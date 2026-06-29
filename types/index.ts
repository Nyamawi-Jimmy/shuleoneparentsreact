// Shared types - keep aligned with backend OpenAPI DTOs
// As per doc section 4: "No frontend developer should rename or alter shared DTOs"

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  grade: string;       // e.g. "Grade 6"
  className: string;   // e.g. "Class 6B"
  schoolName: string;  // e.g. "Greendale Academy"
  photoUrl?: string;
  feesBalance: number;
  feesBalanceDueDate?: string;
  attendancePercent: number;
  academicAverage: number;
  learningStreakDays: number;
}

export interface SubjectPerformance {
  id: string;
  name: string;
  score: number;       // percentage 0-100
  grade: string;       // "A", "B+", "B-" etc
  icon: 'math' | 'english' | 'science' | 'kiswahili' | 'social' | 'other';
}

export interface TermTrendPoint {
  label: string;       // "Term 1", "Mid Term", "Term 2", "Term 3"
  value: number | null; // null if no data yet
}

export interface TeacherComment {
  id: string;
  teacherName: string;
  teacherInitials: string;
  comment: string;
  date: string;
}

export interface AcademicSummary {
  examAverage: number;
  examTerm: string;     // "Term 2 Midterm Exams"
  subjects: SubjectPerformance[];
  trend: TermTrendPoint[];
  teacherComments: TeacherComment[];
}

export interface FeeReceipt {
  id: string;
  amount: number;
  method: 'M-Pesa' | 'Bank' | 'Cash' | 'Card';
  date: string;
  reference: string;
}

export interface FeeStatement {
  termLabel: string;     // "Term 2, 2025"
  period: string;        // "Jan – Jun 2025"
  totalAmount: number;
}

export interface FinanceSummary {
  outstandingBalance: number;
  dueDate?: string;
  statement: FeeStatement;
  recentReceipts: FeeReceipt[];
}

export interface AttendanceToday {
  status: 'Present' | 'Late' | 'Absent';
  date: string;          // "Friday, 16 May 2025"
}

export interface AttendanceStats {
  presentDays: number;
  lateDays: number;
  absentDays: number;
}

export interface SchoolAnnouncement {
  id: string;
  title: string;
  body: string;
  date: string;
  isNew?: boolean;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
}

export interface TeacherMessage {
  id: string;
  teacherName: string;
  teacherInitials: string;
  message: string;
  date: string;
}

export interface ParentAlert {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  date: string;
}

export interface CommunicationSummary {
  attendanceToday: AttendanceToday;
  attendanceStats: AttendanceStats;
  announcements: SchoolAnnouncement[];
  upcomingEvents: UpcomingEvent[];
  teacherMessages: TeacherMessage[];
  alerts: ParentAlert[];
}

export interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  preferredLanguage: 'en' | 'sw';
  children: Child[];
}
