import React, {
  createContext, useContext, useEffect, useState, useCallback, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'shuleone:lesson-progress';

// =================================================================
// Per-lesson record
// =================================================================
export interface LessonProgress {
  done: boolean;
  bestStars: number;          // 0-3
  bestScore: number;          // % correct
  attempts: number;
  lastCompletedAt: number;    // epoch ms
}

interface ProgressMap {
  [lessonId: string]: LessonProgress;
}

// =================================================================
// Context value
// =================================================================
interface ContextValue {
  loading: boolean;
  progressMap: ProgressMap;
  getProgress: (lessonId: string) => LessonProgress | null;
  isDone: (lessonId: string) => boolean;
  markComplete: (lessonId: string, stars: number, scorePct: number) => Promise<void>;
  /** Reset all - useful for debug or sign-out. */
  resetAll: () => Promise<void>;
}

const Ctx = createContext<ContextValue | undefined>(undefined);

// =================================================================
// Provider
// =================================================================
export const LessonProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(true);

  // Load on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setProgressMap(JSON.parse(raw));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (next: ProgressMap) => {
    setProgressMap(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore - state still kept in memory for this session
    }
  };

  const getProgress = useCallback(
    (id: string) => progressMap[id] ?? null,
    [progressMap],
  );

  const isDone = useCallback(
    (id: string) => progressMap[id]?.done === true,
    [progressMap],
  );

  const markComplete = useCallback(
    async (lessonId: string, stars: number, scorePct: number) => {
      const prev = progressMap[lessonId];
      const next: LessonProgress = {
        done: true,
        bestStars: Math.max(stars, prev?.bestStars ?? 0),
        bestScore: Math.max(scorePct, prev?.bestScore ?? 0),
        attempts: (prev?.attempts ?? 0) + 1,
        lastCompletedAt: Date.now(),
      };
      await persist({ ...progressMap, [lessonId]: next });
    },
    [progressMap],
  );

  const resetAll = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setProgressMap({});
  }, []);

  return (
    <Ctx.Provider value={{ loading, progressMap, getProgress, isDone, markComplete, resetAll }}>
      {children}
    </Ctx.Provider>
  );
};

export function useLessonProgress() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLessonProgress must be inside <LessonProgressProvider>');
  return ctx;
}
