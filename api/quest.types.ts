// =================================================================
// Quest API types - mirrors Spring DTOs exactly (same field names).
// Source: com.educraft.lmsbacknew.quest.dto.*
// =================================================================

// Spring enum: AgeTier
export type AgeTier = 'PLAY' | 'TEEN' | 'SENIOR' | 'CAMPUS';

// Spring enum: ProgressStatus
export type ProgressStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';

// Spring enums - treat as opaque strings until you share the values
export type StageType = string;
export type ActivityKind = string;

// =================================================================
// QuestSummaryDto
// =================================================================
export interface QuestSummary {
  id: number;
  key: string;
  title: string;
  theme: string;
  subject: string;
  ageTier: AgeTier;
  description: string;
  coverImageUrl: string | null;
  accentColor: string | null;
  totalStages: number;
  completedStages: number;
  totalXp: number;
  earnedXp: number;
  status: ProgressStatus;
  grade?: string | null;            // class code (PLAYGROUP/PP1/GRADE1/FORM1…)
  lastActivityAt?: string | null;
}

/** GET /api/quests/catalog — quests tagged by class + the student's own class. */
export interface QuestCatalog {
  myGrade: string | null;
  grades: string[];
  quests: QuestSummary[];
}

// =================================================================
// StageDto - a node on the quest map
// =================================================================
export interface Stage {
  id: number;
  position: number;          // 1-indexed ordering
  title: string;
  type: StageType;
  lessonId: number;
  status: ProgressStatus;
  stars: number;
  xpReward: number;
  mapX: number | null;       // 0-100 coordinate space (matches the SVG viewBox)
  mapY: number | null;
}

// =================================================================
// QuestDetailDto - quest + ordered stages
// =================================================================
export interface QuestDetail {
  quest: QuestSummary;
  stages: Stage[];
}

// =================================================================
// LessonActivityDto - one step inside a lesson
// =================================================================
export interface LessonActivity {
  id: number;
  position: number;
  kind: ActivityKind;        // QUIZ, TAP_SELECT, SORT_BUCKET, ...
  prompt: string;
  options: string[] | null;  // present for QUIZ
  mediaUrl: string | null;
  maxScore: number | null;
  config: Record<string, unknown> | null;
  audioUrl: string | null;
  narration: string | null;
}

// =================================================================
// LessonDto
// =================================================================
export interface Lesson {
  id: number;
  title: string;
  subject: string;
  ageTier: AgeTier;
  intro: string;
  contentHtml: string;
  videoUrl: string | null;
  audioIntroUrl: string | null;
  coverImageUrl: string | null;
  estimatedMinutes: number | null;
  difficulty: string;
  xpValue: number;
  activities: LessonActivity[];
}

// =================================================================
// StageCompletionResultDto
// =================================================================
export interface StageCompletionResult {
  questId: number;
  stageId: number;
  studentId: number;
  awardedXp: number;
  stars: number;
  stageStatus: ProgressStatus;
  unlockedStageId: number | null;
  questStatus: ProgressStatus;
  totalEarnedXp: number;
  /** Present when the server (re-)scored the attempt. */
  score?: number | null;
  maxScore?: number | null;
}
