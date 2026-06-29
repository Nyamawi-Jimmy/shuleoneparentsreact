// =================================================================
// Lesson content store - drives the interactive LessonPlayer.
// Each lesson has multiple slides: intro, content cards, quiz questions.
// Lesson IDs are stable strings so Quest, Code Lab, "Continue" cards
// all reference the same lesson.
// =================================================================

import { Tier } from './TierContext';

// =================================================================
// Slide types
// =================================================================
export type Slide =
  | { type: 'intro'; emoji: string; title: string; body: string; speak?: string }
  | { type: 'content'; emoji: string; title: string; body: string; speak?: string }
  | { type: 'image'; emoji: string; caption: string; speak?: string }
  | {
      type: 'quiz';
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
      speak?: string;
    };

// =================================================================
// Lesson
// =================================================================
export interface Lesson {
  id: string;
  tier: Tier;
  subject: string;
  title: string;
  emoji: string;
  color: [string, string];
  duration: string;
  rewardXp: number;
  slides: Slide[];
}

// =================================================================
// Lessons - covering quest progression + code-lab content
// At least one per tier; quest levels reference these by ID.
// =================================================================
export const lessonContent: Lesson[] = [
  // ============================================================
  // SPROUT - PP1-G3 (5-8 yrs)
  // ============================================================
  {
    id: 'sprout-counting-1',
    tier: 'sprout',
    subject: 'Numbers',
    title: 'Counting to 5',
    emoji: '🔢',
    color: ['#ff9d2e', '#ff5e9c'],
    duration: '5 min',
    rewardXp: 20,
    slides: [
      { type: 'intro', emoji: '🔢', title: 'Counting to 5', body: "Hi friend! Today we'll count from 1 to 5 using yummy apples.", speak: "Hi friend! Today we'll count from one to five using yummy apples." },
      { type: 'content', emoji: '🍎', title: 'One apple', body: "Here is 1 apple. Say: 'One!'", speak: 'One apple.' },
      { type: 'content', emoji: '🍎🍎', title: 'Two apples', body: "Now we have 2 apples. Say: 'Two!'", speak: 'Two apples.' },
      { type: 'content', emoji: '🍎🍎🍎', title: 'Three apples', body: "Three apples! Wow. Say: 'Three!'", speak: 'Three apples.' },
      { type: 'content', emoji: '🍎🍎🍎🍎', title: 'Four apples', body: "Four apples! You're doing great. Say: 'Four!'", speak: 'Four apples.' },
      { type: 'content', emoji: '🍎🍎🍎🍎🍎', title: 'Five apples', body: "Five apples! High five! ✋", speak: 'Five apples. High five!' },
      { type: 'quiz', question: 'How many apples? 🍎🍎🍎', options: ['1', '2', '3', '4'], correctIndex: 2, explanation: 'There are 3 apples. Count them: one, two, three!', speak: 'How many apples?' },
      { type: 'quiz', question: 'Tap the bigger number', options: ['2', '5', '1', '3'], correctIndex: 1, explanation: '5 is the biggest! It comes after 4.', speak: 'Tap the bigger number.' },
    ],
  },
  {
    id: 'sprout-counting-2',
    tier: 'sprout',
    subject: 'Numbers',
    title: 'Count to 10',
    emoji: '🔟',
    color: ['#7c5cff', '#a78bfa'],
    duration: '6 min',
    rewardXp: 25,
    slides: [
      { type: 'intro', emoji: '🐾', title: 'Count to 10!', body: "Let's count animals from 1 to 10!", speak: "Let's count animals from one to ten!" },
      { type: 'content', emoji: '🐰🐰🐰🐰🐰', title: 'Five rabbits', body: 'Count: 1, 2, 3, 4, 5 — five rabbits!', speak: 'One, two, three, four, five. Five rabbits.' },
      { type: 'content', emoji: '🐰🐰🐰🐰🐰🐰', title: 'Six rabbits!', body: 'A friend joined. Now we have 6!', speak: 'Six rabbits!' },
      { type: 'content', emoji: '🐰🐰🐰🐰🐰🐰🐰🐰🐰🐰', title: 'Ten rabbits!', body: 'WOW! 10 rabbits! That is a lot.', speak: 'Ten rabbits! That is a lot.' },
      { type: 'quiz', question: 'What comes after 7?', options: ['6', '8', '9', '10'], correctIndex: 1, explanation: 'After 7 comes 8. The order is: 6, 7, 8, 9, 10.' },
      { type: 'quiz', question: '5 + 1 = ?', options: ['4', '5', '6', '7'], correctIndex: 2, explanation: '5 plus 1 is 6! Add one more.' },
    ],
  },
  {
    id: 'sprout-letters-1',
    tier: 'sprout',
    subject: 'Words',
    title: 'Letter A is for Apple',
    emoji: '🔤',
    color: ['#3aa0ff', '#7c5cff'],
    duration: '5 min',
    rewardXp: 20,
    slides: [
      { type: 'intro', emoji: '🔤', title: 'Meet Letter A', body: 'A is the first letter of the alphabet!', speak: 'A is the first letter of the alphabet.' },
      { type: 'content', emoji: '🍎', title: 'A is for Apple', body: 'Apple starts with A. Aaaa-pple!', speak: 'Apple starts with A. A. A. Apple.' },
      { type: 'content', emoji: '🐜', title: 'A is for Ant', body: 'Ant starts with A. Aaa-nt!', speak: 'Ant starts with A.' },
      { type: 'content', emoji: '✈️', title: 'A is for Aeroplane', body: 'Aeroplane starts with A too!', speak: 'Aeroplane starts with A.' },
      { type: 'quiz', question: 'Which word starts with A?', options: ['Banana', 'Apple', 'Cat', 'Dog'], correctIndex: 1, explanation: 'Apple starts with A!' },
      { type: 'quiz', question: 'Tap the A picture', options: ['🐶', '🍎', '🐱', '🐮'], correctIndex: 1, explanation: '🍎 Apple starts with A.' },
    ],
  },

  // ============================================================
  // EXPLORER - G4-G6 (9-12 yrs)
  // ============================================================
  {
    id: 'explorer-fractions-1',
    tier: 'explorer',
    subject: 'Mathematics',
    title: 'Introduction to Fractions',
    emoji: '🍕',
    color: ['#7c5cff', '#a78bfa'],
    duration: '10 min',
    rewardXp: 35,
    slides: [
      { type: 'intro', emoji: '🍕', title: 'What are fractions?', body: 'A fraction is part of a whole thing. Like a slice of pizza!', speak: 'A fraction is part of a whole thing. Like a slice of pizza.' },
      { type: 'content', emoji: '🍕', title: 'One half', body: 'If you cut a pizza into 2 equal parts, each part is 1/2 (one half).', speak: 'One half. The pizza is cut into two equal parts.' },
      { type: 'content', emoji: '🍕', title: 'One quarter', body: 'If you cut a pizza into 4 equal parts, each part is 1/4 (one quarter).', speak: 'One quarter. The pizza is cut into four equal parts.' },
      { type: 'content', emoji: '🍕', title: 'Numerator & Denominator', body: 'The top number (1) is the numerator — slices you took. The bottom (4) is the denominator — total slices.', speak: 'The top number is the numerator. The bottom is the denominator.' },
      { type: 'quiz', question: 'You eat 1 slice of a pizza cut into 4. What fraction did you eat?', options: ['1/2', '1/4', '1/3', '2/4'], correctIndex: 1, explanation: '1/4 — one slice out of four equal slices.' },
      { type: 'quiz', question: 'Which is bigger?', options: ['1/4', '1/2', '1/8', '1/10'], correctIndex: 1, explanation: '1/2 is bigger. Fewer slices = bigger slice!' },
      { type: 'quiz', question: '2/4 is the same as...', options: ['1/4', '1/2', '2/8', '3/4'], correctIndex: 1, explanation: '2/4 equals 1/2. Two of four equal parts is half!' },
    ],
  },
  {
    id: 'explorer-water-1',
    tier: 'explorer',
    subject: 'Science',
    title: 'The Water Cycle',
    emoji: '💧',
    color: ['#3aa0ff', '#7fc4ff'],
    duration: '12 min',
    rewardXp: 40,
    slides: [
      { type: 'intro', emoji: '💧', title: 'The Water Cycle', body: 'Water on Earth never disappears — it travels in a cycle. Let\'s learn how!', speak: 'Water on Earth never disappears. It travels in a cycle.' },
      { type: 'content', emoji: '☀️', title: '1. Evaporation', body: 'The sun heats water in oceans, lakes, and rivers. It turns into water vapor and rises into the sky.', speak: 'Evaporation. The sun heats water and it rises as vapor.' },
      { type: 'content', emoji: '☁️', title: '2. Condensation', body: 'High in the sky, water vapor cools down and forms tiny droplets. These droplets make clouds.', speak: 'Condensation. Water vapor cools to form clouds.' },
      { type: 'content', emoji: '🌧️', title: '3. Precipitation', body: 'When clouds get heavy with water, it falls back to Earth as rain, snow, or hail.', speak: 'Precipitation. Water falls as rain or snow.' },
      { type: 'content', emoji: '🌊', title: '4. Collection', body: 'Water collects in oceans, lakes, and rivers. Then the cycle starts again!', speak: 'Collection. Water gathers and the cycle starts again.' },
      { type: 'quiz', question: 'What heats water to start the cycle?', options: ['The Moon', 'The Sun', 'Wind', 'Stars'], correctIndex: 1, explanation: 'The Sun! Its heat causes evaporation.' },
      { type: 'quiz', question: 'Clouds form during which stage?', options: ['Evaporation', 'Condensation', 'Precipitation', 'Collection'], correctIndex: 1, explanation: 'Condensation — water vapor cools and forms cloud droplets.' },
    ],
  },

  // ============================================================
  // VOYAGER - JSS 7-9 (13-15 yrs)
  // ============================================================
  {
    id: 'voyager-algebra-1',
    tier: 'voyager',
    subject: 'Mathematics',
    title: 'Solving Linear Equations',
    emoji: '📐',
    color: ['#7c3aed', '#22d3ee'],
    duration: '15 min',
    rewardXp: 60,
    slides: [
      { type: 'intro', emoji: '📐', title: 'Linear Equations', body: 'An equation is a statement that two things are equal. We use letters (variables) for unknown numbers.', speak: 'An equation says two things are equal.' },
      { type: 'content', emoji: '⚖️', title: 'The Balance Rule', body: 'An equation is like a balance scale. Whatever you do to one side, you must do to the other.', speak: 'Whatever you do to one side, do to the other.' },
      { type: 'content', emoji: '🔢', title: 'Example: x + 5 = 12', body: 'To find x, subtract 5 from both sides:\nx + 5 - 5 = 12 - 5\nx = 7\n\nCheck: 7 + 5 = 12 ✓' },
      { type: 'content', emoji: '✖️', title: 'Multiplication & Division', body: 'For 3x = 15, divide both sides by 3:\n3x ÷ 3 = 15 ÷ 3\nx = 5\n\nCheck: 3 × 5 = 15 ✓' },
      { type: 'quiz', question: 'Solve: x + 8 = 20', options: ['x = 28', 'x = 12', 'x = 10', 'x = 16'], correctIndex: 1, explanation: 'Subtract 8 from both sides: x = 20 - 8 = 12.' },
      { type: 'quiz', question: 'Solve: 4x = 24', options: ['x = 6', 'x = 20', 'x = 28', 'x = 96'], correctIndex: 0, explanation: 'Divide both sides by 4: x = 24 ÷ 4 = 6.' },
      { type: 'quiz', question: 'Solve: x - 3 = 10', options: ['x = 7', 'x = 30', 'x = 13', 'x = -7'], correctIndex: 2, explanation: 'Add 3 to both sides: x = 10 + 3 = 13.' },
    ],
  },

  // ============================================================
  // SCHOLAR - SSS 10-12 (16-18 yrs)
  // ============================================================
  {
    id: 'scholar-quadratics-1',
    tier: 'scholar',
    subject: 'Mathematics',
    title: 'Solving Quadratic Equations',
    emoji: '∑',
    color: ['#4f46e5', '#7c3aed'],
    duration: '20 min',
    rewardXp: 80,
    slides: [
      { type: 'intro', emoji: '∑', title: 'Quadratic Equations', body: 'A quadratic has the form ax² + bx + c = 0. Today we\'ll solve them by factoring.', speak: 'A quadratic has the form a x squared plus b x plus c equals zero.' },
      { type: 'content', emoji: '🧮', title: 'Standard Form', body: 'ax² + bx + c = 0\nwhere a, b, c are constants and a ≠ 0.\nExample: x² + 5x + 6 = 0' },
      { type: 'content', emoji: '🔍', title: 'Factoring Method', body: 'For x² + 5x + 6 = 0, find two numbers that:\n• Multiply to give 6 (the c)\n• Add to give 5 (the b)\n\nAnswer: 2 and 3.' },
      { type: 'content', emoji: '✅', title: 'Setting up factors', body: 'x² + 5x + 6 = (x + 2)(x + 3) = 0\nSo either x + 2 = 0 or x + 3 = 0.\nThis gives x = -2 or x = -3.' },
      { type: 'quiz', question: 'Solve x² - 7x + 12 = 0', options: ['x = 3, 4', 'x = -3, -4', 'x = 2, 6', 'x = -2, -6'], correctIndex: 0, explanation: '(x - 3)(x - 4) = 0, so x = 3 or 4. (3 × 4 = 12, 3 + 4 = 7.)' },
      { type: 'quiz', question: 'Factor x² + 8x + 15', options: ['(x+3)(x+5)', '(x-3)(x-5)', '(x+1)(x+15)', '(x+2)(x+7)'], correctIndex: 0, explanation: '3 × 5 = 15 and 3 + 5 = 8. So (x+3)(x+5).' },
    ],
  },

  // ============================================================
  // CAMPUS - College
  // ============================================================
  {
    id: 'campus-bst-1',
    tier: 'campus',
    subject: 'CSC 201',
    title: 'Binary Search Trees',
    emoji: '🌳',
    color: ['#0f766e', '#475569'],
    duration: '45 min',
    rewardXp: 120,
    slides: [
      { type: 'intro', emoji: '🌳', title: 'Binary Search Trees', body: 'A BST is a node-based binary tree where each node has at most two children, and values follow a strict order.' },
      { type: 'content', emoji: '📏', title: 'BST Property', body: 'For any node N:\n• All values in N\'s left subtree are < N\n• All values in N\'s right subtree are > N\n\nThis order makes lookup fast.' },
      { type: 'content', emoji: '🔍', title: 'Searching', body: 'To find a value, compare it to the root. If less, go left. If greater, go right. Repeat. Average time: O(log n).' },
      { type: 'content', emoji: '➕', title: 'Insertion', body: 'Walk the tree like a search until you hit a null spot. Create new node there. Same O(log n) average.' },
      { type: 'quiz', question: 'What is the average search time in a BST?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], correctIndex: 1, explanation: 'O(log n) on average for a balanced BST.' },
      { type: 'quiz', question: 'For node with value 50, where does 30 go?', options: ['Right subtree', 'Left subtree', 'Replaces root', 'Cannot insert'], correctIndex: 1, explanation: '30 < 50, so it goes in the left subtree.' },
    ],
  },
];

// =================================================================
// Quest level → lesson mapping
// Quest levels reference the lesson by ID. Updating the lesson
// content automatically updates the quest content.
// =================================================================
export interface QuestLevel {
  id: string;
  number: number;
  lessonId: string;          // Maps to a lesson in lessonContent
  title: string;
  emoji: string;
  isBoss?: boolean;
  tier: Tier;
}

export const questLevels: QuestLevel[] = [
  // SPROUT
  { id: 'q-sp-1', number: 1, lessonId: 'sprout-counting-1', title: 'Count to 5', emoji: '🍎', tier: 'sprout' },
  { id: 'q-sp-2', number: 2, lessonId: 'sprout-counting-2', title: 'Count to 10', emoji: '🐰', tier: 'sprout' },
  { id: 'q-sp-3', number: 3, lessonId: 'sprout-letters-1',  title: 'Letter A',    emoji: '🔤', tier: 'sprout' },
  { id: 'q-sp-4', number: 4, lessonId: 'sprout-counting-1', title: 'Big Quiz',    emoji: '👑', isBoss: true, tier: 'sprout' },

  // EXPLORER
  { id: 'q-ex-1', number: 1, lessonId: 'explorer-fractions-1', title: 'Fractions',   emoji: '🍕', tier: 'explorer' },
  { id: 'q-ex-2', number: 2, lessonId: 'explorer-water-1',     title: 'Water Cycle', emoji: '💧', tier: 'explorer' },
  { id: 'q-ex-3', number: 3, lessonId: 'explorer-fractions-1', title: 'Fractions+',  emoji: '➗', tier: 'explorer' },
  { id: 'q-ex-4', number: 4, lessonId: 'explorer-water-1',     title: 'Term Boss',   emoji: '👑', isBoss: true, tier: 'explorer' },

  // VOYAGER
  { id: 'q-vo-1', number: 1, lessonId: 'voyager-algebra-1', title: 'Linear Eqs',     emoji: '📐', tier: 'voyager' },
  { id: 'q-vo-2', number: 2, lessonId: 'voyager-algebra-1', title: 'More Algebra',   emoji: '🔢', tier: 'voyager' },
  { id: 'q-vo-3', number: 3, lessonId: 'voyager-algebra-1', title: 'Mid-Term Boss',  emoji: '👑', isBoss: true, tier: 'voyager' },

  // SCHOLAR
  { id: 'q-sc-1', number: 1, lessonId: 'scholar-quadratics-1', title: 'Quadratics',  emoji: '∑',  tier: 'scholar' },
  { id: 'q-sc-2', number: 2, lessonId: 'scholar-quadratics-1', title: 'Mock Boss',   emoji: '👑', isBoss: true, tier: 'scholar' },

  // CAMPUS
  { id: 'q-ca-1', number: 1, lessonId: 'campus-bst-1', title: 'BST',        emoji: '🌳', tier: 'campus' },
  { id: 'q-ca-2', number: 2, lessonId: 'campus-bst-1', title: 'BST Quiz',   emoji: '👑', isBoss: true, tier: 'campus' },
];

export function getLessonById(id: string): Lesson | undefined {
  return lessonContent.find((l) => l.id === id);
}

export function getQuestLevelsForTier(tier: Tier): QuestLevel[] {
  return questLevels.filter((l) => l.tier === tier);
}
