import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Linking, Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ParentHeader } from '../../components/ParentHeader';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useCommunication } from '../../hooks/useCommunication';
import { Announcement, LiveClass, TermEvent } from '../../api/communication.types';

type SectionType = 'announcements' | 'events' | 'live';
type AnnouncementFilter = 'all' | 'notice' | 'newsletter';

export const CommunicationListScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const params = useLocalSearchParams<{ type?: string }>();
  const sectionType = (params.type as SectionType) ?? 'announcements';

  const { announcements, liveClasses, events, loading, refreshing, refresh, error } = useCommunication();

  const [annFilter, setAnnFilter] = useState<AnnouncementFilter>('all');

  const screenTitle =
    sectionType === 'events' ? 'Upcoming Events' :
    sectionType === 'live'   ? 'Live Classes' :
    'School Announcements';

  // ── Filter announcements by type ──
  const filteredAnnouncements = useMemo(() => {
    const sorted = [...announcements].sort((a, b) => compareDateDesc(a.date, b.date));
    if (sectionType !== 'announcements') return sorted;
    if (annFilter === 'all') return sorted;
    return sorted.filter((a) => (a.type ?? '').toUpperCase() === annFilter.toUpperCase());
  }, [announcements, annFilter, sectionType]);

  const sortedEvents = useMemo(() => [...events].sort((a, b) => compareDateAsc(a.startDate, b.startDate)), [events]);
  const sortedLiveClasses = useMemo(() => [...liveClasses].sort((a, b) => compareDateDesc(a.startsOn, b.startsOn)), [liveClasses]);

  // Counts for the pill badges
  const counts = useMemo(() => {
    const all = announcements.length;
    const notice = announcements.filter((a) => (a.type ?? '').toUpperCase() === 'NOTICE').length;
    const newsletter = announcements.filter((a) => (a.type ?? '').toUpperCase() === 'NEWSLETTER').length;
    return { all, notice, newsletter };
  }, [announcements]);

  return (
    <View style={styles.safe}>
      <ParentHeader title={screenTitle} showBack rightIcon="none" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color={colors.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={refresh} hitSlop={6}><Text style={styles.retryInline}>Retry</Text></TouchableOpacity>
          </View>
        )}

        {/* ─── Filter pills for announcements ─── */}
        {!loading && sectionType === 'announcements' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            <FilterPill colors={colors} styles={styles} label="All"          count={counts.all}        active={annFilter === 'all'}        onPress={() => setAnnFilter('all')} />
            <FilterPill colors={colors} styles={styles} label="Notices"      count={counts.notice}     active={annFilter === 'notice'}     onPress={() => setAnnFilter('notice')} />
            <FilterPill colors={colors} styles={styles} label="Newsletters"  count={counts.newsletter} active={annFilter === 'newsletter'} onPress={() => setAnnFilter('newsletter')} />
          </ScrollView>
        )}

        {/* ─── Announcements ─── */}
        {!loading && sectionType === 'announcements' && (
          <>
            {filteredAnnouncements.length === 0 ? (
              <EmptyState colors={colors} styles={styles} icon="megaphone-outline" label="No announcements to show" />
            ) : (
              filteredAnnouncements.map((a) => (
                <AnnouncementCard key={a.id ?? Math.random()} item={a} colors={colors} styles={styles} />
              ))
            )}
          </>
        )}

        {/* ─── Events ─── */}
        {!loading && sectionType === 'events' && (
          <>
            {sortedEvents.length === 0 ? (
              <EmptyState colors={colors} styles={styles} icon="calendar-outline" label="No upcoming events" />
            ) : (
              sortedEvents.map((e) => (
                <EventCard key={e.id ?? Math.random()} item={e} colors={colors} styles={styles} />
              ))
            )}
          </>
        )}

        {/* ─── Live classes ─── */}
        {!loading && sectionType === 'live' && (
          <>
            {sortedLiveClasses.length === 0 ? (
              <EmptyState colors={colors} styles={styles} icon="videocam-outline" label="No live classes" />
            ) : (
              sortedLiveClasses.map((c) => (
                <LiveClassCard key={c.id ?? Math.random()} item={c} colors={colors} styles={styles} />
              ))
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// =================================================================
// Filter pill
// =================================================================
const FilterPill: React.FC<{
  label: string; count: number; active: boolean; onPress: () => void;
  colors: ColorPalette; styles: any;
}> = ({ label, count, active, onPress, colors, styles }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress}
    style={[styles.pill, active && styles.pillActive]}>
    <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    {count > 0 && (
      <View style={[styles.pillBadge, active && styles.pillBadgeActive]}>
        <Text style={[styles.pillBadgeText, active && styles.pillBadgeTextActive]}>{count}</Text>
      </View>
    )}
  </TouchableOpacity>
);

// =================================================================
// Announcement card
// =================================================================
const AnnouncementCard: React.FC<{ item: Announcement; colors: ColorPalette; styles: any }> = ({ item, colors, styles }) => {
  const [expanded, setExpanded] = useState(false);
  const type = (item.type ?? '').toUpperCase();
  const isNewsletter = type === 'NEWSLETTER';
  const typeColor = isNewsletter ? colors.purple : colors.primary;
  const typeBg = isNewsletter ? colors.purpleLight : colors.primarySoft;
  const typeIcon = isNewsletter ? 'newspaper' : 'megaphone';

  const previewLen = 110;
  const body = stripHtml(item.body);
  const showExpand = body.length > previewLen;
  const visibleBody = expanded || !showExpand ? body : body.slice(0, previewLen).trimEnd() + '…';

  const handleAttachmentTap = () => {
    if (!item.filePath) return;
    Linking.openURL(item.filePath).catch(() => {
      Alert.alert('Could not open', "We couldn't open the attachment.");
    });
  };

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => showExpand && setExpanded((v) => !v)} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBox, { backgroundColor: typeBg }]}>
          <Ionicons name={typeIcon as any} size={20} color={typeColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.cardTopRow}>
            <Text style={styles.typePill} numberOfLines={1}>
              <Text style={{ color: typeColor, backgroundColor: typeBg }}>  {type || 'NOTICE'}  </Text>
            </Text>
            {item.isNew && <View style={styles.newDot} />}
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title ?? 'Untitled'}</Text>
          <Text style={styles.cardMeta}>
            {item.from ? `From ${item.from}` : 'School Administration'}
            {item.date ? ` • ${formatNiceDate(item.date)}` : ''}
          </Text>
        </View>
      </View>

      {!!body && <Text style={styles.cardBody}>{visibleBody}</Text>}

      {showExpand && (
        <Text style={styles.expandHint}>{expanded ? 'Show less' : 'Read more'}</Text>
      )}

      {item.fileName && (
        <TouchableOpacity activeOpacity={0.7} onPress={handleAttachmentTap} style={styles.attachment}>
          <Feather name="paperclip" size={13} color={colors.primary} />
          <Text style={styles.attachmentText} numberOfLines={1}>{item.fileName}</Text>
          <Feather name="external-link" size={13} color={colors.primary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// =================================================================
// Event card
// =================================================================
const EventCard: React.FC<{ item: TermEvent; colors: ColorPalette; styles: any }> = ({ item, colors, styles }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.cardIconBox, { backgroundColor: colors.infoSoft }]}>
        <Ionicons name="calendar" size={20} color={colors.info} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title ?? 'Event'}</Text>
        <Text style={styles.cardMeta}>{formatDateRange(item.startDate, item.endDate)}</Text>
        {item.className && <Text style={styles.cardMeta}>{item.className}</Text>}
      </View>
    </View>
    {!!item.description && (
      <Text style={styles.cardBody} numberOfLines={4}>{stripHtml(item.description)}</Text>
    )}
  </View>
);

