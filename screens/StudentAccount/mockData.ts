// Mock data for the entire student app, organized by section.
// Some fields vary by tier - we pick at render time.

export const mockStudentName = 'Amani';
export const mockAvatarEmoji = '🦊';

// HOME / play layout
export const mockPlayHome = {
  level: 7,
  xp: 320,
  xpToNext: 500,
  streak: 5,
  stars: 240,
  todayMission: {
    title: "Today's Quest",
    titleBase: 'Daily Challenge',
    body: 'Finish 1 lesson and play 1 brain game to win 50 ⭐',
    bodyBase: 'Complete 1 lesson + 1 quiz to earn 50 XP',
    progress: 1,
    total: 2,
  },
  continueLesson: {
    title: 'Continue: Counting to 20',
    titleBase: 'Continue: Fractions — Part 2',
    icon: '🔢',
    progress: 0.55,
  },
};

// HOME / play - worlds grid
export const mockWorlds = [
  { id: 'w1', icon: '🗺️', title: 'Quest Map', titleBase: 'Learning Path', sub: 'Your learning adventure', subBase: 'Your study journey', color: 'purple', progress: 60 },
  { id: 'w2', icon: '🌍', title: 'Learning Worlds', titleBase: 'Subjects', sub: 'Numbers · Words · Shapes', subBase: 'All your subjects', color: 'indigo', progress: 42 },
  { id: 'w3', icon: '📺', title: 'Watch & Wow', titleBase: 'Video Lessons', sub: 'Fun video lessons', subBase: 'Recorded classes', color: 'blue', progress: 75 },
  { id: 'w4', icon: '🎪', title: 'Live Magic', titleBase: 'Live Classes', sub: 'Live class with teacher', subBase: 'Join live sessions', color: 'pink', progress: 20 },
  { id: 'w5', icon: '🤖', title: 'Code Lab', titleBase: 'Code Studio', sub: 'Build & play with blocks', subBase: 'Projects & challenges', color: 'green', progress: 35 },
  { id: 'w6', icon: '🧠', title: 'Brain Games', titleBase: 'Quizzes', sub: 'Quizzes & puzzles', subBase: 'Test your knowledge', color: 'orange', progress: 50 },
  { id: 'w7', icon: '📚', title: 'Story Library', titleBase: 'Library', sub: 'Books & notes', subBase: 'Books & notes', color: 'teal', progress: 80 },
  { id: 'w8', icon: '🏆', title: 'Hall of Stars', titleBase: 'Leaderboard', sub: 'See the top learners', subBase: 'Class ranking', color: 'amber', progress: 90 },
];

// HOME / teen (voyager)
export const mockTeenHome = {
  league: 'Sapphire League',
  leagueRank: 4,
  leagueTotal: 30,
  xpWeek: 1240,
  xpToPromotion: 210,
  streak: 5,
  goals: [
    { id: 'g1', title: 'Finish Algebra: Linear Equations', xp: 40, done: true },
    { id: 'g2', title: 'Science quiz: Cells', xp: 30, done: true },
    { id: 'g3', title: 'Submit CBC project draft', xp: 60, done: false },
    { id: 'g4', title: 'Kiswahili: Insha practice', xp: 25, done: false },
    { id: 'g5', title: 'Keep your 5-day streak alive', xp: 20, done: false },
  ],
  continueLesson: 'Continue: Linear Equations — Part 2',
  continueProgress: 0.62,
  leagueBoard: [
    { rank: 2, name: 'Baraka', avatar: '🐼', points: 1510, color: ['#3aa0ff', '#7fc4ff'] },
    { rank: 3, name: 'Neema', avatar: '🐯', points: 1360, color: ['#15c98c', '#74e6b4'] },
    { rank: 4, name: 'You · Amani', avatar: '🦊', points: 1240, color: ['#7c3aed', '#22d3ee'], me: true },
  ],
  dueSoon: [
    { title: 'CBC project draft', due: 'Thu', urgent: true },
    { title: 'Maths assignment', due: 'Mon', urgent: false },
  ],
};

