import { apiFetch } from '../config/api';
import { DiarySession } from './diary.types';

/**
 * GET /api/parent/children/{studentId}/diary
 *
 * Returns published diary weeks for the given child. Requires a JWT
 * with PARENT role; backend verifies parent-owns-child.
 */
export function getChildDiary(accessToken: string, studentId: number) {
  return apiFetch<DiarySession[]>(`/api/parent/children/${studentId}/diary`, {
    accessToken,
  });
}

export interface DiarySignPayload {
  sessionId: number;
  scope: 'DAILY' | 'WEEKLY';
  dayIndex?: number;      // required for DAILY (0..4)
  comment?: string;
  signature: string;
}

export interface DiarySignResult {
  scope?: string;
  dayIndex?: number;
  parentComment?: string | null;
  parentSign?: string | null;
  parentSignedAt?: string | null;
}

/**
 * POST /api/parent/children/{studentId}/diary/sign
 *
 * Parent signs (and optionally comments on) a daily or weekly diary entry.
 * Persisted by ShuleOne through the same upsert the teacher portal uses.
 */
export function signDiaryEntry(
  accessToken: string,
  studentId: number,
  payload: DiarySignPayload,
) {
  return apiFetch<DiarySignResult>(`/api/parent/children/${studentId}/diary/sign`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}
