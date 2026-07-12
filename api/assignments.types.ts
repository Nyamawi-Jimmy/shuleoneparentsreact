// =================================================================
// Parent assignments — mirrors ParentAssignmentDto.
// Source: com.educraft.lmsbacknew.parent.dto.assignment.ParentAssignmentDto
// A child's assignment (eLearning exam with category "Assignment") + the
// child's attempt/grade. Dates are ISO strings; subject/teacher may be null.
// =================================================================

export type ParentAssignmentStatus = 'DUE' | 'OVERDUE' | 'SUBMITTED' | 'GRADED' | string;

export interface ParentAssignment {
  id: number | null;
  title: string | null;
  subject: string | null;
  teacher: string | null;
  status: ParentAssignmentStatus | null;
  dueAt: string | null;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
  deepLink: string | null;
  category: string | null;
}
