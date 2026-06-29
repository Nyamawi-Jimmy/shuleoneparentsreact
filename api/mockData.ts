// Mock data for development. Replace with API calls (generated TS client)
// once Developer 1 publishes the OpenAPI contract.
// All values match the design screenshots provided.

import {
  Parent,
  AcademicSummary,
  FinanceSummary,
  CommunicationSummary,
} from '../types';

export const mockParent: Parent = {
  id: 'parent-001',
  firstName: 'Sarah',
  lastName: 'Wanjohi',
  phone: '+254712345678',
  email: 'sarah.w@example.com',
  preferredLanguage: 'en',
  children: [
    {
      id: 'child-001',
      firstName: 'Brian',
      lastName: 'Wanjohi',
      fullName: 'Brian Wanjohi',
      grade: 'Grade 6',
      className: 'Class 6B',
      schoolName: 'Greendale Academy',
      feesBalance: 12450,
      feesBalanceDueDate: '31 May 2025',
      attendancePercent: 92,
      academicAverage: 76,
      learningStreakDays: 7,
    },
    {
      id: 'child-002',
      firstName: 'Amani',
      lastName: 'Wanjohi',
      fullName: 'Amani Wanjohi',
      grade: 'Grade 3',
      className: 'Class 3A',
      schoolName: 'Greendale Academy',
      feesBalance: 8200,
      feesBalanceDueDate: '31 May 2025',
      attendancePercent: 98,
      academicAverage: 84,
      learningStreakDays: 12,
    },
  ],
};

export const mockAcademicSummary: AcademicSummary = {
  examAverage: 76,
  examTerm: 'Term 2 Midterm Exams',
  subjects: [
    { id: 's1', name: 'Mathematics', score: 82, grade: 'B+', icon: 'math' },
    { id: 's2', name: 'English', score: 74, grade: 'B', icon: 'english' },
    { id: 's3', name: 'Science', score: 71, grade: 'B-', icon: 'science' },
    { id: 's4', name: 'Kiswahili', score: 77, grade: 'B+', icon: 'kiswahili' },
  ],
  trend: [
    { label: 'Term 1', value: 68 },
    { label: 'Mid Term', value: 72 },
    { label: 'Term 2', value: 76 },
    { label: 'Term 3', value: null },
  ],
  teacherComments: [
    {
      id: 'tc1',
      teacherName: 'Mr. Thomas Mwangi',
      teacherInitials: 'TM',
      comment:
        'Brian is participating well in class. Focus on problem solving in Mathematics and reading comprehension.',
      date: '12 May 2025',
    },
  ],
};

export const mockFinanceSummary: FinanceSummary = {
  outstandingBalance: 12450,
  dueDate: '31 May 2025',
  statement: {
    termLabel: 'Term 2, 2025',
    period: 'Jan – Jun 2025',
    totalAmount: 45000,
  },
  recentReceipts: [
    {
      id: 'r1',
      amount: 15000,
      method: 'M-Pesa',
      date: '15 Apr 2025',
      reference: 'REC-2025-0415',
    },
    {
      id: 'r2',
      amount: 15000,
      method: 'M-Pesa',
      date: '12 Feb 2025',
      reference: 'REC-2025-0212',
    },
    {
      id: 'r3',
      amount: 15000,
      method: 'Bank',
      date: '10 Jan 2025',
      reference: 'REC-2025-0110',
    },
  ],
};

export const mockCommunicationSummary: CommunicationSummary = {
  attendanceToday: {
    status: 'Present',
    date: 'Friday, 16 May 2025',
  },
  attendanceStats: {
    presentDays: 18,
    lateDays: 2,
    absentDays: 1,
  },
  announcements: [
    {
      id: 'a1',
      title: 'Sports Day – 24 May 2025',
      body: 'Join us for our annual sports day. Parents are welcome!',
      date: '12 May 2025',
      isNew: true,
    },
  ],
  upcomingEvents: [
    {
      id: 'e1',
      title: 'PTA Meeting',
      date: '22 May 2025',
      time: '4:00 PM',
      location: 'School Hall',
    },
  ],
  teacherMessages: [
    {
      id: 'm1',
      teacherName: 'Mr. Thomas Mwangi',
      teacherInitials: 'TM',
      message:
        'Brian has shown great improvement in his recent assignments. Keep it up!',
      date: '13 May 2025',
    },
  ],
  alerts: [
    {
      id: 'al1',
      message: 'Brian was late on 14 May 2025',
      severity: 'warning',
      date: '14 May 2025',
    },
  ],
};
