import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTier } from '../TierContext';
import { useTokens } from '../tokens';
import { mockAvatarEmoji } from '../mockData';

/**
 * Student top bar — one tidy row:
 *
 *   [ShuleOne  STUDENT] ·············· [🔥n] [⭐n] [🔔] [avatar]
 *
 * The class/stream lives on the greeting card (like the web's header
 * subtitle), NOT here — a phone-width row can't fit it without crushing
 * everything else. Streak/star pills are hidden on scholar/campus (the
 * web's `clean` mode).
 */
interface TopBarProps {
  streak?: number | null;
  stars?: number | null;
  onAvatarPress?: () => void;
  onBellPress?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ streak, stars, onAvatarPress, onBellPress }) => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const insets = useSafeAreaInsets();
  const isAdult = tier === 'scholar' || tier === 'campus';

  const topPad =
      insets.top > 0
          ? insets.top
          : Platform.OS === 'android'
              ? StatusBar.currentHeight ?? 24
              : 0;

  return (
      <View style={[styles.wrap, { paddingTop: topPad + 10 }]}>
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
                <Text style={[styles.pillNum, { color: '#ff6a3d' }]}>{streak ?? 0}</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillEm}>⭐</Text>
                <Text style={[styles.pillNum, { color: '#f59e0b' }]}>{compact(stars ?? 0)}</Text>
              </View>
            </>
        )}

        <TouchableOpacity style={styles.bell} hitSlop={6} onPress={onBellPress}>
          <Text style={{ fontSize: 16 }}>🔔</Text>
          <View style={styles.bellDot} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} onPress={onAvatarPress} disabled={!onAvatarPress}>
          <LinearGradient
              colors={['#3aa0ff', '#7c5cff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.me}
          >
            <Text style={{ fontSize: 20 }}>{mockAvatarEmoji}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
  );
};

/** 1240 → "1.2k" so the stars pill never stretches the row. */
function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
}

const styles = StyleSheet.create({
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
    color: '#2c2550',
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
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 4,
    borderWidth: 1.5,
    borderColor: '#ece8fb',
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
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ece8fb',
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
});
