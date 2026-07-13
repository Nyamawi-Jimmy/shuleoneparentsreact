// Custom bottom tab bar — the "bubble" pattern: inactive tabs are compact
// icons, the active tab expands into a soft-rose pill with its label. That
// keeps all five destinations comfortably visible on narrow screens, where
// five icon+label columns would clip.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../constants/theme';

// Icon per route name (filled when active, outline otherwise).
const ICONS: Record<string, (active: boolean, color: string) => React.ReactNode> = {
  index: (a, c) => <Ionicons name={a ? 'home' : 'home-outline'} size={21} color={c} />,
  learning: (a, c) => <Ionicons name={a ? 'rocket' : 'rocket-outline'} size={21} color={c} />,
  finance: (a, c) => <MaterialCommunityIcons name={a ? 'wallet' : 'wallet-outline'} size={21} color={c} />,
  academics: (a, c) => <Ionicons name={a ? 'school' : 'school-outline'} size={21} color={c} />,
  communication: (a, c) => <Ionicons name={a ? 'chatbubbles' : 'chatbubbles-outline'} size={21} color={c} />,
};

interface TabRoute { key: string; name: string; params?: object }

// Minimal shape of the react-navigation tab-bar props this component uses
// (the bottom-tabs package is a transitive dep of expo-router, so its types
// aren't directly importable here).
interface TabBarProps {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (e: { type: string; target?: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
}

export const BrandTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.bar, {
      backgroundColor: colors.card,
      borderTopColor: colors.border,
      shadowOpacity: colors.scheme === 'dark' ? 0.4 : 0.07,
    }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = String(options.title ?? route.name);
        const active = state.index === index;
        const color = active ? colors.primary : colors.textTertiary;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!active && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={active ? { selected: true } : {}}
            accessibilityLabel={label}
            onPress={onPress}
            activeOpacity={0.75}
            style={styles.slot}
          >
            <View style={[styles.pill, active && { backgroundColor: colors.primarySoft }]}>
              {ICONS[route.name]?.(active, color) ?? <Ionicons name="ellipse-outline" size={21} color={color} />}
              {active && (
                <Text style={[styles.pillLabel, { color: colors.primary }]} numberOfLines={1}>
                  {label}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 26 : 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 10,
  },
  slot: { flex: 1, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  pillLabel: { fontSize: 11.5, fontFamily: fonts.bold, letterSpacing: -0.1, flexShrink: 1 },
});
