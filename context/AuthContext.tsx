import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { ApiError } from '../config/api';
import {
  AuthResponse,
  loginParent,
  loginStudent,
  loginUnified,
  UnifiedLoginResult,
  loginWithGoogle,
  isAuthSuccess,
  GoogleLoginOptions,
  GoogleLoginResult,
  refreshTokens,
  fetchMe,
  UserType,
} from '../api/auth';

// =================================================================
// Storage keys — SecureStore keys may only contain alphanumerics,
// ".", "-" and "_" (no colons).
// =================================================================
const KEY_ACCESS = 'shuleone.auth.access';
const KEY_REFRESH = 'shuleone.auth.refresh';
const KEY_USER = 'shuleone.auth.user';
// Written the first time the app runs after an install. Its ABSENCE means this
// is a fresh install — so any auth tokens present must be leftovers (a restore,
// a reinstall over old data) and are wiped, guaranteeing a fresh install always
// starts at onboarding rather than a stale logged-in state.
const KEY_INSTALL = 'shuleone.install.marker';

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
  /** Google: resolves to the signed-in user, or the raw CHOOSE_ACCOUNT /
   *  GOOGLE_SETUP_REQUIRED payload for the login screen to handle. */
  signInGoogle: (idToken: string, opts?: GoogleLoginOptions)
    => Promise<{ user?: AuthUser; result: GoogleLoginResult }>;

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
  //
  // A stored token is NOT proof of a usable session. It may be expired, revoked,
  // or — the case that bit us — issued by a different backend after
  // EXPO_PUBLIC_API_BASE_URL changed. Restoring it blindly dropped users onto a
  // home screen where every request 401s, which reads as "the app is broken"
  // rather than "please sign in".
  //
  // So: verify with /auth/me, try a refresh once, and only then give up. A
  // NETWORK failure is deliberately not treated as a bad session — being offline
  // must not sign anyone out.
  useEffect(() => {
    const wipe = () => Promise.all([
      SecureStore.deleteItemAsync(KEY_ACCESS),
      SecureStore.deleteItemAsync(KEY_REFRESH),
      SecureStore.deleteItemAsync(KEY_USER),
    ]);

    (async () => {
      try {
        // ── Fresh-install guard ──────────────────────────────
        // No install marker = this is the app's first run after an install.
        // Any tokens present are therefore stale leftovers (a cloud restore, or
        // an install over old data), so wipe them and let onboarding show. This
        // is what guarantees a fresh install NEVER opens into a logged-in state.
        const installed = await SecureStore.getItemAsync(KEY_INSTALL);
        if (!installed) {
          await wipe();
          await SecureStore.setItemAsync(KEY_INSTALL, String(Date.now()));
          return; // no user set → onboarding
        }

        const [access, refreshToken, userJson] = await Promise.all([
          SecureStore.getItemAsync(KEY_ACCESS),
          SecureStore.getItemAsync(KEY_REFRESH),
          SecureStore.getItemAsync(KEY_USER),
        ]);
        if (!access || !userJson) return;             // nothing stored → login

        const stored = JSON.parse(userJson) as AuthUser;

        try {
          await fetchMe(access);                      // token still good (200)
          setAccessToken(access);
          setUser(stored);
          return;
        } catch (e) {
          const status = e instanceof ApiError ? e.status : null;
          // Keep the session ONLY when the server was genuinely unreachable
          // (no HTTP status at all) — that is a real offline case. ANY HTTP
          // rejection (401/403/404/5xx) means the token is no good here, so we
          // fall through and clear it. Keeping it produced the "logged in but
          // no data" state the user reported.
          if (status == null) {
            setAccessToken(access);
            setUser(stored);
            return;
          }
        }

        // Rejected. One refresh attempt, then clear and drop to login.
        if (refreshToken) {
          try {
            const res = await refreshTokens(refreshToken);
            await persist(res);
            return;
          } catch {
            // fall through to the wipe below
          }
        }

        await wipe();
      } catch (e) {
        // bad storage state — just stay logged out
        console.warn('Auth rehydrate failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [persist]);

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

  /**
   * Google sign-in. The backend may answer with a full session, a list of
   * accounts to choose from, or a request to set up a new learner — so this
   * returns the raw result and only persists when a session actually came back.
   */
  const signInGoogle = useCallback(
    async (idToken: string, opts: GoogleLoginOptions = {}) => {
      const res = await loginWithGoogle(idToken, opts);
      if (isAuthSuccess(res)) {
        const user = await persist(res);
        return { user, result: res };
      }
      return { result: res };
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
