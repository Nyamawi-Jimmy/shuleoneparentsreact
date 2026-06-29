// =================================================================
// Code Lab mock data - Scratch, Blockly, Python, Mobile Dev, Robotics
// Maps directly to LMS spec section 12 (Code Lab requirements).
// All tier-aware: sprout/explorer get block coding, voyager+ get text.
// =================================================================

import { Tier } from './TierContext';

// =================================================================
// CODING TRACK overview - shown on the Code Lab landing page
// =================================================================
export interface CodingTrack {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: [string, string];
  lessonsTotal: number;
  lessonsDone: number;
  projects: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tier: Tier[];
  route: string;
}

export const mockCodingTracks: CodingTrack[] = [
  {
    id: 'scratch',
    name: 'Scratch',
    description: 'Drag colourful code blocks to make games, stories, and animations.',
    emoji: '🐱',
    color: ['#ff9d2e', '#ff5e9c'],
    lessonsTotal: 12,
    lessonsDone: 5,
    projects: 3,
    difficulty: 'Beginner',
    tier: ['sprout', 'explorer', 'voyager'],
    route: '/student/code/scratch',
  },
  {
    id: 'blockly',
    name: 'Blockly Puzzles',
    description: 'Solve puzzle-style coding challenges with snap-together blocks.',
    emoji: '🧩',
    color: ['#7c5cff', '#a78bfa'],
    lessonsTotal: 20,
    lessonsDone: 8,
    projects: 5,
    difficulty: 'Beginner',
    tier: ['sprout', 'explorer', 'voyager'],
    route: '/student/code/blockly',
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Real text-based programming. Make games, scripts, and AI projects.',
    emoji: '🐍',
    color: ['#3aa0ff', '#7c5cff'],
    lessonsTotal: 24,
    lessonsDone: 6,
    projects: 4,
    difficulty: 'Intermediate',
    tier: ['voyager', 'scholar', 'campus'],
    route: '/student/code/python',
  },
  {
    id: 'mobile',
    name: 'Mobile Dev',
    description: 'Design and build mobile apps with React Native concepts.',
    emoji: '📱',
    color: ['#15c98c', '#13b8c6'],
    lessonsTotal: 16,
    lessonsDone: 2,
    projects: 2,
    difficulty: 'Advanced',
    tier: ['scholar', 'campus'],
    route: '/student/code/mobile',
  },
  {
    id: 'robotics',
    name: 'Robotics',
    description: 'Build, wire, and program robots. Sensors, motors, and missions.',
    emoji: '🤖',
    color: ['#7c3aed', '#0ea5a8'],
    lessonsTotal: 18,
    lessonsDone: 4,
    projects: 6,
    difficulty: 'Intermediate',
    tier: ['explorer', 'voyager', 'scholar', 'campus'],
    route: '/student/code/robotics',
  },
];

// =================================================================
// MY PROJECTS - student's saved Code Lab projects
// =================================================================
export interface CodingProject {
  id: string;
  title: string;
  trackId: string;
  thumb: string;
  color: [string, string];
  lastEdited: string;
  status: 'in-progress' | 'submitted' | 'reviewed';
  feedback?: string;
  score?: number;
  versions: number;
}

export const mockProjects: CodingProject[] = [
  {
    id: 'pr1', title: 'My First Game', trackId: 'scratch',
    thumb: '🎮', color: ['#ff9d2e', '#ff5e9c'],
    lastEdited: '2 days ago', status: 'in-progress', versions: 4,
  },
  {
    id: 'pr2', title: 'Catch the Stars', trackId: 'scratch',
    thumb: '⭐', color: ['#f4a716', '#ff9d2e'],
    lastEdited: '1 week ago', status: 'reviewed', score: 18,
    feedback: 'Great use of variables for the score! Try adding levels next.',
    versions: 6,
  },
  {
    id: 'pr3', title: 'Maze Runner', trackId: 'blockly',
    thumb: '🌀', color: ['#7c5cff', '#a78bfa'],
    lastEdited: 'Yesterday', status: 'submitted', versions: 3,
  },
  {
    id: 'pr4', title: 'Number Guesser', trackId: 'python',
    thumb: '🔢', color: ['#3aa0ff', '#7c5cff'],
    lastEdited: '3 days ago', status: 'in-progress', versions: 2,
  },
  {
    id: 'pr5', title: 'Line Follower Bot', trackId: 'robotics',
    thumb: '🤖', color: ['#7c3aed', '#0ea5a8'],
    lastEdited: '5 days ago', status: 'reviewed', score: 22,
    feedback: 'Robot follows the line well. Improve the turn smoothness.',
    versions: 5,
  },
];

