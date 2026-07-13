// Reusable brand app bar — flat, slim and quiet: a single solid band of the
// brand color, a bold title with an optional one-line subtitle, an optional
// round back button, and a right-side action slot. No gradient, no drop
// shadow — the rounded bottom edge alone separates it from the content.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    <View style={[styles.bar, { backgroundColor: colors.primary }]}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#FFF', fontSize: 16.5, fontFamily: fonts.extrabold, letterSpacing: -0.3 },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, fontFamily: fonts.regular, marginTop: 1 },
});
