import { apiFetch } from '../config/api';
import { AcademicReport, ChildAttendance } from './academics.types';

/** GET /api/parent/children/{studentId}/academics */
export function getChildAcademics(accessToken: string, studentId: number) {
  return apiFetch<AcademicReport>(
    `/api/parent/children/${studentId}/academics`,
    { accessToken },
  );
}

/** GET /api/parent/children/{studentId}/attendance[?from&to] */
export function getChildAttendance(
  accessToken: string,
  studentId: number,
  filters?: { from?: string; to?: string },
) {
  const qs = new URLSearchParams();
  if (filters?.from) qs.set('from', filters.from);
  if (filters?.to) qs.set('to', filters.to);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<ChildAttendance>(
    `/api/parent/children/${studentId}/attendance${query}`,
    { accessToken },
  );
}
