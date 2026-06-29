import React, { createContext, useContext, useState, ReactNode } from 'react';

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

export const TIER_META: Record<
  Tier,
  { label: string; sublabel: string; bandLabel: string }
> = {
  sprout: { label: 'Sproutling', sublabel: 'PP1–G3', bandLabel: '🌍 Class PP1 · Sunshine Group' },
  explorer: { label: 'Explorer', sublabel: 'G4–G6', bandLabel: '🦅 Grade 5 · Eagles' },
  voyager: { label: 'Voyager', sublabel: 'JSS 7–9', bandLabel: '⚡ Grade 8 · Falcons' },
  scholar: { label: 'Scholar', sublabel: 'SSS 10–12', bandLabel: '🎓 Grade 11 · STEM Pathway' },
  campus: { label: 'Campus', sublabel: 'College', bandLabel: '🏛️ Year 2 · BSc Computer Science' },
};

interface TierContextValue {
  tier: Tier;
  setTier: (t: Tier) => void;
  layout: HomeLayout;
}

const TierContext = createContext<TierContextValue | undefined>(undefined);

export const TierProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tier, setTier] = useState<Tier>('sprout');
  return (
    <TierContext.Provider value={{ tier, setTier, layout: TIER_LAYOUT[tier] }}>
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
