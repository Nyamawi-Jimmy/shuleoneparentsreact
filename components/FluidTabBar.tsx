// FluidTabBar — the single bottom bar used by BOTH the parent and student
// shells. The active destination expands into a tinted pill that carries its
// label; the others stay as icons in their own hue, dimmed. Nothing greys out,
// so the row reads as a colourful set at rest and the selection is unmistakable.
//
// Modern bits, all first-party to the SDK:
//   · Reanimated 4 layout animations (LinearTransition) do the pill's width
//     change — no manual width measuring, no LayoutAnimation flicker.
//   · The label fades in/out with entering/exiting, springing the pill open.
//   · expo-haptics fires a selection tick on tab change (iOS + Android).
//
// The bar is attached to the bottom (not floating) on purpose: a floating bar
// would sit over the last row of every scroll view, which is the exact class of
// bug we just fixed with the safe-area work.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
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
      <Animated.View style={[styles.pill, pillStyle]} layout={LinearTransition.springify().damping(20)}>
        {/* Separate wash layer so the pill can fade in without animating the
            colour string itself (cheaper, and no interpolateColor jank). */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.wash, { backgroundColor: tint + '1F' }, washStyle]}
        />

        <Animated.View style={iconStyle}>
          {renderIcon(tint, 21)}
        </Animated.View>

        {active && (
          <Animated.Text
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(90)}
            layout={LinearTransition}
            numberOfLines={1}
            allowFontScaling={false}
            style={[styles.label, { color: tint }]}
          >
            {label}
          </Animated.Text>
        )}

        {badge != null && badge > 0 && (
          <View style={[styles.badge, { backgroundColor: tint, borderColor: surface }]}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
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
  slot: { flexShrink: 1, minWidth: 0 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  wash: { borderRadius: 999 },
  label: { fontSize: 11.5, fontFamily: fonts.bold, letterSpacing: -0.2, maxWidth: 92 },
  badge: {
    position: 'absolute', top: 2, right: 6,
    minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  badgeText: { color: '#FFF', fontSize: 9, fontFamily: fonts.extrabold },
});
