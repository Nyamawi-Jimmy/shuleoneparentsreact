// Google sign-in button — the mobile equivalent of the web's GoogleSignInButton.
//
// The web loads Google Identity Services and receives `resp.credential` (a Google
// ID token JWT). Here the native SDK returns the same thing as `idToken`, which is
// what POST /api/auth/google expects — so the backend contract is identical and
// no server change is needed for mobile.
//
// CONFIG (deployment, not code):
//   · webClientId below must be the WEB OAuth client — the native SDK mints the
//     ID token against it, and it is what the backend validates as the audience.
//   · The backend's GOOGLE_CLIENT_IDS env var (comma-separated) must ALSO list the
//     Android and iOS client IDs, or every mobile sign-in fails audience checks
//     with 401 "Invalid Google token".

import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ActivityIndicator, View, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/palettes';
import { fonts } from '../constants/theme';

// The native module is resolved LAZILY and defensively. A top-level import
// throws `TurboModuleRegistry.getEnforcing('RNGoogleSignin')` inside Expo Go,
// which has no custom native code — and because that happens at module-eval
// time it takes down the whole login route and then the root layout with it.
// Requiring it in a try/catch keeps the app usable in Expo Go; the button then
// explains it needs the installed build rather than silently doing nothing.
let GoogleSignin: any = null;
let statusCodes: any = {};
let nativeAvailable = false;
try {
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod?.GoogleSignin ?? null;
  statusCodes = mod?.statusCodes ?? {};
  nativeAvailable = typeof GoogleSignin?.signIn === 'function';
} catch {
  nativeAvailable = false;   // Expo Go, or a build without the module
}

// Same project as the web (project number 509920554608). Overridable per build.
const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  '509920554608-lekr1m3rlg12l8le4ikfdcp01boe63vm.apps.googleusercontent.com';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? undefined;

let configured = false;
function configureOnce() {
  if (configured || !nativeAvailable) return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    // We only need identity — no Drive/Calendar scopes.
    scopes: ['profile', 'email'],
    offlineAccess: false,
  });
  configured = true;
}

/** The official four-colour Google "G". */
const GoogleG: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </Svg>
);

interface Props {
  /** Receives the Google ID token to POST to /api/auth/google. */
  onIdToken: (idToken: string) => void;
  /** Surfaced to the caller so it can render inline (never an Alert). */
  onError?: (message: string) => void;
  /** Parent is mid-request — keep the button disabled and spinning. */
  busy?: boolean;
  label?: string;
}

export const GoogleSignInButton: React.FC<Props> = ({
  onIdToken, onError, busy = false, label = 'Continue with Google',
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [working, setWorking] = React.useState(false);

  React.useEffect(() => { configureOnce(); }, []);

  const press = async () => {
    if (working || busy) return;
    if (!nativeAvailable) {
      // Expo Go can't do native Google sign-in. Say so plainly instead of
      // failing in a way that looks like the account is at fault.
      onError?.('Google sign-in needs the installed ShuleOne app — it is not available in Expo Go.');
      return;
    }
    setWorking(true);
    try {
      // Android only: surfaces the "update Play Services" dialog itself.
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      // Sign out first so the account picker always appears — otherwise the SDK
      // silently reuses the last account and a shared phone can't switch users.
      await GoogleSignin.signOut().catch(() => {});
      const res: any = await GoogleSignin.signIn();

      // v13+ returns { type, data }, older returns the user object directly.
      const idToken: string | null =
        res?.data?.idToken ?? res?.idToken ?? null;

      if (res?.type === 'cancelled') return;      // user backed out — say nothing
      if (!idToken) {
        onError?.('Google did not return a sign-in token. Please try again.');
        return;
      }
      onIdToken(idToken);
    } catch (e: any) {
      const code = e?.code;
      if (code === statusCodes.SIGN_IN_CANCELLED) return;   // silent
      if (code === statusCodes.IN_PROGRESS) return;         // already open
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onError?.('Google Play Services is not available on this device.');
        return;
      }
      onError?.(e?.message || 'Could not sign in with Google. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const spinning = working || busy;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={press}
      disabled={spinning}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.btn, spinning && { opacity: 0.7 }]}
    >
      {spinning ? (
        <ActivityIndicator size="small" color={colors.textSecondary} />
      ) : (
        <>
          <View style={styles.logo}><GoogleG /></View>
          <Text style={styles.text}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: c.card,
    borderWidth: 1.5, borderColor: c.border,
    borderRadius: 14, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  logo: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 14.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
});