// =================================================================
// SCRATCH lessons and project templates
// =================================================================
export interface ScratchLesson {
  id: string;
  step: number;
  title: string;
  description: string;
  estTime: string;
  emoji: string;
  done: boolean;
  locked: boolean;
}

export const mockScratchLessons: ScratchLesson[] = [
  { id: 's1', step: 1, title: 'Meet the Cat', description: 'Move the Scratch cat with arrow keys.', estTime: '5 min', emoji: '🐱', done: true, locked: false },
  { id: 's2', step: 2, title: 'Make it Talk', description: 'Add speech bubbles and sounds.', estTime: '7 min', emoji: '💬', done: true, locked: false },
  { id: 's3', step: 3, title: 'Drawing with Pen', description: 'Make the cat draw shapes as it walks.', estTime: '10 min', emoji: '✏️', done: true, locked: false },
  { id: 's4', step: 4, title: 'Loops & Repeat', description: 'Repeat actions to make patterns.', estTime: '8 min', emoji: '🔁', done: true, locked: false },
  { id: 's5', step: 5, title: 'Variables: Score', description: 'Keep score in your game.', estTime: '12 min', emoji: '🎯', done: true, locked: false },
  { id: 's6', step: 6, title: 'Make a Game', description: 'Build a clicker game from scratch.', estTime: '20 min', emoji: '🎮', done: false, locked: false },
  { id: 's7', step: 7, title: 'Multiple Sprites', description: 'Add a friend who chases the cat.', estTime: '15 min', emoji: '🐭', done: false, locked: false },
  { id: 's8', step: 8, title: 'Levels & Backgrounds', description: 'Switch scenes when player wins.', estTime: '15 min', emoji: '🌆', done: false, locked: true },
];

export const mockScratchTemplates = [
  { id: 'st1', title: 'Pong Game', emoji: '🏓', color: ['#3aa0ff', '#7c5cff'], description: 'Classic bouncing ball + paddle' },
  { id: 'st2', title: 'Cat Animation', emoji: '🐱', color: ['#ff9d2e', '#ff5e9c'], description: 'Animate the cat dancing' },
  { id: 'st3', title: 'Quiz Maker', emoji: '❓', color: ['#15c98c', '#13b8c6'], description: 'Build your own quiz' },
  { id: 'st4', title: 'Drawing App', emoji: '🎨', color: ['#7c5cff', '#ff5e9c'], description: 'Click and drag to draw' },
];

// =================================================================
// BLOCKLY puzzles
// =================================================================
export interface BlocklyPuzzle {
  id: string;
  number: number;
  title: string;
  description: string;
  difficulty: 1 | 2 | 3;        // stars
  blocks: number;                // number of blocks needed
  status: 'locked' | 'available' | 'completed' | 'best';
  bestBlocks?: number;           // best run for completed
}

