import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useParentProfile } from '../context/ParentProfileContext';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/palettes';

interface Props {
  title?: string;
  greetingName?: string;
  showBack?: boolean;
  rightIcon?: 'bell' | 'filter' | 'more' | 'none';
  rightDot?: boolean;
  onRightPress?: () => void;
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

  const displayName = greetingName ?? parent?.firstName ?? 'there';
  const greeting = getGreeting();

  const handleRightPress = onRightPress ?? (() => router.push('/notifications' as any));

  return (
    <View style={styles.wrap}>
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.sideBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.sidePlaceholder} />
      )}

      <View style={[styles.center, { alignItems: showBack ? 'center' : (title ? 'center' : 'flex-start') }]}>
        {title ? (
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        ) : (
          <View style={styles.greetingRow}>
            <Text style={styles.greetingText} numberOfLines={1}>
              {greeting}, {displayName}!
            </Text>
            <Text style={styles.wave}>  👋</Text>
          </View>
        )}
      </View>

      {rightIcon !== 'none' ? (
        <TouchableOpacity onPress={handleRightPress} hitSlop={10} style={styles.sideBtn}>
          <View>
            {rightIcon === 'bell' && <Ionicons name="notifications-outline" size={22} color={colors.text} />}
            {rightIcon === 'filter' && <Feather name="sliders" size={20} color={colors.text} />}
            {rightIcon === 'more' && <Feather name="more-vertical" size={20} color={colors.text} />}
            {rightDot && <View style={styles.dot} />}
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.sidePlaceholder} />
      )}
    </View>
  );
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingTop: Platform.OS === 'ios' ? 56 : 36,
      paddingBottom: 14,
      backgroundColor: c.background,
      borderBottomWidth: 0,
    },
    sideBtn: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },
    sidePlaceholder: { width: 36 },
    center: { flex: 1, paddingHorizontal: 6 },
    title: {
      color: c.text,
      fontSize: 17, fontWeight: '800',
      letterSpacing: -0.3,
    },
    greetingRow: { flexDirection: 'row', alignItems: 'center' },
    greetingText: {
      color: c.text,
      fontSize: 18, fontWeight: '800',
      letterSpacing: -0.3,
    },
    wave: { fontSize: 17 },
    dot: {
      position: 'absolute',
      top: -1, right: -1,
      width: 9, height: 9, borderRadius: 4.5,
      backgroundColor: c.primary,
      borderWidth: 1.5, borderColor: c.background,
    },
  });
}
