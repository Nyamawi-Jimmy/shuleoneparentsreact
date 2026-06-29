import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { getParentMe, updateParentMe } from '../api/parent';
import { Parent, UpdateProfileRequest } from '../api/parent.types';
import { mockParent } from '../api/mockData';
import { ApiError } from '../config/api';

// =================================================================
// Build a Parent from the legacy mockParent so the app always has
// something to show before /api/parent/me responds.
// =================================================================
function buildMockProfile(): Parent {
  const m = mockParent as any;
  const fullName = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim();
  return {
    id: typeof m.id === 'number' ? m.id : 0,
    name: fullName || 'Parent',
    firstName: m.firstName ?? '',
    lastName: m.lastName ?? '',
    email: m.email ?? '',
    phone: m.phone ?? '',
    image: m.photoUrl ?? '',
    photoUrl: m.photoUrl ?? '',
    initials: fullName.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join(''),
  };
}

// =================================================================
// Context
// =================================================================
interface ContextValue {
  parent: Parent;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  update: (body: UpdateProfileRequest) => Promise<void>;
  /** True once /api/parent/me has been fetched successfully. */
  isFromBackend: boolean;
}

const ParentProfileContext = createContext<ContextValue | undefined>(undefined);

export const ParentProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken, user } = useAuth();

  const initial = useMemo(() => buildMockProfile(), []);
  const [parent, setParent] = useState<Parent>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromBackend, setIsFromBackend] = useState(false);

  const isParent = user?.userType === 'PARENT';

  const refresh = useCallback(async () => {
    if (!accessToken || !isParent) return;
    setLoading(true);
    setError(null);
    try {
      const real = await getParentMe(accessToken);
      if (real) {
        // Merge: preserve any legacy fields from mock that backend doesn't return
        setParent((prev) => ({ ...prev, ...real }));
        setIsFromBackend(true);
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not load profile.';
      setError(msg);
      // Keep mock data on screen so the app stays usable
    } finally {
      setLoading(false);
    }
  }, [accessToken, isParent]);

  // Fetch on token appearing
  useEffect(() => {
    if (accessToken && isParent) {
      refresh();
    }
    if (!accessToken) {
      setParent(buildMockProfile());
      setIsFromBackend(false);
      setError(null);
    }
  }, [accessToken, isParent, refresh]);

  const update = useCallback(async (body: UpdateProfileRequest) => {
    if (!accessToken) throw new Error('Not signed in');
    setLoading(true);
    setError(null);
    try {
      const real = await updateParentMe(accessToken, body);
      if (real) {
        setParent((prev) => ({ ...prev, ...real }));
        setIsFromBackend(true);
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not update profile.';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  return (
    <ParentProfileContext.Provider value={{
      parent, loading, error, refresh, update, isFromBackend,
    }}>
      {children}
    </ParentProfileContext.Provider>
  );
};

export function useParentProfile() {
  const ctx = useContext(ParentProfileContext);
  if (!ctx) {
    throw new Error('useParentProfile must be used inside <ParentProfileProvider>');
  }
  return ctx;
}
