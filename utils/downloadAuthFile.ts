// =================================================================
// Authenticated file download helper.
//
// Supports both expo-file-system v54+ (File / Paths API) and the
// legacy API (FileSystem.downloadAsync). Tries the new API first;
// falls back to legacy silently if unavailable.
//
// Required packages:
//   - expo-file-system
//   - expo-sharing  (optional but recommended)
// =================================================================

import { Alert } from 'react-native';
import { API_BASE_URL } from '../config/api';

interface DownloadOptions {
  /** Display name (e.g., "fees-statement-Term-2-2024.pdf") */
  fileName: string;
  /** Optional MIME type override (default: application/pdf) */
  mimeType?: string;
}

/**
 * Download an authenticated file and open it in the system viewer.
 * Returns the local file URI on success, or null on failure.
 */
export async function downloadAuthFile(
  accessToken: string,
  remoteUrl: string,
  opts: DownloadOptions,
): Promise<string | null> {
  if (!accessToken) {
    Alert.alert('Not signed in', 'Please sign in again to download.');
    return null;
  }

  const fullUrl = remoteUrl.startsWith('http')
    ? remoteUrl
    : `${API_BASE_URL}${remoteUrl.startsWith('/') ? '' : '/'}${remoteUrl}`;
  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const headers = { Authorization: `Bearer ${accessToken}` };

  let localUri: string | null = null;
  try {
    localUri = await downloadViaNewApi(fullUrl, safeName, headers);
  } catch {
    // Fall through to legacy
  }
  if (!localUri) {
    try {
      localUri = await downloadViaLegacy(fullUrl, safeName, headers);
    } catch (e: any) {
      Alert.alert('Download failed', e?.message ?? 'Could not download the file.');
      return null;
    }
  }
  if (!localUri) return null;

  // Open in the share/preview sheet
  await openWithSharing(localUri, opts);
  return localUri;
}

// =================================================================
// New API (expo-file-system v54+) - File / Paths
// =================================================================
async function downloadViaNewApi(
  url: string,
  fileName: string,
  headers: Record<string, string>,
): Promise<string | null> {
  let fs: any;
  try {
    fs = require('expo-file-system');
  } catch {
    return null;
  }
  const { File, Paths } = fs;
  if (!File || !Paths || typeof File.downloadFileAsync !== 'function') {
    return null;
  }
  const destination = new File(Paths.cache, fileName);
  try {
    // If the file already exists from a previous attempt, clear it
    if (destination.exists) {
      try { destination.delete(); } catch {}
    }
  } catch {}
  const output = await File.downloadFileAsync(url, destination, { headers });
  return output?.uri ?? destination.uri ?? null;
}

// =================================================================
// Legacy API (works on all SDK versions)
// =================================================================
async function downloadViaLegacy(
  url: string,
  fileName: string,
  headers: Record<string, string>,
): Promise<string | null> {
  // Import from /legacy to suppress the deprecation warning on SDK 54+
  let FileSystem: any;
  try {
    FileSystem = require('expo-file-system/legacy');
  } catch {
    try {
      FileSystem = require('expo-file-system');
    } catch {
      Alert.alert(
        'Install expo-file-system',
        'Run: npx expo install expo-file-system',
      );
      return null;
    }
  }
  const localUri = `${FileSystem.cacheDirectory}${fileName}`;
  const dl = await FileSystem.downloadAsync(url, localUri, { headers });
  if (dl.status >= 400) {
    throw new Error(`Server responded with ${dl.status}.`);
  }
  return dl.uri;
}

// =================================================================
// Sharing
// =================================================================
async function openWithSharing(localUri: string, opts: DownloadOptions) {
  let Sharing: any;
  try { Sharing = require('expo-sharing'); } catch { Sharing = null; }
  if (Sharing && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(localUri, {
      mimeType: opts.mimeType ?? 'application/pdf',
      dialogTitle: opts.fileName,
      UTI: 'com.adobe.pdf',
    });
  } else {
    Alert.alert('Downloaded', `Saved to: ${localUri}`);
  }
}
