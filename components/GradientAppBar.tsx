// Reusable brand app bar — the primary-gradient header used across parent
// pages (Today has its own richer variant). Title + optional subtitle on the
// gradient, an optional back button, and an optional right-side action slot.
// Colors come from the theme's primary family only, so every page wearing it
// reads as one brand.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  /** Optional element rendered on the right (e.g. an icon button). */
  right?: React.ReactNode;
}

export const GradientAppBar: React.FC<Props> = ({ title, subtitle, showBack = false, right }) => {
  const { colors } = useTheme();

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDeep]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.bar}
    >
      <View style={styles.row}>
        {showBack && (
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} hitSlop={8} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  bar: {
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#FFF', fontSize: 19, fontFamily: fonts.extrabold, letterSpacing: -0.4 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: fonts.medium, marginTop: 2 },
});
