// Reusable brand app bar — flat, slim and quiet: a single solid band of the
// brand color, a bold title with an optional one-line subtitle, an optional
// round back button, and a right-side action slot.
//
//  - `large`   top-level tab pages: bigger title, a little more presence.
//  - `overlap` pages that float a card/segment over the bar's bottom edge:
//              adds breathing room below the text so the floating element
//              never covers the title or subtitle.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  /** Top-level tab page: larger title. */
  large?: boolean;
  /** Content below floats over the bar's edge: pad the bottom so text stays clear. */
  overlap?: boolean;
  /** Optional element rendered on the right (e.g. an icon button). */
  right?: React.ReactNode;
}

export const GradientAppBar: React.FC<Props> = ({ title, subtitle, showBack = false, large = false, overlap = false, right }) => {
  const { colors } = useTheme();
  // Pad by the real status-bar height instead of a hardcoded guess, so the
  // clock/battery/notification icons are never sat on by the title row.
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.bar,
      { backgroundColor: colors.primary, paddingTop: insets.top + 12 },
      overlap && styles.barOverlap,
    ]}>
      {/* The bar is always a deep brand colour, in light AND dark mode, so the
          status-bar icons must be light here regardless of the app scheme. */}
      <StatusBar style="light" />
      <View style={styles.row}>
        {showBack && (
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} hitSlop={10} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#FFF" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.title, large && styles.titleLarge]} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={[styles.subtitle, large && styles.subtitleLarge]} numberOfLines={1}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    // paddingTop comes from the safe-area inset inline (see component).
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  // Room for a floating card/segment below without covering the text.
  barOverlap: { paddingBottom: 38 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#FFF', fontSize: 16.5, fontFamily: fonts.extrabold, letterSpacing: -0.3 },
  titleLarge: { fontSize: 20, letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, fontFamily: fonts.regular, marginTop: 1 },
  subtitleLarge: { fontSize: 12.5, marginTop: 2 },
});
