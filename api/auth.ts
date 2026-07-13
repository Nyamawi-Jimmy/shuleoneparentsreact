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

export function loginWithGoogle(idToken: string, userType: UserType | null) {
  return apiFetch<AuthResponse>('/api/auth/google', {
    method: 'POST',
    body: { idToken, userType },
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
