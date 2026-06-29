// =================================================================
// ShuleOne Parent App — Design tokens.
//
// `colors` is exported statically as a backward-compat default
// (points to LIGHT palette) for screens not yet migrated to useTheme().
// For dark-mode support in a screen, import { useTheme } from '../theme/ThemeContext'
// and read colors from the hook instead of from this static export.
// =================================================================

export { lightColors as colors } from '../theme/palettes';
export { lightColors, darkColors } from '../theme/palettes';
export type { ColorPalette } from '../theme/palettes';
export { useTheme, ThemeProvider } from '../theme/ThemeContext';
export type { ThemeMode } from '../theme/ThemeContext';

// =================================================================
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

// =================================================================
export const radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 22,
  pill: 999,
};

// =================================================================
// typography uses the light-mode text color by default.
// Screens that fully support dark mode should use useTheme().colors.text
// directly instead of relying on these defaults.
// =================================================================
import { lightColors } from '../theme/palettes';

export const typography = {
  display:   { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5, color: lightColors.text },
  h1:        { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3, color: lightColors.text },
  h2:        { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2, color: lightColors.text },
  h3:        { fontSize: 15, fontWeight: '700' as const, color: lightColors.text },
  body:      { fontSize: 13.5, color: lightColors.text, fontWeight: '400' as const },
  bodyBold:  { fontSize: 13.5, color: lightColors.text, fontWeight: '700' as const },
  caption:   { fontSize: 11.5, color: lightColors.textSecondary, fontWeight: '500' as const },
  small:     { fontSize: 11, color: lightColors.textTertiary, fontWeight: '500' as const },
  label:     { fontSize: 11.5, fontWeight: '700' as const, letterSpacing: 0.3, color: lightColors.textSecondary },
};

// =================================================================
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  primary: {
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  purple: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 6,
  },
};
