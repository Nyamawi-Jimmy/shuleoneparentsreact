// =================================================================
// Diary types - mirrors DiarySessionDTO exactly.
// Source: com.educraft.lmsbacknew.parent.dto.diary.DiarySessionDTO
// =================================================================

export type DiaryStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface DiarySession {
  id: number;
  weekLabel: string;
  weekStart: string;          // ISO yyyy-MM-dd, Monday of the week
  classLabel: string;         // e.g. "Grade 5 • Emerald"
  classNo: number | null;
  streamId: number | null;
  teacherName: string;
  teacherInitials: string;
  notes: string | null;
  status: DiaryStatus;
  planRows: DiaryPlanRow[];
  dailyEntries: DiaryDailyEntry[];
  weeklyEntry: DiaryWeeklyEntry | null;
}

export interface DiaryPlanRow {
  dayIndex: number;
  rowIndex: number;
  subject: string | null;
  book: string | null;
  exercise: string | null;
  page: string | null;
}

export interface DiaryDailyEntry {
  dayIndex: number;
  teacherComment: string | null;
  teacherSign: string | null;
  teacherSignedAt: string | null;     // ISO timestamp
  parentComment: string | null;
  parentSign: string | null;
  parentSignedAt: string | null;
}

export interface DiaryWeeklyEntry {
  teacherComment: string | null;
  teacherSign: string | null;
  teacherSignedAt: string | null;
  parentComment: string | null;
  parentSign: string | null;
  parentSignedAt: string | null;
}
