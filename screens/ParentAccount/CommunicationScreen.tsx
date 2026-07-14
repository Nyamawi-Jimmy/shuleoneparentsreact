import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image, Linking, TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { GradientAppBar } from '../../components/GradientAppBar';
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

  // Assignments. dueCount ("needs attention" = overdue or due within 2 days) is
  // computed at fetch time — the clock is read here, not during render, and the
  // focus-refetch keeps it fresh enough.
  const [dueCount, setDueCount] = useState(0);
  useFocusEffect(useCallback(() => {
    if (!accessToken || studentId == null) { setAssignments([]); setDueCount(0); return; }
    setAssignments(null); setAssignError(false);
    getChildAssignments(accessToken, studentId)
      .then((raw) => {
        const rows = Array.isArray(raw) ? raw : [];
        setAssignments(rows);
        // Badge = how many tasks still need doing (due or overdue).
        setDueCount(rows.filter((a) => a.status === 'OVERDUE' || a.status === 'DUE').length);
      })
      .catch(() => { setAssignments([]); setDueCount(0); setAssignError(true); });
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

  // Opening Updates marks visible-new read (mirrors the web page). Runs from the
  // tab-press handler, not an effect, so no render-phase setState is needed.
  const sweepUnseen = useCallback(() => {
    if (!accessToken) return;
    const unseen = annList.filter((a) => a.isNew && a.id).map((a) => a.id!) as string[];
    if (unseen.length === 0) return;
    setReadIds((prev) => new Set([...prev, ...unseen]));
    unseen.forEach((id) => markAnnouncementRead(accessToken, id).catch(() => {}));
  }, [accessToken, annList]);
  const openTab = (t: Tab) => {
    setTab(t);
    if (t === 'updates') sweepUnseen();
  };

  const unreadChats = contacts.reduce((s, c) => s + (c.unreadCount ?? 0), 0);

  // Tapping one announcement marks just that one read — covers items the
  // tab-open sweep skips, mirroring the web page's read receipts.
  const markOneRead = (id?: string | null) => {
    if (!id || !accessToken || readIds.has(id)) return;
    setReadIds((prev) => new Set([...prev, id]));
    markAnnouncementRead(accessToken, id).catch(() => {});
  };

  const TABS: { id: Tab; label: string; icon: any; count: number }[] = [
    { id: 'assignments', label: 'Assignments', icon: 'clipboard-outline', count: dueCount },
    { id: 'updates', label: 'School updates', icon: 'megaphone-outline', count: newCount },
    { id: 'chats', label: 'Teacher chats', icon: 'chatbubbles-outline', count: unreadChats },
  ];

  return (
    <View style={styles.root}>
      <GradientAppBar
        large overlap
        title="Messages"
        subtitle={`${unreadChats} unread chat${unreadChats !== 1 ? 's' : ''} · ${newCount} school update${newCount !== 1 ? 's' : ''}`}
        right={
          <TouchableOpacity style={styles.helpBtn} activeOpacity={0.8} onPress={() => router.push('/help' as any)}>
            <Ionicons name="help-buoy-outline" size={16} color="#FFF" />
            <Text style={styles.helpBtnText}>Help</Text>
          </TouchableOpacity>
        }
      />

      {/* Floating segmented control — rides over the app bar edge */}
      <View style={styles.segmentWrap}>
        <View style={styles.segment}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <TouchableOpacity key={t.id} style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                activeOpacity={0.85} onPress={() => openTab(t.id)}>
                <Ionicons name={t.icon} size={16} color={active ? '#FFF' : colors.textTertiary} />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>{t.label}</Text>
                {t.count > 0 && (
                  <View style={[styles.segmentBadge, active && styles.segmentBadgeActive]}>
                    <Text style={[styles.segmentBadgeText, active && { color: colors.primary }]}>
                      {t.count > 99 ? '99+' : t.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {tab === 'assignments' ? (
          <AssignmentsTab styles={styles} colors={colors} childName={childName} studentId={studentId} assignments={assignments} error={assignError} />
        ) : tab === 'updates' ? (
          <UpdatesTab styles={styles} colors={colors} loading={loading} announcements={annList} onOpen={markOneRead} />
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
const AssignmentsTab: React.FC<{ styles: any; colors: ColorPalette; childName: string; studentId: number | null; assignments: ParentAssignment[] | null; error: boolean }> =
  ({ styles, colors, childName, studentId, assignments, error }) => {
  const openAssignment = (a: ParentAssignment) => {
    if (a.id == null || studentId == null) return;
    router.push({ pathname: '/help-assignment', params: { examId: String(a.id), studentId: String(studentId), childName } } as any);
  };
  if (assignments === null) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (error) return <View style={styles.errorBox}><Text style={styles.errorText}>Couldn’t load assignments just now.</Text></View>;
  if (assignments.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <MaterialCommunityIcons name="clipboard-text-outline" size={30} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No assignments yet</Text>
        <Text style={styles.emptyText}>When {childName}’s teachers set homework, it’ll appear here.</Text>
      </View>
    );
  }
  return (
    <>
      <View style={styles.aList}>
        {assignments.map((a, i) => {
          const ic = subjectIcon(a.subject, colors);
          const graded = a.status === 'GRADED';
          const submitted = a.status === 'SUBMITTED';
          const overdue = a.status === 'OVERDUE';
          const color = graded || submitted ? colors.success : overdue ? colors.danger : colors.warning;
          const scoreStr = a.score != null && a.maxScore != null ? `${a.score}/${a.maxScore}` : a.score != null ? String(a.score) : null;
          const meta = graded
            ? { word: 'Graded', detail: scoreStr ? `Scored ${scoreStr}` : 'Marked', icon: 'ribbon' as const }
            : submitted
              ? { word: 'Submitted', detail: a.submittedAt ? `Handed in ${shortDate(a.submittedAt)}` : 'Handed in', icon: 'checkmark-circle' as const }
              : overdue
                ? { word: 'Overdue', detail: a.dueAt ? `Was due ${shortDate(a.dueAt)}` : 'Past due', icon: 'alert-circle' as const }
                : { word: dueLabel(a.dueAt), detail: '', icon: 'time' as const };
          const sub = [a.subject, a.teacher].filter(Boolean).join(' · ');
          const done = graded || submitted;
          return (
            <TouchableOpacity key={a.id ?? i} style={styles.aCard} activeOpacity={0.85} onPress={() => openAssignment(a)}>
              <View style={[styles.aAccent, { backgroundColor: color }]} />
              <View style={styles.aBody}>
                <View style={styles.aTopRow}>
                  <View style={[styles.aIcon, { backgroundColor: ic.color + '18' }]}>
                    <MaterialCommunityIcons name={ic.name} size={19} color={ic.color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.aTitle} numberOfLines={2}>{a.title || 'Assignment'}</Text>
                    {!!sub && <Text style={styles.aSub} numberOfLines={1}>{sub}</Text>}
                  </View>
                  {graded && scoreStr && (
                    <View style={[styles.aScore, { borderColor: color + '55' }]}>
                      <Text style={[styles.aScoreVal, { color }]}>{scoreStr}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.aFooter}>
                  <View style={[styles.aStatus, { backgroundColor: color + '18' }]}>
                    <Ionicons name={meta.icon} size={12} color={color} />
                    <Text style={[styles.aStatusText, { color }]}>{meta.word}</Text>
                  </View>
                  {!!meta.detail && <Text style={styles.aDetail} numberOfLines={1}>{meta.detail}</Text>}
                  <View style={styles.aCta}>
                    <Text style={styles.aCtaText}>{done ? 'View' : 'Help do it'}</Text>
                    <Feather name="chevron-right" size={15} color={colors.primary} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.infoNote}>
        <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
        <Text style={styles.infoNoteText}>
          Homework also appears in the class <Text style={{ color: colors.primary, fontFamily: fonts.bold }} onPress={() => router.push('/diary' as any)}>Diary</Text>. {childName} can do tasks from their own learning space.
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
const UpdatesTab: React.FC<{ styles: any; colors: ColorPalette; loading: boolean; announcements: Announcement[]; onOpen: (id?: string | null) => void }> =
  ({ styles, colors, loading, announcements, onOpen }) => {
  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (announcements.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <MaterialCommunityIcons name="bullhorn-outline" size={30} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No announcements yet</Text>
        <Text style={styles.emptyText}>When the school posts a notice or newsletter, it’ll appear here.</Text>
      </View>
    );
  }
  return (
    <>
      {announcements.map((a, i) => {
        const t = annStyle(a.type, colors);
        return (
          <TouchableOpacity key={a.id ?? i} style={styles.annCard} activeOpacity={0.8} onPress={() => onOpen(a.id)}>
            <View style={[styles.annAccent, { backgroundColor: a.isNew ? colors.primary : t.color + '55' }]} />
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
          </TouchableOpacity>
        );
      })}
    </>
  );
};

// ── Chats ────────────────────────────────────────────────────────────────────
const ChatsTab: React.FC<{ styles: any; colors: ColorPalette; contacts: ChatContact[] }> = ({ styles, colors, contacts }) => {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const filtered = q
    ? contacts.filter((cnt) =>
        String(cnt.name || '').toLowerCase().includes(q)
        || String((cnt as any).subtitle || '').toLowerCase().includes(q)
        || String(cnt.lastMessage || '').toLowerCase().includes(q))
    : contacts;

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
    <>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={15} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search chats…"
          placeholderTextColor={colors.textTertiary}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity hitSlop={8} onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      {filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No chats match “{search}”.</Text>
        </View>
      ) : (
    <View style={styles.card}>
      {filtered.map((cnt, i) => {
        const unread = (cnt.unreadCount ?? 0) > 0;
        return (
          <TouchableOpacity
            key={cnt.id ?? i}
            style={[styles.chatRow, i > 0 && styles.divider]}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/conversation', params: { contactId: String(cnt.id ?? ''), name: cnt.name ?? '', avatar: (cnt as any).avatarUrl ?? cnt.avatar ?? '', role: String(cnt.role ?? 'TEACHER') } } as any)}
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
      )}
    </>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 14 },
    center: { padding: 40, alignItems: 'center' },

    // Floating segmented control over the app bar edge
    segmentWrap: { paddingHorizontal: 16, marginTop: -20 },
    segment: {
      flexDirection: 'row', backgroundColor: c.card, borderRadius: 14, padding: 4,
      borderWidth: 1, borderColor: c.border,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12, shadowRadius: 14, elevation: 5,
    },
    segmentBtn: {
      flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
      paddingVertical: 9, paddingHorizontal: 2, borderRadius: 12,
    },
    segmentBtnActive: {
      backgroundColor: c.primary,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3, shadowRadius: 7, elevation: 4,
    },
    segmentText: { fontSize: 11.5, fontFamily: fonts.bold, color: c.textSecondary },
    segmentTextActive: { color: '#FFF' },
    segmentBadge: {
      position: 'absolute', top: 4, right: 6,
      minWidth: 17, height: 17, paddingHorizontal: 4.5, borderRadius: 9,
      backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: c.card,
    },
    segmentBadgeActive: { backgroundColor: '#FFF', borderColor: c.primary },
    segmentBadgeText: { fontSize: 9.5, fontFamily: fonts.extrabold, color: '#FFF' },

    helpBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999,
      paddingHorizontal: 11, paddingVertical: 6,
    },
    helpBtnText: { color: '#FFF', fontSize: 12.5, fontFamily: fonts.bold },

    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.card, borderRadius: 13, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 12, height: 42, marginBottom: 12,
    },
    searchInput: { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: c.text, paddingVertical: 0 },

    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 16 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },

    errorBox: { backgroundColor: c.dangerSoft, borderRadius: 12, padding: 14 },
    errorText: { fontSize: 13, fontFamily: fonts.medium, color: c.danger },
    emptyCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 30, alignItems: 'center' },
    emptyTitle: { fontSize: 15.5, fontFamily: fonts.bold, color: c.text, marginTop: 12 },
    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', marginTop: 5, lineHeight: 19 },

    // Assignment cards — each its own elevated card with a status accent edge,
    // subject icon, and a status footer (distinct from the web's flat rows).
    aList: { gap: 10, marginBottom: 14 },
    aCard: {
      flexDirection: 'row', backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
      shadowColor: '#1e1b3a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
    },
    aAccent: { width: 4, alignSelf: 'stretch' },
    aBody: { flex: 1, padding: 13 },
    aTopRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    aIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    aTitle: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2, lineHeight: 18 },
    aSub: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2 },
    aScore: {
      borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
      alignItems: 'center', justifyContent: 'center', minWidth: 44,
    },
    aScoreVal: { fontSize: 14, fontFamily: fonts.extrabold, letterSpacing: -0.3 },
    aFooter: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 11 },
    aStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4.5 },
    aStatusText: { fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.1 },
    aDetail: { flex: 1, fontSize: 11.5, fontFamily: fonts.medium, color: c.textTertiary },
    aCta: { flexDirection: 'row', alignItems: 'center', gap: 1 },
    aCtaText: { fontSize: 12, fontFamily: fonts.bold, color: c.primary },

    assignRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
    assignIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    assignTitle: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    assignSub: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2 },
    statusChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
    statusChipText: { fontSize: 10.5, fontFamily: fonts.bold },

    infoNote: { flexDirection: 'row', gap: 7, backgroundColor: c.primarySofter, borderRadius: 12, padding: 12, marginBottom: 8 },
    infoNoteText: { flex: 1, fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 17 },

    annCard: {
      flexDirection: 'row', gap: 12, backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 10, overflow: 'hidden',
    },
    annAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
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
