// =================================================================
// Student API types — mirrors lms_spring OpenAPI schemas.
// =================================================================

/** /api/student/me → StudentProfileDto */
export interface StudentProfile {
  studentId: number | null;
  admNo: string | null;
  firstName: string | null;
  fullName: string | null;
  className: string | null;
  streamName: string | null;
  grade: number | null;
  tier: string | null;
  dateOfBirth: string | null;
}

/** /api/student/calendar → StudentCalendarItem[] */
export interface StudentCalendarItem {
  kind: string | null;        // e.g. LIVE_CLASS, EVENT, EXAM
  title: string | null;
  description: string | null;
  startsOn: string | null;    // ISO datetime
  endsOn: string | null;
  targetClass: string | null;
  status: string | null;      // LIVE, SCHEDULED, ENDED
}

/** /api/student/fees → FeeSummary (re-use parent FeeSummary shape) */
export interface StudentFeeSummary {
  balance: number | string | null;
  termBilling: number | string | null;
  termPaid: number | string | null;
  paid: number | string | null;
  billed: number | string | null;
  carryForward?: number | string | null;
  year?: number | null;
  term?: number | null;
}

/** /api/student/assignments → StudentAssignment[] (partner-school students only) */
export interface StudentAssignment {
  id: number;
  title: string | null;
  subject: string | null;
  teacher: string | null;
  status: string | null;          // DUE | OVERDUE | SUBMITTED | GRADED
  dueAt: string | null;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
  deepLink: string | null;
  category: string | null;        // Assignment | CAT | Term paper ...
}

/** /api/student/live-classes → StudentLiveClass[] */
export interface StudentLiveClass {
  id: number;
  title: string | null;
  subject?: string | null;
  teacher?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  status?: string | null;         // 'Live' | 'Upcoming' | 'Ended'
  [key: string]: unknown;
}

// ── Assignment player (take an assessment in-app) ────────────────
export interface AssignmentChoice { id: number; label: string; text: string; }
export interface AssignmentQuestion {
  id: number;
  sequenceNumber?: number | null;
  type: string;                       // 'Multiple choices' | written
  questionText: string;
  maxMarks?: number | null;
  mediaUrl?: string | null;
  choices?: AssignmentChoice[] | null;
}
export interface AssignmentAttemptState {
  canAttempt?: boolean | null;
  submitted?: boolean | null;
  submittedAt?: string | null;
  status?: string | null;
  reason?: string | null;             // e.g. CLOSED | NOT_OPEN
  attemptNumber?: number | null;
}
export interface AssignmentExam {
  id?: number;
  title: string | null;
  category?: string | null;
  questionCount?: number | null;
  totalMarks?: number | null;
  durationMinutes?: number | null;
  lockBrowser?: boolean | null;
  allowRetakes?: boolean | null;
  maxTakes?: number | null;
  attempt?: AssignmentAttemptState | null;
  questions?: AssignmentQuestion[] | null;
}
export interface AssignmentSubmitResult {
  score?: number | null;
  maxScore?: number | null;
  pendingMarking?: boolean | null;
}
export interface AssignmentReviewChoice extends AssignmentChoice {
  chosen?: boolean | null;
  isCorrect?: boolean | null;
}
export interface AssignmentReviewItem {
  questionId: number;
  sequenceNumber?: number | null;
  type: string;
  questionText: string;
  maxMarks?: number | null;
  awardedMarks?: number | null;
  correct?: boolean | null;
  yourAnswer?: string | null;
  markingScheme?: string | null;
  choices?: AssignmentReviewChoice[] | null;
}
export interface AssignmentReview {
  released?: boolean | null;
  pendingMarking?: boolean | null;
  score?: number | null;
  maxScore?: number | null;
  attemptNumber?: number | null;
  items?: AssignmentReviewItem[] | null;
}

/** Web's dueItems(): what still needs doing. */
export function dueAssignments(items: StudentAssignment[] | null | undefined): StudentAssignment[] {
  return (items ?? []).filter((a) => a.status === 'DUE' || a.status === 'OVERDUE');
}

/** Web's liveNow(): classes broadcasting right now. */
export function liveNowClasses(items: StudentLiveClass[] | null | undefined): StudentLiveClass[] {
  return (items ?? []).filter((c) => c.status === 'Live');
}

/** Initials helper */
export function initialsFor(profile: StudentProfile | null): string {
  if (!profile?.fullName) return '?';
  return profile.fullName
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '').join('') || '?';
}

// =================================================================
// Portfolio — mirrors PortfolioDtos.Portfolio (GET /api/learner/{id}/portfolio)
// =================================================================
export interface PortfolioProject {
  id?: number | null;
  title: string | null;
  summary: string | null;
  artifactUrl: string | null;
  repoUrl: string | null;
  status: string | null;          // SUBMITTED | GRADED | PUBLISHED ...
  scorePct: number | null;        // null until graded
  band: number | null;            // CBC competency band, if graded
  feedback: string | null;
  [key: string]: unknown;
}
export interface PortfolioSkill {
  subStrandId: number | null;
  name: string | null;
  masteryPct: number;
}
export interface PortfolioStats { projects: number; skillsMastered: number; }
export interface StudentPortfolio {
  stats: PortfolioStats | null;
  projects: PortfolioProject[] | null;
  skills: PortfolioSkill[] | null;
}
