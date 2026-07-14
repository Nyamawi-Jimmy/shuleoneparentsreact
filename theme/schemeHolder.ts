import { Appearance } from 'react-native';

// External store for the ACTIVE colour scheme. ThemeProvider writes to it
// from event callbacks/effects; scheme-proxied stylesheets read it, and
// components subscribe via useSyncExternalStore (see studentTheme's
// useSchemeTick) so a flip re-renders everything that depends on it.
type Scheme = 'light' | 'dark';

const listeners = new Set<() => void>();

export const schemeHolder = {
  current: (Appearance.getColorScheme() ?? 'light') as Scheme,
};

export function setActiveScheme(next: Scheme): void {
  if (schemeHolder.current === next) return;
  schemeHolder.current = next;
  listeners.forEach((l) => l());
}

export function getActiveScheme(): Scheme {
  return schemeHolder.current;
}

export function subscribeScheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
