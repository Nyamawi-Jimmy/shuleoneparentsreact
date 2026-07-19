import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useParentProfile } from '../context/ParentProfileContext';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/palettes';
import { fonts } from '../constants/theme';

interface Props {
  title?: string;
  greetingName?: string;
  showBack?: boolean;
  rightIcon?: 'bell' | 'filter' | 'more' | 'none';
  rightDot?: boolean;
  onRightPress?: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function initials(name?: string | null): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || '?';
}

export const ParentHeader: React.FC<Props> = ({
  title,
  greetingName,
  showBack = false,
  rightIcon = 'bell',
  rightDot = false,
  onRightPress,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { parent } = useParentProfile();
  // Pad by the real status-bar height instead of a hardcoded guess, so the
  // clock/battery/notification icons are never sat on by the header row.
  const insets = useSafeAreaInsets();

  const displayName = greetingName ?? parent?.firstName ?? 'there';
  const handleRightPress = onRightPress ?? (() => router.push('/notifications' as any));

  const renderRight = () =>
    rightIcon === 'none' ? (
      <View style={styles.sidePlaceholder} />
    ) : (
      <TouchableOpacity onPress={handleRightPress} hitSlop={8} style={styles.iconBtn} activeOpacity={0.7}>
        {rightIcon === 'bell' && <Ionicons name="notifications-outline" size={20} color={colors.text} />}
        {rightIcon === 'filter' && <Feather name="sliders" size={18} color={colors.text} />}
        {rightIcon === 'more' && <Feather name="more-vertical" size={18} color={colors.text} />}
        {rightDot && <View style={styles.dot} />}
      </TouchableOpacity>
    );

  // ── Title mode (sub-pages) ──────────────────────────────────────
  if (title || showBack) {
    return (
      <View style={[styles.wrap, { paddingTop: insets.top + 16 }]}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.sidePlaceholder} />
        )}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {renderRight()}
      </View>
    );
  }

  // ── Greeting mode (Today) ───────────────────────────────────────
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <View style={styles.avatar}>
        {/* Real photo when the parent has one; initials are the fallback. */}
        {parent?.photoUrl ? (
          <Image source={{ uri: parent.photoUrl }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarText}>{initials(parent?.name || displayName)}</Text>
        )}
      </View>
      <View style={styles.greetingCol}>
        <Text style={styles.greetingLabel}>{getGreeting()}</Text>
        <Text style={styles.greetingName} numberOfLines={1}>{displayName}</Text>
      </View>
      {renderRight()}
    </View>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      // paddingTop comes from the safe-area inset inline (see component).
      paddingBottom: 12,
      backgroundColor: c.background,
    },
    avatar: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', // clip the photo to the circle
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { color: c.primary, fontFamily: fonts.extrabold, fontSize: 15 },
    greetingCol: { flex: 1 },
    greetingLabel: { color: c.textSecondary, fontFamily: fonts.medium, fontSize: 12.5, letterSpacing: 0.1 },
    greetingName: { color: c.text, fontFamily: fonts.extrabold, fontSize: 19, letterSpacing: -0.4, marginTop: 1 },

    title: {
      flex: 1, textAlign: 'center',
      color: c.text, fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.3,
    },

    iconBtn: {
      width: 42, height: 42, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    },
    sidePlaceholder: { width: 42, height: 42 },
    dot: {
      position: 'absolute', top: 9, right: 10,
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: c.danger,
      borderWidth: 1.5, borderColor: c.card,
    },
  });
}
