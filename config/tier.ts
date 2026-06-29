import { Tier } from '../screens/StudentAccount/TierContext';
import { AgeTier } from '../api/quest.types';

// =================================================================
// Front-end tier (5 levels) -> Backend AgeTier (4 levels)
//
// Backend bands (from AgeTier.java fromAge):
//   PLAY    : age <= 8
//   TEEN    : age 9-13
//   SENIOR  : age 14-17
//   CAMPUS  : age 18+
//
// Front-end tiers vs typical age:
//   sprout   PP1-G3    5-8     -> PLAY
//   explorer G4-G6     9-12    -> TEEN
//   voyager  JSS 7-9   13-15   -> TEEN
//   scholar  SSS 10-12 16-18   -> SENIOR
//   campus   College   18+     -> CAMPUS
// =================================================================
export function tierToAgeTier(tier: Tier): AgeTier {
  switch (tier) {
    case 'sprout':   return 'PLAY';
    case 'explorer': return 'TEEN';
    case 'voyager':  return 'TEEN';
    case 'scholar':  return 'SENIOR';
    case 'campus':   return 'CAMPUS';
  }
}

/** Reverse mapping. Several front-end tiers can map to the same backend
 *  AgeTier; this returns the most "typical" one. */
export function ageTierToTier(age: AgeTier): Tier {
  switch (age) {
    case 'PLAY':   return 'sprout';
    case 'TEEN':   return 'explorer';
    case 'SENIOR': return 'scholar';
    case 'CAMPUS': return 'campus';
  }
}
