// =====================================================================
// Brain Games — content & round generators, ported 1:1 from the web
// (lms-react src/games/data.js) so both apps play the same games.
//
// Most games share one shape: a list of "rounds", each a question with a
// visual, a set of options, and the key of the correct option. QuizGame
// renders any of them; Memory is its own board. Rounds are generated
// fresh on every play (call build() from an event handler).
// =====================================================================

export interface RoundOption {
  key: string;
  value?: number | string;
  label?: string;
  glyph?: string;
  hex?: string;
}

export interface Round {
  id: string;
  prompt: string;
  say: string;
  visual: { kind: 'icons'; icon: string; count: number; tappable?: boolean; big?: boolean } | null;
  optionKind: 'number' | 'letter' | 'glyph' | 'swatch';
  options: RoundOption[];
  answer: string;
  praise: string;
}

export interface GameDef {
  id: string;
  kind: 'quiz' | 'memory';
  icon: string;
  tone: string;                      // maps to a gradient in the view
  title: { base: string; sprout?: string };
  blurb: { base: string; sprout?: string };
  build?: () => Round[];
  faces?: string[];
}

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T,>(arr: T[]): T => arr[(Math.random() * arr.length) | 0];
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const sample = <T,>(arr: T[], n: number): T[] => shuffle(arr).slice(0, n);

let _seq = 0;
const uid = () => `r${++_seq}`;

const PRAISE = ['Yes! 🎉', 'Great job!', 'You got it!', 'Awesome!', 'Brilliant!', 'Well done!', 'Super star!'];
export const randomPraise = () => pick(PRAISE);

// ---- Number Fun: count the objects -----------------------------------
const COUNT_ICONS = ['🍎', '⭐', '🐠', '🎈', '🍩', '🐱', '🌸', '🚗', '🦋', '🍓', '🐢', '🌻'];

function numberOptions(answer: number): RoundOption[] {
  const opts = new Set<number>([answer]);
  while (opts.size < 3) {
    const d = answer + randInt(-2, 2);
    if (d >= 1 && d <= 10) opts.add(d);
  }
  return shuffle([...opts]).map((v) => ({ key: `n${v}`, value: v }));
}

export function countingRounds(n = 6): Round[] {
  return Array.from({ length: n }, () => {
    const count = randInt(2, 9);
    const icon = pick(COUNT_ICONS);
    return {
      id: uid(),
      prompt: 'How many?',
      say: 'Count them out loud, then tap the number!',
      visual: { kind: 'icons' as const, icon, count, tappable: true },
      optionKind: 'number' as const,
      options: numberOptions(count),
      answer: `n${count}`,
      praise: `${count}! Well done!`,
    };
  });
}

// ---- Word Play: first letters -----------------------------------------
const WORDS = [
  { emoji: '🍎', word: 'Apple', letter: 'A' },
  { emoji: '🐝', word: 'Bee', letter: 'B' },
  { emoji: '🐱', word: 'Cat', letter: 'C' },
  { emoji: '🐶', word: 'Dog', letter: 'D' },
  { emoji: '🥚', word: 'Egg', letter: 'E' },
  { emoji: '🐟', word: 'Fish', letter: 'F' },
  { emoji: '🍇', word: 'Grapes', letter: 'G' },
  { emoji: '🎩', word: 'Hat', letter: 'H' },
  { emoji: '🦁', word: 'Lion', letter: 'L' },
  { emoji: '🌙', word: 'Moon', letter: 'M' },
  { emoji: '🦉', word: 'Owl', letter: 'O' },
  { emoji: '⭐', word: 'Star', letter: 'S' },
  { emoji: '🌳', word: 'Tree', letter: 'T' },
  { emoji: '☂️', word: 'Umbrella', letter: 'U' },
];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function letterOptions(answer: string): RoundOption[] {
  const opts = new Set<string>([answer]);
  while (opts.size < 3) opts.add(pick(ALPHABET));
  return shuffle([...opts]).map((L) => ({ key: `l${L}`, value: L }));
}

export function letterRounds(n = 6): Round[] {
  return sample(WORDS, n).map((w) => ({
    id: uid(),
    prompt: `What letter does ${w.word} start with?`,
    say: `${w.word}. What letter does ${w.word} start with?`,
    visual: { kind: 'icons' as const, icon: w.emoji, count: 1, big: true },
    optionKind: 'letter' as const,
    options: letterOptions(w.letter),
    answer: `l${w.letter}`,
    praise: `${w.letter}! ${w.word}.`,
  }));
}

