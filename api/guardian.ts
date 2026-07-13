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
