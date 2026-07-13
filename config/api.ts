/**
 * Centralized API config.
 *
 * IMPORTANT: from a phone running Expo Go, `localhost` refers to the phone
 * itself, NOT your laptop. You MUST use your laptop's LAN IP.
 *
 * Find it:
 *   - Linux:   ip addr show | grep "inet " | grep -v 127.0.0.1
 *   - macOS:   ipconfig getifaddr en0
 *   - Windows: ipconfig | findstr IPv4
 *
 * Your Metro QR shows it too: "exp://10.x.x.x:8081" — that's the IP.
 *
 * Configure per-environment via the `EXPO_PUBLIC_API_BASE_URL` env var
 * (e.g. in a `.env` file at the repo root). Expo inlines any `EXPO_PUBLIC_*`
 * var into the bundle at build time — no rebuild of native code needed.
 * Falls back to the dev ngrok tunnel when unset.
 *
 * In production, set `EXPO_PUBLIC_API_BASE_URL` to your deployed backend URL.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'https://a3e7-102-205-238-249.ngrok-free.app';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: object;
  /** Bearer token to attach. */
  accessToken?: string | null;
}

// ── "Learn as my child" (parent-device learning) ─────────────────────────────
// While a child plays quests on the parent's phone, every request carries the
// X-Learn-As-Child header with the child's id. The backend verifies the
// parent_child link on EVERY request and records quest progress against the
// CHILD's own rows (QuestController.LEARN_AS_CHILD_HEADER); endpoints that
// don't know the header simply ignore it. Mirrors the web app's
// localStorage('s1.learnAsChild') mechanism.
let learnAsChildId: number | null = null;

/** Arm/disarm kid-learn mode. Pass null when the parent takes the device back. */
export function setLearnAsChild(studentId: number | null): void {
  learnAsChildId = studentId;
}

export function getLearnAsChild(): number | null {
  return learnAsChildId;
}

/**
 * Thin wrapper over fetch. Always JSON, always throws on non-2xx.
 * Backend errors come back as JSON like { error: "Bad credentials", ... }
 * — we surface the message in ApiError.
 */
export async function apiFetch<T>(
  path: string,
  { body, accessToken, headers, ...rest }: ApiFetchOptions = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };
  if (accessToken) {
    finalHeaders.Authorization = `Bearer ${accessToken}`;
  }
  if (learnAsChildId != null) {
    finalHeaders['X-Learn-As-Child'] = String(learnAsChildId);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e: any) {
    // Network failure: backend offline, wrong IP, firewall, etc.
    throw new ApiError(
      0,
      'Network error — is the backend running and reachable?',
      e?.message,
    );
  }

  const text = await res.text();
  const parsed = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const msg =
      (parsed as any)?.message ||
      (parsed as any)?.error ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, parsed);
  }

  return parsed as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