export const mockBlocklyPuzzles: BlocklyPuzzle[] = [
  { id: 'b1', number: 1, title: 'Reach the Star', description: 'Move forward 3 spaces.', difficulty: 1, blocks: 3, status: 'best', bestBlocks: 3 },
  { id: 'b2', number: 2, title: 'Turn the Corner', description: 'Use turn-right.', difficulty: 1, blocks: 4, status: 'best', bestBlocks: 4 },
  { id: 'b3', number: 3, title: 'Loop the Walk', description: 'Use repeat to save blocks.', difficulty: 1, blocks: 3, status: 'completed', bestBlocks: 5 },
  { id: 'b4', number: 4, title: 'Conditional Path', description: 'Pick a direction.', difficulty: 2, blocks: 6, status: 'completed', bestBlocks: 7 },
  { id: 'b5', number: 5, title: 'Counting Apples', description: 'Loop with variable.', difficulty: 2, blocks: 7, status: 'completed', bestBlocks: 8 },
  { id: 'b6', number: 6, title: 'The Maze', description: 'Reach the exit.', difficulty: 2, blocks: 8, status: 'completed', bestBlocks: 10 },
  { id: 'b7', number: 7, title: 'Number Pattern', description: 'Output a sequence.', difficulty: 2, blocks: 5, status: 'completed', bestBlocks: 6 },
  { id: 'b8', number: 8, title: 'Two Robots', description: 'Coordinate two characters.', difficulty: 3, blocks: 10, status: 'completed', bestBlocks: 12 },
  { id: 'b9', number: 9, title: 'Function Factory', description: 'Define and call your own block.', difficulty: 3, blocks: 8, status: 'available' },
  { id: 'b10', number: 10, title: 'Fibonacci', description: 'Recursion challenge.', difficulty: 3, blocks: 9, status: 'locked' },
  { id: 'b11', number: 11, title: 'Sorting Race', description: 'Sort 5 numbers.', difficulty: 3, blocks: 12, status: 'locked' },
];

// =================================================================
// PYTHON lessons + sample editor content
// =================================================================
export interface PythonLesson {
  id: string;
  unit: number;
  title: string;
  description: string;
  duration: string;
  topics: string[];
  done: boolean;
  locked: boolean;
}

export const mockPythonLessons: PythonLesson[] = [
  { id: 'py1', unit: 1, title: 'Hello, Python!', description: 'Print, variables and your first program.', duration: '10 min', topics: ['print', 'variables', 'strings'], done: true, locked: false },
  { id: 'py2', unit: 1, title: 'Numbers & Math', description: 'Integers, floats, and arithmetic operators.', duration: '12 min', topics: ['int', 'float', 'operators'], done: true, locked: false },
  { id: 'py3', unit: 1, title: 'Input & Output', description: 'Get input from the user, print formatted output.', duration: '8 min', topics: ['input', 'f-strings'], done: true, locked: false },
  { id: 'py4', unit: 2, title: 'If / Else', description: 'Make decisions with conditional statements.', duration: '15 min', topics: ['if', 'else', 'elif', 'booleans'], done: true, locked: false },
  { id: 'py5', unit: 2, title: 'Loops: For & While', description: 'Repeat actions automatically.', duration: '18 min', topics: ['for', 'while', 'range'], done: true, locked: false },
  { id: 'py6', unit: 2, title: 'Lists', description: 'Store collections of values.', duration: '15 min', topics: ['list', 'append', 'indexing'], done: true, locked: false },
  { id: 'py7', unit: 3, title: 'Functions', description: 'Define and call your own functions.', duration: '20 min', topics: ['def', 'return', 'parameters'], done: false, locked: false },
  { id: 'py8', unit: 3, title: 'Strings Deep Dive', description: 'Slicing, methods, formatting.', duration: '15 min', topics: ['slice', 'methods', 'format'], done: false, locked: false },
  { id: 'py9', unit: 3, title: 'Dictionaries', description: 'Key-value data structures.', duration: '18 min', topics: ['dict', 'keys', 'values'], done: false, locked: true },
  { id: 'py10', unit: 4, title: 'File I/O', description: 'Read from and write to files.', duration: '20 min', topics: ['open', 'read', 'write'], done: false, locked: true },
];

export const mockPythonStarter = `# Your first Python program
name = input("What is your name? ")
print(f"Hello, {name}!")

# Try changing the message
# Tip: press Run to test your code`;

// =================================================================
// MOBILE DEV course
// =================================================================
export interface MobileDevModule {
  id: string;
  number: number;
  title: string;
  description: string;
  type: 'concept' | 'design' | 'code' | 'project';
  duration: string;
  done: boolean;
  locked: boolean;
}

