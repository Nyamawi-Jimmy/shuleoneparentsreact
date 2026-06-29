// =================================================================
// Mock data for the 6 new student learning sections.
// All data is tier-aware where it makes sense (different content
// per age group sprout / explorer / voyager / scholar / campus).
//
// Backed by JSON-shaped objects so it can be swapped for real
// API responses later without touching screens.
// =================================================================

import { Tier } from './TierContext';

// =================================================================
// VIDEO LESSONS - Watch & Wow
// =================================================================
export interface VideoLesson {
  id: string;
  title: string;
  subject: string;
  duration: string;     // e.g. "5:32"
  thumbnail: string;    // emoji used as placeholder
  thumbColor: [string, string];
  teacher: string;
  watched: boolean;
  progress: number;     // 0..1
  isNew?: boolean;
  tier: Tier[];
}

export const mockVideos: VideoLesson[] = [
  { id: 'v1', title: 'Counting to 10 with Animals', subject: 'Numbers', duration: '3:45', thumbnail: '🦁', thumbColor: ['#ff9d2e', '#ff5e9c'], teacher: 'Teacher Maria', watched: true, progress: 1, tier: ['sprout'] },
  { id: 'v2', title: 'Letters of the Alphabet', subject: 'Words', duration: '4:20', thumbnail: '🔤', thumbColor: ['#3aa0ff', '#7c5cff'], teacher: 'Teacher James', watched: false, progress: 0.4, tier: ['sprout'] },
  { id: 'v3', title: 'Shapes Around Us', subject: 'Shapes', duration: '3:10', thumbnail: '🔷', thumbColor: ['#15c98c', '#13b8c6'], teacher: 'Teacher Maria', watched: false, progress: 0, isNew: true, tier: ['sprout', 'explorer'] },

  { id: 'v4', title: 'Fractions Explained', subject: 'Mathematics', duration: '8:15', thumbnail: '🍕', thumbColor: ['#7c5cff', '#a78bfa'], teacher: 'Mr. Otieno', watched: true, progress: 1, tier: ['explorer'] },
  { id: 'v5', title: 'The Water Cycle', subject: 'Science', duration: '6:30', thumbnail: '💧', thumbColor: ['#3aa0ff', '#7fc4ff'], teacher: 'Mrs. Akinyi', watched: false, progress: 0.6, tier: ['explorer', 'voyager'] },
  { id: 'v6', title: 'Verbs in Kiswahili', subject: 'Kiswahili', duration: '5:45', thumbnail: '🗣️', thumbColor: ['#ff5e9c', '#ffa3c6'], teacher: 'Mwalimu Hassan', watched: false, progress: 0, isNew: true, tier: ['explorer', 'voyager'] },

  { id: 'v7', title: 'Linear Equations', subject: 'Mathematics', duration: '12:20', thumbnail: '📐', thumbColor: ['#7c3aed', '#22d3ee'], teacher: 'Mr. Mwangi', watched: false, progress: 0.3, tier: ['voyager'] },
  { id: 'v8', title: 'Cells & Microorganisms', subject: 'Biology', duration: '15:40', thumbnail: '🧬', thumbColor: ['#15c98c', '#74e6b4'], teacher: 'Mrs. Chebet', watched: true, progress: 1, tier: ['voyager', 'scholar'] },

  { id: 'v9', title: 'Quadratic Equations', subject: 'Mathematics', duration: '18:30', thumbnail: '∑', thumbColor: ['#4f46e5', '#7c3aed'], teacher: 'Mr. Kamau', watched: false, progress: 0.5, tier: ['scholar'] },
  { id: 'v10', title: 'Organic Chemistry Intro', subject: 'Chemistry', duration: '22:15', thumbnail: '⚗️', thumbColor: ['#ff5e9c', '#7c3aed'], teacher: 'Dr. Wanjiru', watched: false, progress: 0, isNew: true, tier: ['scholar'] },

  { id: 'v11', title: 'Binary Search Trees', subject: 'CSC 201', duration: '48:00', thumbnail: '🌳', thumbColor: ['#0f766e', '#475569'], teacher: 'Prof. Mwangi', watched: false, progress: 0.2, tier: ['campus'] },
  { id: 'v12', title: 'SQL Joins Deep Dive', subject: 'CSC 205', duration: '35:20', thumbnail: '💾', thumbColor: ['#0f766e', '#3aa0ff'], teacher: 'Dr. Otieno', watched: true, progress: 1, tier: ['campus'] },
];

