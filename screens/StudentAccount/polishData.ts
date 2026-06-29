// =================================================================
// Chunk C - mock data for Recommendations, Learn+, Notifications, Settings
// Spec ref: sections 9 (adaptive), 14 (monetization), 17 (notifications)
// =================================================================

import { Tier } from './TierContext';

// =================================================================
// ADAPTIVE RECOMMENDATIONS - "what should I do next"
// Driven by weak topics, recent activity, exam performance signals
// =================================================================
export type RecReason = 'weak-topic' | 'continue' | 'streak' | 'upcoming' | 'new';

export interface Recommendation {
  id: string;
  title: string;
  reason: RecReason;
  reasonText: string;
  subject: string;
  emoji: string;
  color: [string, string];
  route: string;
  xpReward: number;
  estMinutes: number;
  tier: Tier[];
}

export const mockRecommendations: Recommendation[] = [
  // SPROUT
  { id: 'rec1', title: 'Practice counting 1-10', reason: 'weak-topic', reasonText: 'You missed 3 questions on counting last week', subject: 'Numbers', emoji: '🔢', color: ['#ff9d2e', '#ff5e9c'], route: '/student/lesson', xpReward: 15, estMinutes: 5, tier: ['sprout'] },
  { id: 'rec2', title: 'Keep your 5-day streak!', reason: 'streak', reasonText: 'One more lesson today to keep your flame alive 🔥', subject: 'Daily mission', emoji: '🔥', color: ['#f4a716', '#ff5e9c'], route: '/(student-tabs)/quest', xpReward: 20, estMinutes: 8, tier: ['sprout', 'explorer'] },

  // EXPLORER
  { id: 'rec3', title: 'Fractions — Part 2', reason: 'continue', reasonText: 'Resume where you left off (60% complete)', subject: 'Mathematics', emoji: '🍕', color: ['#7c5cff', '#a78bfa'], route: '/student/lesson', xpReward: 25, estMinutes: 12, tier: ['explorer'] },
  { id: 'rec4', title: 'Watch: Water Cycle video', reason: 'new', reasonText: 'New 6-minute explainer for your grade', subject: 'Science', emoji: '💧', color: ['#3aa0ff', '#7fc4ff'], route: '/student/videos', xpReward: 10, estMinutes: 6, tier: ['explorer'] },

  // VOYAGER
  { id: 'rec5', title: 'CBC project draft due Thu', reason: 'upcoming', reasonText: 'Submit your Social Studies project before Thursday', subject: 'Social Studies', emoji: '📋', color: ['#ef4444', '#f59e0b'], route: '/student/assignments', xpReward: 60, estMinutes: 45, tier: ['voyager'] },
  { id: 'rec6', title: 'Algebra: weak in equations', reason: 'weak-topic', reasonText: 'Score dropped to 65% on last quiz — try 5 more questions', subject: 'Mathematics', emoji: '📐', color: ['#7c3aed', '#22d3ee'], route: '/(student-tabs)/games', xpReward: 30, estMinutes: 10, tier: ['voyager'] },
  { id: 'rec7', title: 'Join: Math Olympiad Prep', reason: 'new', reasonText: 'Live class tomorrow at 10 AM — 18 classmates already in', subject: 'Mathematics', emoji: '🏆', color: ['#f4a716', '#ff9d2e'], route: '/student/live-classes', xpReward: 40, estMinutes: 60, tier: ['voyager'] },

  // SCHOLAR
  { id: 'rec8', title: 'Chemistry CAT 2 — Friday', reason: 'upcoming', reasonText: 'Review topical questions before your CAT', subject: 'Chemistry', emoji: '⚗️', color: ['#ff5e9c', '#7c3aed'], route: '/student/tests', xpReward: 80, estMinutes: 40, tier: ['scholar'] },
  { id: 'rec9', title: 'Physics is at B+. Push to A-', reason: 'weak-topic', reasonText: 'Target gap closing — practice 3 topical sets this week', subject: 'Physics', emoji: '🔭', color: ['#8b5cf6', '#3aa0ff'], route: '/student/library', xpReward: 50, estMinutes: 30, tier: ['scholar'] },
  { id: 'rec10', title: 'KCSE 2023 past paper', reason: 'new', reasonText: 'Just uploaded — practice in exam mode', subject: 'Mathematics', emoji: '📋', color: ['#4f46e5', '#0ea5a8'], route: '/student/library', xpReward: 100, estMinutes: 120, tier: ['scholar'] },

  // CAMPUS
  { id: 'rec11', title: 'OS Assignment 3 due Wed', reason: 'upcoming', reasonText: 'Worth 50 marks — start now to stay on track', subject: 'CSC 210', emoji: '📤', color: ['#ef4444', '#f59e0b'], route: '/student/assignments', xpReward: 100, estMinutes: 180, tier: ['campus'] },
  { id: 'rec12', title: 'BST lecture recording', reason: 'continue', reasonText: 'You started watching 20% through it', subject: 'CSC 201', emoji: '🌳', color: ['#0f766e', '#475569'], route: '/student/videos', xpReward: 30, estMinutes: 38, tier: ['campus'] },
];