export const mockMobileDevModules: MobileDevModule[] = [
  { id: 'm1', number: 1, title: 'What is a Mobile App?', description: 'Native vs hybrid. Why React Native.', type: 'concept', duration: '15 min', done: true, locked: false },
  { id: 'm2', number: 2, title: 'UI Components', description: 'View, Text, Image, Button - the basics.', type: 'concept', duration: '20 min', done: true, locked: false },
  { id: 'm3', number: 3, title: 'Design Your First Screen', description: 'Drag-and-drop wireframing.', type: 'design', duration: '25 min', done: false, locked: false },
  { id: 'm4', number: 4, title: 'State & Props', description: 'How data flows through components.', type: 'concept', duration: '22 min', done: false, locked: false },
  { id: 'm5', number: 5, title: 'Build a Counter App', description: 'Your first interactive app.', type: 'code', duration: '30 min', done: false, locked: true },
  { id: 'm6', number: 6, title: 'Navigation Between Screens', description: 'Multi-screen apps.', type: 'code', duration: '35 min', done: false, locked: true },
  { id: 'm7', number: 7, title: 'Project: Habit Tracker', description: 'Build and submit your own app.', type: 'project', duration: '2 hours', done: false, locked: true },
];

// =================================================================
// ROBOTICS - components, lessons, projects
// =================================================================
export interface RoboticsComponent {
  id: string;
  name: string;
  category: 'controller' | 'sensor' | 'motor' | 'output';
  description: string;
  emoji: string;
  color: [string, string];
}

export const mockRoboticsComponents: RoboticsComponent[] = [
  { id: 'c1', name: 'Arduino Uno', category: 'controller', description: 'The brain. Runs your code and controls everything else.', emoji: '🧠', color: ['#0ea5a8', '#3aa0ff'] },
  { id: 'c2', name: 'Raspberry Pi', category: 'controller', description: 'A mini computer. More powerful than Arduino.', emoji: '🍓', color: ['#dc2626', '#f59e0b'] },
  { id: 'c3', name: 'Ultrasonic Sensor', category: 'sensor', description: 'Measures distance using sound waves.', emoji: '📡', color: ['#3aa0ff', '#7c5cff'] },
  { id: 'c4', name: 'Light Sensor (LDR)', category: 'sensor', description: 'Detects how bright the room is.', emoji: '☀️', color: ['#f4a716', '#ff9d2e'] },
  { id: 'c5', name: 'Temperature Sensor', category: 'sensor', description: 'Reads ambient temperature.', emoji: '🌡️', color: ['#ef4444', '#f59e0b'] },
  { id: 'c6', name: 'DC Motor', category: 'motor', description: 'Spins to drive wheels or fans.', emoji: '⚙️', color: ['#6b7280', '#9ca3af'] },
  { id: 'c7', name: 'Servo Motor', category: 'motor', description: 'Rotates to a precise angle. Used for robot arms.', emoji: '🦾', color: ['#7c5cff', '#3aa0ff'] },
  { id: 'c8', name: 'LED Light', category: 'output', description: 'Lights up when current flows through it.', emoji: '💡', color: ['#f4a716', '#ffd766'] },
  { id: 'c9', name: 'Buzzer', category: 'output', description: 'Makes sounds and beeps.', emoji: '🔊', color: ['#7c3aed', '#a78bfa'] },
  { id: 'c10', name: 'LCD Display', category: 'output', description: 'Shows text and numbers.', emoji: '📺', color: ['#15c98c', '#13b8c6'] },
];

export interface RoboticsLesson {
  id: string;
  step: number;
  title: string;
  description: string;
  emoji: string;
  componentsUsed: string[];
  duration: string;
  done: boolean;
  locked: boolean;
}

