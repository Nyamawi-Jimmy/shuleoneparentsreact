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
import { useTier, TIER_META } from '../TierContext';
import { useTokens } from '../tokens';
import { mockAvatarEmoji } from '../mockData';

/**
 * Student top bar — one tidy row, mirroring the web Topbar:
 *
 *   [ShuleOne  STUDENT  class-chip] ······ [🔥n] [⭐n] [🔔] [avatar]
 *
 * The playful streak/star pills are hidden on scholar/campus (the web's
 * `clean` mode). The class chip shrinks with an ellipsis on small screens
 * so the row never wraps or scatters.
 */
interface TopBarProps {
  /** Real class chip, e.g. "GRADE2 · B" — falls back to the tier's sample band. */
  chip?: string;
  streak?: number | null;
  stars?: number | null;
  onAvatarPress?: () => void;
  onBellPress?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ chip, streak, stars, onAvatarPress, onBellPress }) => {
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
        {/* Brand + account tag + class chip */}
        <Text style={styles.brand}>ShuleOne</Text>
        <LinearGradient
            colors={[tokens.accent1, tokens.accent2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tag}
        >
          <Text style={styles.tagText}>STUDENT</Text>
        </LinearGradient>
        <View style={styles.chip}>
          <Text style={styles.chipText} numberOfLines={1}>
            {chip ?? TIER_META[tier].bandLabel}
          </Text>
        </View>

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
          <Text style={{ fontSize: 15 }}>🔔</Text>
          <View style={styles.bellDot} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} onPress={onAvatarPress} disabled={!onAvatarPress}>
          <LinearGradient
              colors={['#3aa0ff', '#7c5cff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.me}
          >
            <Text style={{ fontSize: 18 }}>{mockAvatarEmoji}</Text>
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
    fontSize: 18,
    fontWeight: '800',
    color: '#2c2550',
    letterSpacing: 0.2,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tagText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 8.5,
    letterSpacing: 0.8,
  },
  chip: {
    flexShrink: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ece8fb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6f679c',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 3,
    borderWidth: 1.5,
    borderColor: '#ece8fb',
  },
  pillEm: {
    fontSize: 11,
  },
  pillNum: {
    fontWeight: '800',
    fontSize: 11.5,
  },
  bell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ece8fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ff5e9c',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  me: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
