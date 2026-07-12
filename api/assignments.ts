import { apiFetch } from '../config/api';
import { ParentAssignment } from './assignments.types';

/**
 * GET /api/parent/children/{studentId}/assignments
 *
 * A linked child's assignments for the parent portal. PARENT-only +
 * parent-owns-child enforced server-side.
 */
export function getChildAssignments(accessToken: string, studentId: number) {
  return apiFetch<ParentAssignment[]>(`/api/parent/children/${studentId}/assignments`, {
    accessToken,
  });
}
