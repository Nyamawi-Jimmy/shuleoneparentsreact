import { apiFetch } from '../config/api';

// =================================================================
// Student coding curriculum — mirrors the web codingApi + coding exams:
//   /api/curriculum/me/*            lessons, progress, pairing, quiz
//   /api/learner/{id}/coding-exams  end-of-term coding & robotics exams
// =================================================================

export interface CodingProgressRow {
  lessonId: number;
  lessonNumber: number;
  title: string | null;
  available: boolean;
  hasQuiz: boolean;
  quizPassed: boolean;
  lastQuizPercent: number | null;
  status: string | null;          // COMPLETED | IN_PROGRESS | LOCKED
  teacherScore: number | null;
  graded: boolean;
  teacherOpen: boolean;
}

export interface CodingLessonInfo {
  id: number;
  lessonNumber: number;
  week: number | null;
  title: string | null;
  objective: string | null;
  sandboxKind: string | null;
}

export interface CodingSandbox {
  kind: string | null;            // NONE | TEXT | SCRATCH | PYTHON | WEB | ...
  language: string | null;
  embedUrl: string | null;
  starterCode: string | null;
}

export interface CodingLessonDetail {
  id: number;
  lessonNumber: number;
  grade: number | null;
  week?: number | null;
  title: string | null;
  objective: string | null;
  learningOutcomes: string[] | null;
  sandbox: CodingSandbox | null;
  assignment: { id: number; title: string | null; instructions: string | null; maxScore: number | null } | null;
}

export interface Classmate { id: number; name: string; }

export interface CodingLessonGrade {
  graded: boolean;
  teacherScore: number | null;
  totalMax: number | null;
  indicators?: { indicator: string; score: number | null; maxScore: number | null; remark: string | null }[] | null;
  feedback?: string | null;
}

// ── Quiz (the lesson Challenge) ──────────────────────────────────
export interface CodingQuizOption { id: number; sortOrder: number; content: string; }
export interface CodingQuizQuestion {
  id: number;
  sortOrder: number;
  type: string;                   // MCQ_SINGLE | MCQ_MULTI | TRUE_FALSE | SHORT_ANSWER | NUMERIC | ORDERING | MATCHING
  prompt: string;
  points: number | null;
  mediaUrl: string | null;
  options: CodingQuizOption[] | null;
  matchTargets: string[] | null;
}
export interface CodingQuiz {
  title: string | null;
  passPercent: number;
  maxAttempts: number | null;
  attemptsUsed: number | null;
  questions: CodingQuizQuestion[];
}
export interface QuizAnswerOut {
  questionId: number;
  selectedOptionIds?: number[];
  orderedOptionIds?: number[];
  matches?: { optionId: number; target: string }[];
  text?: string;
}
export interface QuizAttemptResult {
  passed: boolean;
  recorded?: boolean | null;
  nextLessonUnlocked?: boolean | null;
  scorePercent: number;
  scorePoints: number;
  maxPoints: number;
  questions?: { questionId: number; correct: boolean; explanation: string | null }[] | null;
}

// ── Exams ────────────────────────────────────────────────────────
export interface CodingExamRow {
  id: number;
  title: string | null;
  term: number | null;
  totalMarks: number | null;
  durationMinutes: number | null;
  attemptStatus: string | null;   // null | IN_PROGRESS | SUBMITTED | MARKED | RELEASED
  attemptId: number | null;
}
export interface CodingExamQuestion {
  id: number;
  type: string;                   // MCQ | SHORT | LONG | CODE
  prompt: string;
  maxMarks: number | null;
  options: string[] | null;
  language?: string | null;
  starterCode?: string | null;
}
export interface CodingExamTake {
  attemptId: number;
  exam: { id: number; title: string | null; attemptStatus?: string | null; lockTab?: boolean } | null;
  questions: CodingExamQuestion[];
  responses?: Record<number, string> | null;
}
export interface CodingExamReport {
  examTitle: string | null;
  term: number | null;
  examYear: number | null;
  totalScore: number | null;
  maxScore: number | null;
  percent: number | null;
  band: number | null;
  passed: boolean | null;
  topics?: { subStrandId: number; name: string; earned: number; max: number }[] | null;
  questions?: { prompt: string; marksAwarded: number | null; maxMarks: number | null; feedback: string | null; markedBy: string | null }[] | null;
}

