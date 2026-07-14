// =================================================================
// Authenticated file download helpers.
//
//   downloadAuthFile()      → download + open in the system viewer / share
//                             sheet (good for "View").
//   saveAuthFileToDevice()  → download + SAVE onto the device. On Android it
//                             writes into a folder the parent picks once (via
//                             the Storage Access Framework, remembered after),
//                             so the file really lands in their storage; on
//                             iOS it opens the share sheet where "Save to
//                             Files" does the same. Falls back to sharing on
//                             any error, so it never dead-ends.
//
// Required packages: expo-file-system (+ expo-sharing recommended).
// =================================================================

import { Alert, Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';

const SAF_DIR_KEY = 'shuleone:downloads-dir';

interface DownloadOptions {
  /** Display name (e.g., "fees-statement-Term-2-2024.pdf") */
  fileName: string;
  /** Optional MIME type override (default: application/pdf) */
  mimeType?: string;
}

const fullUrlOf = (remoteUrl: string) =>
  remoteUrl.startsWith('http')
    ? remoteUrl
    : `${API_BASE_URL}${remoteUrl.startsWith('/') ? '' : '/'}${remoteUrl}`;

/**
 * Download an authenticated file and open it in the system viewer / share
 * sheet. Returns the local file URI on success, or null on failure.
 */
export async function downloadAuthFile(
  accessToken: string,
  remoteUrl: string,
  opts: DownloadOptions,
): Promise<string | null> {
  const localUri = await downloadToCache(accessToken, remoteUrl, opts);
  if (!localUri) return null;
  await openFile(localUri, opts);
  return localUri;
}

/**
 * Download an authenticated file and save it onto the device. Returns true if
 * the file was saved or handed to the share sheet, false on hard failure.
 */
export async function saveAuthFileToDevice(
  accessToken: string,
  remoteUrl: string,
  opts: DownloadOptions,
): Promise<boolean> {
  const localUri = await downloadToCache(accessToken, remoteUrl, opts);
  if (!localUri) return false;

  if (Platform.OS === 'android') {
    try {
      const saved = await saveViaSAF(localUri, opts);
      if (saved) {
        // Take the parent straight to the file so they can see what was
        // downloaded (open it / share it / re-save it).
        await openFile(localUri, opts);
        return true;
      }
    } catch {
      // fall through to sharing
    }
  }
  // iOS (Save to Files) and Android fallback.
  await openFile(localUri, opts);
  return true;
}

/**
 * Fetch an authenticated file and return it as a base64 string — used to hand
 * a PDF to the in-app viewer (WebView + pdf.js) without a second auth round.
 * Returns null on failure.
 */
export async function fetchAuthFileBase64(
  accessToken: string,
  remoteUrl: string,
  fileName = 'file.pdf',
): Promise<string | null> {
  const localUri = await downloadToCache(accessToken, remoteUrl, { fileName });
  if (!localUri) return null;
  const FileSystem = legacyFs();
  if (!FileSystem?.readAsStringAsync) return null;
  try {
    return await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  } catch {
    return null;
  }
}

// =================================================================
// Cache download (shared by both helpers)
// =================================================================
async function downloadToCache(
  accessToken: string,
  remoteUrl: string,
  opts: DownloadOptions,
): Promise<string | null> {
  if (!accessToken) {
    Alert.alert('Not signed in', 'Please sign in again to download.');
    return null;
  }
  const url = fullUrlOf(remoteUrl);
  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const headers = { Authorization: `Bearer ${accessToken}` };

  let localUri: string | null = null;
  try {
    localUri = await downloadViaNewApi(url, safeName, headers);
  } catch {
    // Fall through to legacy
  }
  if (!localUri) {
    try {
      localUri = await downloadViaLegacy(url, safeName, headers);
    } catch (e: any) {
      Alert.alert('Download failed', e?.message ?? 'Could not download the file.');
      return null;
    }
  }
  return localUri;
}

// New API (expo-file-system v54+) — File / Paths
async function downloadViaNewApi(
  url: string,
  fileName: string,
  headers: Record<string, string>,
): Promise<string | null> {
  let fs: any;
  try { fs = require('expo-file-system'); } catch { return null; }
  const { File, Paths } = fs;
  if (!File || !Paths || typeof File.downloadFileAsync !== 'function') return null;
  const destination = new File(Paths.cache, fileName);
  try { if (destination.exists) { try { destination.delete(); } catch {} } } catch {}
  const output = await File.downloadFileAsync(url, destination, { headers });
  return output?.uri ?? destination.uri ?? null;
}

// Legacy API (works on all SDK versions)
async function downloadViaLegacy(
  url: string,
  fileName: string,
  headers: Record<string, string>,
): Promise<string | null> {
  const FileSystem = legacyFs();
  if (!FileSystem) {
    Alert.alert('Install expo-file-system', 'Run: npx expo install expo-file-system');
    return null;
  }
  const localUri = `${FileSystem.cacheDirectory}${fileName}`;
  const dl = await FileSystem.downloadAsync(url, localUri, { headers });
  if (dl.status >= 400) throw new Error(`Server responded with ${dl.status}.`);
  return dl.uri;
}

// =================================================================
// Android: save into a user-chosen folder via Storage Access Framework.
// The folder is remembered so it's a one-time prompt.
// =================================================================
// A short date-time suffix so every save writes a NEW file (never "already
// exists") — the parent can download the same statement/receipt any number
// of times, each landing as its own dated copy.
function stampSuffix(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${ms}`;
}

async function writeToDir(
  FileSystem: any, SAF: any, dirUri: string, base64: string, opts: DownloadOptions,
): Promise<void> {
  const displayName = `${opts.fileName.replace(/\.[^.]+$/, '')}-${stampSuffix()}`;
  const destUri = await SAF.createFileAsync(dirUri, displayName, opts.mimeType ?? 'application/pdf');
  await FileSystem.writeAsStringAsync(destUri, base64, { encoding: 'base64' });
}

async function saveViaSAF(localUri: string, opts: DownloadOptions): Promise<boolean> {
  const FileSystem = legacyFs();
  const SAF = FileSystem?.StorageAccessFramework;
  if (!SAF) return false;

  let store: any = null;
  try { store = require('@react-native-async-storage/async-storage').default; } catch { store = null; }

  let dirUri: string | null = null;
  try { dirUri = store ? await store.getItem(SAF_DIR_KEY) : null; } catch { dirUri = null; }

  if (!dirUri) {
    const perm = await SAF.requestDirectoryPermissionsAsync();
    if (!perm.granted) return false;
    dirUri = perm.directoryUri;
    try { if (store) await store.setItem(SAF_DIR_KEY, dirUri); } catch {}
  }

  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  try {
    await writeToDir(FileSystem, SAF, dirUri as string, base64, opts);
  } catch {
    // Stored folder was revoked/removed — ask for a fresh one, once.
    try { if (store) await store.removeItem(SAF_DIR_KEY); } catch {}
    const perm = await SAF.requestDirectoryPermissionsAsync();
    if (!perm.granted) return false;
    try { if (store) await store.setItem(SAF_DIR_KEY, perm.directoryUri); } catch {}
    await writeToDir(FileSystem, SAF, perm.directoryUri, base64, opts);
  }
  // No blocking alert — the caller opens the file next so the parent sees it.
  return true;
}

function legacyFs(): any {
  try { return require('expo-file-system/legacy'); } catch {}
  try { return require('expo-file-system'); } catch {}
  return null;
}

// =================================================================
// Open the downloaded file directly — the OS opens it in the default viewer,
// or shows an "open with" chooser — instead of a share sheet.
// =================================================================
async function openFile(localUri: string, opts: DownloadOptions) {
  const mimeType = opts.mimeType ?? 'application/pdf';

  if (Platform.OS === 'android') {
    // ACTION_VIEW via a content:// URI = "open / open with", not "share".
    try {
      const FileSystem = legacyFs();
      const IntentLauncher = requireIntentLauncher();
      if (FileSystem?.getContentUriAsync && IntentLauncher?.startActivityAsync) {
        const contentUri = await FileSystem.getContentUriAsync(localUri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: mimeType,
        });
        return;
      }
    } catch {
      // fall through to sharing as a last resort
    }
  }

  // iOS (Quick Look) and Android fallback.
  let Sharing: any;
  try { Sharing = require('expo-sharing'); } catch { Sharing = null; }
  if (Sharing && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(localUri, { mimeType, dialogTitle: opts.fileName, UTI: 'com.adobe.pdf' });
  } else {
    Alert.alert('Downloaded', `Saved to: ${localUri}`);
  }
}

function requireIntentLauncher(): any {
  try { return require('expo-intent-launcher'); } catch { return null; }
}
