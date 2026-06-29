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
