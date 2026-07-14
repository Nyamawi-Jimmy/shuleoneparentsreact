import { apiFetch } from '../config/api';

// =================================================================
// Learner "Me" endpoints — the web student dashboard's data trio:
//   GET /api/learner/{id}/next     → recommended next step (or diagnostic/locked)
//   GET /api/learner/{id}/mastery  → per-substrand mastery snapshot
//   GET /api/learner/{id}/access   → trial / premium access state
// =================================================================

export interface RecommendedNext {
  type: string | null;             // DIAGNOSTIC | LESSON | LOCKED | ...
  contentId: number | null;
  title: string | null;
  subStrandId: number | null;
  subStrandName: string | null;
  reason: string | null;
  coldStart?: boolean | null;
  premiumLocked?: boolean | null;
}

export interface MasteryRow {
  subStrandId: number;
  subStrandName: string | null;
  score: number | null;            // 0..1
  confidence?: number | null;
  attempts?: number | null;
  lastSeenAt?: string | null;
}

export interface LearnerAccess {
  paid: boolean;
  trialActive: boolean;
  daysLeft: number;
  trialDays: number;
  remindSoon?: boolean;
}

export function getRecommendedNext(accessToken: string, studentId: number) {
  return apiFetch<RecommendedNext>(`/api/learner/${studentId}/next`, { accessToken });
}

export function getMastery(accessToken: string, studentId: number) {
  return apiFetch<MasteryRow[]>(`/api/learner/${studentId}/mastery`, { accessToken });
}

export function getLearnerAccess(accessToken: string, studentId: number) {
  return apiFetch<LearnerAccess>(`/api/learner/${studentId}/access`, { accessToken });
}

/** Clamp a 0..1 mastery score to a 0..100 integer, mirroring the web's pct(). */
export function masteryPct(score: number | null | undefined): number {
  return Math.max(0, Math.min(100, Math.round((Number(score) || 0) * 100)));
}

// =================================================================
// AI homework helper — POST /api/learner/{studentId}/homework-help
// Hints/coaching for one question. audience 'PARENT' = "help you explain",
// 'STUDENT' = "hints only". Mirrors the web HomeworkHelp component.
// =================================================================
export interface HomeworkHelpRequest {
  assignmentId?: number | null;
  schoolId?: number | null;
  audience: 'PARENT' | 'STUDENT';
  questionText?: string | null;
  options?: string | null;
  markingScheme?: string | null;
  message: string;
  history: { role: string; text: string }[];
}

export interface HomeworkHelpResponse {
  reply: string | null;
  mode?: string | null;   // TUTOR | REVISION
}

export function getHomeworkHelp(accessToken: string, studentId: number, body: HomeworkHelpRequest) {
  return apiFetch<HomeworkHelpResponse>(`/api/learner/${studentId}/homework-help`, {
    method: 'POST', accessToken, body,
  });
}
