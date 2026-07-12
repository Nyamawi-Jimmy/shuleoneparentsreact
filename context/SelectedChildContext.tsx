import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { listChildrenNormalized } from '../api/parent';
import { Child } from '../api/parent.types';
import { ApiError } from '../config/api';

// No mock children — the app shows the real parent's children from
// /api/parent/children, or nothing until they load.
function buildMockChildren(): Child[] {
  return [];
}

// =================================================================
// Context
// =================================================================
interface ContextValue {
  children: Child[];
  selectedChild: Child | null;
  /**
   * Set the selected child. Accepts a number (new API) OR a string
   * for backward compatibility with screens that still pass IDs as strings.
   */
  selectChild: (id: number | string) => void;
  /** Alias preserved for new code. */
  setSelectedChildById: (id: number | string) => void;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isFromBackend: boolean;
}

const SelectedChildContext = createContext<ContextValue | undefined>(undefined);

export const SelectedChildProvider: React.FC<{ children: ReactNode }> = ({ children: kids }) => {
  const { accessToken, user } = useAuth();

  const initialChildren = useMemo(() => buildMockChildren(), []);
  const [children, setChildren] = useState<Child[]>(initialChildren);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(
    initialChildren[0]?.studentId ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromBackend, setIsFromBackend] = useState(false);

  const isParent = user?.userType === 'PARENT';

  const refresh = useCallback(async () => {
    if (!accessToken || !isParent) return;
    setLoading(true);
    setError(null);
    try {
      const real = await listChildrenNormalized(accessToken);
      if (real.length > 0) {
        const merged = real.map((rc) => {
          const m = initialChildren.find((mc) => mc.studentId === rc.studentId);
          return m ? { ...m, ...rc } : rc;
        });
        setChildren(merged);
        setIsFromBackend(true);
        setSelectedChildId((prev) =>
          prev != null && merged.some((c) => c.studentId === prev) ? prev : merged[0].studentId,
        );
      } else {
        setIsFromBackend(true);
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not load children.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [accessToken, isParent, initialChildren]);

  useEffect(() => {
    if (accessToken && isParent) {
      refresh();
    }
    if (!accessToken) {
      const mock = buildMockChildren();
      setChildren(mock);
      setSelectedChildId(mock[0]?.studentId ?? null);
      setIsFromBackend(false);
      setError(null);
    }
  }, [accessToken, isParent, refresh]);

  // Accepts number or string. Coerces string IDs (e.g. 'child-1' or '42') to number.
  const selectChild = useCallback((id: number | string) => {
    if (typeof id === 'number') {
      setSelectedChildId(id);
      return;
    }
    // Strip non-digit chars from strings like 'child-1' → 1
    const digits = id.replace(/\D/g, '');
    const n = Number(digits || id);
    if (Number.isFinite(n)) {
      setSelectedChildId(n);
    } else {
      // Last-resort fallback: try to find a child whose .id matches the raw string
      const match = children.find((c) => String((c as any).id) === id || String(c.studentId) === id);
      if (match) setSelectedChildId(match.studentId);
    }
  }, [children]);

  const selectedChild = useMemo(
    () => children.find((c) => c.studentId === selectedChildId) ?? null,
    [children, selectedChildId],
  );

  return (
    <SelectedChildContext.Provider value={{
      children,
      selectedChild,
      selectChild,
      setSelectedChildById: selectChild,   // alias
      loading,
      error,
      refresh,
      isFromBackend,
    }}>
      {kids}
    </SelectedChildContext.Provider>
  );
};

export function useSelectedChild() {
  const ctx = useContext(SelectedChildContext);
  if (!ctx) {
    throw new Error('useSelectedChild must be used inside <SelectedChildProvider>');
  }
  return ctx;
}
