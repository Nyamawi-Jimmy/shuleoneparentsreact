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
import { mockPlayHome, mockAvatarEmoji } from '../mockData';

/**
 * Two-row student top bar - gives every element enough room to breathe.
 *
 *  Row 1:  [ShuleOne · STUDENT]              [bell]  [avatar]
 *  Row 2:  [class chip - full text, no clip]      [streak]  [stars]
 *
 * Pills are hidden on scholar/campus (adult tiers) per the design.
 * Status bar inset handled via useSafeAreaInsets so the phone's clock,
 * battery, and signal indicators stay fully visible above the bar.
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
        {/* Row 1: brand + actions */}
        <View style={styles.row1}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>ShuleOne</Text>
            <LinearGradient
                colors={[tokens.accent1, tokens.accent2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tag}
            >
              <Text style={styles.tagText}>STUDENT</Text>
            </LinearGradient>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.bell} hitSlop={6} onPress={onBellPress}>
              <Text style={{ fontSize: 18 }}>🔔</Text>
              <View style={styles.bellDot} />
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} onPress={onAvatarPress} disabled={!onAvatarPress}>
              <LinearGradient
                  colors={['#3aa0ff', '#7c5cff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.me}
              >
                <Text style={{ fontSize: 22 }}>{mockAvatarEmoji}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: class chip + streak/star pills */}
        <View style={styles.row2}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{chip ?? TIER_META[tier].bandLabel}</Text>
          </View>

          {!isAdult && (
              <View style={styles.pillsRow}>
                <View style={styles.pill}>
                  <Text style={styles.pillEm}>🔥</Text>
                  <Text style={[styles.pillNum, { color: '#ff6a3d' }]}>
                    {streak ?? mockPlayHome.streak}
                  </Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillEm}>⭐</Text>
                  <Text style={[styles.pillNum, { color: '#f59e0b' }]}>
                    {stars ?? mockPlayHome.stars}
                  </Text>
                </View>
              </View>
          )}
        </View>
      </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },

  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2c2550',
    letterSpacing: 0.3,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#ff5e9c',
    borderWidth: 2,
    borderColor: '#fff',
  },
  me: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },

  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  chip: {
    flexShrink: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ece8fb',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6f679c',
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 5,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  pillEm: {
    fontSize: 14,
  },
  pillNum: {
    fontWeight: '800',
    fontSize: 13,
  },
});