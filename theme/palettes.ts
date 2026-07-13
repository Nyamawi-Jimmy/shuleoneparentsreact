// =================================================================
// Light + dark color palettes. Same shape, swappable at runtime.
// =================================================================

export interface ColorPalette {
  // Brand pink/rose
  primary: string;
  primaryLight: string;
  primaryDeep: string;
  primarySoft: string;
  primarySofter: string;

  // Purple (academics, premium accents)
  purple: string;
  purpleLight: string;
  purpleDeep: string;

  // Status
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  // Subject palette
  subjectMath: string;
  subjectEnglish: string;
  subjectScience: string;
  subjectKiswahili: string;
  subjectSocial: string;
  subjectCRE: string;
  subjectComputer: string;
  subjectArt: string;

  // Surfaces & text
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  card: string;
  background: string;
  backgroundAlt: string;

  // Internal helpers
  scheme: 'light' | 'dark';
  /** Color for status bar content (light or dark) */
  statusBarStyle: 'light-content' | 'dark-content';
}

// =================================================================
// Light — professional, calm, trustworthy. Rose primary (the Parent App
// brand card color) on a soft slate canvas with white cards.
export const lightColors: ColorPalette = {
  primary:       '#E11D48',   // rose-600 — the Parent App card color
  primaryLight:  '#FB7185',   // rose-400
  primaryDeep:   '#BE123C',   // rose-700 — gradient partner
  primarySoft:   '#FFE4E6',   // rose-100
  primarySofter: '#FFF1F2',   // rose-50

  purple:        '#7C3AED',   // violet accent (academics)
  purpleLight:   '#EDE9FE',
  purpleDeep:    '#5B21B6',

  success:       '#059669',   // emerald-600
  successSoft:   '#D1FAE5',
  warning:       '#D97706',   // amber-600
  warningSoft:   '#FEF3C7',
  danger:        '#DC2626',   // red-600
  dangerSoft:    '#FEE2E2',
  info:          '#2563EB',   // blue-600
  infoSoft:      '#DBEAFE',

  subjectMath:     '#0D9488',   // teal
  subjectEnglish:  '#2563EB',   // blue
  subjectScience:  '#DC2626',   // red
  subjectKiswahili:'#7C3AED',   // violet
  subjectSocial:   '#D97706',   // amber
  subjectCRE:      '#0891B2',   // cyan
  subjectComputer: '#4F46E5',   // indigo
  subjectArt:      '#DB2777',   // pink

  text:          '#0F172A',     // slate-900
  textSecondary: '#475569',     // slate-600
  textTertiary:  '#94A3B8',     // slate-400
  border:        '#E2E8F0',     // slate-200
  card:          '#FFFFFF',
  background:    '#F8FAFC',      // slate-50 — soft modern canvas
  backgroundAlt: '#F1F5F9',      // slate-100

  scheme: 'light',
  statusBarStyle: 'dark-content',
};

// =================================================================
export const darkColors: ColorPalette = {
  // Rose lifted for dark surfaces — same brand, readable on slate
  primary:       '#FB7185',     // rose-400 — pops on slate
  primaryLight:  '#FDA4AF',
  primaryDeep:   '#E11D48',
  // Soft tints become low-saturation dark variants of the brand
  primarySoft:   '#4C0519',     // rose-950
  primarySofter: '#38030F',

  purple:        '#A78BFA',     // lifted purple, sits better on dark
  purpleLight:   '#332554',
  purpleDeep:    '#7C3AED',

  // Status colors slightly lifted for dark surfaces
  success:       '#34D399',
  successSoft:   '#0F2F26',
  warning:       '#FBBF24',
  warningSoft:   '#3A2A0F',
  danger:        '#F87171',
  dangerSoft:    '#3A1414',
  info:          '#60A5FA',
  infoSoft:      '#152340',

  // Subjects lifted for dark mode visibility
  subjectMath:     '#34D399',
  subjectEnglish:  '#60A5FA',
  subjectScience:  '#F87171',
  subjectKiswahili:'#A78BFA',
  subjectSocial:   '#FBBF24',
  subjectCRE:      '#22D3EE',
  subjectComputer: '#818CF8',
  subjectArt:      '#F472B6',

  // Surfaces - slate-based for clean look
  text:          '#F9FAFB',     // near-white
  textSecondary: '#CBD5E1',     // slate-300
  textTertiary:  '#94A3B8',     // slate-400
  border:        '#1F2937',     // slate-800 / softer divider on cards
  card:          '#1E293B',     // slate-800
  background:    '#0F172A',     // slate-900 - main screen bg
  backgroundAlt: '#0B1220',     // slightly darker bg for grouped scrolls

  scheme: 'dark',
  statusBarStyle: 'light-content',
};
