// =================================================================
// Gamification types — mirrors lms_spring OpenAPI.
// =================================================================

/** /api/gamification/me → GamificationStateDto */
export interface GamificationState {
  streak: Streak | null;
  totalXp: number | null;
  level: number | null;
  badges: Badge[] | null;
}

export interface Streak {
  current: number | null;
  longest: number | null;
}

export interface Badge {
  code: string | null;
  title: string | null;
  description: string | null;
  icon: string | null;
  earnedAt: string | null;     // null if locked
}

/** Empty default for a graceful first render */
export const emptyGamification: GamificationState = {
  streak: { current: 0, longest: 0 },
  totalXp: 0,
  level: 1,
  badges: [],
};

/** XP per level - tweak to match backend curve if needed */
export const XP_PER_LEVEL = 250;

/** XP towards next level (0 .. XP_PER_LEVEL) */
export function xpInCurrentLevel(state: GamificationState | null): number {
  const total = state?.totalXp ?? 0;
  return total % XP_PER_LEVEL;
}

/** XP needed to reach next level */
export function xpToNextLevel(state: GamificationState | null): number {
  return XP_PER_LEVEL - xpInCurrentLevel(state);
}

/** Fractional progress towards next level (0-1) */
export function levelProgressFraction(state: GamificationState | null): number {
  return xpInCurrentLevel(state) / XP_PER_LEVEL;
}