// =================================================================
// LIVE CLASSES - Live Magic
// =================================================================
export interface LiveClass {
  id: string;
  title: string;
  subject: string;
  teacher: string;
  status: 'live' | 'upcoming' | 'ended';
  startTime: string;   // human readable, e.g. "Today, 10:00 AM"
  duration: string;    // "45 min"
  attendees: number;
  capacity: number;
  thumb: string;       // emoji
  color: [string, string];
  tier: Tier[];
}

export const mockLiveClasses: LiveClass[] = [
  { id: 'l1', title: 'Storytelling Hour', subject: 'English', teacher: 'Teacher Maria', status: 'live', startTime: 'Now', duration: '30 min', attendees: 22, capacity: 30, thumb: '📚', color: ['#ff9d2e', '#ff5e9c'], tier: ['sprout'] },
  { id: 'l2', title: 'Sing & Count', subject: 'Numbers', teacher: 'Teacher James', status: 'upcoming', startTime: 'Today, 2:00 PM', duration: '25 min', attendees: 0, capacity: 30, thumb: '🎵', color: ['#7c5cff', '#a78bfa'], tier: ['sprout'] },

  { id: 'l3', title: 'Solar System Tour', subject: 'Science', teacher: 'Mr. Otieno', status: 'live', startTime: 'Now', duration: '45 min', attendees: 28, capacity: 35, thumb: '🪐', color: ['#3aa0ff', '#7c5cff'], tier: ['explorer'] },
  { id: 'l4', title: 'Creative Writing Workshop', subject: 'English', teacher: 'Mrs. Akinyi', status: 'upcoming', startTime: 'Today, 4:00 PM', duration: '50 min', attendees: 5, capacity: 25, thumb: '✍️', color: ['#15c98c', '#13b8c6'], tier: ['explorer', 'voyager'] },
  { id: 'l5', title: 'Math Olympiad Prep', subject: 'Mathematics', teacher: 'Mr. Mwangi', status: 'upcoming', startTime: 'Tomorrow, 10:00 AM', duration: '60 min', attendees: 12, capacity: 30, thumb: '🏆', color: ['#f4a716', '#ff9d2e'], tier: ['explorer', 'voyager'] },

  { id: 'l6', title: 'Algebra Mastery', subject: 'Mathematics', teacher: 'Mr. Mwangi', status: 'upcoming', startTime: 'Today, 3:00 PM', duration: '60 min', attendees: 14, capacity: 30, thumb: '📐', color: ['#7c3aed', '#22d3ee'], tier: ['voyager'] },
  { id: 'l7', title: 'Insha Writing Tips', subject: 'Kiswahili', teacher: 'Mwalimu Hassan', status: 'ended', startTime: 'Yesterday, 4:00 PM', duration: '45 min', attendees: 18, capacity: 25, thumb: '🗣️', color: ['#ff5e9c', '#a78bfa'], tier: ['voyager'] },

  { id: 'l8', title: 'KCSE Maths Revision', subject: 'Mathematics', teacher: 'Mr. Kamau', status: 'upcoming', startTime: 'Today, 5:00 PM', duration: '90 min', attendees: 22, capacity: 40, thumb: '∑', color: ['#4f46e5', '#0ea5a8'], tier: ['scholar'] },
  { id: 'l9', title: 'Mock Exam Strategy', subject: 'All Subjects', teacher: 'Dr. Wanjiru', status: 'upcoming', startTime: 'Sat, 9:00 AM', duration: '120 min', attendees: 35, capacity: 50, thumb: '📋', color: ['#7c3aed', '#0ea5a8'], tier: ['scholar'] },

  { id: 'l10', title: 'DS Tutorial: BSTs', subject: 'CSC 201', teacher: 'Prof. Mwangi', status: 'upcoming', startTime: 'Wed, 11:00 AM', duration: '120 min', attendees: 18, capacity: 40, thumb: '🌳', color: ['#0f766e', '#475569'], tier: ['campus'] },
];

