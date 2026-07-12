import { apiFetch } from '../config/api';
import { ProgressReport } from './learner-progress.types';

// =================================================================
// Guardian (parent) view of a child's learning.
//   GET /api/guardian/children/{studentId}/report   → ProgressReportDto
//   GET /api/guardian/children/{studentId}/insights → { state, content }
// =================================================================

/** A parent's read-only report of one child's learning. */
export function getChildLearningReport(accessToken: string, studentId: number) {
  return apiFetch<ProgressReport>(
    `/api/guardian/children/${studentId}/report`,
    { accessToken },
  );
}

export interface ChildInsights {
  /** e.g. 'READY' | 'NOT_ACTIVE' | 'LOCKED' */
  state?: string | null;
  /** Human-readable insight text (may be markdown). */
  content?: string | null;
  [key: string]: any;
}

/** AI insights (Premium). Fails soft — callers should not block on it. */
export function getChildInsights(accessToken: string, studentId: number) {
  return apiFetch<ChildInsights>(
    `/api/guardian/children/${studentId}/insights`,
    { accessToken },
  );
}
