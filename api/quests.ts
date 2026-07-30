import { apiFetch } from '../config/api';
import {
  QuestSummary,
  QuestDetail,
  QuestCatalog,
  Lesson,
  StageCompletionResult,
  AgeTier,
} from './quest.types';

/**
 * GET /api/quests/catalog
 *
 * All active quests tagged with their class code, the grade list, and the
 * student's own class (so the UI can default there). Every grade is browsable.
 */
export function getQuestCatalog(accessToken: string) {
  return apiFetch<QuestCatalog>('/api/quests/catalog', { accessToken });
}

// ── Recommended path (the learner's exam-driven revision path) ───────────────
// GET /api/quests/recommended — self-scoped (JWT resolves the student). Mirrors
// the web's questApi.recommended(). Fail-soft: { exists:false } when no path.
export interface RecommendedItem {
  position: number;
  subStrandId?: number | null;
  subStrand?: string | null;
  lessonId?: number | null;
  lessonTitle?: string | null;
  reason?: string | null;
  status?: string | null;      // e.g. DONE
  questId?: number | null;     // null → lesson not staged in a quest here (skip)
}
export interface RecommendedPath {
  exists: boolean;
  generatedAt?: string | null;
  validUntil?: string | null;
  items?: RecommendedItem[];
}
export function getRecommendedPath(accessToken: string) {
  return apiFetch<RecommendedPath>('/api/quests/recommended', { accessToken });
}

// =================================================================
// QuestController endpoints. Most require a Bearer token; pass
// `accessToken` from useAuth().
// =================================================================

/** GET /api/quests?tier=PLAY */
export function listQuests(accessToken: string, tier?: AgeTier) {
  const qs = tier ? `?tier=${tier}` : '';
  return apiFetch<QuestSummary[]>(`/api/quests${qs}`, { accessToken });
}

/** GET /api/quests/{questId} */
export function getQuest(accessToken: string, questId: number) {
  return apiFetch<QuestDetail>(`/api/quests/${questId}`, { accessToken });
}

/**
 * GET /api/quests/{questId}/stages/{stageId}/lesson
 *
 * Lesson content is fetched THROUGH its stage so the backend can authorise
 * access (stage must belong to the quest and be unlocked). This replaced the
 * old /api/lessons/{id}, which now 404s.
 */
export function getStageLesson(accessToken: string, questId: number, stageId: number) {
  return apiFetch<Lesson>(`/api/quests/${questId}/stages/${stageId}/lesson`, { accessToken });
}

/** One recorded answer per activity the learner solved — the server re-scores from config. */
export interface StageAnswer {
  activityId: number;
  kind: string;
  answer: Record<string, unknown>;   // e.g. { choiceIndex: 2 } | { value: true } | { completed: true }
}

export interface CompleteStagePayload {
  secondsSpent: number;
  answers: StageAnswer[];
  /** Legacy client-scored fallback — only when there are no authored activities. */
  score?: number;
  maxScore?: number;
}

/** POST /api/quests/{questId}/stages/{stageId}/complete */
export function completeStage(
  accessToken: string,
  questId: number,
  stageId: number,
  payload: CompleteStagePayload,
) {
  return apiFetch<StageCompletionResult>(
    `/api/quests/${questId}/stages/${stageId}/complete`,
    { method: 'POST', accessToken, body: payload },
  );
}