// =================================================================
// LIBRARY - Story Library / Notes / Books
// =================================================================
export interface LibraryResource {
  id: string;
  title: string;
  type: 'book' | 'notes' | 'audio' | 'pdf' | 'worksheet';
  subject: string;
  size: string;         // "1.2 MB"
  pages?: number;
  duration?: string;
  thumb: string;        // emoji
  color: [string, string];
  downloaded: boolean;
  isNew?: boolean;
  tier: Tier[];
}

export const mockLibrary: LibraryResource[] = [
  { id: 'b1', title: 'Anansi & the Talking Drum', type: 'book', subject: 'Stories', size: '2.3 MB', pages: 24, thumb: '🕷️', color: ['#ff9d2e', '#ff5e9c'], downloaded: true, tier: ['sprout', 'explorer'] },
  { id: 'b2', title: 'The Lion & the Mouse', type: 'audio', subject: 'Stories', size: '4.1 MB', duration: '8:30', thumb: '🦁', color: ['#f4a716', '#ff9d2e'], downloaded: false, isNew: true, tier: ['sprout'] },
  { id: 'b3', title: 'My First ABC Book', type: 'book', subject: 'Reading', size: '3.8 MB', pages: 32, thumb: '🔤', color: ['#3aa0ff', '#7c5cff'], downloaded: true, tier: ['sprout'] },

  { id: 'b4', title: 'CBC Class 5 Maths Notes', type: 'pdf', subject: 'Mathematics', size: '1.6 MB', pages: 18, thumb: '📐', color: ['#7c5cff', '#a78bfa'], downloaded: false, tier: ['explorer'] },
  { id: 'b5', title: 'Sayansi Notes (Kiswahili)', type: 'notes', subject: 'Science', size: '950 KB', pages: 12, thumb: '🧪', color: ['#15c98c', '#13b8c6'], downloaded: true, tier: ['explorer', 'voyager'] },
  { id: 'b6', title: 'Map Reading Worksheet', type: 'worksheet', subject: 'Social Studies', size: '720 KB', pages: 4, thumb: '🗺️', color: ['#ff5e9c', '#a78bfa'], downloaded: false, tier: ['explorer'] },

  { id: 'b7', title: 'Algebra Practice Booklet', type: 'pdf', subject: 'Mathematics', size: '2.4 MB', pages: 40, thumb: '∑', color: ['#7c3aed', '#22d3ee'], downloaded: false, tier: ['voyager', 'scholar'] },
  { id: 'b8', title: 'CBC Grade 8 Insha Notes', type: 'notes', subject: 'Kiswahili', size: '1.1 MB', pages: 20, thumb: '✍️', color: ['#ff5e9c', '#ffa3c6'], downloaded: true, isNew: true, tier: ['voyager'] },

  { id: 'b9', title: 'KCSE 2023 Maths Paper 1', type: 'pdf', subject: 'Mathematics', size: '850 KB', pages: 8, thumb: '📋', color: ['#4f46e5', '#0ea5a8'], downloaded: true, tier: ['scholar'] },
  { id: 'b10', title: 'Past Paper Bank — Chemistry', type: 'pdf', subject: 'Chemistry', size: '3.2 MB', pages: 64, thumb: '⚗️', color: ['#ff5e9c', '#7c3aed'], downloaded: false, isNew: true, tier: ['scholar'] },
  { id: 'b11', title: 'Physics Formula Sheet', type: 'notes', subject: 'Physics', size: '480 KB', pages: 6, thumb: '🔭', color: ['#8b5cf6', '#3aa0ff'], downloaded: true, tier: ['scholar'] },

  { id: 'b12', title: 'CLRS Ch. 12 Notes', type: 'notes', subject: 'CSC 201', size: '1.4 MB', pages: 22, thumb: '📚', color: ['#0f766e', '#475569'], downloaded: false, tier: ['campus'] },
  { id: 'b13', title: 'Database Systems Slides', type: 'pdf', subject: 'CSC 205', size: '5.8 MB', pages: 124, thumb: '💾', color: ['#0f766e', '#3aa0ff'], downloaded: true, tier: ['campus'] },
];

