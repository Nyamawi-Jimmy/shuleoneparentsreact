import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Optional element on the right (e.g. a step counter chip). */
  right?: React.ReactNode;
}

/** Compact header used on all pushed learning screens. */
export const LearningHeader: React.FC<Props> = ({ title, subtitle, onBack, right }) => {
  const insets = useSafeAreaInsets();
  const topPad =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight ?? 24
      : 0;

  return (
    <View style={[styles.wrap, { paddingTop: topPad + 10 }]}>
      <TouchableOpacity
        onPress={onBack ?? (() => router.back())}
        style={styles.backBtn}
        hitSlop={10}
      >
        <Ionicons name="chevron-back" size={22} color="#2c2550" />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>

      {right ?? <View style={{ width: 40 }} />}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2c2550',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11.5,
    color: '#6f679c',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 1,
  },
});