// =================================================================
// LEARN+ SUBSCRIPTION
// =================================================================
export interface SubscriptionPlan {
  id: string;
  name: string;
  tagline: string;
  monthlyKsh: number;
  yearlyKsh: number;
  features: string[];
  color: [string, string];
  popular?: boolean;
}

export const mockPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Stay connected with school',
    monthlyKsh: 0,
    yearlyKsh: 0,
    features: [
      'Fees, receipts, statements',
      'Exam results & attendance',
      'School notices & diary',
      'Basic learning content',
    ],
    color: ['#94a3b8', '#cbd5e1'],
  },
  {
    id: 'learn-plus',
    name: 'Learn+',
    tagline: 'Smarter revision, weekly progress',
    monthlyKsh: 499,
    yearlyKsh: 4990,
    features: [
      'Everything in Free',
      'Full revision notes & quizzes',
      'Weak-topic practice generator',
      'Weekly parent progress email',
      'Offline downloads',
    ],
    color: ['#7c5cff', '#a78bfa'],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium Learning',
    tagline: 'Mock exams, videos, personal study plan',
    monthlyKsh: 999,
    yearlyKsh: 9990,
    features: [
      'Everything in Learn+',
      'Video lessons & mock exams',
      'Personalized study plan',
      'Past papers (5+ years)',
      'Priority tutor responses',
    ],
    color: ['#ff5e9c', '#7c3aed'],
  },
  {
    id: 'coding-club',
    name: 'Coding & Robotics Club',
    tagline: 'Scratch, Python, robotics, certificates',
    monthlyKsh: 1499,
    yearlyKsh: 14990,
    features: [
      'Full Code Lab access',
      'Scratch, Python, Mobile Dev',
      'Robotics projects + tutor review',
      'Holiday bootcamp invitations',
      'Certificates on completion',
    ],
    color: ['#0f766e', '#0ea5a8'],
  },
];

export const mockSubscriptionStatus = {
  currentPlanId: 'learn-plus',
  status: 'active' as 'active' | 'expiring' | 'expired',
  renewsOn: '15 June 2025',
  billingCycle: 'monthly' as 'monthly' | 'yearly',
  nextBillKsh: 499,
  daysRemaining: 16,
};

// =================================================================
// NOTIFICATION PREFERENCES - per category, per channel
// =================================================================
export type NotificationChannel = 'push' | 'sms' | 'email' | 'whatsapp';

export interface NotificationCategory {
  id: string;
  label: string;
  description: string;
  emoji: string;
  channels: Record<NotificationChannel, boolean>;
  required?: boolean;
}

export const mockNotificationCategories: NotificationCategory[] = [
  { id: 'fees', label: 'Fees & Payments', description: 'Balance reminders, payment confirmations', emoji: '💳', channels: { push: true, sms: true, email: true, whatsapp: false } },
  { id: 'attendance', label: 'Attendance', description: 'Daily check-in, late arrivals, absences', emoji: '🚸', channels: { push: true, sms: true, email: false, whatsapp: true }, required: true },
  { id: 'academics', label: 'Exam Results & Reports', description: 'New results, term reports, comments', emoji: '📊', channels: { push: true, sms: false, email: true, whatsapp: false } },
  { id: 'communication', label: 'School Notices', description: 'Announcements, events, diary entries', emoji: '📣', channels: { push: true, sms: false, email: true, whatsapp: false } },
  { id: 'transport', label: 'Bus & Transport', description: 'Pickup/drop-off, route changes', emoji: '🚌', channels: { push: true, sms: true, email: false, whatsapp: true } },
  { id: 'learning', label: 'Learning Progress', description: 'Streaks, badges, weekly summaries', emoji: '🧠', channels: { push: true, sms: false, email: true, whatsapp: false } },
  { id: 'marketing', label: 'Tips & Offers', description: 'New features, subscription offers', emoji: '✨', channels: { push: false, sms: false, email: true, whatsapp: false } },
];

// =================================================================
// PROFILE / SETTINGS misc
// =================================================================
export const mockSettingsState = {
  language: 'English' as 'English' | 'Kiswahili',
  theme: 'Light' as 'Light' | 'Dark' | 'System',
  textSize: 'Medium' as 'Small' | 'Medium' | 'Large',
  audioSupport: true,         // for sprout/explorer accessibility
  highContrast: false,
  offlineDownloads: 'Wifi-only' as 'Wifi-only' | 'Always' | 'Off',
  parentControls: false,      // student-side flag
};

export const mockDevices = [
  { id: 'd1', name: 'Samsung Galaxy A52', lastActive: 'Now', current: true, icon: '📱' },
  { id: 'd2', name: 'Family iPad', lastActive: '3 days ago', current: false, icon: '📔' },
];
