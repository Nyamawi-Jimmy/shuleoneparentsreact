import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Appearance } from 'react-native';
import { ColorPalette, lightColors, darkColors } from './palettes';
import { schemeHolder } from './schemeHolder';

// =================================================================
// AsyncStorage with safe fallback (some setups may not have it installed)
// =================================================================
const STORAGE_KEY = 'shuleone:theme-mode';

let storage: any = null;
try {
  storage = require('@react-native-async-storage/async-storage').default;
} catch {
  // No-op storage if package isn't installed; choice won't persist
  storage = {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  };
}

// =================================================================
export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  /** User's selected mode (what they picked) */
  mode: ThemeMode;
  /** Active scheme (resolved: system → light or dark) */
  scheme: 'light' | 'dark';
  /** Active color palette to use in styles */
  colors: ColorPalette;
  /** Update mode + persist */
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// =================================================================
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(
    (Appearance.getColorScheme() ?? 'light') as 'light' | 'dark',
  );
  // Mirror of `mode` readable inside event callbacks without stale closures.
  const modeRef = useRef<ThemeMode>('system');

  const applyMode = useCallback((next: ThemeMode) => {
    modeRef.current = next;
    // Keep the module-level scheme mirror in sync BEFORE React re-renders,
    // so scheme-proxy stylesheets resolve the fresh scheme on the next pass.
    schemeHolder.current = next === 'system'
      ? ((Appearance.getColorScheme() ?? 'light') as 'light' | 'dark')
      : next;
    setModeState(next);
  }, []);

  // ── Hydrate stored mode on mount ───
  useEffect(() => {
    (async () => {
      try {
        const stored = await storage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          applyMode(stored);
        }
      } catch { /* ignore */ }
    })();
  }, [applyMode]);

  // ── Watch system colour scheme changes ───
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      const sys = (colorScheme ?? 'light') as 'light' | 'dark';
      if (modeRef.current === 'system') schemeHolder.current = sys;
      setSystemScheme(sys);
    });
    return () => sub.remove();
  }, []);

  // ── Resolve mode → actual scheme ───
  const scheme: 'light' | 'dark' = mode === 'system' ? systemScheme : mode;
  const colors = scheme === 'dark' ? darkColors : lightColors;

  const setMode = useCallback(async (next: ThemeMode) => {
    applyMode(next);
    try { await storage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, [applyMode]);

  return (
    <ThemeContext.Provider value={{ mode, scheme, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// =================================================================
/**
 * Get the active theme. Falls back to light palette if used outside the
 * provider (so screens not yet wrapped won't crash).
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  return {
    mode: 'light',
    scheme: 'light',
    colors: lightColors,
    setMode: async () => {},
  };
}
