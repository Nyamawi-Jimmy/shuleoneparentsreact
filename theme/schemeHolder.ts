import { Appearance } from 'react-native';

// Mutable mirror of the ACTIVE scheme, updated by ThemeProvider from event
// callbacks only (mode picker, system listener, storage hydration) — never
// during render. Module code may READ it at render time; the accompanying
// context change is what triggers the re-render.
export const schemeHolder = {
  current: (Appearance.getColorScheme() ?? 'light') as 'light' | 'dark',
};
