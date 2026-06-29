import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../shuleoneparents/constants/theme';

interface ScreenHeaderProps {
  title: string;
  showFilter?: boolean;
  onFilterPress?: () => void;
  onBellPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showFilter,
  onFilterPress,
  onBellPress,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {showFilter ? (
        <TouchableOpacity onPress={onFilterPress} style={styles.iconLeft} hitSlop={10}>
          {/* Spacer for symmetry on screens that have filter on right */}
          <View style={{ width: 24 }} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconLeft} />
      )}
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity onPress={onBellPress} style={styles.iconRight} hitSlop={10}>
        {showFilter ? (
          <Ionicons name="funnel-outline" size={22} color={colors.text} />
        ) : (
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  iconLeft: {
    width: 32,
    alignItems: 'flex-start',
  },
  iconRight: {
    width: 32,
    alignItems: 'flex-end',
  },
});
