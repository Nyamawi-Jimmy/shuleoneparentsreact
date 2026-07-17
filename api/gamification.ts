import { apiFetch } from '../config/api';
import { GamificationState, Badge, LeagueBoard } from './gamification.types';

// =================================================================
// /api/gamification/me, /api/gamification/catalog
// =================================================================

export async function getGamificationState(accessToken: string): Promise<GamificationState> {
  return apiFetch<GamificationState>('/api/gamification/me', { accessToken });
}

export async function getBadgeCatalog(accessToken: string): Promise<Badge[]> {
  return apiFetch<Badge[]>('/api/gamification/catalog', { accessToken });
}

/** School-tunable star gate for the Games hub: game i unlocks at base + i*step XP. */
export interface GamesGate {
  enabled: boolean;
  base?: number;
  step?: number;
}

export async function getGamesGate(accessToken: string): Promise<GamesGate> {
  return apiFetch<GamesGate>('/api/gamification/games-gate', { accessToken });
}

/** Weekly leaderboard for the signed-in student/learner. Free (auth only). */
export async function getLeague(accessToken: string, top = 20): Promise<LeagueBoard> {
  return apiFetch<LeagueBoard>(`/api/learner/league?top=${top}`, { accessToken });
}