// =================================================================
// TESTS & MOCK EXAMS
// =================================================================
export interface MockTest {
  id: string;
  title: string;
  subject: string;
  type: 'weekly' | 'topic' | 'mock' | 'cat';
  duration: string;
  questions: number;
  attempts: number;
  bestScore?: number;
  status: 'available' | 'in-progress' | 'completed' | 'locked';
  unlockDate?: string;
  tier: Tier[];
}

export const mockTests: MockTest[] = [
  { id: 't1', title: 'Number Fun Test', subject: 'Numbers', type: 'weekly', duration: '15 min', questions: 10, attempts: 2, bestScore: 90, status: 'completed', tier: ['sprout'] },
  { id: 't2', title: 'Letter Recognition', subject: 'Words', type: 'topic', duration: '10 min', questions: 8, attempts: 1, bestScore: 75, status: 'available', tier: ['sprout'] },

  { id: 't3', title: 'Fractions Quick Test', subject: 'Mathematics', type: 'topic', duration: '20 min', questions: 15, attempts: 1, bestScore: 80, status: 'completed', tier: ['explorer'] },
  { id: 't4', title: 'Weekly Maths Challenge', subject: 'Mathematics', type: 'weekly', duration: '30 min', questions: 20, attempts: 0, status: 'available', tier: ['explorer', 'voyager'] },
  { id: 't5', title: 'End-of-Topic: Water Cycle', subject: 'Science', type: 'topic', duration: '15 min', questions: 12, attempts: 0, status: 'available', tier: ['explorer'] },

  { id: 't6', title: 'CBC Term 2 CAT', subject: 'Mathematics', type: 'cat', duration: '40 min', questions: 25, attempts: 0, status: 'available', tier: ['voyager'] },
  { id: 't7', title: 'Algebra Mastery Test', subject: 'Mathematics', type: 'topic', duration: '25 min', questions: 18, attempts: 1, bestScore: 72, status: 'completed', tier: ['voyager'] },
  { id: 't8', title: 'Mid-Term Mock Exam', subject: 'All Subjects', type: 'mock', duration: '120 min', questions: 60, attempts: 0, status: 'locked', unlockDate: '15 June', tier: ['voyager'] },

  { id: 't9', title: 'KCSE Mock — Paper 1', subject: 'Mathematics', type: 'mock', duration: '150 min', questions: 30, attempts: 0, status: 'available', tier: ['scholar'] },
  { id: 't10', title: 'Chemistry CAT 2', subject: 'Chemistry', type: 'cat', duration: '60 min', questions: 35, attempts: 0, status: 'available', tier: ['scholar'] },
  { id: 't11', title: 'KCSE Mock — Paper 2', subject: 'Mathematics', type: 'mock', duration: '150 min', questions: 30, attempts: 0, status: 'locked', unlockDate: '20 June', tier: ['scholar'] },
  { id: 't12', title: 'Past Paper: Biology 2022', subject: 'Biology', type: 'mock', duration: '120 min', questions: 28, attempts: 1, bestScore: 68, status: 'completed', tier: ['scholar'] },

  { id: 't13', title: 'DS Mid-Sem Exam', subject: 'CSC 201', type: 'mock', duration: '120 min', questions: 40, attempts: 0, status: 'available', tier: ['campus'] },
];

// =================================================================
// ASSIGNMENTS & HOMEWORK
// =================================================================
export interface Assignment {
  id: string;
  title: string;
  subject: string;
  assignedBy: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  submissionType: 'text' | 'photo' | 'document' | 'project';
  score?: number;
  maxScore: number;
  feedback?: string;
  tier: Tier[];
}