// ---- Shape Hunt: spot the shape ---------------------------------------
const SHAPES = [
  { name: 'Circle', glyph: '⭕' },
  { name: 'Square', glyph: '🟦' },
  { name: 'Triangle', glyph: '🔺' },
  { name: 'Star', glyph: '⭐' },
  { name: 'Heart', glyph: '❤️' },
  { name: 'Diamond', glyph: '🔷' },
];

export function shapeRounds(n = 6): Round[] {
  return Array.from({ length: n }, () => {
    const target = pick(SHAPES);
    const others = sample(SHAPES.filter((s) => s.name !== target.name), 3);
    const options = shuffle([target, ...others]).map((s) => ({ key: `s${s.name}`, glyph: s.glyph, label: s.name }));
    return {
      id: uid(),
      prompt: `Find the ${target.name}`,
      say: `Find the ${target.name}`,
      visual: null,
      optionKind: 'glyph' as const,
      options,
      answer: `s${target.name}`,
      praise: `Yes! That's the ${target.name}.`,
    };
  });
}

// ---- Colour Match: tap the colour -------------------------------------
const COLORS = [
  { name: 'Red', hex: '#ff5b5b' },
  { name: 'Blue', hex: '#3aa0ff' },
  { name: 'Green', hex: '#27c98c' },
  { name: 'Yellow', hex: '#ffd23f' },
  { name: 'Purple', hex: '#9b5cff' },
  { name: 'Orange', hex: '#ff9d2e' },
  { name: 'Pink', hex: '#ff5e9c' },
];

export function colourRounds(n = 6): Round[] {
  return Array.from({ length: n }, () => {
    const target = pick(COLORS);
    const others = sample(COLORS.filter((c) => c.name !== target.name), 3);
    const options = shuffle([target, ...others]).map((c) => ({ key: `c${c.name}`, hex: c.hex, label: c.name }));
    return {
      id: uid(),
      prompt: `Tap the ${target.name} one`,
      say: `Tap the ${target.name} one`,
      visual: null,
      optionKind: 'swatch' as const,
      options,
      answer: `c${target.name}`,
      praise: `${target.name}!`,
    };
  });
}

// ---- Brain Mix: a bit of everything -----------------------------------
export function mixRounds(): Round[] {
  return shuffle([...countingRounds(2), ...letterRounds(2), ...shapeRounds(1), ...colourRounds(1)]);
}

// ---- The catalogue shown on the games hub -----------------------------
export const GAMES: GameDef[] = [
  {
    id: 'count',
    kind: 'quiz',
    icon: '🔢',
    tone: 'orange',
    title: { base: 'Numeracy', sprout: 'Number Fun' },
    blurb: { base: 'Counting & adding', sprout: 'Count the things' },
    build: () => countingRounds(6),
  },
  {
    id: 'letters',
    kind: 'quiz',
    icon: '🔤',
    tone: 'pink',
    title: { base: 'Literacy', sprout: 'Word Play' },
    blurb: { base: 'Letters & sounds', sprout: 'First letters' },
    build: () => letterRounds(6),
  },
  {
    id: 'shapes',
    kind: 'quiz',
    icon: '🔷',
    tone: 'blue',
    title: { base: 'Geometry', sprout: 'Shape Hunt' },
    blurb: { base: 'Find the shapes', sprout: 'Spot the shape' },
    build: () => shapeRounds(6),
  },
  {
    id: 'colours',
    kind: 'quiz',
    icon: '🎨',
    tone: 'green',
    title: { base: 'Colours', sprout: 'Colour Match' },
    blurb: { base: 'Match the colours', sprout: 'Tap the colour' },
    build: () => colourRounds(6),
  },
  {
    id: 'memory',
    kind: 'memory',
    icon: '🧠',
    tone: 'purple',
    title: { base: 'Memory', sprout: 'Memory' },
    blurb: { base: 'Flip & remember', sprout: 'Find the pairs' },
    faces: ['🍎', '⭐', '🐠', '🎈', '🍩', '🐱'],
  },
  {
    id: 'mix',
    kind: 'quiz',
    icon: '🧭',
    tone: 'teal',
    title: { base: 'Practice Arena', sprout: 'Brain Mix' },
    blurb: { base: 'A bit of everything', sprout: 'All games mixed!' },
    build: () => mixRounds(),
  },
];

export function buildMemoryDeck(faces: string[]): { id: number; face: string }[] {
  const deck = [...faces, ...faces].map((face, i) => ({ id: i, face }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
