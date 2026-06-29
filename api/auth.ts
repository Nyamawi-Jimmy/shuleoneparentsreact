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
