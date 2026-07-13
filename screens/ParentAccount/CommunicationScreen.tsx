import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image, Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { ParentHeader } from '../../components/ParentHeader';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useCommunication } from '../../hooks/useCommunication';
import { useChatContacts } from '../../hooks/useChatContacts';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useAuth } from '../../context/AuthContext';
import { getAnnouncementReadIds, markAnnouncementRead } from '../../api/communication';
import { getChildAssignments } from '../../api/assignments';
import { Announcement } from '../../api/communication.types';
import { ParentAssignment } from '../../api/assignments.types';
import { ChatContact } from '../../api/chat.types';

type Tab = 'assignments' | 'updates' | 'chats';

const stripHtml = (s?: string | null) => (s ? s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : '');
const relTime = (iso?: string | null): string => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const diff = Date.now() - t;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const shortDate = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const dueLabel = (iso?: string | null): string => {
  if (!iso) return 'Due';
  const d = new Date(iso); if (isNaN(d.getTime())) return 'Due';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff <= 6) return `Due in ${diff}d`;
  return `Due ${shortDate(iso)}`;
};
const initials = (name?: string | null) =>
  (name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || '?';

export const CommunicationScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();
  const { announcements, loading, refreshing, refresh } = useCommunication();
  const { contacts } = useChatContacts();

  const [tab, setTab] = useState<Tab>('assignments');
  const [assignments, setAssignments] = useState<ParentAssignment[] | null>(null);
  const [assignError, setAssignError] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const studentId = selectedChild?.studentId ?? null;
  const childName = selectedChild?.firstName || selectedChild?.fullName || 'your child';

  // Assignments
  useFocusEffect(useCallback(() => {
    if (!accessToken || studentId == null) { setAssignments([]); return; }
    setAssignments(null); setAssignError(false);
    getChildAssignments(accessToken, studentId)
      .then((rows) => setAssignments(Array.isArray(rows) ? rows : []))
      .catch(() => { setAssignments([]); setAssignError(true); });
  }, [accessToken, studentId]));

  // Announcement read-ids
  useEffect(() => {
    if (!accessToken) return;
    getAnnouncementReadIds(accessToken).then((ids) => setReadIds(new Set(ids ?? []))).catch(() => {});
  }, [accessToken]);

  const annList = useMemo(() =>
    [...announcements].map((a) => ({ ...a, isNew: !!a.isNew && !(a.id && readIds.has(a.id)) })),
    [announcements, readIds]);
  const newCount = annList.filter((a) => a.isNew).length;

  // Opening Updates marks visible-new read
  useEffect(() => {
    if (tab !== 'updates' || !accessToken) return;
    const unseen = annList.filter((a) => a.isNew && a.id).map((a) => a.id!) as string[];
    if (unseen.length === 0) return;
    setReadIds((prev) => new Set([...prev, ...unseen]));
    unseen.forEach((id) => markAnnouncementRead(accessToken, id).catch(() => {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const assignList = assignments ?? [];
  const dueCount = assignList.filter((a) => a.status === 'OVERDUE' || (a.status === 'DUE' && a.dueAt && new Date(a.dueAt).getTime() - Date.now() <= 2 * 86400000)).length;
  const unreadChats = contacts.reduce((s, c) => s + (c.unreadCount ?? 0), 0);

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'assignments', label: 'Tasks', count: dueCount },
    { id: 'updates', label: 'Updates', count: newCount },
    { id: 'chats', label: 'Chats', count: unreadChats },
  ];

  return (
    <View style={styles.root}>
      <ParentHeader title="Messages" showBack={false} rightIcon="none" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <Text style={styles.subtitle} numberOfLines={1}>
          {unreadChats} unread chat{unreadChats !== 1 ? 's' : ''} · {newCount} school update{newCount !== 1 ? 's' : ''}
        </Text>

        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <TouchableOpacity key={t.id} style={[styles.tab, active && styles.tabActive]} activeOpacity={0.8} onPress={() => setTab(t.id)}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                {t.count > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: active ? '#FFFFFF33' : colors.primarySofter }]}>
                    <Text style={[styles.tabBadgeText, { color: active ? '#FFF' : colors.primary }]}>{t.count > 99 ? '99+' : t.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'assignments' ? (
          <AssignmentsTab styles={styles} colors={colors} childName={childName} assignments={assignments} error={assignError} />
        ) : tab === 'updates' ? (
          <UpdatesTab styles={styles} colors={colors} loading={loading} announcements={annList} />
        ) : (
          <ChatsTab styles={styles} colors={colors} contacts={contacts} />
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
};

// ── Assignments ──────────────────────────────────────────────────────────────
const subjectIcon = (subject: string | null, c: ColorPalette): { name: any; color: string } => {
  const s = String(subject || '').toLowerCase();
  if (/cod|robot/.test(s)) return { name: 'code-tags', color: c.purple };
  if (/math|hisabati/.test(s)) return { name: 'calculator-variant', color: c.info };
  if (/kiswahili|swahili/.test(s)) return { name: 'book-alphabet', color: c.success };
  if (/scien|sayansi/.test(s)) return { name: 'flask-outline', color: c.warning };
  if (/english|lugha/.test(s)) return { name: 'book-open-variant', color: c.danger };
  return { name: 'file-document-outline', color: c.primary };
};
const AssignmentsTab: React.FC<{ styles: any; colors: ColorPalette; childName: string; assignments: ParentAssignment[] | null; error: boolean }> =
  ({ styles, colors, childName, assignments, error }) => {
  if (assignments === null) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (error) return <View style={styles.errorBox}><Text style={styles.errorText}>Couldn't load assignments just now.</Text></View>;
  if (assignments.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <MaterialCommunityIcons name="clipboard-text-outline" size={30} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No assignments yet</Text>
        <Text style={styles.emptyText}>When {childName}'s teachers set homework, it'll appear here.</Text>
      </View>
    );
  }
  return (
    <>
      <View style={styles.card}>
        {assignments.map((a, i) => {
          const ic = subjectIcon(a.subject, colors);
          const graded = a.status === 'GRADED';
          const submitted = a.status === 'SUBMITTED';
          const overdue = a.status === 'OVERDUE';
          const statusColor = graded || submitted ? colors.success : overdue ? colors.danger : colors.warning;
          const scoreStr = a.score != null && a.maxScore != null ? `${a.score}/${a.maxScore}` : a.score != null ? String(a.score) : null;
          const statusLabel = graded ? (scoreStr ? `Graded · ${scoreStr}` : 'Graded')
            : submitted ? (a.submittedAt ? `Submitted ${shortDate(a.submittedAt)}` : 'Submitted')
            : overdue ? 'Overdue' : dueLabel(a.dueAt);
          const sub = [a.subject, a.teacher].filter(Boolean).join(' · ');
          return (
            <View key={a.id ?? i} style={[styles.assignRow, i > 0 && styles.divider]}>
              <View style={[styles.assignIcon, { backgroundColor: ic.color + '1A' }]}>
                <MaterialCommunityIcons name={ic.name} size={19} color={ic.color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.assignTitle} numberOfLines={1}>{a.title || 'Assignment'}</Text>
                {!!sub && <Text style={styles.assignSub} numberOfLines={1}>{sub}</Text>}
              </View>
              <View style={[styles.statusChip, { backgroundColor: statusColor + '1A' }]}>
                <Text style={[styles.statusChipText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.infoNote}>
        <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
        <Text style={styles.infoNoteText}>
          Homework also appears in the class <Text style={{ color: colors.primary, fontFamily: fonts.bold }} onPress={() => router.push('/(tabs)/diary' as any)}>Diary</Text>. {childName} can do tasks from their own learning space.
        </Text>
      </View>
    </>
  );
};

// ── Updates (announcements) ──────────────────────────────────────────────────
const annStyle = (type: string | null, c: ColorPalette): { name: any; color: string; label: string } => {
  const t = String(type || '').toUpperCase();
  if (t === 'NEWSLETTER') return { name: 'file-document', color: c.warning, label: 'Newsletter' };
  if (t === 'EVENT') return { name: 'calendar', color: c.success, label: 'Event' };
  if (t === 'INVITATION') return { name: 'account-group', color: c.purple, label: 'Invite' };
  return { name: 'bullhorn', color: c.info, label: 'Notice' };
};
const UpdatesTab: React.FC<{ styles: any; colors: ColorPalette; loading: boolean; announcements: Announcement[] }> =
  ({ styles, colors, loading, announcements }) => {
  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (announcements.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <MaterialCommunityIcons name="bullhorn-outline" size={30} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No announcements yet</Text>
        <Text style={styles.emptyText}>When the school posts a notice or newsletter, it'll appear here.</Text>
      </View>
    );
  }
  return (
    <>
      {announcements.map((a, i) => {
        const t = annStyle(a.type, colors);
        return (
          <View key={a.id ?? i} style={styles.annCard}>
            <View style={[styles.annIcon, { backgroundColor: t.color + '1A' }]}>
              <MaterialCommunityIcons name={t.name} size={20} color={t.color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.annTitleRow}>
                <Text style={styles.annTitle} numberOfLines={2}>{a.title || 'Announcement'}</Text>
                {a.isNew && <View style={styles.newChip}><Text style={styles.newChipText}>NEW</Text></View>}
              </View>
              {!!a.body && <Text style={styles.annBody}>{stripHtml(a.body)}</Text>}
              {a.type?.toUpperCase() === 'NEWSLETTER' && !!a.fileName && (
                a.filePath ? (
                  <TouchableOpacity style={styles.annFile} onPress={() => Linking.openURL(a.filePath!)} activeOpacity={0.7}>
                    <Feather name="file-text" size={13} color={colors.primary} />
                    <Text style={styles.annFileText} numberOfLines={1}>{a.fileName}</Text>
                    <Feather name="download" size={12} color={colors.primary} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.annFile}><Feather name="file-text" size={13} color={colors.textTertiary} /><Text style={[styles.annFileText, { color: colors.textTertiary }]} numberOfLines={1}>{a.fileName}</Text></View>
                )
              )}
              <View style={styles.annFooter}>
                <Text style={styles.annMeta}>{[a.from, relTime(a.date)].filter(Boolean).join(' · ')}</Text>
                <View style={[styles.typeChip, { backgroundColor: t.color + '14' }]}><Text style={[styles.typeChipText, { color: t.color }]}>{t.label}</Text></View>
              </View>
            </View>
          </View>
        );
      })}
    </>
  );
};

// ── Chats ────────────────────────────────────────────────────────────────────
const ChatsTab: React.FC<{ styles: any; colors: ColorPalette; contacts: ChatContact[] }> = ({ styles, colors, contacts }) => {
  if (contacts.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <MaterialCommunityIcons name="chat-outline" size={30} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No conversations yet</Text>
        <Text style={styles.emptyText}>Teacher messages will appear here when the school opens a chat.</Text>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      {contacts.map((cnt, i) => {
        const unread = (cnt.unreadCount ?? 0) > 0;
        return (
          <TouchableOpacity
            key={cnt.id ?? i}
            style={[styles.chatRow, i > 0 && styles.divider]}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/conversation', params: { contactId: String(cnt.id ?? ''), name: cnt.name ?? '', avatar: (cnt as any).avatarUrl ?? cnt.avatar ?? '' } } as any)}
          >
            <View style={styles.chatAvatarWrap}>
              {(cnt as any).avatarUrl || cnt.avatar ? (
                <Image source={{ uri: (cnt as any).avatarUrl ?? cnt.avatar! }} style={styles.chatAvatar} />
              ) : (
                <View style={[styles.chatAvatar, { backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.chatInitials}>{initials(cnt.name)}</Text>
                </View>
              )}
              {cnt.isOnline && <View style={styles.onlineDot} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.chatTopRow}>
                <Text style={[styles.chatName, unread && { fontFamily: fonts.extrabold }]} numberOfLines={1}>{cnt.name || 'Teacher'}</Text>
                <Text style={styles.chatTime}>{relTime(cnt.lastMessageTime)}</Text>
              </View>
              {!!cnt.subtitle && <Text style={styles.chatSubtitle} numberOfLines={1}>{cnt.subtitle}</Text>}
              <View style={styles.chatBottomRow}>
                <Text style={[styles.chatMsg, unread && { color: colors.text, fontFamily: fonts.semibold }]} numberOfLines={1}>
                  {cnt.lastMessageWasMe ? 'You: ' : ''}{cnt.lastMessage || 'No messages yet'}
                </Text>
                {unread && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{cnt.unreadCount}</Text></View>}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 4 },
    center: { padding: 40, alignItems: 'center' },
    subtitle: { fontSize: 12, fontFamily: fonts.medium, color: c.textTertiary, marginBottom: 12, marginLeft: 2 },

    tabs: { flexDirection: 'row', backgroundColor: c.backgroundAlt, borderRadius: 12, padding: 4, marginBottom: 20 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 9 },
    tabActive: { backgroundColor: c.primary },
    tabText: { fontSize: 13, fontFamily: fonts.bold, color: c.textSecondary },
    tabTextActive: { color: '#FFF' },
    tabBadge: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    tabBadgeText: { fontSize: 10.5, fontFamily: fonts.bold },

    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 16 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },

    errorBox: { backgroundColor: c.dangerSoft, borderRadius: 12, padding: 14 },
    errorText: { fontSize: 13, fontFamily: fonts.medium, color: c.danger },
    emptyCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 30, alignItems: 'center' },
    emptyTitle: { fontSize: 15.5, fontFamily: fonts.bold, color: c.text, marginTop: 12 },
    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', marginTop: 5, lineHeight: 19 },

    assignRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
    assignIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    assignTitle: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    assignSub: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2 },
    statusChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
    statusChipText: { fontSize: 10.5, fontFamily: fonts.bold },

    infoNote: { flexDirection: 'row', gap: 7, backgroundColor: c.primarySofter, borderRadius: 12, padding: 12, marginBottom: 8 },
    infoNoteText: { flex: 1, fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 17 },

    annCard: { flexDirection: 'row', gap: 12, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 10 },
    annIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    annTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    annTitle: { flex: 1, fontSize: 14.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    newChip: { backgroundColor: c.primary, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, marginTop: 1 },
    newChipText: { fontSize: 9.5, fontFamily: fonts.extrabold, color: '#FFF', letterSpacing: 0.5 },
    annBody: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 4, lineHeight: 18 },
    annFile: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    annFileText: { flex: 1, fontSize: 12, fontFamily: fonts.semibold, color: c.primary },
    annFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    annMeta: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary, flex: 1 },
    typeChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
    typeChipText: { fontSize: 10.5, fontFamily: fonts.bold },

    chatRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    chatAvatarWrap: { position: 'relative' },
    chatAvatar: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden' },
    chatInitials: { fontSize: 15, fontFamily: fonts.extrabold, color: c.primary },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: c.success, borderWidth: 2, borderColor: c.card },
    chatTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    chatName: { flex: 1, fontSize: 14.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    chatTime: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary },
    chatSubtitle: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 1 },
    chatBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
    chatMsg: { flex: 1, fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary },
    unreadBadge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    unreadBadgeText: { fontSize: 11, fontFamily: fonts.bold, color: '#FFF' },
  });
}
