import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ParentHeader } from '../../components/ParentHeader';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useCommunication } from '../../hooks/useCommunication';
import { useChildAttendance } from '../../hooks/useAcademics';
import { useChatContacts } from '../../hooks/useChatContacts';
import { useSelectedChild } from '../../context/SelectedChildContext';

export const CommunicationScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { selectedChild } = useSelectedChild();
  const { announcements, events, loading, refreshing, refresh } = useCommunication();
  const { summary: attendanceSummary, attendance } = useChildAttendance();
  const { contacts: teachers } = useChatContacts();

  // ── Today's attendance status ────────────────────────────────
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const todayRecord = (attendance?.dailyAttendance ?? []).find((d: any) => {
    const dKey = (d.date ?? '').slice(0, 10);
    return dKey === todayKey;
  });
  const todayStatus = (todayRecord?.status ?? 'PRESENT').toString().toUpperCase();
  const todayDateLabel = today.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  });

  // ── Top item from each section ──────────────────────────────
  const sortedAnnouncements = useMemo(
    () => [...announcements].sort((a, b) => compareDateDesc(a.date, b.date)),
    [announcements],
  );
  const topAnnouncement = sortedAnnouncements[0] ?? null;

  const upcomingEvents = useMemo(
    () => [...events]
      .filter((e) => !e.startDate || new Date(e.startDate).getTime() >= today.getTime() - 86400000)
      .sort((a, b) => compareDateAsc(a.startDate, b.startDate)),
    [events],
  );
  const topEvent = upcomingEvents[0] ?? null;

  const topTeacher = (teachers ?? []).find((c) => c.lastMessage) ?? teachers?.[0] ?? null;

  const recentAlerts = useMemo(() => {
    const list = attendance?.dailyAttendance ?? [];
    const thirtyAgo = today.getTime() - 30 * 86400000;
    return list
      .filter((d: any) => {
        const ts = d.date ? new Date(d.date).getTime() : 0;
        const status = (d.status ?? '').toUpperCase();
        return ts > thirtyAgo && (status === 'LATE' || status === 'ABSENT');
      })
      .sort((a: any, b: any) => compareDateDesc(a.date, b.date))
      .slice(0, 1);
  }, [attendance]);
  const topAlert = recentAlerts[0] ?? null;

  if (loading) {
    return (
      <View style={styles.safe}>
        <ParentHeader title="Communication" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <ParentHeader title="Communication" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {/* ═══════════════════════════════════════════════════════
            Today's Attendance
        ═══════════════════════════════════════════════════════ */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Today's Attendance</Text>
          <TouchableOpacity hitSlop={6} onPress={() => router.push('/(tabs)/academics' as any)}>
            <Text style={styles.viewAll}>View calendar</Text>
          </TouchableOpacity>
        </View>

        <AttendanceStatusCard status={todayStatus} dateLabel={todayDateLabel} colors={colors} styles={styles} />

        <View style={styles.statsRow}>
          <StatBox label="Present" value={attendanceSummary?.present ?? 18} suffix="days" valueColor={colors.text} styles={styles} />
          <StatBox label="Late" value={attendanceSummary?.late ?? 2} suffix="days" valueColor={colors.warning} styles={styles} />
          <StatBox label="Absent" value={attendanceSummary?.absent ?? 1} suffix={(attendanceSummary?.absent ?? 1) === 1 ? 'day' : 'days'} valueColor={colors.danger} styles={styles} />
        </View>

        {/* ═══════════════════════════════════════════════════════
            School Announcements
        ═══════════════════════════════════════════════════════ */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>School Announcements</Text>
          <TouchableOpacity hitSlop={6} onPress={() => router.push('/communication-all?type=announcements' as any)}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.itemCard}>
          <View style={[styles.itemIconBox, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="megaphone" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.itemTitleRow}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {topAnnouncement?.title ?? 'Sports Day – 24 May 2025'}
              </Text>
              {((topAnnouncement?.isNew) ?? true) && <View style={styles.newDot} />}
            </View>
            <Text style={styles.itemBody} numberOfLines={2}>
              {topAnnouncement ? stripHtml(topAnnouncement.body) : 'Join us for our annual sports day. Parents are welcome!'}
            </Text>
            <Text style={styles.itemDate}>
              {topAnnouncement?.date ? formatNiceDate(topAnnouncement.date) : '12 May 2025'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════
            Upcoming Events
        ═══════════════════════════════════════════════════════ */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <TouchableOpacity hitSlop={6} onPress={() => router.push('/communication-all?type=events' as any)}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.itemCard}>
          <View style={[styles.itemIconBox, { backgroundColor: colors.infoSoft }]}>
            <Ionicons name="calendar" size={20} color={colors.info} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {topEvent?.title ?? 'PTA Meeting'}
            </Text>
            <Text style={styles.itemBody}>
              {topEvent?.startDate ? `${formatNiceDate(topEvent.startDate)}${hasTime(topEvent.startDate) ? `  •  ${formatTime(topEvent.startDate)}` : ''}` : '22 May 2025  •  4:00 PM'}
            </Text>
            <Text style={styles.itemDate}>
              {topEvent?.className ?? 'School Hall'}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════
            Teacher Messages
        ═══════════════════════════════════════════════════════ */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Teacher Messages</Text>
          <TouchableOpacity hitSlop={6} onPress={() => router.push('/chat' as any)}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.itemCard}
          onPress={() => topTeacher && router.push({
            pathname: '/conversation',
            params: { contactId: String(topTeacher.id ?? ''), name: topTeacher.name ?? '', avatar: topTeacher.avatarUrl ?? '' },
          } as any)}
        >
          <View style={styles.teacherAvatar}>
            {topTeacher?.avatarUrl ? (
              <Image source={{ uri: topTeacher.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            ) : (
              <Text style={styles.teacherInitials}>
                {topTeacher
                  ? (topTeacher.name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((s: string) => s[0]?.toUpperCase() ?? '').join('')
                  : 'TM'}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.teacherTopRow}>
              <Text style={styles.teacherName} numberOfLines={1}>
                {topTeacher?.name ?? 'Mr. Thomas Mwangi'}
              </Text>
              <Text style={styles.teacherDate}>
                {topTeacher?.lastMessageAt ? formatNiceDate(topTeacher.lastMessageAt) : '13 May 2025'}
              </Text>
            </View>
            <Text style={styles.teacherMessage} numberOfLines={2}>
              {topTeacher?.lastMessage ?? `${selectedChild?.firstName ?? 'Brian'} has shown great improvement in his recent assignments. Keep it up!`}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════
            Alerts
        ═══════════════════════════════════════════════════════ */}
        <View style={[styles.sectionRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Alerts</Text>
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.alertCard}>
          <View style={styles.alertIconWrap}>
            <Ionicons name="warning" size={18} color={colors.warning} />
          </View>
          <Text style={styles.alertText} numberOfLines={2}>
            {topAlert
              ? `${selectedChild?.firstName ?? 'Your child'} was ${(topAlert.status ?? '').toUpperCase() === 'LATE' ? 'late' : 'absent'} on ${formatNiceDate(topAlert.date)}`
              : `${selectedChild?.firstName ?? 'Brian'} was late on 14 May 2025`}
          </Text>
          <Feather name="chevron-right" size={16} color={colors.warning} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// =================================================================
// Today's Attendance hero card — LIGHT GREEN tinted background, dark check circle
// =================================================================
const AttendanceStatusCard: React.FC<{
  status: string; dateLabel: string;
  colors: ColorPalette; styles: any;
}> = ({ status, dateLabel, colors, styles }) => {
  const isPresent = status === 'PRESENT';
  const isLate = status === 'LATE';
  const isAbsent = status === 'ABSENT';

  // Default to Present styling (matches marketing) when no record yet
  const tint =
    isAbsent ? colors.danger :
    isLate ? colors.warning :
    colors.success;

  const bg =
    isAbsent ? colors.dangerSoft :
    isLate ? colors.warningSoft :
    colors.successSoft;

  const label =
    isAbsent ? 'Absent' :
    isLate ? 'Late' :
    'Present';

  const icon =
    isAbsent ? 'close' :
    isLate ? 'time' :
    'checkmark';

  return (
    <View style={[styles.todayCard, { backgroundColor: bg }]}>
      <View style={[styles.todayCheck, { backgroundColor: tint }]}>
        <Ionicons name={icon as any} size={22} color="#FFF" />
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={styles.todayLabel}>{label}</Text>
        <Text style={styles.todayDate}>{dateLabel}</Text>
      </View>
      <View style={[styles.todayPeople, { opacity: 0.35 }]}>
        <Ionicons name="people" size={32} color={tint} />
      </View>
    </View>
  );
};

// =================================================================
// Stat box — white card, dark/colored number, small grey "days" suffix
// =================================================================
const StatBox: React.FC<{
  label: string; value: number; suffix: string; valueColor: string; styles: any;
}> = ({ label, value, suffix, valueColor, styles }) => (
  <View style={styles.statBox}>
    <Text style={styles.statLabel}>{label}</Text>
    <View style={styles.statValueRow}>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.statSuffix}>{suffix}</Text>
    </View>
  </View>
);

// =================================================================
// Helpers
// =================================================================
function stripHtml(s: string | null): string {
  if (!s) return '';
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
function compareDateDesc(a: string | null | undefined, b: string | null | undefined): number {
  const tA = a ? new Date(a).getTime() : 0;
  const tB = b ? new Date(b).getTime() : 0;
  return tB - tA;
}
function compareDateAsc(a: string | null | undefined, b: string | null | undefined): number {
  const tA = a ? new Date(a).getTime() : 0;
  const tB = b ? new Date(b).getTime() : 0;
  return tA - tB;
}
function formatNiceDate(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}
function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return ''; }
}
function hasTime(iso: string): boolean {
  try {
    const d = new Date(iso);
    return d.getHours() !== 0 || d.getMinutes() !== 0;
  } catch { return false; }
}

// =================================================================
// Styles
// =================================================================
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 18, paddingTop: 4 },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    loadingText: { fontSize: 12.5, color: c.textSecondary, marginTop: 12, fontWeight: '500' },

    sectionRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 18, marginBottom: 12,
    },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: c.text, letterSpacing: -0.3 },
    viewAll: { fontSize: 12.5, fontWeight: '700', color: c.primary },

    // ─── Today's Attendance card ─────────────────────────────
    todayCard: {
      flexDirection: 'row', alignItems: 'center',
      padding: 16, borderRadius: 18,
    },
    todayCheck: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
    },
    todayLabel: { fontSize: 19, fontWeight: '800', color: c.text, letterSpacing: -0.4 },
    todayDate: { fontSize: 12, color: c.textSecondary, marginTop: 2, fontWeight: '500' },
    todayPeople: { width: 40, alignItems: 'center', justifyContent: 'center' },

    // ─── Stat boxes ───────────────────────────────────────────
    statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    statBox: {
      flex: 1,
      backgroundColor: c.card, borderRadius: 14,
      paddingHorizontal: 14, paddingVertical: 14,
      borderWidth: 1, borderColor: c.border,
    },
    statLabel: { fontSize: 12.5, color: c.textSecondary, fontWeight: '600' },
    statValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4, gap: 5 },
    statValue: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
    statSuffix: { fontSize: 12, color: c.textTertiary, fontWeight: '600' },

    // ─── Item card (used for announcements, events, teacher) ──
    itemCard: {
      flexDirection: 'row', alignItems: 'flex-start',
      backgroundColor: c.card,
      padding: 14, borderRadius: 16,
      borderWidth: 1, borderColor: c.border,
    },
    itemIconBox: {
      width: 42, height: 42, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    itemTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    itemTitle: { flex: 1, fontSize: 14.5, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    newDot: {
      width: 9, height: 9, borderRadius: 4.5,
      backgroundColor: c.danger, marginLeft: 8,
    },
    itemBody: { fontSize: 12.5, color: c.textSecondary, marginTop: 4, lineHeight: 17, fontWeight: '500' },
    itemDate: { fontSize: 11.5, color: c.textTertiary, marginTop: 4, fontWeight: '500' },

    // ─── Teacher avatar (PINK like marketing) ─────────────────
    teacherAvatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    teacherInitials: { color: c.primary, fontSize: 14, fontWeight: '900' },
    teacherTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    teacherName: { flex: 1, fontSize: 14.5, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    teacherDate: { fontSize: 11.5, color: c.textTertiary, fontWeight: '600', marginLeft: 8 },
    teacherMessage: { fontSize: 12.5, color: c.textSecondary, marginTop: 4, lineHeight: 17, fontWeight: '500' },

    // ─── Alert card (amber tint) ──────────────────────────────
    alertCard: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.warningSoft,
      padding: 14, borderRadius: 14,
    },
    alertIconWrap: { width: 24, alignItems: 'center' },
    alertText: { flex: 1, fontSize: 13, color: c.text, fontWeight: '700', letterSpacing: -0.1 },
  });
}