// =================================================================
// Live class card
// =================================================================
const LiveClassCard: React.FC<{ item: LiveClass; colors: ColorPalette; styles: any }> = ({ item, colors, styles }) => {
  const status = (item.status ?? '').toUpperCase();
  const isLive = status === 'LIVE';
  const isScheduled = status === 'SCHEDULED' || status === 'UPCOMING';

  const statusColor = isLive ? colors.danger : isScheduled ? colors.primary : colors.textTertiary;
  const statusBg = isLive ? colors.dangerSoft : isScheduled ? colors.primarySoft : (colors.scheme === 'dark' ? '#2A3744' : '#F3F4F6');

  const handleJoin = () => Alert.alert('Join class', `Opening "${item.title}"…`);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBox, { backgroundColor: colors.purpleLight }]}>
          <Ionicons name="videocam" size={20} color={colors.purple} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={[styles.cardTopRow, { flexWrap: 'wrap' }]}>
            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
              {isLive && <View style={styles.livePulse} />}
              <Text style={[styles.statusPillText, { color: statusColor }]}>{status || 'SCHEDULED'}</Text>
            </View>
            {item.className && <Text style={styles.subPill}>{item.className}</Text>}
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title ?? 'Live class'}</Text>
          <Text style={styles.cardMeta}>{formatTimeRange(item.startsOn, item.endsOn)}</Text>
        </View>
      </View>
      {!!item.description && (
        <Text style={styles.cardBody} numberOfLines={3}>{stripHtml(item.description)}</Text>
      )}
      {(isLive || isScheduled) && (
        <TouchableOpacity activeOpacity={0.85} onPress={handleJoin}
          style={[styles.joinBtn, isLive && { backgroundColor: colors.danger }]}>
          <Ionicons name={isLive ? 'radio' : 'time-outline'} size={14} color="#FFF" />
          <Text style={styles.joinBtnText}>{isLive ? 'Join now' : 'Set reminder'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// =================================================================
// Empty state
// =================================================================
const EmptyState: React.FC<{ icon: any; label: string; colors: ColorPalette; styles: any }> = ({ icon, label, colors, styles }) => (
  <View style={styles.center}>
    <View style={styles.emptyCircle}>
      <Ionicons name={icon} size={28} color={colors.textTertiary} />
    </View>
    <Text style={styles.emptyText}>{label}</Text>
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
function formatTimeRange(startIso: string | null, endIso: string | null): string {
  if (!startIso) return '—';
  try {
    const s = new Date(startIso);
    if (isNaN(s.getTime())) return startIso;
    const dateStr = s.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const startTime = s.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (endIso) {
      const e = new Date(endIso);
      if (!isNaN(e.getTime())) {
        const endTime = e.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        return `${dateStr} · ${startTime}–${endTime}`;
      }
    }
    return `${dateStr} · ${startTime}`;
  } catch { return startIso; }
}
function formatDateRange(startIso: string | null, endIso: string | null): string {
  if (!startIso) return '—';
  try {
    const s = new Date(startIso);
    if (isNaN(s.getTime())) return startIso;
    if (!endIso || startIso === endIso) {
      return s.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }
    const e = new Date(endIso);
    if (isNaN(e.getTime())) return s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    const sDay = s.toLocaleDateString('en-GB', { day: 'numeric', month: sameMonth ? undefined : 'short' });
    const eDay = e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${sDay} – ${eDay}`;
  } catch { return startIso; }
}

// =================================================================
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 18, paddingTop: 8 },

    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    loadingText: { fontSize: 12.5, color: c.textSecondary, marginTop: 12, fontWeight: '500' },
    emptyCircle: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.card,
      borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    emptyText: { fontSize: 12.5, color: c.textSecondary, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18, fontWeight: '500' },

    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.dangerSoft, borderRadius: 12,
      padding: 12, marginBottom: 12,
    },
    errorBannerText: { flex: 1, color: c.danger, fontSize: 12.5, fontWeight: '700' },
    retryInline: { color: c.danger, fontWeight: '800', fontSize: 13 },

    // Filter pills
    pillsRow: { flexDirection: 'row', gap: 8, paddingVertical: 6, marginBottom: 8 },
    pill: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.card,
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 999, borderWidth: 1, borderColor: c.border,
    },
    pillActive: { backgroundColor: c.primary, borderColor: c.primary },
    pillLabel: { fontSize: 12.5, fontWeight: '700', color: c.textSecondary },
    pillLabelActive: { color: '#FFF' },
    pillBadge: {
      minWidth: 20, paddingHorizontal: 6, paddingVertical: 1,
      borderRadius: 99, backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    pillBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
    pillBadgeText: { fontSize: 10, fontWeight: '800', color: c.primary },
    pillBadgeTextActive: { color: '#FFF' },

    // Card
    card: {
      backgroundColor: c.card,
      borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 14, marginBottom: 10,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    cardIconBox: {
      width: 42, height: 42, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    cardTitle: { fontSize: 14.5, fontWeight: '800', color: c.text, marginTop: 4, letterSpacing: -0.2 },
    cardMeta: { fontSize: 11.5, color: c.textSecondary, marginTop: 2, fontWeight: '500' },
    cardBody: { fontSize: 13, color: c.text, lineHeight: 19, marginTop: 4, fontWeight: '500' },

    typePill: {
      fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6,
      overflow: 'hidden', borderRadius: 99,
    },
    newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.danger, marginLeft: 4 },
    expandHint: { fontSize: 12, fontWeight: '700', color: c.primary, marginTop: 6 },
    attachment: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.primarySoft,
      paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, marginTop: 10,
    },
    attachmentText: { flex: 1, fontSize: 12, fontWeight: '700', color: c.primary },

    // Live class
    statusPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
    },
    statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.danger },
    subPill: {
      fontSize: 10.5, fontWeight: '700', color: c.textSecondary,
      backgroundColor: c.backgroundAlt,
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99,
    },
    joinBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: c.primary,
      paddingVertical: 10, borderRadius: 99, marginTop: 8,
    },
    joinBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  });
}
