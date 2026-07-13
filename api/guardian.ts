import { apiFetch } from '../config/api';
import { ProgressReport } from './learner-progress.types';

// =================================================================
// Guardian (parent) view of a child's learning.
//   GET  /api/guardian/children/{studentId}/report        → ProgressReportDto
//   GET  /api/guardian/children/{studentId}/quests        → QuestSummaryDto[]
//   GET  /api/guardian/children/{studentId}/insights      → LearningInsightDto
//   POST /api/guardian/children/{studentId}/coach         → CoachReplyDto
//   GET  /api/guardian/children/{studentId}/coach/history → CoachTurn[]
// =================================================================

/** A parent's read-only report of one child's learning. */
export function getChildLearningReport(accessToken: string, studentId: number) {
  return apiFetch<ProgressReport>(
    `/api/guardian/children/${studentId}/report`,
    { accessToken },
  );
}

// ── Quests (drives the "By subject" section, grouped by subject) ──────────────
export interface QuestSummary {
  id: number | null;
  key: string | null;
  title: string | null;
  theme: string | null;
  subject: string | null;
  description: string | null;
  coverImageUrl: string | null;
  accentColor: string | null;
  totalStages: number;
  completedStages: number;
  totalXp: number;
  earnedXp: number;
  status: string | null;   // IN_PROGRESS | AVAILABLE | COMPLETED | LOCKED
  /** Most recent progress touch — ISO datetime; null when never opened. Drives "continue where you left off". */
  lastActivityAt: string | null;
}

export function getChildQuests(accessToken: string, studentId: number) {
  return apiFetch<QuestSummary[]>(
    `/api/guardian/children/${studentId}/quests`,
    { accessToken },
  );
}

// ── AI insights (Premium) — mirrors LearningInsightDto ───────────────────────
export interface InsightItem { area?: string | null; note?: string | null; }
export interface ChildInsights {
  studentId?: number;
  available?: boolean;
  /** READY (insight present) | LOCKED (not Premium — upsell) | NO_DATA (nothing learned yet) */
  state?: string | null;
  headline?: string | null;
  summary?: string | null;
  strengths?: InsightItem[] | null;
  focusAreas?: InsightItem[] | null;
  nextStep?: string | null;
  generatedAt?: string | null;
  model?: string | null;
  fromCache?: boolean;
  /** Legacy free-text field (older backends). */
  content?: string | null;
  [key: string]: any;
}

/** AI insights (Premium). Fails soft — callers should not block on it. */
export function getChildInsights(accessToken: string, studentId: number, refresh = false) {
  return apiFetch<ChildInsights>(
    `/api/guardian/children/${studentId}/insights${refresh ? '?refresh=true' : ''}`,
    { accessToken },
  );
}

// ── Parent AI coach (Premium) ────────────────────────────────────────────────
export interface CoachTurn { role: 'parent' | 'coach' | string; content: string; }
export interface CoachReply { reply: string | null; model?: string | null; }

/** Ask the coach one question about the child. Grounded in real progress. */
export function askChildCoach(accessToken: string, studentId: number, message: string, history: CoachTurn[] = []) {
  return apiFetch<CoachReply>(
    `/api/guardian/children/${studentId}/coach`,
    { method: 'POST', accessToken, body: { message, history } },
  );
}

export function getChildCoachHistory(accessToken: string, studentId: number) {
  return apiFetch<CoachTurn[]>(
    `/api/guardian/children/${studentId}/coach/history`,
    { accessToken },
  );
}

// =================================================================
// Coding & Robotics — read-only mirrors of GuardianCodingController.
//   GET .../coding/lessons                   → StudentLessonSummaryDto[]
//   GET .../coding/progress                  → LessonProgressDto[]
//   GET .../coding/reports?limit=N           → ClassReportDto[]  (tutor write-ups)
//   GET .../coding/stats                     → CodingStatsDto    (completion, XP, rank)
//   GET .../coding/lessons/{id}/submission   → SubmissionDto|null (latest handed-in work)
//   GET .../coding/lessons/{id}/project      → CodingProjectDto  (saved Scratch .sb3)
// =================================================================

/** Kid-facing lesson card — StudentLessonSummaryDto. */
export interface CodingLessonSummary {
  id: number;
  lessonNumber: number | null;
  week: number | null;
  title: string | null;
  objective: string | null;
  sandboxKind: string | null;  // SCRATCH | BLOCKS | WEB | PYTHON | ...
}

/** Per-lesson progress — LessonProgressDto. */
export interface CodingLessonProgress {
  lessonId: number;
  lessonNumber: number | null;
  title: string | null;
  available: boolean | null;
  hasQuiz: boolean | null;
  quizPassed: boolean | null;
  lastQuizPercent: number | null;
  status: string | null;       // COMPLETED | IN_PROGRESS | AVAILABLE | LOCKED
  teacherScore: number | null;
  graded: boolean | null;
  teacherOpen: boolean | null;
}

/** One delivered class session as reported by the tutor — ClassReportDto. */
export interface CodingClassReport {
  id: number;
  sessionDate: string | null;  // ISO yyyy-MM-dd
  topic: string | null;
  summary: string | null;
  skillsCovered: string | null;
  nextFocus: string | null;
  className: string | null;
  streamName: string | null;
  lessonId: number | null;
  lessonTitle: string | null;
}

/** Child's coding standing — CodingStatsDto. */
export interface CodingStats {
  totalLessons: number;
  completedLessons: number;
  percent: number;
  xp: number;
  classRank: number | null;
  classSize: number | null;
}

/** Latest handed-in sandbox work — SubmissionDto. */
export interface CodingSubmission {
  id: number;
  lessonId: number;
  kind: string | null;
  language: string | null;
  content: string | null;
  fileUrl: string | null;
  status: string | null;
  score: number | null;
  maxScore: number | null;
  feedback: string | null;
  submittedAt: number | null;
  createdAt: number | null;
  updatedAt: number | null;
}

/** Saved Scratch project — CodingProjectDto (sb3Base64 null when nothing saved). */
export interface CodingProject {
  lessonId?: number | null;
  sb3Base64: string | null;
  [key: string]: any;
}

export function getChildCodingLessons(accessToken: string, studentId: number) {
  return apiFetch<CodingLessonSummary[]>(
    `/api/guardian/children/${studentId}/coding/lessons`,
    { accessToken },
  );
}

export function getChildCodingProgress(accessToken: string, studentId: number) {
  return apiFetch<CodingLessonProgress[]>(
    `/api/guardian/children/${studentId}/coding/progress`,
    { accessToken },
  );
}

export function getChildCodingReports(accessToken: string, studentId: number, limit = 10) {
  return apiFetch<CodingClassReport[]>(
    `/api/guardian/children/${studentId}/coding/reports?limit=${limit}`,
    { accessToken },
  );
}

export function getChildCodingStats(accessToken: string, studentId: number) {
  return apiFetch<CodingStats>(
    `/api/guardian/children/${studentId}/coding/stats`,
    { accessToken },
  );
}

export function getChildCodingSubmission(accessToken: string, studentId: number, lessonId: number) {
  return apiFetch<CodingSubmission | null>(
    `/api/guardian/children/${studentId}/coding/lessons/${lessonId}/submission`,
    { accessToken },
  );
}

export function getChildCodingProject(accessToken: string, studentId: number, lessonId: number) {
  return apiFetch<CodingProject>(
    `/api/guardian/children/${studentId}/coding/lessons/${lessonId}/project`,
    { accessToken },
  );
}
