// Mobile app config — the force-update source of truth.
//
// The backend owns a MINIMUM supported Android versionCode. When you publish a
// release that older versions must not keep running against (a breaking API
// change, a critical fix), you raise minAndroidVersionCode on the server and
// every install below it is hard-gated to the Play Store on next launch.
//
// Public endpoint (no auth) — the gate runs before login. See lms-spring
// AppConfigController.

import { API_BASE_URL } from '../config/api';

export interface MobileAppConfig {
  /** Installs with a lower Android versionCode MUST update before continuing. */
  minAndroidVersionCode: number;
  /** Latest published versionCode (informational — for a "recommended" prompt). */
  latestAndroidVersionCode?: number | null;
  /** Where to send users to update. Defaults to the Play listing if omitted. */
  androidStoreUrl?: string | null;
}

/**
 * Fetch the mobile config. Deliberately standalone (not apiFetch) with a short
 * timeout, because it runs at launch before anything else and must never hang
 * the splash. Returns null on ANY failure so the caller can FAIL OPEN — a
 * missing/unreachable config must never brick a working app.
 */
export async function getMobileAppConfig(): Promise<MobileAppConfig | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${API_BASE_URL}/api/app/mobile-config`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;                 // 404 (not deployed yet), 5xx, …
    const data = await res.json();
    if (data == null || typeof data.minAndroidVersionCode !== 'number') return null;
    return data as MobileAppConfig;
  } catch {
    return null;                              // offline, timeout, bad JSON
  }
}