export const mockAssignments: Assignment[] = [
  { id: 'a1', title: 'Draw Your Favorite Animal', subject: 'Art', assignedBy: 'Teacher Maria', dueDate: 'Tomorrow', status: 'pending', priority: 'medium', submissionType: 'photo', maxScore: 10, tier: ['sprout'] },
  { id: 'a2', title: 'Count Objects at Home', subject: 'Numbers', assignedBy: 'Teacher James', dueDate: 'Today', status: 'submitted', priority: 'high', submissionType: 'photo', maxScore: 10, tier: ['sprout'] },

  { id: 'a3', title: 'Fractions Worksheet', subject: 'Mathematics', assignedBy: 'Mr. Otieno', dueDate: 'Friday', status: 'pending', priority: 'high', submissionType: 'document', maxScore: 20, tier: ['explorer'] },
  { id: 'a4', title: 'Science Project: Plants', subject: 'Science', assignedBy: 'Mrs. Akinyi', dueDate: 'Next Monday', status: 'pending', priority: 'medium', submissionType: 'project', maxScore: 30, tier: ['explorer'] },
  { id: 'a5', title: 'Story Writing — My Family', subject: 'English', assignedBy: 'Teacher Sarah', dueDate: 'Yesterday', status: 'graded', priority: 'medium', submissionType: 'text', score: 16, maxScore: 20, feedback: 'Great descriptive writing! Watch your punctuation in paragraph 2.', tier: ['explorer'] },

  { id: 'a6', title: 'CBC Project Draft', subject: 'Social Studies', assignedBy: 'Mr. Mwangi', dueDate: 'Thursday', status: 'pending', priority: 'high', submissionType: 'project', maxScore: 40, tier: ['voyager'] },
  { id: 'a7', title: 'Linear Equations Practice', subject: 'Mathematics', assignedBy: 'Mr. Mwangi', dueDate: 'Tomorrow', status: 'pending', priority: 'high', submissionType: 'document', maxScore: 25, tier: ['voyager'] },
  { id: 'a8', title: 'Insha — Mazingira Yetu', subject: 'Kiswahili', assignedBy: 'Mwalimu Hassan', dueDate: 'Friday', status: 'pending', priority: 'medium', submissionType: 'text', maxScore: 20, tier: ['voyager'] },
  { id: 'a9', title: 'Biology Lab Report', subject: 'Biology', assignedBy: 'Mrs. Chebet', dueDate: 'Last Friday', status: 'overdue', priority: 'high', submissionType: 'document', maxScore: 30, tier: ['voyager'] },

  { id: 'a10', title: 'Physics CAT 2 Prep', subject: 'Physics', assignedBy: 'Mr. Kamau', dueDate: 'Friday', status: 'pending', priority: 'high', submissionType: 'document', maxScore: 30, tier: ['scholar'] },
  { id: 'a11', title: 'Chemistry Essay', subject: 'Chemistry', assignedBy: 'Dr. Wanjiru', dueDate: 'Monday', status: 'pending', priority: 'high', submissionType: 'text', maxScore: 25, tier: ['scholar'] },
  { id: 'a12', title: 'Past Paper — Maths 2021', subject: 'Mathematics', assignedBy: 'Mr. Kamau', dueDate: 'Yesterday', status: 'graded', priority: 'medium', submissionType: 'document', score: 22, maxScore: 30, feedback: 'Strong on calculus. Revise vectors before next CAT.', tier: ['scholar'] },

  { id: 'a13', title: 'OS Assignment 3', subject: 'CSC 210', assignedBy: 'Prof. Ochieng', dueDate: 'Wednesday', status: 'pending', priority: 'high', submissionType: 'document', maxScore: 50, tier: ['campus'] },
  { id: 'a14', title: 'DB Project Milestone', subject: 'CSC 205', assignedBy: 'Dr. Otieno', dueDate: 'Friday', status: 'pending', priority: 'high', submissionType: 'project', maxScore: 100, tier: ['campus'] },
];

