// =================================================================
// Write a base64 payload to the cache directory and open the system
// share sheet. Same dual-path approach as downloadAuthFile: tries the
// expo-file-system v54+ File/Paths API first, falls back to legacy.
// =================================================================

import { Alert } from 'react-native';

function base64ToUint8Array(b64: string): Uint8Array {
  // Hermes provides atob globally; throw (caught by caller) if it's ever absent.
  const bin = (globalThis as any).atob(b64) as string;
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Save base64 content as a cache file and share it. Returns the local
 * URI on success, or null on failure (an alert is shown).
 */
export async function shareBase64File(
  base64: string,
  fileName: string,
  mimeType = 'application/octet-stream',
): Promise<string | null> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '_');

  let localUri: string | null = null;
  try {
    localUri = writeViaNewApi(base64, safeName);
  } catch {
    // Fall through to legacy
  }
  if (!localUri) {
    try {
      localUri = await writeViaLegacy(base64, safeName);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Could not save the file.');
      return null;
    }
  }
  if (!localUri) return null;

  let Sharing: any;
  try { Sharing = require('expo-sharing'); } catch { Sharing = null; }
  if (Sharing && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(localUri, { mimeType, dialogTitle: fileName });
  } else {
    Alert.alert('Saved', `Saved to: ${localUri}`);
  }
  return localUri;
}

// New API (expo-file-system v54+) — File / Paths
function writeViaNewApi(base64: string, fileName: string): string | null {
  let fs: any;
  try { fs = require('expo-file-system'); } catch { return null; }
  const { File, Paths } = fs;
  if (!File || !Paths) return null;
  const file = new File(Paths.cache, fileName);
  try { if (file.exists) file.delete(); } catch {}
  file.write(base64ToUint8Array(base64));
  return file.uri ?? null;
}

// Legacy API (works on all SDK versions)
async function writeViaLegacy(base64: string, fileName: string): Promise<string | null> {
  let FileSystem: any;
  try {
    FileSystem = require('expo-file-system/legacy');
  } catch {
    FileSystem = require('expo-file-system');
  }
  const localUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(localUri, base64, {
    encoding: FileSystem.EncodingType?.Base64 ?? 'base64',
  });
  return localUri;
}
