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

/** Initials helper */
export function initialsFor(profile: StudentProfile | null): string {
  if (!profile?.fullName) return '?';
  return profile.fullName
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '').join('') || '?';
}
