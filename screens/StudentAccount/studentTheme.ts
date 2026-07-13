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

import { schemeHolder } from '../../theme/schemeHolder';

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
};

export const STUDENT_SCHEMES = { light: STUDENT_LIGHT, dark: STUDENT_DARK } as const;

/**
 * A pair of same-shaped objects (stylesheets or palettes) behind one proxy:
 * every property read resolves against the scheme active RIGHT NOW.
 */
export function themedSheets<T extends object>(light: T, dark: T): T {
  const pair = { light, dark };
  return new Proxy(light, {
    get: (_t, key) => (pair[schemeHolder.current] as any)[key],
  }) as T;
}

/** Scheme-following palette for inline JSX colours (icons etc.). */
export const C = themedSheets(STUDENT_LIGHT, STUDENT_DARK);
