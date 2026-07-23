// Mobile app config — the force-update source of truth.
//
// This is hosted as a plain JSON file in the app's OWN GitHub repo, NOT on the
// backend — so forcing an update needs no server or deploy: you edit
// mobile-config.json, push it, and within a few minutes (GitHub's CDN cache)
// every install below minAndroidVersionCode is gated to the Play Store.
//
//   Raw file: https://raw.githubusercontent.com/<owner>/<repo>/<branch>/mobile-config.json
//
// Override the URL per build with EXPO_PUBLIC_APP_CONFIG_URL if the repo moves.

const CONFIG_URL =
  process.env.EXPO_PUBLIC_APP_CONFIG_URL ??
  'https://raw.githubusercontent.com/Nyamawi-Jimmy/shuleoneparentsreact/main/mobile-config.json';

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
    // Cache-bust so a freshly-pushed config isn't masked by a stale CDN copy
    // longer than necessary.
    const res = await fetch(`${CONFIG_URL}?t=${Date.now()}`, {
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
