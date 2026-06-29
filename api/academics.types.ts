// =================================================================
// Academics + Attendance types - mirrors lms_spring DTOs.
// =================================================================

export interface SubjectScore {
  subject: string | null;
  code: string | null;
  score: string | null;
  grade: string | null;
  points: string | null;
  position: string | null;
  average: string | null;
  scoreDiff: string | null;
  remark: string | null;
}

export interface ExamResult {
  examId: number | null;
  examName: string | null;
  grade: string | null;
  mean: string | null;
  points: string | null;
  overallRemark: string | null;
  dev: string | null;
  subjects: SubjectScore[] | null;
}

export interface AcademicReport {
  studentId: number | null;
  studentName: string | null;
  admNo: string | null;
  className: string | null;
  streamName: string | null;
  exams: ExamResult[] | null;
}

// =================================================================
// Attendance
// =================================================================
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED' | string;

export interface AttendanceDay {
  date: string | null;             // ISO yyyy-MM-dd
  status: AttendanceStatus | null;
  firstIn: string | null;          // ISO time HH:mm
  lastOut: string | null;
}

export interface AttendanceSummary {
  from: string | null;
  to: string | null;
  present: number | null;
  late: number | null;
  absent: number | null;
  excused: number | null;
  recordedDays: number | null;
  attendanceRate: number | null;   // 0-100
  days: AttendanceDay[] | null;
}

export interface ChildAttendance {
  studentId: number | null;
  studentName: string | null;
  admNo: string | null;
  className: string | null;
  streamName: string | null;
  summary: AttendanceSummary | null;
}