// HOME / senior (scholar)
export const mockSeniorHome = {
  date: '📅 Mon, 26 May',
  examCountdownDays: 18,
  examTitle: 'Mock exams start 13 June',
  examNote: "You're tracking B+ overall — push 2 subjects to hit your A- target.",
  kpis: [
    { ic: '📈', value: 'B+ · 78%', label: 'Term mean · pos 6/42' },
    { ic: '🎯', value: 'A- · 80%', label: 'Target grade' },
    { ic: '✅', value: '5 / 7', label: 'Subjects on track' },
    { ic: '🔥', value: '5', label: 'Day revision streak' },
  ],
  subjects: [
    { name: 'Mathematics', emoji: '∑', color: '#3aa0ff', pct: 79, grade: 'A-' },
    { name: 'Biology', emoji: '🧬', color: '#15c98c', pct: 76, grade: 'B+' },
    { name: 'Chemistry', emoji: '⚗️', color: '#ff5e9c', pct: 72, grade: 'B' },
    { name: 'Physics', emoji: '🔭', color: '#8b5cf6', pct: 77, grade: 'B+' },
    { name: 'Computer Studies', emoji: '💻', color: '#7c5cff', pct: 85, grade: 'A' },
  ],
  revision: ['📄 KCSE past papers', '🧩 Topical questions', '🧪 Mock 1 results', '⏱️ Timed practice'],
  upcomingCATs: [
    { title: 'Physics CAT 2', due: 'Fri', urgent: true },
    { title: 'Biology essay', due: 'Mon', urgent: true },
    { title: 'Maths assignment', due: 'Wed', urgent: false },
  ],
  timetable: [
    { time: '08:00', activity: 'Mathematics · Rm 14' },
    { time: '10:30', activity: 'Chemistry Lab' },
    { time: '13:00', activity: 'Computer Studies' },
  ],
};

// HOME / campus
export const mockCampusHome = {
  date: '📅 Mon, 26 May · Week 7',
  kpis: [
    { ic: '🎓', value: '3.62', label: 'Cumulative GPA' },
    { ic: '📚', value: '48 / 120', label: 'Credits earned' },
    { ic: '🧾', value: '5', label: 'Units this semester' },
    { ic: '📤', value: '2', label: 'Submissions due' },
  ],
  units: [
    { name: 'Data Structures', code: 'CSC 201 · 3 credits', short: 'DS', color: '#3aa0ff', pct: 72, grade: 'B+' },
    { name: 'Database Systems', code: 'CSC 205 · 3 credits', short: 'DB', color: '#7c5cff', pct: 88, grade: 'A' },
    { name: 'Operating Systems', code: 'CSC 210 · 3 credits', short: 'OS', color: '#15c98c', pct: 64, grade: 'B' },
    { name: 'Linear Algebra', code: 'MAT 202 · 3 credits', short: '∑', color: '#ff9d2e', pct: 70, grade: 'B+' },
    { name: 'Technical Comms', code: 'HUM 110 · 2 credits', short: 'CM', color: '#13b8c6', pct: 91, grade: 'A' },
  ],
  announcements: [
    { text: 'CSC 201 lab venue moved to Lab B', due: '2h', urgent: false },
    { text: 'Semester registration closes Friday', due: 'Fri', urgent: true },
  ],
  deadlines: [
    { text: 'OS assignment 3', due: 'Wed', urgent: true },
    { text: 'DB project milestone', due: 'Fri', urgent: true },
    { text: 'Algebra problem set', due: 'Next wk', urgent: false },
  ],
  weekly: [
    { time: 'Mon', activity: 'Data Structures · Lecture' },
    { time: 'Tue', activity: 'Database lab · 2h' },
    { time: 'Thu', activity: 'OS tutorial' },
  ],
  certs: ['📜 Cloud Practitioner', '💼 Internship portal'],
};

// QUEST / Quest map (sprout/explorer)
export const mockQuestNodes = [
  { id: 'q1', x: 18, y: 88, status: 'done', label: 'Count 1–5', labelBase: 'Place value' },
  { id: 'q2', x: 42, y: 80, status: 'done', label: 'Count 6–10', labelBase: 'Fractions' },
  { id: 'q3', x: 64, y: 70, status: 'done', label: 'Big & Small', labelBase: 'Decimals' },
  { id: 'q4', x: 80, y: 56, status: 'cur', label: 'Count to 20', labelBase: 'Ratios' },
  { id: 'q5', x: 58, y: 45, status: 'lock', label: 'Add to 10', labelBase: 'Algebra' },
  { id: 'q6', x: 34, y: 36, status: 'lock', label: 'Shapes', labelBase: 'Geometry' },
  { id: 'q7', x: 56, y: 24, status: 'lock', label: 'Patterns', labelBase: 'Equations' },
  { id: 'q8', x: 76, y: 11, status: 'lock', label: 'Number Champion', labelBase: 'Unit test', boss: true },
];

// CODE
export const mockCodeContinue = {
  title: 'Keep building: "My First Game"',
  titleBase: 'Keep building: "Platformer v2"',
  icon: '🐱',
  progress: 0.4,
};