// =================================================================
// PORTFOLIO - Completed work, certificates, best scores
// =================================================================
export interface PortfolioItem {
  id: string;
  title: string;
  type: 'lesson' | 'certificate' | 'project' | 'best-score';
  subject: string;
  completedDate: string;
  score?: number;
  thumb: string;
  color: [string, string];
  tier: Tier[];
}

export const mockPortfolio: PortfolioItem[] = [
  { id: 'p1', title: 'Counting to 10', type: 'lesson', subject: 'Numbers', completedDate: '2 days ago', score: 100, thumb: '🔢', color: ['#ff9d2e', '#ff5e9c'], tier: ['sprout'] },
  { id: 'p2', title: 'Number Hero Badge', type: 'certificate', subject: 'Numbers', completedDate: '5 days ago', thumb: '🏅', color: ['#f4a716', '#ff9d2e'], tier: ['sprout'] },
  { id: 'p3', title: 'My Color Drawing', type: 'project', subject: 'Art', completedDate: '1 week ago', thumb: '🎨', color: ['#7c5cff', '#ff5e9c'], tier: ['sprout'] },

  { id: 'p4', title: 'Fractions Mastered', type: 'lesson', subject: 'Mathematics', completedDate: 'Yesterday', score: 92, thumb: '🍕', color: ['#7c5cff', '#a78bfa'], tier: ['explorer'] },
  { id: 'p5', title: 'Junior Scientist Cert', type: 'certificate', subject: 'Science', completedDate: '3 days ago', thumb: '🔬', color: ['#15c98c', '#13b8c6'], tier: ['explorer'] },
  { id: 'p6', title: 'Plant Growth Project', type: 'project', subject: 'Science', completedDate: '2 weeks ago', thumb: '🌱', color: ['#15c98c', '#74e6b4'], tier: ['explorer'] },

  { id: 'p7', title: 'Algebra Basics', type: 'lesson', subject: 'Mathematics', completedDate: '4 days ago', score: 88, thumb: '📐', color: ['#7c3aed', '#22d3ee'], tier: ['voyager'] },
  { id: 'p8', title: 'CBC Project: Recycling', type: 'project', subject: 'Social Studies', completedDate: '1 week ago', thumb: '♻️', color: ['#15c98c', '#13b8c6'], tier: ['voyager'] },
  { id: 'p9', title: 'Top Quiz Score', type: 'best-score', subject: 'Mathematics', completedDate: '2 weeks ago', score: 98, thumb: '🏆', color: ['#f4a716', '#ff9d2e'], tier: ['voyager'] },

  { id: 'p10', title: 'KCSE Mock Best', type: 'best-score', subject: 'Mathematics', completedDate: 'Last week', score: 85, thumb: '🏆', color: ['#4f46e5', '#0ea5a8'], tier: ['scholar'] },
  { id: 'p11', title: 'Past Paper Champion', type: 'certificate', subject: 'Physics', completedDate: '2 weeks ago', thumb: '🎖️', color: ['#8b5cf6', '#3aa0ff'], tier: ['scholar'] },
  { id: 'p12', title: 'Quadratics Mastered', type: 'lesson', subject: 'Mathematics', completedDate: '3 days ago', score: 94, thumb: '∑', color: ['#7c3aed', '#0ea5a8'], tier: ['scholar'] },

  { id: 'p13', title: 'DS Lab 4 Complete', type: 'project', subject: 'CSC 201', completedDate: '1 week ago', score: 92, thumb: '🌳', color: ['#0f766e', '#475569'], tier: ['campus'] },
  { id: 'p14', title: 'Cloud Practitioner', type: 'certificate', subject: 'Industry', completedDate: 'Last month', thumb: '☁️', color: ['#3aa0ff', '#0f766e'], tier: ['campus'] },
];

// =================================================================
// Helpers — filter any list by current tier
// =================================================================
export function filterByTier<T extends { tier: Tier[] }>(items: T[], tier: Tier): T[] {
  return items.filter((i) => i.tier.includes(tier));
}
