import { apiFetch } from '../config/api';
import { GamificationState, Badge } from './gamification.types';

// =================================================================
// /api/gamification/me, /api/gamification/catalog
// =================================================================

export async function getGamificationState(accessToken: string): Promise<GamificationState> {
  return apiFetch<GamificationState>('/api/gamification/me', { accessToken });
}

export async function getBadgeCatalog(accessToken: string): Promise<Badge[]> {
  return apiFetch<Badge[]>('/api/gamification/catalog', { accessToken });
}
