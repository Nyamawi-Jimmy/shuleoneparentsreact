// Parent bottom bar — a thin configuration of the shared FluidTabBar: the
// per-destination colours, the icon set, and the unread-message badge. All the
// motion and layout lives in FluidTabBar so both shells behave identically.

import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { FluidTabBar } from './FluidTabBar';
import { useChatContacts } from '../hooks/useChatContacts';

// One signature colour per destination, so the bar reads as a colourful row on
// a neutral surface rather than five identical grey glyphs.
const TINTS: Record<string, string> = {
  index: '#E11D48',          // rose — Home (brand)
  learning: '#7C3AED',       // violet — Learning
  finance: '#059669',        // emerald — Fees
  academics: '#2563EB',      // blue — Academics
  communication: '#EA580C',  // orange — Messages
};

// Icon per route name (filled when active, outline otherwise).
const ICONS: Record<string, (active: boolean, color: string, size: number) => React.ReactNode> = {
  index: (a, c, s) => <Ionicons name={a ? 'home' : 'home-outline'} size={s} color={c} />,
  learning: (a, c, s) => <Ionicons name={a ? 'rocket' : 'rocket-outline'} size={s} color={c} />,
  finance: (a, c, s) => <MaterialCommunityIcons name={a ? 'wallet' : 'wallet-outline'} size={s} color={c} />,
  academics: (a, c, s) => <Ionicons name={a ? 'school' : 'school-outline'} size={s} color={c} />,
  communication: (a, c, s) => <Ionicons name={a ? 'chatbubbles' : 'chatbubbles-outline'} size={s} color={c} />,
};

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string; params?: object }[] };
  descriptors: Record<string, any>;
  navigation: any;
}

export const BrandTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  const { colors } = useTheme();
  // Unread chat count → a notification badge on the Messages tab.
  const { contacts } = useChatContacts();
  const unread = contacts.reduce((s, c) => s + (c.unreadCount ?? 0), 0);

  return (
    <FluidTabBar
      state={state}
      descriptors={descriptors}
      navigation={navigation}
      tints={TINTS}
      // Explicit order — a custom tabBar sees every route the navigator has.
      include={['index', 'learning', 'finance', 'academics', 'communication']}
      badges={{ communication: unread }}
      surface={colors.card}
      border={colors.border}
      dark={colors.scheme === 'dark'}
      renderIcon={(name, active, color, size) =>
        ICONS[name]?.(active, color, size) ?? <Ionicons name="ellipse-outline" size={size} color={color} />
      }
    />
  );
};
