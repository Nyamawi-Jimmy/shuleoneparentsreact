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
