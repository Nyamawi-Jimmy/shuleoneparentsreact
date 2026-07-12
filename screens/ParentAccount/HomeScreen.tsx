import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { ParentHeader } from '../../components/ParentHeader';
import { ChildSwitcherModal } from '../../components/ChildSwitcherModal';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useParentProfile } from '../../context/ParentProfileContext';
import { useParentHome } from '../../hooks/useParentHome';
import { useChildFees } from '../../hooks/useChildFees';
import { useChildAttendance } from '../../hooks/useAcademics';
import { moneyToNumber } from '../../api/fees.types';
import { ParentHomeAction, ParentHomeSignal } from '../../api/home';

const formatKsh = (n: number): string => `KSh ${n.toLocaleString('en-KE')}`;

// Map the web feed's deep links to mobile routes.
function toMobileRoute(deepLink?: string | null): string {
  const p = (deepLink || '').toLowerCase();
  if (p.includes('finance') || p.includes('payment') || p.includes('fee')) return '/finance';
  if (p.includes('attendance')) return '/academics';
  if (p.includes('academics') || p.includes('exam') || p.includes('result')) return '/academics';
  if (p.includes('transport') || p.includes('bus')) return '/transport';
  if (p.includes('communication') || p.includes('message') || p.includes('announce')) return '/communication';
  if (p.includes('calendar') || p.includes('event') || p.includes('live')) return '/calendar';
  if (p.includes('diary')) return '/diary';
  if (p.includes('learning') || p.includes('progress')) return '/learning';
  return '/';
}

