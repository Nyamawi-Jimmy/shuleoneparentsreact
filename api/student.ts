import { apiFetch } from '../config/api';
import {
  StudentProfile, StudentCalendarItem, StudentFeeSummary,
  StudentAssignment, StudentLiveClass,
} from './student.types';

// =================================================================
// /api/student/me, /api/student/calendar, /api/student/fees
// =================================================================

export async function getStudentProfile(accessToken: string): Promise<StudentProfile> {
  return apiFetch<StudentProfile>('/api/student/me', { accessToken });
}

export async function getStudentFees(accessToken: string): Promise<StudentFeeSummary> {
  return apiFetch<StudentFeeSummary>('/api/student/fees', { accessToken });
}

export async function getStudentAssignments(accessToken: string): Promise<StudentAssignment[]> {
  return apiFetch<StudentAssignment[]>('/api/student/assignments', { accessToken });
}

export async function getStudentLiveClasses(accessToken: string): Promise<StudentLiveClass[]> {
  return apiFetch<StudentLiveClass[]>('/api/student/live-classes', { accessToken });
}

export async function getStudentCalendar(
  accessToken: string,
  params?: { from?: string; to?: string },
): Promise<StudentCalendarItem[]> {
  const search = new URLSearchParams();
  if (params?.from) search.set('from', params.from);
  if (params?.to) search.set('to', params.to);
  const qs = search.toString() ? `?${search.toString()}` : '';
  return apiFetch<StudentCalendarItem[]>(`/api/student/calendar${qs}`, { accessToken });
}
