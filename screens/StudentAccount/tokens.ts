import { Tier } from './TierContext';

// Tokens from the kids-design.html CSS variables, per tier.
// Each tier has its own accent, corner radius, and base font size.

export const SHARED = {
  ink: '#2c2550',
  inkSoft: '#6f679c',
  line: '#ece8fb',
  ring: '#efeaff',
  card: '#fff',

  purple1: '#7c5cff',
  purple2: '#a78bfa',
  blue1: '#3aa0ff',
  blue2: '#7fc4ff',
  pink1: '#ff5e9c',
  pink2: '#ffa3c6',
  green1: '#15c98c',
  green2: '#74e6b4',
  orange1: '#ff9d2e',
  orange2: '#ffc879',
  teal1: '#13b8c6',
  teal2: '#6fe6ef',
  amber1: '#f4a716',
  amber2: '#ffd766',
  indigo1: '#5b6cff',
  indigo2: '#9aa6ff',
};

export interface TierTokens {
  radius: number;        // base corner radius
  fontBase: number;      // base font size
  accent1: string;
  accent2: string;
  mascotSize: number;    // 0 = no mascot
  bgColor: string;
}

export const TIER_TOKENS: Record<Tier, TierTokens> = {
  sprout: {
    radius: 26,
    fontBase: 16.5,
    accent1: '#7c5cff',
    accent2: '#ff5e9c',
    mascotSize: 118,
    bgColor: '#f4f1ff',
  },
  explorer: {
    radius: 18,
    fontBase: 15,
    accent1: '#5b6cff',
    accent2: '#13b8c6',
    mascotSize: 92,
    bgColor: '#f4f1ff',
  },
  voyager: {
    radius: 16,
    fontBase: 14.5,
    accent1: '#7c3aed',
    accent2: '#22d3ee',
    mascotSize: 0,
    bgColor: '#f1f0ff',
  },
  scholar: {
    radius: 13,
    fontBase: 14,
    accent1: '#4f46e5',
    accent2: '#0ea5a8',
    mascotSize: 0,
    bgColor: '#f3f5fb',
  },
  campus: {
    radius: 11,
    fontBase: 13.5,
    accent1: '#0f766e',
    accent2: '#475569',
    mascotSize: 0,
    bgColor: '#f4f7f6',
  },
};

export const useTokens = (tier: Tier) => TIER_TOKENS[tier];

// Shadow presets
export const SHADOWS = {
  card: {
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 4,
  },
  cardSm: {
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },
};