const PRIORITY: Record<string, { tintKey: keyof ColorPalette; label: string }> = {
  URGENT: { tintKey: 'danger', label: 'Urgent' },
  SOON: { tintKey: 'warning', label: 'Soon' },
  WHENEVER: { tintKey: 'info', label: '' },
};

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const HomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { parent } = useParentProfile();
  const { selectedChild: child, children } = useSelectedChild();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const { data: home, loading: homeLoading, refreshing, error: homeError, refresh } = useParentHome();
  const { summary: feesSummary } = useChildFees();
  const { summary: attendanceSummary } = useChildAttendance();

  const parentName = parent?.firstName || 'there';
  const childFirst = child?.firstName || (child as any)?.name?.split(' ')?.[0] || 'your child';
  const hasMultiple = children.length > 1;

  const actions: ParentHomeAction[] = Array.isArray(home?.actions) ? home!.actions : [];
  const signals: ParentHomeSignal[] = Array.isArray(home?.signals) ? home!.signals : [];

  // Status tile values — real where available, honest neutral otherwise.
  const feesBalance = feesSummary ? moneyToNumber(feesSummary.balance) : null;
  const feesValue = feesBalance == null ? '—' : feesBalance > 0 ? formatKsh(feesBalance) : 'Up to date';
  const feesTone = feesBalance != null && feesBalance > 0 ? colors.danger : colors.success;

  const attDays = attendanceSummary?.days ?? [];
  const attLatest = attDays.length
    ? [...attDays].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]
    : null;
  const attValue = attendanceSummary?.attendanceRate != null
    ? `${Math.round(attendanceSummary.attendanceRate)}%`
    : attLatest?.status
      ? String(attLatest.status)
      : '—';

  const statusLine = home?.statusLine || (homeLoading ? 'Loading your day…' : 'Here’s your day');

  return (
    <View style={styles.root}>
      <ParentHeader greetingName={parentName} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {/* Greeting hero */}
        <LinearGradient colors={['#6366F1', '#4338CA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroGreeting}>{greetingWord()}, {parentName} 👋</Text>
          <Text style={styles.heroSub}>Here’s what’s happening with {childFirst} today.</Text>
          <View style={styles.statusPill}>
            <Ionicons
              name={home?.status === 'ALL_GOOD' ? 'checkmark-circle' : 'sparkles'}
              size={14} color="#FFF"
            />
            <Text style={styles.statusPillText}>{statusLine}</Text>
          </View>
        </LinearGradient>

        {/* Child + status tiles */}
        {child && (
          <View style={styles.childCard}>
            <TouchableOpacity
              style={styles.childRow}
              activeOpacity={hasMultiple ? 0.7 : 1}
              onPress={hasMultiple ? () => setSwitcherOpen(true) : () => router.push('/settings' as any)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(child.fullName || (child as any).name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.childName} numberOfLines={1}>{child.fullName || (child as any).name}</Text>
                <Text style={styles.childMeta} numberOfLines={1}>
                  {[child.className, (child as any).streamName].filter(Boolean).join(' ')}  •  {child.schoolName}
                </Text>
              </View>
              {hasMultiple ? (
                <View style={styles.switchPill}>
                  <Ionicons name="swap-horizontal" size={13} color={colors.primary} />
                  <Text style={styles.switchPillText}>Switch</Text>
                </View>
              ) : (
                <Feather name="chevron-right" size={18} color={colors.textTertiary} />
              )}
            </TouchableOpacity>

            <View style={styles.tiles}>
              <Tile styles={styles} colors={colors} icon={<MaterialCommunityIcons name="wallet-outline" size={16} color={colors.success} />}
                label="Fees" value={feesValue} valueColor={feesTone} onPress={() => router.push('/finance' as any)} />
              <Tile styles={styles} colors={colors} icon={<Ionicons name="checkmark-done-outline" size={16} color={colors.info} />}
                label="Attendance" value={attValue} onPress={() => router.push('/academics' as any)} />
              <Tile styles={styles} colors={colors} icon={<MaterialCommunityIcons name="bus-school" size={16} color={colors.info} />}
                label="Bus" value="View" onPress={() => router.push('/transport' as any)} />
              <Tile styles={styles} colors={colors} icon={<Ionicons name="megaphone-outline" size={16} color={colors.warning} />}
                label="Updates" value="View" onPress={() => router.push('/communication' as any)} />
            </View>
          </View>
        )}

        {/* Needs your attention */}
        {actions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Needs your attention</Text>
            <View style={styles.card}>
              {actions.map((a, i) => {
                const pr = PRIORITY[String(a.priority || 'WHENEVER').toUpperCase()] || PRIORITY.WHENEVER;
                const tint = colors[pr.tintKey] as string;
                const isFee = a.kind === 'PAY_FEES';
                return (
                  <TouchableOpacity key={a.id || i} style={[styles.attnRow, i > 0 && styles.divider]} activeOpacity={0.7}
                    onPress={() => router.push(toMobileRoute(a.deepLink) as any)}>
                    <View style={[styles.attnIcon, { backgroundColor: tint + '1A' }]}>
                      <Ionicons name={isFee ? 'wallet' : 'alert-circle'} size={18} color={tint} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attnTitle}>{a.title}</Text>
                      {!!a.subtitle && <Text style={styles.attnSub} numberOfLines={1}>{a.subtitle}</Text>}
                    </View>
                    {isFee ? (
                      <View style={styles.payBtn}><Text style={styles.payBtnText}>Pay now</Text></View>
                    ) : (
                      <Feather name="chevron-right" size={18} color={colors.textTertiary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Today's timeline */}
        {signals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Today’s timeline</Text>
            <View style={styles.card}>
              {signals.slice(0, 8).map((s, i) => (
                <TouchableOpacity key={s.id || i} style={[styles.signalRow, i > 0 && styles.divider]} activeOpacity={0.7}
                  onPress={() => router.push(toMobileRoute(s.deepLink) as any)}>
                  <Text style={styles.signalTime}>{timeLabel(s.occurredAt)}</Text>
                  <View style={[styles.signalDot, { backgroundColor: s.isNew ? colors.primary : colors.border }]} />
                  <Text style={styles.signalTitle} numberOfLines={2}>{s.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Empty / error */}
        {!homeLoading && actions.length === 0 && signals.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name={homeError ? 'cloud-offline-outline' : 'checkmark-circle-outline'} size={42} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>{homeError ? 'Couldn’t load your home' : 'Nothing on your list'}</Text>
            <Text style={styles.emptyText}>
              {homeError
                ? 'Pull down to try again.'
                : 'When fees, attendance, announcements or events need you, they’ll show up here.'}
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <ChildSwitcherModal visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </View>
  );
};

function initials(name?: string | null): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || '?';
}

function timeLabel(ms?: number | null): string {
  if (!ms) return '';
  const d = new Date(Number(ms));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

const Tile: React.FC<{
  styles: any; colors: ColorPalette; icon: React.ReactNode; label: string; value: string; valueColor?: string; onPress: () => void;
}> = ({ styles, colors, icon, label, value, valueColor, onPress }) => (
  <TouchableOpacity style={styles.tile} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.tileHead}>
      {icon}
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
    <Text style={[styles.tileValue, { color: valueColor || colors.text }]} numberOfLines={1}>{value}</Text>
  </TouchableOpacity>
);

// =================================================================
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 4 },

    hero: {
      borderRadius: 20, padding: 18, marginBottom: 14,
      shadowColor: '#4338CA', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.26, shadowRadius: 18, elevation: 8,
    },
    heroGreeting: { color: '#FFF', fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
    heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4, fontWeight: '500' },
    statusPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999,
      paddingHorizontal: 11, paddingVertical: 6, marginTop: 14,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    },
    statusPillText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

    childCard: {
      backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border,
      padding: 14, marginBottom: 22,
    },
    childRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: c.primary, fontSize: 16, fontWeight: '800' },
    childName: { fontSize: 16, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    childMeta: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    switchPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
    },
    switchPillText: { color: c.primary, fontSize: 11, fontWeight: '800' },

    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    tile: {
      flexBasis: '47.5%', flexGrow: 1, backgroundColor: c.backgroundAlt,
      borderRadius: 12, padding: 11,
    },
    tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    tileLabel: { fontSize: 11.5, color: c.textSecondary, fontWeight: '600' },
    tileValue: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },

    sectionTitle: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 11, letterSpacing: -0.3 },
    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 14, marginBottom: 22,
    },
    divider: { borderTopWidth: 1, borderTopColor: c.border },

    attnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
    attnIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    attnTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    attnSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    payBtn: { backgroundColor: c.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    payBtnText: { color: '#FFF', fontSize: 12.5, fontWeight: '800' },

    signalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    signalTime: { fontSize: 11, color: c.textTertiary, fontWeight: '600', width: 46 },
    signalDot: { width: 8, height: 8, borderRadius: 4 },
    signalTitle: { flex: 1, fontSize: 13, color: c.text, fontWeight: '500' },

    empty: { alignItems: 'center', padding: 30, gap: 8 },
    emptyTitle: { fontSize: 15, fontWeight: '800', color: c.text, marginTop: 4 },
    emptyText: { fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 19, paddingHorizontal: 12 },
  });
}
