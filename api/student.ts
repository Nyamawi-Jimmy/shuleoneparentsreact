import { apiFetch } from '../config/api';
import {
  StudentProfile, StudentCalendarItem, StudentFeeSummary,
  StudentAssignment, StudentLiveClass,
  AssignmentExam, AssignmentSubmitResult, AssignmentReview,
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

/** Mint a join URL (Jitsi token) for one live class. */
export async function joinStudentLiveClass(accessToken: string, id: number) {
  return apiFetch<{ joinUrl?: string | null; status?: string | null }>(
    `/api/student/live-classes/${id}/join`, { accessToken },
  );
}

// ── Assignment player: open → submit → review ────────────────────
export function getAssignmentExam(accessToken: string, examId: number) {
  return apiFetch<AssignmentExam>(`/api/student/assignments/${examId}`, { accessToken });
}

export function submitAssignmentExam(
  accessToken: string, examId: number,
  body: { startedAt: string | null; durationSpentSeconds: number; answers: ({ questionId: number; choiceId: number } | { questionId: number; text: string })[] },
) {
  return apiFetch<AssignmentSubmitResult>(`/api/student/assignments/${examId}/submit`, {
    method: 'POST', accessToken, body,
  });
}

export function getAssignmentReview(accessToken: string, examId: number, take?: number | null) {
  const qs = take != null ? `?take=${take}` : '';
  return apiFetch<AssignmentReview>(`/api/student/assignments/${examId}/review${qs}`, { accessToken });
}

// ── Parent-assist ("Help do it"): the SAME assignment flow, but scoped to a
// child via the parent endpoints (matches the web AssignmentPlayer's
// basePath=/parent/children/{studentId}/assignments). Saved as parent-assisted.
export function getParentAssignmentExam(accessToken: string, studentId: number, examId: number) {
  return apiFetch<AssignmentExam>(`/api/parent/children/${studentId}/assignments/${examId}`, { accessToken });
}

export function submitParentAssignmentExam(
  accessToken: string, studentId: number, examId: number,
  body: { startedAt: string | null; durationSpentSeconds: number; answers: ({ questionId: number; choiceId: number } | { questionId: number; text: string })[] },
) {
  return apiFetch<AssignmentSubmitResult>(`/api/parent/children/${studentId}/assignments/${examId}/submit`, {
    method: 'POST', accessToken, body,
  });
}

export function getParentAssignmentReview(accessToken: string, studentId: number, examId: number, take?: number | null) {
  const qs = take != null ? `?take=${take}` : '';
  return apiFetch<AssignmentReview>(`/api/parent/children/${studentId}/assignments/${examId}/review${qs}`, { accessToken });
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