export const mockRoboticsLessons: RoboticsLesson[] = [
  { id: 'r1', step: 1, title: 'Blink an LED', description: 'Make a light blink on and off.', emoji: '💡', componentsUsed: ['Arduino Uno', 'LED Light'], duration: '15 min', done: true, locked: false },
  { id: 'r2', step: 2, title: 'Beep on Button Press', description: 'Buzzer reacts to button input.', emoji: '🔘', componentsUsed: ['Arduino Uno', 'Buzzer'], duration: '20 min', done: true, locked: false },
  { id: 'r3', step: 3, title: 'Distance Detector', description: 'Beep when something is close.', emoji: '📡', componentsUsed: ['Arduino Uno', 'Ultrasonic Sensor', 'Buzzer'], duration: '30 min', done: true, locked: false },
  { id: 'r4', step: 4, title: 'Spin a Motor', description: 'Drive a DC motor forwards and backwards.', emoji: '⚙️', componentsUsed: ['Arduino Uno', 'DC Motor'], duration: '25 min', done: true, locked: false },
  { id: 'r5', step: 5, title: 'Line Follower', description: 'Build a robot that follows a line.', emoji: '🛤️', componentsUsed: ['Arduino Uno', 'Light Sensor (LDR)', 'DC Motor'], duration: '90 min', done: false, locked: false },
  { id: 'r6', step: 6, title: 'Obstacle Avoider', description: 'Robot detects obstacles and turns away.', emoji: '🚧', componentsUsed: ['Arduino Uno', 'Ultrasonic Sensor', 'DC Motor', 'Servo Motor'], duration: '120 min', done: false, locked: false },
  { id: 'r7', step: 7, title: 'Weather Station', description: 'Display temperature on an LCD.', emoji: '🌡️', componentsUsed: ['Arduino Uno', 'Temperature Sensor', 'LCD Display'], duration: '60 min', done: false, locked: true },
  { id: 'r8', step: 8, title: 'Robot Arm', description: 'Pick up small objects with a servo arm.', emoji: '🦾', componentsUsed: ['Arduino Uno', 'Servo Motor'], duration: '150 min', done: false, locked: true },
];

export interface RoboticsProject {
  id: string;
  title: string;
  thumb: string;
  color: [string, string];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  componentsCount: number;
  estTime: string;
  status: 'available' | 'in-progress' | 'submitted' | 'reviewed';
}

export const mockRoboticsProjects: RoboticsProject[] = [
  { id: 'rp1', title: 'Smart Night Light', thumb: '🌙', color: ['#7c3aed', '#3aa0ff'], difficulty: 'Beginner', componentsCount: 3, estTime: '1 hour', status: 'reviewed' },
  { id: 'rp2', title: 'Plant Watering Reminder', thumb: '🌱', color: ['#15c98c', '#74e6b4'], difficulty: 'Beginner', componentsCount: 4, estTime: '2 hours', status: 'in-progress' },
  { id: 'rp3', title: 'Line Follower Robot', thumb: '🤖', color: ['#7c3aed', '#0ea5a8'], difficulty: 'Intermediate', componentsCount: 5, estTime: '4 hours', status: 'reviewed' },
  { id: 'rp4', title: 'Obstacle-Avoiding Car', thumb: '🚗', color: ['#ef4444', '#f59e0b'], difficulty: 'Intermediate', componentsCount: 6, estTime: '5 hours', status: 'available' },
  { id: 'rp5', title: 'Weather Display', thumb: '🌤️', color: ['#3aa0ff', '#15c98c'], difficulty: 'Intermediate', componentsCount: 4, estTime: '3 hours', status: 'available' },
  { id: 'rp6', title: 'Mini Robot Arm', thumb: '🦾', color: ['#7c5cff', '#a78bfa'], difficulty: 'Advanced', componentsCount: 7, estTime: '8 hours', status: 'available' },
];

// =================================================================
// CERTIFICATES from completed coding tracks
// =================================================================
export const mockCodingCerts = [
  { id: 'cc1', track: 'Scratch', level: 'Beginner', earned: '2 weeks ago', emoji: '🐱' },
  { id: 'cc2', track: 'Blockly', level: 'Beginner', earned: '1 week ago', emoji: '🧩' },
  { id: 'cc3', track: 'Robotics', level: 'Foundations', earned: '5 days ago', emoji: '🤖' },
];
