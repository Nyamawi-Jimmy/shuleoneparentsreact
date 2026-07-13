// Today — the parent dashboard. 2026-07 redesign: one integrated gradient header
// (avatar + greeting + notifications + frosted child switcher), an elevated
// quick-access grid that surfaces every section in one tap, and an "At a glance"
// row of real status cards (fees / attendance / bus / updates). Below that, the
// existing signal-driven sections: needs-your-attention, coding class report,
// upcoming events and recent activity.

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Image, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { fonts } from '../../constants/theme';
import { ChildSwitcherModal } from '../../components/ChildSwitcherModal';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useParentProfile } from '../../context/ParentProfileContext';
import { useParentHome } from '../../hooks/useParentHome';
import { useChildFees } from '../../hooks/useChildFees';
import { useChildAttendance } from '../../hooks/useAcademics';
import { useChildUpcoming } from '../../hooks/useChildUpcoming';
import { moneyToNumber } from '../../api/fees.types';
import { ParentHomeAction, ParentHomeSignal } from '../../api/home';
import { useAuth } from '../../context/AuthContext';
import { CodingClassReport, getChildCodingReports } from '../../api/guardian';

const formatKsh = (n: number): string => `KSh ${n.toLocaleString('en-KE')}`;

// Map the web feed's deep links to mobile routes.
function toMobileRoute(deepLink?: string | null): string {
  const p = (deepLink || '').toLowerCase();
  if (p.includes('finance') || p.includes('payment') || p.includes('fee')) return '/finance';
  if (p.includes('attendance')) return '/academics';
  if (p.includes('academics') || p.includes('exam') || p.includes('result')) return '/academics';
  if (p.includes('transport') || p.includes('bus')) return '/transport';
  if (p.includes('coding')) return '/coding';
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

// Quick access — every section one tap away, so More stays a fallback, not a maze.
interface QuickItem { label: string; route: string; icon: React.ReactNode; tint: string }
const quickItems = (c: ColorPalette): QuickItem[] => [
  { label: 'Fees',      route: '/finance',       tint: '#10B981', icon: <MaterialCommunityIcons name="wallet-outline" size={21} color="#10B981" /> },
  { label: 'Academics', route: '/academics',     tint: '#6366F1', icon: <Ionicons name="school-outline" size={21} color="#6366F1" /> },
  { label: 'Bus',       route: '/transport',     tint: '#2563EB', icon: <MaterialCommunityIcons name="bus-school" size={21} color="#2563EB" /> },
  { label: 'Messages',  route: '/chat',          tint: '#0891B2', icon: <Ionicons name="chatbubbles-outline" size={21} color="#0891B2" /> },
  { label: 'Coding',    route: '/coding',        tint: '#059669', icon: <MaterialCommunityIcons name="code-tags" size={21} color="#059669" /> },
  { label: 'Calendar',  route: '/calendar',      tint: '#E11D48', icon: <Ionicons name="calendar-outline" size={21} color="#E11D48" /> },
  { label: 'Documents', route: '/documents',     tint: '#D97706', icon: <Ionicons name="folder-open-outline" size={21} color="#D97706" /> },
  { label: 'Updates',   route: '/communication', tint: '#7C3AED', icon: <Ionicons name="megaphone-outline" size={21} color="#7C3AED" /> },
];

export const HomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { parent } = useParentProfile();
  const { selectedChild: child, children } = useSelectedChild();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const { data: home, loading: homeLoading, refreshing, error: homeError, refresh } = useParentHome();
  const { summary: feesSummary } = useChildFees();
  const { summary: attendanceSummary } = useChildAttendance();
  const { items: upcoming } = useChildUpcoming();

  const parentName = parent?.firstName || 'there';
  const childFirst = child?.firstName || (child as any)?.name?.split(' ')?.[0] || 'your child';
  const hasMultiple = children.length > 1;

  const actions: ParentHomeAction[] = Array.isArray(home?.actions) ? home!.actions : [];
  const signals: ParentHomeSignal[] = Array.isArray(home?.signals) ? home!.signals : [];
  const newSignals = signals.filter((s) => s.isNew).length;

  // At a glance — real where available, honest neutral otherwise.
  const feesBalance = feesSummary ? moneyToNumber(feesSummary.balance) : null;
  const feesValue = feesBalance == null ? '—' : feesBalance > 0 ? formatKsh(feesBalance) : 'Up to date';
  const feesTone = feesBalance != null && feesBalance > 0 ? colors.danger : colors.success;
  const feesFoot = feesBalance == null ? 'Tap to view' : feesBalance > 0 ? 'Balance due · tap to pay' : 'All settled this term';

  const attDays = attendanceSummary?.days ?? [];
  const attLatest = attDays.length
    ? [...attDays].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]
    : null;
  const attRate = attendanceSummary?.attendanceRate;
  const attValue = attRate != null ? `${Math.round(attRate)}%` : attLatest?.status ? String(attLatest.status) : '—';
  const attFoot = attRate != null ? 'Attendance this term' : attLatest?.status ? 'Latest recorded day' : 'No records yet';

  const statusLine = home?.statusLine || (homeLoading ? 'Loading your day…' : 'Here’s your day');

  // Light status icons belong to the indigo header, but only while this tab is
  // focused — other tabs have plain backgrounds and keep the theme default.
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  return (
    <View style={styles.root}>
      {/* Light status icons over the indigo header — only while this tab is focused. */}
      {focused && <StatusBar style="light" />}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#FFF" progressViewOffset={70} />}
      >
        {/* ── Integrated header: greeting, bell, child switcher ─────────── */}
        <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.avatarWrap} activeOpacity={0.8} onPress={() => router.push('/settings' as any)}>
              {parent?.photoUrl ? (
                <Image source={{ uri: parent.photoUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{parent?.initials || '?'}</Text>
              )}
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.greeting} numberOfLines={1}>{greetingWord()}, {parentName}</Text>
              <Text style={styles.greetingSub} numberOfLines={1}>{statusLine}</Text>
            </View>
            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7} onPress={() => router.push('/notifications' as any)}>
              <Ionicons name="notifications-outline" size={20} color="#FFF" />
              {newSignals > 0 && <View style={styles.bellDot} />}
            </TouchableOpacity>
          </View>

          {/* Child switcher — frosted card inside the header */}
          {child && (
            <TouchableOpacity
              style={styles.childCard}
              activeOpacity={0.8}
              onPress={hasMultiple ? () => setSwitcherOpen(true) : () => router.push('/settings' as any)}
            >
              <View style={styles.childAvatar}>
                <Text style={styles.childAvatarText}>{initials(child.fullName || (child as any).name)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.childName} numberOfLines={1}>{child.fullName || (child as any).name}</Text>
                <Text style={styles.childMeta} numberOfLines={1}>
                  {[child.className, (child as any).streamName].filter(Boolean).join(' ')}  ·  {child.schoolName}
                </Text>
              </View>
              {hasMultiple ? (
                <View style={styles.switchPill}>
                  <Ionicons name="swap-horizontal" size={12} color="#FFF" />
                  <Text style={styles.switchPillText}>Switch</Text>
                </View>
              ) : (
                <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.7)" />
              )}
            </TouchableOpacity>
          )}
        </LinearGradient>

        <View style={styles.body}>
          {/* ── Quick access — elevated card overlapping the header ───────── */}
          <View style={styles.quickCard}>
            {quickItems(colors).map((q) => (
              <TouchableOpacity key={q.label} style={styles.quickItem} activeOpacity={0.7}
                onPress={() => router.push(q.route as any)}>
                <View style={[styles.quickIcon, { backgroundColor: q.tint + '14' }]}>{q.icon}</View>
                <Text style={styles.quickLabel} numberOfLines={1}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── At a glance ────────────────────────────────────────────────── */}
          <SectionHeader styles={styles} colors={colors} title={`${childFirst}’s day at a glance`} />
          <View style={styles.statGrid}>
            <StatCard
              styles={styles} tint="#10B981" label="Fees"
              icon={<MaterialCommunityIcons name="wallet-outline" size={17} color="#10B981" />}
              value={feesValue} valueColor={feesTone} foot={feesFoot}
              onPress={() => router.push('/finance' as any)}
            />
            <StatCard
              styles={styles} tint="#6366F1" label="Attendance"
              icon={<Ionicons name="checkmark-done-outline" size={17} color="#6366F1" />}
              value={attValue} foot={attFoot}
              progress={attRate != null ? Math.max(0, Math.min(100, attRate)) : null}
              onPress={() => router.push('/academics' as any)}
            />
            <StatCard
              styles={styles} tint="#2563EB" label="School bus"
              icon={<MaterialCommunityIcons name="bus-school" size={17} color="#2563EB" />}
              value="Track live" foot="Pickup, drop-off & route"
              onPress={() => router.push('/transport' as any)}
            />
            <StatCard
              styles={styles} tint="#7C3AED" label="Updates"
              icon={<Ionicons name="megaphone-outline" size={17} color="#7C3AED" />}
              value={newSignals > 0 ? `${newSignals} new` : 'All read'}
              foot={newSignals > 0 ? 'School news waiting' : 'Nothing unread'}
              onPress={() => router.push('/communication' as any)}
            />
          </View>

          {/* Coding class report — only when the child's class was delivered recently */}
          <CodingClassReportCard styles={styles} colors={colors} studentId={child?.studentId ?? null} />

          {/* Needs your attention */}
          {actions.length > 0 && (
            <>
              <SectionHeader styles={styles} colors={colors} title="Needs your attention" />
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

          {/* Upcoming events */}
          {upcoming.length > 0 && (
            <>
              <SectionHeader styles={styles} colors={colors} title="Upcoming events"
                actionLabel="View calendar" onAction={() => router.push('/calendar' as any)} />
              <View style={styles.card}>
                {upcoming.map((u, i) => (
                  <TouchableOpacity key={u.key} style={[styles.eventRow, i > 0 && styles.divider]} activeOpacity={0.7}
                    onPress={() => router.push('/calendar' as any)}>
                    <View style={[styles.eventDate, { backgroundColor: u.isLive ? colors.dangerSoft : colors.primarySoft }]}>
                      <Text style={[styles.eventDay, { color: u.isLive ? colors.danger : colors.primary }]}>{dayNum(u.date)}</Text>
                      <Text style={[styles.eventMon, { color: u.isLive ? colors.danger : colors.primary }]}>{monShort(u.date)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{u.title}</Text>
                      <Text style={styles.eventMeta} numberOfLines={1}>
                        {eventDateLabel(u.date)}{u.time ? `  ·  ${u.time}` : ''}
                      </Text>
                    </View>
                    {u.isLive ? (
                      <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>Live</Text></View>
                    ) : (
                      <Feather name="chevron-right" size={18} color={colors.textTertiary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Recent activity */}
          {signals.length > 0 && (
            <>
              <SectionHeader styles={styles} colors={colors} title="Recent activity" />
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
          {!homeLoading && actions.length === 0 && signals.length === 0 && upcoming.length === 0 && (
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
        </View>
      </ScrollView>

      <ChildSwitcherModal visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </View>
  );
};

// "Coding class report" banner — appears ONLY when the child's coding/robotics class was
// delivered recently (a finalized tutor write-up within the last 7 days). Self-contained
// fetch that renders nothing when there's no data, so the home screen stays exactly as it
// was for families without the programme. Mirrors the web dashboard's card.
const CodingClassReportCard: React.FC<{ styles: any; colors: ColorPalette; studentId: number | null }> =
  ({ styles, colors, studentId }) => {
  const { accessToken } = useAuth();
  const [report, setReport] = useState<CodingClassReport | null>(null);

  useFocusEffect(useCallback(() => {
    if (!accessToken || studentId == null) { setReport(null); return; }
    let stop = false;
    getChildCodingReports(accessToken, studentId, 1)
      .then((rows) => {
        if (stop) return;
        const r = Array.isArray(rows) && rows[0] ? rows[0] : null;
        // Only surface a FRESH report — the card is "what happened in class", not an archive.
        if (r && r.sessionDate) {
          const age = (Date.now() - new Date(r.sessionDate).getTime()) / 86400000;
          setReport(age <= 7 ? r : null);
        } else {
          setReport(null);
        }
      })
      .catch(() => { if (!stop) setReport(null); });
    return () => { stop = true; };
  }, [accessToken, studentId]));

  if (!report) return null;
  const d = new Date(`${report.sessionDate}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const when = diff === 0 ? 'Today' : diff === -1 ? 'Yesterday'
    : d.toLocaleDateString('en-KE', { weekday: 'long' });

  return (
    <TouchableOpacity style={styles.codingCard} activeOpacity={0.75} onPress={() => router.push('/coding' as any)}>
      <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.codingIcon}>
        <MaterialCommunityIcons name="code-tags" size={19} color="#FFF" />
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.codingKicker}>{when}’s coding & robotics class</Text>
        <Text style={styles.codingTopic} numberOfLines={1}>{report.topic}</Text>
        {!!report.summary && <Text style={styles.codingSummary} numberOfLines={1}>{report.summary}</Text>}
      </View>
      <Feather name="chevron-right" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
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

/** One "At a glance" card: tinted icon tile, small-caps label, value, footnote. */
const StatCard: React.FC<{
  styles: any; tint: string; label: string; icon: React.ReactNode;
  value: string; valueColor?: string; foot: string; progress?: number | null; onPress: () => void;
}> = ({ styles, tint, label, icon, value, valueColor, foot, progress, onPress }) => (
  <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.statHead}>
      <View style={[styles.statIcon, { backgroundColor: tint + '14' }]}>{icon}</View>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
    <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>{value}</Text>
    {progress != null ? (
      <View style={styles.statTrack}>
        <View style={[styles.statFill, { width: `${progress}%`, backgroundColor: tint }]} />
      </View>
    ) : null}
    <Text style={styles.statFoot} numberOfLines={1}>{foot}</Text>
  </TouchableOpacity>
);

const SectionHeader: React.FC<{
  styles: any; colors: ColorPalette; title: string; actionLabel?: string; onAction?: () => void;
}> = ({ styles, colors, title, actionLabel, onAction }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {actionLabel && onAction && (
      <TouchableOpacity onPress={onAction} hitSlop={8} activeOpacity={0.7} style={styles.sectionAction}>
        <Text style={styles.sectionActionText}>{actionLabel}</Text>
        <Feather name="chevron-right" size={14} color={colors.primary} />
      </TouchableOpacity>
    )}
  </View>
);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dayNum(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return isNaN(d.getTime()) ? '–' : String(d.getDate());
}
function monShort(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return isNaN(d.getTime()) ? '' : MONTHS[d.getMonth()];
}
function eventDateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return d.toLocaleDateString('en-KE', { weekday: 'long' });
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

// =================================================================
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },

    // Header
    header: {
      paddingTop: Platform.OS === 'ios' ? 58 : 44,
      paddingHorizontal: 16,
      paddingBottom: 42, // room for the quick-access card to overlap
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarWrap: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { color: '#FFF', fontSize: 15, fontFamily: fonts.extrabold },
    greeting: { color: '#FFF', fontSize: 17.5, fontFamily: fonts.extrabold, letterSpacing: -0.4 },
    greetingSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: fonts.medium, marginTop: 2 },
    bellBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center', justifyContent: 'center',
    },
    bellDot: {
      position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4,
      backgroundColor: '#FBBF24', borderWidth: 1.5, borderColor: '#5B4FE0',
    },

    childCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
      borderRadius: 18, padding: 12, marginTop: 16,
    },
    childAvatar: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center', justifyContent: 'center',
    },
    childAvatarText: { color: '#FFF', fontSize: 14, fontFamily: fonts.extrabold },
    childName: { color: '#FFF', fontSize: 14.5, fontFamily: fonts.bold, letterSpacing: -0.2 },
    childMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, fontFamily: fonts.regular, marginTop: 2 },
    switchPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999,
      paddingHorizontal: 10, paddingVertical: 6,
    },
    switchPillText: { color: '#FFF', fontSize: 11, fontFamily: fonts.bold },

    // Body
    body: { paddingHorizontal: 16 },

    quickCard: {
      flexDirection: 'row', flexWrap: 'wrap',
      backgroundColor: c.card, borderRadius: 20,
      borderWidth: 1, borderColor: c.border,
      paddingVertical: 14, paddingHorizontal: 6,
      marginTop: -28, marginBottom: 24,
      shadowColor: '#312E81', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12, shadowRadius: 18, elevation: 6,
    },
    quickItem: { width: '25%', alignItems: 'center', paddingVertical: 8, gap: 7 },
    quickIcon: {
      width: 48, height: 48, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
    },
    quickLabel: { fontSize: 11, fontFamily: fonts.semibold, color: c.textSecondary },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.4 },
    sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    sectionActionText: { fontSize: 12.5, fontFamily: fonts.bold, color: c.primary },

    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    statCard: {
      flexBasis: '47.5%', flexGrow: 1,
      backgroundColor: c.card, borderRadius: 18,
      borderWidth: 1, borderColor: c.border,
      padding: 14,
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    statHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 },
    statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    statLabel: {
      flex: 1, fontSize: 10.5, fontFamily: fonts.bold, color: c.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.7,
    },
    statValue: { fontSize: 17, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.4 },
    statTrack: { height: 5, borderRadius: 999, backgroundColor: c.backgroundAlt, overflow: 'hidden', marginTop: 7 },
    statFill: { height: '100%', borderRadius: 999 },
    statFoot: { fontSize: 11, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 6 },

    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 14, marginBottom: 24,
    },
    divider: { borderTopWidth: 1, borderTopColor: c.border },

    attnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    attnIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    attnTitle: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    attnSub: { fontSize: 12, color: c.textSecondary, marginTop: 2, fontFamily: fonts.regular },
    payBtn: { backgroundColor: c.primary, borderRadius: 11, paddingHorizontal: 15, paddingVertical: 9 },
    payBtnText: { color: '#FFF', fontSize: 12.5, fontFamily: fonts.bold },

    eventRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12 },
    eventDate: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    eventDay: { fontSize: 17, fontFamily: fonts.extrabold, lineHeight: 20 },
    eventMon: { fontSize: 10, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
    eventTitle: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    eventMeta: { fontSize: 12, fontFamily: fonts.medium, color: c.textSecondary, marginTop: 2 },
    livePill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: c.dangerSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.danger },
    liveText: { fontSize: 11, fontFamily: fonts.bold, color: c.danger },

    signalRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 },
    signalTime: { fontSize: 11, color: c.textTertiary, fontFamily: fonts.semibold, width: 48 },
    signalDot: { width: 8, height: 8, borderRadius: 4 },
    signalTitle: { flex: 1, fontSize: 13, color: c.text, fontFamily: fonts.medium, lineHeight: 18 },

    codingCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 14, marginBottom: 24, marginTop: -8,
    },
    codingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    codingKicker: { fontSize: 10, fontFamily: fonts.bold, color: '#059669', letterSpacing: 0.6, textTransform: 'uppercase' },
    codingTopic: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text, marginTop: 2, letterSpacing: -0.2 },
    codingSummary: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 1 },

    empty: { alignItems: 'center', padding: 32, gap: 8 },
    emptyTitle: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, marginTop: 4, letterSpacing: -0.3 },
    emptyText: { fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12, fontFamily: fonts.regular },
  });
}
