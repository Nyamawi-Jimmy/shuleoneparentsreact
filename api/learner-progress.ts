import { apiFetch } from '../config/api';
import { ProgressReport } from './learner-progress.types';

// =================================================================
// /api/learner/progress, /api/learner/progress/{lessonId}/complete
// =================================================================

export async function getLearnerProgress(accessToken: string): Promise<ProgressReport> {
  return apiFetch<ProgressReport>('/api/learner/progress', { accessToken });
}

export async function markLessonComplete(accessToken: string, lessonId: number): Promise<void> {
  await apiFetch(`/api/learner/progress/${lessonId}/complete`, { method: 'POST', accessToken });
}
