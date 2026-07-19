import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentProfile } from '../../api/student';

// The 5 age tiers from the design.
// Each maps to a home layout: play / play / teen / senior / campus
export type Tier = 'sprout' | 'explorer' | 'voyager' | 'scholar' | 'campus';

export type HomeLayout = 'play' | 'teen' | 'senior' | 'campus';

export const TIER_LAYOUT: Record<Tier, HomeLayout> = {
  sprout: 'play',
  explorer: 'play',
  voyager: 'teen',
  scholar: 'senior',
  campus: 'campus',
};

// NOTE: there is deliberately no TIER_META label map here. The tier is derived
// and internal — it re-skins the UI but is never named to the learner. (The old
// "Sproutling / Explorer / Voyager" labels existed only for the dev-preview
// AgeSwitcher, which has been removed.)

interface TierContextValue {
  tier: Tier;
  setTier: (t: Tier) => void;
  layout: HomeLayout;
  /** Enrolled at a partner school (has a className) — gates school-only nav. */
  inSchool: boolean;
  /** 8-4-4 Form 3/4 (grade 103/104) — excluded from adult-only nav. */
  isForm34: boolean;
}

const TierContext = createContext<TierContextValue | undefined>(undefined);

/** Matches lms-react's theme/tiers.js DEFAULT_TIER. */
export const DEFAULT_TIER: Tier = 'explorer';

const VALID_TIERS: Tier[] = ['sprout', 'explorer', 'voyager', 'scholar', 'campus'];

/**
 * Map a class/grade to a UI tier — a direct port of lms-react's tierForGrade so
 * the mobile app re-skins by grade exactly the way the web does.
 *   <=3 pre-primary + lower primary → sprout   ·  4–6 upper primary → explorer
 *   7–9 junior secondary → voyager             ·  10–12 senior secondary → scholar
 *   101–104 remaining 8-4-4 forms → scholar    ·  200 adult/college → campus
 */
export function tierForGrade(grade: number | null | undefined): Tier {
  if (grade === null || grade === undefined) return DEFAULT_TIER;
  const g = Number(grade);
  if (Number.isNaN(g)) return DEFAULT_TIER;
  if (g === 200) return 'campus';
  if (g <= 3) return 'sprout';
  if (g <= 6) return 'explorer';
  if (g <= 9) return 'voyager';
  if (g <= 12) return 'scholar';
  if (g >= 101 && g <= 104) return 'scholar';
  return DEFAULT_TIER;
}

/** Whole years between `dob` and today, or null if unknown/unparseable. */
export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDelta = now.getMonth() - d.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < d.getDate())) age -= 1;
  return age < 0 ? null : age;
}

export function tierForAge(age: number | null): Tier {
  if (age == null) return DEFAULT_TIER;
  if (age <= 8) return 'sprout';
  if (age <= 11) return 'explorer';
  if (age <= 14) return 'voyager';
  if (age <= 18) return 'scholar';
  return 'campus';
}

export const TierProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken } = useAuth();
  // The tier is DERIVED, never chosen: it re-skins the whole student side to
  // suit the learner's age. Start on the neutral middle tier so a young child
  // never briefly sees the teen layout (or a teenager the toddler one) while
  // the profile loads.
  const [tier, setTier] = useState<Tier>(DEFAULT_TIER);
  // Nav gates, mirroring lms-react StudentDashboard: school-only entries need a
  // className, adult-only entries exclude 8-4-4 Form 3/4.
  const [inSchool, setInSchool] = useState(false);
  const [isForm34, setIsForm34] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const prof = await getStudentProfile(accessToken);
        if (cancelled) return;
        setInSchool(!!prof?.className);
        setIsForm34(prof?.grade === 103 || prof?.grade === 104);
        // Trust the backend's own tier when it sends a valid one, else fall
        // back to grade, then date of birth.
        const fromApi = String(prof?.tier ?? '').toLowerCase() as Tier;
        if (VALID_TIERS.includes(fromApi)) { setTier(fromApi); return; }
        if (prof?.grade != null) { setTier(tierForGrade(prof.grade)); return; }
        setTier(tierForAge(ageFromDob(prof?.dateOfBirth)));
      } catch {
        // Keep the default tier — a failed profile fetch must not blank the UI.
      }
    })();
    return () => { cancelled = true; };
  }, [accessToken]);

  return (
    <TierContext.Provider value={{ tier, setTier, layout: TIER_LAYOUT[tier], inSchool, isForm34 }}>
      {children}
    </TierContext.Provider>
  );
};

export function useTier(): TierContextValue {
  const ctx = useContext(TierContext);
  if (!ctx) throw new Error('useTier must be used inside <TierProvider>');
  return ctx;
}

// Helper: pick a value from a per-tier map, falling back to base.
export function pickByTier<T>(tier: Tier, opts: Partial<Record<Tier, T>> & { base: T }): T {
  return opts[tier] ?? opts.base;
}
