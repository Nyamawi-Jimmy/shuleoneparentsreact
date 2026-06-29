// Student types — mobile-side DTOs aligned with the LMS API domains
// from the requirements doc (section 15: Learning, Quizzes, Code Lab)

export interface Student {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    grade: string;
    className: string;
    avatarEmoji?: string;
    photoUrl?: string;
    level: number;          // gamified level
    starsTotal: number;
    streakDays: number;
}

export interface DailyMission {
    title: string;
    description: string;
    activitiesRequired: number;
    starsReward: number;
    progress: number;       // 0..activitiesRequired
}

export interface CurrentLesson {
    id: string;
    title: string;
    subject: string;
    lessonNumber: number;
    progressPct: number;    // 0..100
    iconEmoji: string;
    iconBg: string;
}

export interface PracticeQuestion {
    id: string;
    subject: string;
    question: string;
    options: { letter: 'A' | 'B' | 'C' | 'D'; text: string }[];
    correctLetter: 'A' | 'B' | 'C' | 'D';
    explanationShort: string;
}

export interface JourneyLevel {
    level: number;
    title: string;
    unlocked: boolean;
    current?: boolean;
}

export interface Achievement {
    id: string;
    title: string;
    iconEmoji: string;
    color: string;
    earned: boolean;
}

export interface CodeClubItem {
    id: string;
    label: string;
    description: string;
    iconEmoji: string;
    iconBg: string;
    iconColor: string;
}

export interface ProjectChallenge {
    title: string;
    description: string;
    cta: string;
}

export interface StudentHomeData {
    student: Student;
    todaysMission: DailyMission;
    continueLesson: CurrentLesson;
}

export interface StudentProgressData {
    overallPct: number;
    journey: JourneyLevel[];
    streakDays: number;
    starsEarned: number;
    starsPercentile: number;
    achievements: Achievement[];
}

export interface StudentCodeClubData {
    items: CodeClubItem[];
    challenge: ProjectChallenge;
}