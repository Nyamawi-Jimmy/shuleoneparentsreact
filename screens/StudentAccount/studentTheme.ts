// Student-side light/dark palettes. The gamified accent colours (tier
// gradients, status tints) stay identical in both schemes — only the
// NEUTRALS swap: canvas, cards, ink, lines and the soft chip fills.
//
// Usage pattern per view (keeps the existing `styles.x` references intact):
//   const makeSheet = (S: StudentColors) => StyleSheet.create({ ... });
//   const styles = themedSheets(makeSheet(STUDENT_LIGHT), makeSheet(STUDENT_DARK));
//   ...inside the top component: useTheme();  // subscribes → re-render on change
// The proxy resolves each style key against the ACTIVE scheme (schemeHolder,
// maintained by ThemeProvider), so no render-time mutation is needed.

import { schemeHolder, mirrorScheme } from '../../theme/schemeHolder';
import { useTheme } from '../../theme/ThemeContext';

export interface StudentColors {
  bg: string;          // screen canvas
  card: string;        // card surface
  ink: string;         // primary text
  inkSoft: string;     // secondary text
  faint: string;       // tertiary text / disabled
  line: string;        // card borders
  divider: string;     // in-card hairlines
  soft: string;        // soft neutral chip fill
  ring: string;        // accent-soft fill (lilac)
  ringStrong: string;  // stronger accent-soft fill
  okSoft: string;      // success tint fill
  badSoft: string;     // danger tint fill
  warnSoft: string;    // warning tint fill
  infoSoft: string;    // info tint fill
  // Readable text/icon colours to sit ON the matching soft tint in EITHER
  // scheme (dark accent on light chip → light accent on dark chip).
  ringInk: string;     // accent text on ring/ringStrong
  okInk: string;       // on okSoft
  badInk: string;      // on badSoft
  warnInk: string;     // on warnSoft
  infoInk: string;     // on infoSoft
}

export const STUDENT_LIGHT: StudentColors = {
  bg: '#f4f1ff',
  card: '#ffffff',
  ink: '#2c2550',
  inkSoft: '#6f679c',
  faint: '#9b94c4',
  line: '#ece8fb',
  divider: '#f2effc',
  soft: '#f4f1ff',
  ring: '#efeaff',
  ringStrong: '#e4defc',
  okSoft: '#eafef3',
  badSoft: '#fee2e2',
  warnSoft: '#fff3da',
  infoSoft: '#e3f1ff',
  ringInk: '#5b45c9',
  okInk: '#0fae78',
  badInk: '#e11d48',
  warnInk: '#b45309',
  infoInk: '#2779c7',
};

export const STUDENT_DARK: StudentColors = {
  bg: '#15122a',
  card: '#221e3f',
  ink: '#efecff',
  inkSoft: '#a9a2d3',
  faint: '#7d76a8',
  line: '#353058',
  divider: '#2c2750',
  soft: '#2a2550',
  ring: '#332c5e',
  ringStrong: '#3e356f',
  okSoft: 'rgba(21, 201, 140, 0.18)',
  badSoft: 'rgba(239, 68, 68, 0.18)',
  warnSoft: 'rgba(244, 167, 22, 0.18)',
  infoSoft: 'rgba(58, 160, 255, 0.18)',
  ringInk: '#c4b5fd',
  okInk: '#5ee6ac',
  badInk: '#fda4af',
  warnInk: '#fcd34d',
  infoInk: '#93c5fd',
};

export const STUDENT_SCHEMES = { light: STUDENT_LIGHT, dark: STUDENT_DARK } as const;

/**
 * A pair of same-shaped objects (stylesheets or palettes) behind one proxy:
 * every property read resolves against the scheme active RIGHT NOW.
 *
 * The active scheme is read straight from the globalThis singleton (not a
 * captured module binding), so even a stale Fast-Refresh copy of this module
 * resolves the one true value — no cold restart needed after theme edits.
 */
export function themedSheets<T extends object>(light: T, dark: T): T {
  const pair = { light, dark };
  return new Proxy(light, {
    get: (_t, key) => {
      const s = (globalThis as { __shuleoneSchemeStore?: { current: 'light' | 'dark' } })
        .__shuleoneSchemeStore?.current ?? schemeHolder.current;
      return (pair[s] as any)[key];
    },
  }) as T;
}

/** Scheme-following palette for inline JSX colours (icons etc.). */
export const C = themedSheets(STUDENT_LIGHT, STUDENT_DARK);

/**
 * Bind a component to the active scheme via the THEME CONTEXT (the authoritative
 * source): every consumer re-renders reliably on mount and on any scheme change,
 * including the async "restore saved theme" flip — so no screen (not even the
 * first tab that mounts before hydration) can get stuck on the wrong scheme.
 *
 * The module-level style proxies read `schemeHolder.current`; we sync it here,
 * during render, so those sheets resolve the correct scheme in the SAME pass.
 */
export function useSchemeTick(): 'light' | 'dark' {
  const { scheme } = useTheme();
  if (schemeHolder.current !== scheme) mirrorScheme(scheme);
  return scheme;
}
