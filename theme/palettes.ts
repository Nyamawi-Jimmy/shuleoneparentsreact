// =================================================================
// Light + dark color palettes. Same shape, swappable at runtime.
// =================================================================

export interface ColorPalette {
  // Brand pink/rose
  primary: string;
  primaryLight: string;
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
export const lightColors: ColorPalette = {
  primary:       '#E11D48',
  primaryLight:  '#FB7185',
  primarySoft:   '#FFE4ED',
  primarySofter: '#FFF1F5',

  purple:        '#7C3AED',
  purpleLight:   '#EDE9FE',
  purpleDeep:    '#5B21B6',

  success:       '#10B981',
  successSoft:   '#D1FAE5',
  warning:       '#F59E0B',
  warningSoft:   '#FEF3C7',
  danger:        '#EF4444',
  dangerSoft:    '#FEE2E2',
  info:          '#3B82F6',
  infoSoft:      '#DBEAFE',

  subjectMath:     '#10B981',
  subjectEnglish:  '#3B82F6',
  subjectScience:  '#EF4444',
  subjectKiswahili:'#7C3AED',
  subjectSocial:   '#F59E0B',
  subjectCRE:      '#06B6D4',
  subjectComputer: '#6366F1',
  subjectArt:      '#EC4899',

  text:          '#1F2937',
  textSecondary: '#6B7280',
  textTertiary:  '#9CA3AF',
  border:        '#F1F1F4',
  card:          '#FFFFFF',
  background:    '#FFFFFF',
  backgroundAlt: '#FAFBFC',

  scheme: 'light',
  statusBarStyle: 'dark-content',
};

// =================================================================
export const darkColors: ColorPalette = {
  // Brand colours stay vivid on dark - they pop
  primary:       '#E11D48',
  primaryLight:  '#FB7185',
  // Soft tints become low-saturation dark variants of the brand
  primarySoft:   '#3F1721',
  primarySofter: '#2A0F18',

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
