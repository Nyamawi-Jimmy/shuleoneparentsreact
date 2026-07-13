import { apiFetch } from '../config/api';

// =================================================================
// Student coding curriculum — mirrors the web codingApi:
//   GET /api/curriculum/me/progress  → quest-map rows (status + quiz state)
//   GET /api/curriculum/me/lessons   → lesson catalogue (objective, week)
// =================================================================

export interface CodingProgressRow {
  lessonId: number;
  lessonNumber: number;
  title: string | null;
  available: boolean;
  hasQuiz: boolean;
  quizPassed: boolean;
  lastQuizPercent: number | null;
  status: string | null;          // COMPLETED | IN_PROGRESS | LOCKED
  teacherScore: number | null;
  graded: boolean;
  teacherOpen: boolean;
}

export interface CodingLessonInfo {
  id: number;
  lessonNumber: number;
  week: number | null;
  title: string | null;
  objective: string | null;
  sandboxKind: string | null;     // NONE | SCRATCH | BLOCKLY | ...
}

export function getCodingProgress(accessToken: string) {
  return apiFetch<CodingProgressRow[]>('/api/curriculum/me/progress', { accessToken });
}

export function getCodingLessons(accessToken: string) {
  return apiFetch<CodingLessonInfo[]>('/api/curriculum/me/lessons', { accessToken });
}