export const mockCodeTiles = [
  { id: 'c1', icon: '🧩', title: 'Build & Play', titleBase: 'Block Coding', sub: 'Scratch & blocks', color: 'green' },
  { id: 'c2', icon: '🎮', title: 'My Creations', titleBase: 'My Projects', sub: 'Things you built', color: 'purple' },
  { id: 'c3', icon: '🏁', title: 'Code Quests', titleBase: 'Challenges', sub: 'Step-by-step missions', color: 'orange' },
  { id: 'c4', icon: '🤖', title: 'Robot Friends', titleBase: 'Robotics', sub: 'Make the robot move', color: 'blue' },
  { id: 'c5', icon: '🧑‍🚀', title: 'My Team', titleBase: 'My Team', sub: 'Build with your group', color: 'pink' },
  { id: 'c6', icon: '🎖️', title: 'Code Badges', titleBase: 'Achievements', sub: "Trophies you've earned", color: 'amber' },
];

// GAMES
export const mockQuiz = {
  topic: '🔢 Numbers Quiz',
  questionNum: 1,
  total: 5,
  starsEach: 10,
  question: 'How many apples? 🍎🍎🍎',
  questionBase: 'What is 3 × 4?',
  options: [
    { emoji: '2️⃣', label: 'Two', labelBase: '10' },
    { emoji: '3️⃣', label: 'Three', labelBase: '12', correct: true },
    { emoji: '4️⃣', label: 'Four', labelBase: '14' },
    { emoji: '5️⃣', label: 'Five', labelBase: '16' },
  ],
};

export const mockGameTiles = [
  { id: 'g1', icon: '🔢', title: 'Number Fun', titleBase: 'Numeracy', sub: 'Counting & adding', color: 'orange' },
  { id: 'g2', icon: '🔤', title: 'Word Play', titleBase: 'Literacy', sub: 'Letters & sounds', color: 'pink' },
  { id: 'g3', icon: '🔷', title: 'Shape Hunt', titleBase: 'Geometry', sub: 'Find the shapes', color: 'blue' },
  { id: 'g4', icon: '🎨', title: 'Colour Match', titleBase: 'Science', sub: 'Match the colours', color: 'green' },
  { id: 'g5', icon: '🧠', title: 'Memory', titleBase: 'Revision', sub: 'Flip & remember', color: 'purple' },
  { id: 'g6', icon: '🧭', title: 'Practice Arena', titleBase: 'Past Papers', sub: 'Try past quizzes', color: 'teal' },
];

// STARS / leaderboard
export const mockPodium = [
  { rank: 2, name: 'Baraka', avatar: '🐼', stars: 410, color: ['#3aa0ff', '#7fc4ff'] },
  { rank: 1, name: 'Zawadi', avatar: '🦄', stars: 520, color: ['#f4a716', '#ff9d2e'] },
  { rank: 3, name: 'Imani', avatar: '🐢', stars: 360, color: ['#15c98c', '#74e6b4'] },
];

export const mockRanking = [
  { rank: 4, name: 'Neema', avatar: '🐯', stars: 300, color: ['#7c5cff', '#a78bfa'] },
  { rank: 5, name: 'You (Amani) 🌟', avatar: '🦊', stars: 240, color: ['#3aa0ff', '#ff5e9c'], me: true },
  { rank: 6, name: 'Jabari', avatar: '🐧', stars: 210, color: ['#13b8c6', '#6fe6ef'] },
  { rank: 7, name: 'Sifa', avatar: '🐰', stars: 180, color: ['#ff9d2e', '#ffc879'] },
];

// AVATAR / profile
export const mockProfile = {
  name: 'Amani the Fox',
  avatar: '🦊',
  chips: ['🏅 Level 7', '🔥 5-day streak', '⭐ 240 stars', '📚 38 lessons done'],
  badges: [
    { icon: '🌟', label: 'First Lesson', earned: true },
    { icon: '🔥', label: '5-Day Streak', earned: true },
    { icon: '🔢', label: 'Number Hero', earned: true },
    { icon: '🧩', label: 'First Code', earned: true },
    { icon: '🎨', label: 'Colour Master', earned: true },
    { icon: '🏆', label: 'Champion', earned: false },
    { icon: '📚', label: 'Bookworm', earned: false },
    { icon: '🚀', label: 'Level 10', earned: false },
    { icon: '🦸', label: 'Quiz Star', earned: false },
    { icon: '🤖', label: 'Robot Boss', earned: false },
    { icon: '🌈', label: '30-Day Streak', earned: false },
    { icon: '👑', label: 'Top of Class', earned: false },
  ],
};
