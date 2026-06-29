import { apiFetch } from '../config/api';
import {
  QuestSummary,
  QuestDetail,
  Lesson,
  StageCompletionResult,
  AgeTier,
} from './quest.types';

// =================================================================
// All 4 endpoints from QuestController.
// Most require a Bearer token; pass `accessToken` from useAuth().
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

/** GET /api/lessons/{lessonId} (no auth required per the controller). */
export function getLesson(accessToken: string | null, lessonId: number) {
  return apiFetch<Lesson>(`/api/lessons/${lessonId}`, {
    accessToken: accessToken ?? undefined,
  });
}

/** POST /api/quests/{questId}/stages/{stageId}/complete */
export function completeStage(accessToken: string, questId: number, stageId: number) {
  return apiFetch<StageCompletionResult>(
    `/api/quests/${questId}/stages/${stageId}/complete`,
    { method: 'POST', accessToken },
  );
}
