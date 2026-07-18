// Custom bottom tab bar — compact icon + label on every tab so all five
// destinations stay readable on narrow screens. The active tab is marked by
// a small indicator bar and the brand tint; everything else stays neutral.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../constants/theme';
import { useChatContacts } from '../hooks/useChatContacts';

// Icon per route name (filled when active, outline otherwise).
const ICONS: Record<string, (active: boolean, color: string) => React.ReactNode> = {
  index: (a, c) => <Ionicons name={a ? 'home' : 'home-outline'} size={20} color={c} />,
  learning: (a, c) => <Ionicons name={a ? 'rocket' : 'rocket-outline'} size={20} color={c} />,
  finance: (a, c) => <MaterialCommunityIcons name={a ? 'wallet' : 'wallet-outline'} size={20} color={c} />,
  academics: (a, c) => <Ionicons name={a ? 'school' : 'school-outline'} size={20} color={c} />,
  communication: (a, c) => <Ionicons name={a ? 'chatbubbles' : 'chatbubbles-outline'} size={20} color={c} />,
};

interface TabRoute { key: string; name: string; params?: object }

// Minimal shape of the react-navigation tab-bar props this component uses
// (the bottom-tabs package is a transitive dep of expo-router, so its types
// aren't directly importable here).
interface TabBarProps {
  state: { index: number; routes: TabRoute[] };
  // Loosely typed: the concrete react-navigation types live in a transitive
  // package; we only read options.title and call emit/navigate.
  descriptors: Record<string, any>;
  navigation: any;
}

export const BrandTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  const { colors } = useTheme();
  // Lift the bar above the device's bottom system UI — Android's on-screen nav
  // keys or the iOS home indicator — so the tabs are never covered by them.
  const insets = useSafeAreaInsets();
  // Unread chat count → a notification badge on the Messages tab.
  const { contacts } = useChatContacts();
  const unread = contacts.reduce((s, c) => s + (c.unreadCount ?? 0), 0);

  return (
    <View style={[styles.bar, {
      backgroundColor: colors.card,
      borderTopColor: colors.border,
      shadowOpacity: colors.scheme === 'dark' ? 0.4 : 0.07,
      paddingBottom: insets.bottom + 8,
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
            activeOpacity={0.7}
            style={styles.slot}
          >
            <View style={[styles.indicator, active && { backgroundColor: colors.primary }]} />
            <View>
              {ICONS[route.name]?.(active, color) ?? <Ionicons name="ellipse-outline" size={20} color={color} />}
              {route.name === 'communication' && unread > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.card }]}>
                  <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.label, { color, fontFamily: active ? fonts.bold : fonts.medium }]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    // paddingBottom is applied inline from safe-area insets (see component).
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 10,
  },
  slot: { flex: 1, alignItems: 'center', paddingTop: 7, paddingBottom: 2, minWidth: 0 },
  indicator: {
    width: 20, height: 3, borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 5,
  },
  label: { fontSize: 9.5, marginTop: 3, maxWidth: '96%', letterSpacing: -0.1 },
  badge: {
    position: 'absolute', top: -6, right: -10,
    minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  badgeText: { color: '#FFF', fontSize: 9.5, fontFamily: fonts.extrabold },
});
