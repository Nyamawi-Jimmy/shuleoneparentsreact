// =================================================================
// School calendar / term events - mirrors lms_spring TermEventDTO.
// Dates are ISO strings (yyyy-MM-dd).
// =================================================================

export interface TermEvent {
  id: number | null;
  title: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Class name this event targets, or null/"All" = school-wide. */
  targetClass: string | null;
  className: string | null;
  description: string | null;
  schoolId: number | null;
}
