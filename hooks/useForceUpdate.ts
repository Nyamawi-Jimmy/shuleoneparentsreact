// useForceUpdate — decides whether this install is too old to run.
//
// It compares the installed Android versionCode against the backend's
// minAndroidVersionCode. The check runs at launch AND every time the app
// returns to the foreground, so a user who leaves the app open across a
// release still gets gated the next time they come back to it.
//
// FAIL OPEN: if the config can't be fetched (offline, endpoint not deployed),
// `required` stays false and the app works normally. A version gate must never
// be the thing that takes the app down.

import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Application from 'expo-application';
import { getMobileAppConfig } from '../api/appConfig';

const DEFAULT_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.walgotech.shuleoneparents';

/** The installed Android versionCode, or null on iOS / if unavailable. */
function currentVersionCode(): number | null {
  if (Platform.OS !== 'android') return null;
  // On Android, nativeBuildVersion is the versionCode (as a string).
  const raw = Application.nativeBuildVersion;
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

export interface ForceUpdateState {
  /** True once we KNOW an update is mandatory. */
  required: boolean;
  /** Where to send the user to update. */
  storeUrl: string;
  /** The versionCode the server demands (for the message). */
  minVersion: number | null;
  current: number | null;
  /** Re-run the check on demand. */
  recheck: () => void;
}

export function useForceUpdate(): ForceUpdateState {
  const [required, setRequired] = useState(false);
  const [storeUrl, setStoreUrl] = useState(DEFAULT_STORE_URL);
  const [minVersion, setMinVersion] = useState<number | null>(null);
  const current = currentVersionCode();

  const check = useCallback(async () => {
    // iOS / unknown version → nothing to enforce here.
    if (current == null) return;
    const cfg = await getMobileAppConfig();
    if (!cfg) return;                          // fail open
    if (cfg.androidStoreUrl) setStoreUrl(cfg.androidStoreUrl);
    setMinVersion(cfg.minAndroidVersionCode);
    if (current < cfg.minAndroidVersionCode) {
      setRequired(true);                       // once gated, stay gated
    }
  }, [current]);

  // On launch.
  useEffect(() => { check(); }, [check]);

  // And whenever the app is brought back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  return { required, storeUrl, minVersion, current, recheck: check };
}
