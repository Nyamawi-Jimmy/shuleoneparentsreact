import { apiFetch } from '../config/api';
import { QuestSummary } from './quest.types';

// =================================================================
// Shule One Professional catalogue — the campus/college coding spine.
// Mirrors the web's GET /api/professional/catalog (ProfessionalCatalogDto).
// Grouping into levels/tracks is done server-side by design, so the app and
// the web render the same structure.
// =================================================================

export interface ProTrack {
  track: string;
  name: string;
  tagline: string | null;
  status: string;                 // LIVE | COMING_SOON | ROADMAP
  examined: boolean;              // certified by MCQ exam vs on completion
  totalQuests: number;
  completedQuests: number;
  totalXp: number;
  earnedXp: number;
  quests: QuestSummary[];
}

export interface ProLevel {
  level: number;                  // 0..6
  name: string;
  tagline: string | null;
  status: string;                 // LIVE | COMING_SOON | ROADMAP
  totalQuests: number;
  completedQuests: number;
  totalXp: number;
  earnedXp: number;
  quests: QuestSummary[];
  tracks: ProTrack[] | null;      // non-null only for level 5 (specialisations)
}

export interface ProfessionalCatalog {
  levels: ProLevel[];
  ungrouped: QuestSummary[];
}

export function getProfessionalCatalog(accessToken: string) {
  return apiFetch<ProfessionalCatalog>('/api/professional/catalog', { accessToken });
}
