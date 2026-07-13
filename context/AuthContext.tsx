import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  AuthResponse,
  loginParent,
  loginStudent,
  loginUnified,
  UnifiedLoginResult,
  loginWithGoogle,
  refreshTokens,
  UserType,
} from '../api/auth';

// =================================================================
// Storage keys — SecureStore keys may only contain alphanumerics,
// ".", "-" and "_" (no colons).
// =================================================================
const KEY_ACCESS = 'shuleone.auth.access';
const KEY_REFRESH = 'shuleone.auth.refresh';
const KEY_USER = 'shuleone.auth.user';

// =================================================================
// Types
// =================================================================
interface AuthUser {
  userId: number;
  userType: UserType;
  username: string;
  roles: string[];
  dateOfBirth: string | null;
}

interface AuthContextValue {
  /** True while we're rehydrating tokens from storage on app launch. */
  loading: boolean;
  /** Null when logged out. */
  user: AuthUser | null;
  accessToken: string | null;

  /** Login flows — throw on failure so screens can show the error. */
  signInParent: (identifier: string, password: string) => Promise<AuthUser>;
  /** Unified /auth/login: resolves to the signed-in user, or the raw
   *  CHOOSE_ACCOUNT / status payload for the login screen to handle. */
  signInUnified: (identifier: string, password: string, userType?: string | null, accountId?: number | string | null)
    => Promise<{ user: AuthUser } | { result: UnifiedLoginResult }>;
  signInStudent: (identifier: string, password: string) => Promise<AuthUser>;
  signInGoogle: (idToken: string, userType: UserType) => Promise<AuthUser>;

  /** Wipes tokens from storage and resets state. */
  signOut: () => Promise<void>;

  /** Refreshes tokens. Returns true on success. */
  refresh: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// =================================================================
// Provider
// =================================================================
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  /** Persist auth response to AsyncStorage + state. */
  const persist = useCallback(async (res: AuthResponse) => {
    const u: AuthUser = {
      userId: res.userId,
      userType: res.userType,
      username: res.username,
      roles: res.roles,
      dateOfBirth: res.dateOfBirth,
    };
    await Promise.all([
      SecureStore.setItemAsync(KEY_ACCESS, res.accessToken),
      SecureStore.setItemAsync(KEY_REFRESH, res.refreshToken),
      SecureStore.setItemAsync(KEY_USER, JSON.stringify(u)),
    ]);
    setAccessToken(res.accessToken);
    setUser(u);
    return u;
  }, []);

  // ── Rehydrate on app launch ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [access, userJson] = await Promise.all([
          SecureStore.getItemAsync(KEY_ACCESS),
          SecureStore.getItemAsync(KEY_USER),
        ]);
        if (access && userJson) {
          setAccessToken(access);
          setUser(JSON.parse(userJson) as AuthUser);
        }
      } catch (e) {
        // bad storage state — just stay logged out
        console.warn('Auth rehydrate failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Login flows ──────────────────────────────────────────
  const signInParent = useCallback(
    async (identifier: string, password: string) => {
      const res = await loginParent(identifier, password);
      return persist(res);
    },
    [persist],
  );

  const signInStudent = useCallback(
    async (identifier: string, password: string) => {
      const res = await loginStudent(identifier, password);
      return persist(res);
    },
    [persist],
  );

  const signInUnified = useCallback(
    async (identifier: string, password: string, userType?: string | null, accountId?: number | string | null) => {
      const res = await loginUnified(identifier, password, userType, accountId);
      if (res && (res as any).accessToken) {
        const user = await persist(res as any);
        return { user };
      }
      return { result: res };
    },
    [persist],
  );

  const signInGoogle = useCallback(
    async (idToken: string, userType: UserType) => {
      const res = await loginWithGoogle(idToken, userType);
      return persist(res);
    },
    [persist],
  );

  // ── Sign out ─────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_ACCESS),
      SecureStore.deleteItemAsync(KEY_REFRESH),
      SecureStore.deleteItemAsync(KEY_USER),
    ]);
    setAccessToken(null);
    setUser(null);
  }, []);

  // ── Refresh ──────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(KEY_REFRESH);
      if (!refreshToken) return false;
      const res = await refreshTokens(refreshToken);
      await persist(res);
      return true;
    } catch {
      await signOut();
      return false;
    }
  }, [persist, signOut]);

  return (
    <AuthContext.Provider
      value={{
        loading,
        user,
        accessToken,
        signInParent,
        signInStudent,
        signInUnified,
        signInGoogle,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
