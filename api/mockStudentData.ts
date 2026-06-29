import {
    StudentHomeData,
    PracticeQuestion,
    StudentProgressData,
    StudentCodeClubData,
} from '../types/student';

export const mockStudentHome: StudentHomeData = {
    student: {
        id: 'student-001',
        firstName: 'Aisha',
        lastName: 'Otieno',
        fullName: 'Aisha Otieno',
        grade: 'Grade 5',
        className: 'Class 5A',
        avatarEmoji: '🦊',
        level: 7,
        starsTotal: 1250,
        streakDays: 12,
    },
    todaysMission: {
        title: "TODAY'S MISSION",
        description: 'Complete 3 activities and earn 50 stars!',
        activitiesRequired: 3,
        starsReward: 50,
        progress: 1,
    },
    continueLesson: {
        id: 'lesson-001',
        title: 'Fractions and Decimals',
        subject: 'Mathematics',
        lessonNumber: 4,
        progressPct: 60,
        iconEmoji: '🔢',
        iconBg: '#EDE9FE',
    },
};

export const mockPracticeQuestion: PracticeQuestion = {
    id: 'q-3',
    subject: 'Mathematics',
    question: 'What is the value of 7 in the number 7,842?',
    options: [
        { letter: 'A', text: '7' },
        { letter: 'B', text: '70' },
        { letter: 'C', text: '700' },
        { letter: 'D', text: '7,000' },
    ],
    correctLetter: 'D',
    explanationShort: '7 is in the thousands place.',
};

export const mockStudentProgress: StudentProgressData = {
    overallPct: 78,
    journey: [
        { level: 5, title: 'Master Explorer', unlocked: false },
        { level: 4, title: 'Skilled Learner', unlocked: false },
        { level: 3, title: 'Confident Builder', unlocked: true, current: true },
        { level: 2, title: 'Curious Starter', unlocked: true },
        { level: 1, title: 'First Steps', unlocked: true },
    ],
    streakDays: 12,
    starsEarned: 1250,
    starsPercentile: 10,
    achievements: [
        { id: 'a1', title: 'First Quiz', iconEmoji: '🛡️', color: '#7C3AED', earned: true },
        { id: 'a2', title: 'Math Whiz', iconEmoji: '⭐', color: '#EF4444', earned: true },
        { id: 'a3', title: 'Streak Star', iconEmoji: '🌟', color: '#F59E0B', earned: true },
        { id: 'a4', title: 'Code Explorer', iconEmoji: '🔷', color: '#3B82F6', earned: true },
    ],
};

export const mockCodeClub: StudentCodeClubData = {
    items: [
        {
            id: 'cc1',
            label: 'Coding Courses',
            description: 'Learn step-by-step',
            iconEmoji: '</>',
            iconBg: '#EDE9FE',
            iconColor: '#7C3AED',
        },
        {
            id: 'cc2',
            label: 'Robotics Lab',
            description: 'Build and program robots',
            iconEmoji: '🤖',
            iconBg: '#F3F4F6',
            iconColor: '#6B7280',
        },
        {
            id: 'cc3',
            label: 'My Projects',
            description: 'Create, save and improve',
            iconEmoji: '📁',
            iconBg: '#FEF3C7',
            iconColor: '#F59E0B',
        },
        {
            id: 'cc4',
            label: 'Certificates',
            description: 'Earn and showcase',
            iconEmoji: '🏅',
            iconBg: '#FFE4ED',
            iconColor: '#E11D48',
        },
    ],
    challenge: {
        title: 'Build a Smart Saver App',
        description:
            'Create an app that helps kids save money and learn smart spending',
        cta: 'Start Challenge',
    },
};