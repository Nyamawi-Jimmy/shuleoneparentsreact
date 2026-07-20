import { apiFetch } from '../config/api';

// =================================================================
// Types - mirror the backend DTOs exactly
// =================================================================

/** Matches Spring Boot's UserType enum. */
export type UserType = 'PARENT' | 'STUDENT';

/** Matches AuthResponse.java */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userId: number;
  userType: UserType;
  username: string;
  roles: string[];
  /** ISO date string (yyyy-MM-dd). Students only; null for parents. */
  dateOfBirth: string | null;
}

/** Matches the `/me` endpoint response. */
export interface MeResponse {
  id: number;
  userType: UserType;
  username: string;
  roles: string[];
}

// =================================================================
// Endpoints
// =================================================================

export function loginParent(identifier: string, password: string) {
  return apiFetch<AuthResponse>('/api/auth/parent/login', {
    method: 'POST',
    body: { identifier, password },
  });
}

export function loginStudent(identifier: string, password: string) {
  return apiFetch<AuthResponse>('/api/auth/student/login', {
    method: 'POST',
    body: { identifier, password },
  });
}

// =================================================================
// Google sign-in — POST /api/auth/google returns ONE OF three shapes.
// The backend matches the token's verified email across parents, students
// and learners, so no userType is sent on the first attempt.
// =================================================================

/** One account an email could sign into, when it matches more than one. */
export interface AuthCandidate {
  userType: UserType;
  accountId: number | null;
  label: string | null;
  subtitle: string | null;
}

/** The email matches several accounts — the caller must pick one and retry. */
export interface AuthChoiceResponse {
  status: 'CHOOSE_ACCOUNT';
  message: string | null;
  candidates: AuthCandidate[] | null;
}

/** Brand-new Google email — needs a learner name + grade before an account exists. */
export interface GoogleSetupRequiredResponse {
  status: 'GOOGLE_SETUP_REQUIRED';
  message: string | null;
  name: string | null;
  email: string | null;
  picture: string | null;
}

export type GoogleLoginResult = AuthResponse | AuthChoiceResponse | GoogleSetupRequiredResponse;

/** Success is identified by the presence of an access token, as on the web. */
export const isAuthSuccess = (r: GoogleLoginResult): r is AuthResponse =>
  !!(r as AuthResponse)?.accessToken;
export const isChooseAccount = (r: GoogleLoginResult): r is AuthChoiceResponse =>
  (r as any)?.status === 'CHOOSE_ACCOUNT';
export const isSetupRequired = (r: GoogleLoginResult): r is GoogleSetupRequiredResponse =>
  (r as any)?.status === 'GOOGLE_SETUP_REQUIRED';

export interface GoogleLoginOptions {
  /** Set when retrying after CHOOSE_ACCOUNT. */
  userType?: UserType | null;
  accountId?: number | null;
  /** Set when retrying after GOOGLE_SETUP_REQUIRED. */
  learnerName?: string | null;
  learnerGrade?: number | null;
}

export function loginWithGoogle(idToken: string, opts: GoogleLoginOptions = {}) {
  return apiFetch<GoogleLoginResult>('/api/auth/google', {
    method: 'POST',
    // All five keys are always sent (nulls included), matching the web client.
    body: {
      idToken,
      userType: opts.userType ?? null,
      accountId: opts.accountId ?? null,
      learnerName: opts.learnerName ?? null,
      learnerGrade: opts.learnerGrade ?? null,
    },
  });
}

export function refreshTokens(refreshToken: string) {
  return apiFetch<AuthResponse>('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });
}

export function fetchMe(accessToken: string) {
  return apiFetch<MeResponse>('/api/auth/me', { accessToken });
}

// =================================================================
// Password reset (public; self-service for parents/students/learners)
// =================================================================

/** Matches PasswordResetController's generic response. */
export interface ForgotPasswordResponse {
  ok: boolean;
  message?: string;
}

/** POST /api/auth/password/forgot — always succeeds generically (no account enumeration). */
export function requestPasswordReset(identifier: string) {
  return apiFetch<ForgotPasswordResponse>('/api/auth/password/forgot', {
    method: 'POST',
    body: { identifier },
  });
}

/** POST /api/auth/password/reset — confirm the 6-digit code and set a new password. */
export function resetPassword(identifier: string, code: string, newPassword: string) {
  return apiFetch<{ ok: boolean }>('/api/auth/password/reset', {
    method: 'POST',
    body: { identifier, code, newPassword },
  });
}

// =================================================================
// Active devices (session management) — mirrors the web Settings page.
//   GET    /api/auth/devices              → DeviceSession[]
//   DELETE /api/auth/devices/{sessionId}  → { ok }
// =================================================================

/** One signed-in session, as reported by the backend session registry. */
export interface DeviceSession {
  id: string | null;
  deviceName?: string | null;
  deviceType?: string | null;   // mobile | desktop | tablet
  browser?: string | null;
  os?: string | null;
  ipAddress?: string | null;
  lastSeenAt?: string | null;
  current?: boolean;
  [key: string]: any;
}

export function listDevices(accessToken: string) {
  return apiFetch<DeviceSession[]>('/api/auth/devices', { accessToken });
}

export function signOutDevice(accessToken: string, sessionId: string) {
  return apiFetch<{ ok: boolean }>(`/api/auth/devices/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE', accessToken,
  });
}

// =================================================================
// Unified login (the same POST /api/auth/login the web uses).
// Returns tokens directly, or a CHOOSE_ACCOUNT step when the identifier
// matches more than one account type.
// =================================================================

export interface LoginCandidate {
  userType: string;               // PARENT | STUDENT | LEARNER | TUTOR
  accountId: number | string;
  name?: string | null;
  label?: string | null;
  [key: string]: any;
}

export type UnifiedLoginResult =
  | AuthResponse
  | { status: 'CHOOSE_ACCOUNT'; candidates: LoginCandidate[]; message?: string }
  | { status: string; message?: string; [key: string]: any };

export function loginUnified(
  identifier: string,
  password: string,
  userType?: string | null,
  accountId?: number | string | null,
) {
  return apiFetch<UnifiedLoginResult>('/api/auth/login', {
    method: 'POST',
    body: { identifier, password, userType: userType ?? null, accountId: accountId ?? null },
  });
}
