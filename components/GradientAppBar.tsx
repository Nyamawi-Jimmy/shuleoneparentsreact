// Reusable brand app bar — slim, professional gradient header used across
// parent pages. Title + optional subtitle, an optional back button, and an
// optional right-side action slot. Colors come from the theme's primary
// family only, so every page wearing it reads as one brand.

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
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} hitSlop={10} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#FFF" />
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
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#FFF', fontSize: 17, fontFamily: fonts.extrabold, letterSpacing: -0.3 },
  subtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 11.5, fontFamily: fonts.medium, marginTop: 1 },
});
