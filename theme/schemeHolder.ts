import { Appearance } from 'react-native';

// External store for the ACTIVE colour scheme. ThemeProvider writes to it
// from event callbacks/effects; scheme-proxied stylesheets read it, and
// components subscribe via useSyncExternalStore (see studentTheme's
// useSchemeTick) so a flip re-renders everything that depends on it.
//
// Backed by a globalThis singleton: Fast Refresh can leave several copies of
// this MODULE alive in one session, and if each owned its own state, screens
// still holding an old copy would freeze on a stale scheme. One shared store
// makes every copy read and notify the same source of truth.
type Scheme = 'light' | 'dark';

interface SchemeStore {
  current: Scheme;
  listeners: Set<() => void>;
}

const g = globalThis as { __shuleoneSchemeStore?: SchemeStore };
const store: SchemeStore = g.__shuleoneSchemeStore ?? (g.__shuleoneSchemeStore = {
  // Default LIGHT regardless of the device theme — the app only goes dark when
  // the user picks it in Settings (ThemeProvider syncs the stored choice).
  current: 'light' as Scheme,
  listeners: new Set(),
});

export const schemeHolder = store;

export function setActiveScheme(next: Scheme): void {
  if (store.current === next) return;
  store.current = next;
  store.listeners.forEach((l) => l());
}

/**
 * Sync the mirror WITHOUT notifying — safe to call during render to keep the
 * proxy source aligned with the authoritative scheme for the current pass.
 */
export function mirrorScheme(next: Scheme): void {
  store.current = next;
}

export function getActiveScheme(): Scheme {
  return store.current;
}

export function subscribeScheme(listener: () => void): () => void {
  store.listeners.add(listener);
  return () => { store.listeners.delete(listener); };
}
