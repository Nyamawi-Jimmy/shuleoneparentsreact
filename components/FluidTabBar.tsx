// FluidTabBar — the single bottom bar used by BOTH the parent and student
// shells. The active destination expands into a tinted pill that carries its
// label; the others stay as icons in their own hue, dimmed. Nothing greys out,
// so the row reads as a colourful set at rest and the selection is unmistakable.
//
// EVERY tab is labelled — kids shouldn't have to decode an icon alone — so the
// pill stacks icon over label and the active state is carried by the tinted
// wash, the full-strength colour and a lift, rather than by the label's
// presence.
//
// Modern bits, all first-party to the SDK:
//   · Reanimated 4 shared values spring the wash + icon between states.
//   · expo-haptics fires a selection tick on tab change (iOS + Android).
//
// The bar is attached to the bottom (not floating) on purpose: a floating bar
// would sit over the last row of every scroll view, which is the exact class of
// bug we just fixed with the safe-area work.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../constants/theme';

export interface FluidTabBarProps {
  state: { index: number; routes: { key: string; name: string; params?: object }[] };
  // Loosely typed: the concrete react-navigation types live in a transitive
  // package; we only read options.title and call emit/navigate.
  descriptors: Record<string, any>;
  navigation: any;
  /** Per-route signature colour. */
  tints: Record<string, string>;
  /** Draws the icon for a route at the given colour. */
  renderIcon: (routeName: string, active: boolean, color: string, size: number) => React.ReactNode;
  /** Optional per-route badge counts. */
  badges?: Record<string, number | undefined>;
  /** Bar surface + hairline, so each shell keeps its own palette. */
  surface: string;
  border: string;
  dark?: boolean;
}

const SPRING = { damping: 18, stiffness: 190, mass: 0.55 };
const FALLBACK_TINT = '#E11D48';

export const FluidTabBar: React.FC<FluidTabBarProps> = ({
  state, descriptors, navigation, tints, renderIcon, badges, surface, border, dark,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.bar, {
        backgroundColor: surface,
        borderTopColor: border,
        shadowOpacity: dark ? 0.45 : 0.09,
        paddingBottom: insets.bottom + 10,
      }]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = String(options.title ?? route.name);
        const active = state.index === index;
        const tint = tints[route.name] ?? FALLBACK_TINT;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (active || event.defaultPrevented) return;
          // Selection feedback on the tab change itself, not on every touch.
          Haptics.selectionAsync().catch(() => {});
          navigation.navigate(route.name, route.params);
        };

        return (
          <TabSlot
            key={route.key}
            label={label}
            active={active}
            tint={tint}
            badge={badges?.[route.name]}
            surface={surface}
            onPress={onPress}
            renderIcon={(color, size) => renderIcon(route.name, active, color, size)}
          />
        );
      })}
    </View>
  );
};

const TabSlot: React.FC<{
  label: string;
  active: boolean;
  tint: string;
  badge?: number;
  surface: string;
  onPress: () => void;
  renderIcon: (color: string, size: number) => React.ReactNode;
}> = ({ label, active, tint, badge, surface, onPress, renderIcon }) => {
  // `press` drives the tap squash; `sel` drives the idle→active transition.
  const press = useSharedValue(0);
  const sel = useSharedValue(active ? 1 : 0);

  React.useEffect(() => {
    sel.value = withSpring(active ? 1 : 0, SPRING);
  }, [active, sel]);

  // Tap squash only — the tint is drawn by the separate wash layer below.
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(1 - press.value * 0.06, { duration: 90 }) }],
  }));

  const washStyle = useAnimatedStyle(() => ({
    opacity: sel.value,
    transform: [{ scale: interpolate(sel.value, [0, 1], [0.82, 1]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    // Idle tabs keep their own hue, just dimmed — never grey.
    opacity: interpolate(sel.value, [0, 1], [0.45, 1]),
    transform: [{ translateY: interpolate(sel.value, [0, 1], [1, 0]) }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={active ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => { press.value = 1; }}
      onPressOut={() => { press.value = 0; }}
      style={styles.slot}
    >
      <Animated.View style={[styles.pill, pillStyle]}>
        {/* Separate wash layer so the pill can fade in without animating the
            colour string itself (cheaper, and no interpolateColor jank). */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.wash, { backgroundColor: tint + '1F' }, washStyle]}
        />

        <View style={styles.iconWrap}>
          <Animated.View style={iconStyle}>
            {renderIcon(tint, 21)}
          </Animated.View>
          {/* Badge sits OUTSIDE the dimming wrapper so an unread count stays
              at full strength on an idle tab. */}
          {badge != null && badge > 0 && (
            <View style={[styles.badge, { backgroundColor: tint, borderColor: surface }]}>
              <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </View>

        {/* Always labelled — kids shouldn't have to recognise an icon alone.
            The label carries the tab's own hue, dimmed when idle. */}
        <Animated.Text
          numberOfLines={1}
          allowFontScaling={false}
          // Long labels ("Communication") shrink to fit their slot instead of
          // truncating to "Communicati…"; short ones are unaffected.
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          style={[styles.label, { color: tint }, active ? styles.labelActive : styles.labelIdle]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 12,
    elevation: 12,
  },
  // Every tab is the same width so a six-tab student bar stays even.
  slot: { flex: 1, minWidth: 0, alignItems: 'center' },
  pill: {
    // Icon above label: with every tab labelled, a side-by-side pill would be
    // far too wide to fit six destinations.
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 4,
    paddingTop: 7,
    paddingBottom: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  wash: { borderRadius: 16 },
  label: {
    fontSize: 9.5,
    fontFamily: fonts.bold,
    letterSpacing: -0.1,
    marginTop: 3,
    maxWidth: '100%',
    textAlign: 'center',
  },
  labelActive: { opacity: 1 },
  // Matches the idle icon so label and glyph fade together.
  labelIdle: { opacity: 0.45 },
  iconWrap: { position: 'relative' },
  badge: {
    position: 'absolute', top: -5, right: -11,
    minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  badgeText: { color: '#FFF', fontSize: 9, fontFamily: fonts.extrabold },
});
