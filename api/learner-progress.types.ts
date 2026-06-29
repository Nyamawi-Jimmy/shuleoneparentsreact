// =================================================================
// Learner Progress types — mirrors lms_spring OpenAPI.
// =================================================================

/** /api/learner/progress → ProgressReportDto */
export interface ProgressReport {
  learnerName: string | null;
  grade: number | null;
  stagesCompleted: number | null;
  quizzesTaken: number | null;
  avgScorePct: number | null;
  masteryCount: number | null;
  totalXp: number | null;
  level: number | null;
  currentStreak: number | null;
  longestStreak: number | null;
  minutesInvested: number | null;
  subjects: SubjectProgress[] | null;
  recent: ActivityItem[] | null;
}

export interface SubjectProgress {
  subject: string | null;
  completed: number | null;
  avgScorePct: number | null;
  // Additional fields the backend may include in subjects array
  total?: number | null;
}

export interface ActivityItem {
  title: string | null;
  subject: string | null;
  scorePct: number | null;
  stars: number | null;
  completedAt: string | null;
}

/** Empty default */
export const emptyProgress: ProgressReport = {
  learnerName: null, grade: null,
  stagesCompleted: 0, quizzesTaken: 0, avgScorePct: 0,
  masteryCount: 0, totalXp: 0, level: 1,
  currentStreak: 0, longestStreak: 0, minutesInvested: 0,
  subjects: [], recent: [],
};