// =================================================================
// Calls
// =================================================================
export function getCodingProgress(accessToken: string) {
  return apiFetch<CodingProgressRow[]>('/api/curriculum/me/progress', { accessToken });
}

export function getCodingLessons(accessToken: string) {
  return apiFetch<CodingLessonInfo[]>('/api/curriculum/me/lessons', { accessToken });
}

export function getCodingLesson(accessToken: string, lessonId: number) {
  return apiFetch<CodingLessonDetail>(`/api/curriculum/me/lessons/${lessonId}`, { accessToken });
}

/** Heartbeat: the learner is in this lesson (feeds the tutor's live board). */
export function codingLessonSeen(accessToken: string, lessonId: number) {
  return apiFetch<void>(`/api/curriculum/me/lessons/${lessonId}/seen`, { method: 'POST', accessToken });
}

export function getLessonPartners(accessToken: string, lessonId: number) {
  return apiFetch<Classmate[]>(`/api/curriculum/me/lessons/${lessonId}/pair`, { accessToken });
}

export function setLessonPartners(accessToken: string, lessonId: number, partnerIds: number[]) {
  return apiFetch<void>(`/api/curriculum/me/lessons/${lessonId}/pair`, {
    method: 'POST', accessToken, body: { partnerIds },
  });
}

export function getClassmates(accessToken: string, grade?: number | null) {
  const qs = grade || grade === 0 ? `?grade=${grade}` : '';
  return apiFetch<Classmate[]>(`/api/curriculum/me/classmates${qs}`, { accessToken });
}

export function getLessonGrade(accessToken: string, lessonId: number) {
  return apiFetch<CodingLessonGrade>(`/api/curriculum/me/lessons/${lessonId}/grade`, { accessToken });
}

export function getLessonQuiz(accessToken: string, lessonId: number) {
  return apiFetch<CodingQuiz>(`/api/curriculum/me/lessons/${lessonId}/quiz`, { accessToken });
}

export function submitQuizAttempt(accessToken: string, lessonId: number, answers: QuizAnswerOut[]) {
  return apiFetch<QuizAttemptResult>(`/api/curriculum/me/lessons/${lessonId}/quiz/attempts`, {
    method: 'POST', accessToken, body: { answers },
  });
}

/** AI nudge for a missed quiz question — a hint, never the answer. */
export function getQuestionHint(accessToken: string, questionId: number) {
  return apiFetch<{ hint: string | null }>(`/api/learner/quiz/questions/${questionId}/hint`, { accessToken });
}

// ── Exams ────────────────────────────────────────────────────────
export function listCodingExams(accessToken: string, studentId: number) {
  return apiFetch<CodingExamRow[]>(`/api/learner/${studentId}/coding-exams`, { accessToken });
}

export function startCodingExam(accessToken: string, studentId: number, examId: number) {
  return apiFetch<CodingExamTake>(`/api/learner/${studentId}/coding-exams/${examId}/start`, {
    method: 'POST', accessToken,
  });
}

export function submitCodingExam(
  accessToken: string, studentId: number, attemptId: number,
  answers: { questionId: number; response: string }[],
) {
  return apiFetch<void>(`/api/learner/${studentId}/coding-exams/attempts/${attemptId}/submit`, {
    method: 'POST', accessToken, body: { answers },
  });
}

export function getCodingExamReport(accessToken: string, studentId: number, attemptId: number) {
  return apiFetch<CodingExamReport>(`/api/learner/${studentId}/coding-exams/attempts/${attemptId}/report`, { accessToken });
}
