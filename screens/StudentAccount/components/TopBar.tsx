import React from 'react';
import { StudentColors, STUDENT_LIGHT, STUDENT_DARK, themedSheets, useSchemeTick } from '../studentTheme';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTier } from '../TierContext';
import { useTokens } from '../tokens';
import { mockAvatarEmoji } from '../mockData';
import { useAuth } from '../../../context/AuthContext';
import { getGamificationState } from '../../../api/gamification';

/**
 * Student top bar — one tidy row, IDENTICAL on every student screen:
 *
 *   [ShuleOne  STUDENT] ·············· [🔥n] [⭐n] [🔔] [avatar]
 *
 * The bar fetches its own streak/XP (cached across mounts so tab
 * switches don't flash 0s); screens with fresher numbers can still pass
 * them as props. Bell/avatar default to the student notifications and
 * profile routes. Streak/star pills hide on scholar/campus (the web's
 * `clean` mode). The class/stream lives on the Me greeting card.
 */
interface TopBarProps {
  streak?: number | null;
  stars?: number | null;
  onAvatarPress?: () => void;
  onBellPress?: () => void;
}

// Module-level cache: last known numbers survive remounts (tab hops).
let statsCache: { streak: number; stars: number } | null = null;

export const TopBar: React.FC<TopBarProps> = ({ streak, stars, onAvatarPress, onBellPress }) => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const insets = useSafeAreaInsets();
  const scheme = useSchemeTick(); // re-render on scheme flips (styles/C are scheme proxies)
  const { accessToken, signOut } = useAuth();
  const isAdult = tier === 'scholar' || tier === 'campus';
  // Tapping the avatar opens a small account menu. Signing out used to mean
  // navigating to the profile tab and scrolling to the bottom; from here it is
  // two taps on ANY student screen, since this bar is on all of them.
  const [menuOpen, setMenuOpen] = React.useState(false);

  const confirmSignOut = () => {
    setMenuOpen(false);
    Alert.alert(
      'Sign out?',
      "You'll need to log in again to come back.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login' as any);
          },
        },
      ],
    );
  };

  const [fetched, setFetched] = React.useState(statsCache);
  React.useEffect(() => {
    if (!accessToken || (streak != null && stars != null)) return;
    let off = false;
    getGamificationState(accessToken)
      .then((g) => {
        const next = { streak: g.streak?.current ?? 0, stars: g.totalXp ?? 0 };
        statsCache = next;
        if (!off) setFetched(next);
      })
      .catch(() => {});
    return () => { off = true; };
  }, [accessToken, streak, stars]);

  const streakShown = streak ?? fetched?.streak ?? 0;
  const starsShown = stars ?? fetched?.stars ?? 0;
  const goBell = onBellPress ?? (() => router.push('/student/notifications' as any));
  const goProfile = () => router.push('/(student-tabs)/me' as any);
  // An explicit onAvatarPress from a screen still wins; otherwise open the menu.
  const goAvatar = onAvatarPress ?? (() => setMenuOpen(true));

  const topPad =
      insets.top > 0
          ? insets.top
          : Platform.OS === 'android'
              ? StatusBar.currentHeight ?? 24
              : 0;

  return (
      <View style={[styles.wrap, { paddingTop: topPad + 10 }]}>
        {/* The student surface is light (or the dark canvas in dark mode), so
            the clock, wifi and battery must be dark icons here. Without this
            the screen inherits whatever was last set — GradientAppBar sets
            "light" for the parent's rose bar, which is invisible on white. */}
        <ExpoStatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

        {/* Brand + account tag */}
        <Text style={styles.brand}>ShuleOne</Text>
        <LinearGradient
            colors={[tokens.accent1, tokens.accent2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tag}
        >
          <Text style={styles.tagText}>STUDENT</Text>
        </LinearGradient>

        <View style={{ flex: 1 }} />

        {/* Streak / stars pills (younger tiers only) */}
        {!isAdult && (
            <>
              <View style={styles.pill}>
                <Text style={styles.pillEm}>🔥</Text>
                <Text style={[styles.pillNum, { color: '#ff6a3d' }]}>{streakShown}</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillEm}>⭐</Text>
                <Text style={[styles.pillNum, { color: '#f59e0b' }]}>{compact(starsShown)}</Text>
              </View>
            </>
        )}

        <TouchableOpacity style={styles.bell} hitSlop={6} onPress={goBell}>
          <Text style={{ fontSize: 16 }}>🔔</Text>
          <View style={styles.bellDot} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} onPress={goAvatar}>
          <LinearGradient
              colors={['#3aa0ff', '#7c5cff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.me}
          >
            <Text style={{ fontSize: 20 }}>{mockAvatarEmoji}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Account menu — anchored under the avatar, top-right. */}
        <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
            <Pressable style={[styles.menu, { top: topPad + 58 }]}>
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => { setMenuOpen(false); goProfile(); }}
              >
                <Text style={styles.menuEmoji}>🙂</Text>
                <Text style={styles.menuLabel}>My profile</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={confirmSignOut}>
                <Text style={styles.menuEmoji}>🚪</Text>
                <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Sign out</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
  );
};

/** 1240 → "1.2k" so the stars pill never stretches the row. */
function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
}

const makeSheet = (S: StudentColors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  brand: {
    fontSize: 20,
    fontWeight: '800',
    color: S.ink,
    letterSpacing: 0.2,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 9.5,
    letterSpacing: 0.8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: S.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 4,
    borderWidth: 1.5,
    borderColor: S.line,
  },
  pillEm: {
    fontSize: 13,
  },
  pillNum: {
    fontWeight: '800',
    fontSize: 13,
  },
  bell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: S.card,
    borderWidth: 1.5,
    borderColor: S.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff5e9c',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  me: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  // ── Account menu ──────────────────────────────────────────────
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(44,37,80,0.35)' },
  menu: {
    position: 'absolute',
    right: 12,
    minWidth: 186,
    backgroundColor: S.card,
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  menuEmoji: { fontSize: 15 },
  menuLabel: { fontSize: 13.5, fontWeight: '700', color: S.ink },
  menuLabelDanger: { color: '#e11d48' },
  menuDivider: { height: 1, backgroundColor: S.ring, marginHorizontal: 12 },
});

// Scheme-proxied sheets: each style key resolves against the ACTIVE scheme
// (see studentTheme.themedSheets) — no render-time mutation needed.
const styles = themedSheets(makeSheet(STUDENT_LIGHT), makeSheet(STUDENT_DARK));

