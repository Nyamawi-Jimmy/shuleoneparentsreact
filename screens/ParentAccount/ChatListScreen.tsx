import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ParentHeader } from '../../components/ParentHeader';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useChatContacts } from '../../hooks/useChatContacts';
import { ChatContact } from '../../api/chat.types';

// =================================================================
// Messages - the parent's conversation list.
//
// FIELD NAMES WERE WRONG. This screen read contact.avatarUrl,
// contact.online and contact.lastMessageAt, but ChatContactDTO ships
// avatar, isOnline and lastMessageTime - so avatars, presence dots and
// timestamps silently never rendered. It also never forwarded peerRole,
// so every thread opened as TEACHER regardless of who the contact was,
// and an ADMIN conversation would load the wrong history.
//
// Rows are cards rather than divider-separated list items, which keeps
// each conversation a distinct tap target and lets the unread state tint
// the whole card instead of just a dot.
// =================================================================

type Filter = 'all' | 'unread';

export const ChatListScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { contacts, totalUnread, loading, refreshing, refresh } = useChatContacts();
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<Filter>('all');

  const filtered = React.useMemo(() => {
    let list = contacts;
    if (filter === 'unread') list = list.filter((c) => (c.unreadCount ?? 0) > 0);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.subtitle ?? '').toLowerCase().includes(q) ||
      (c.lastMessage ?? '').toLowerCase().includes(q),
    );
  }, [contacts, query, filter]);

  return (
    <View style={styles.safe}>
      <ParentHeader title="Messages" showBack />

      <View style={styles.controls}>
        <View style={styles.searchInner}>
          <Feather name="search" size={15} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search teachers or messages…"
            placeholderTextColor={colors.textTertiary}
          />
          {!!query && (
            <TouchableOpacity hitSlop={8} onPress={() => setQuery('')}>
              <Feather name="x" size={15} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.chipRow}>
          <FilterChip
            styles={styles} label="All" count={contacts.length}
            active={filter === 'all'} onPress={() => setFilter('all')}
          />
          <FilterChip
            styles={styles} label="Unread" count={totalUnread}
            active={filter === 'unread'} onPress={() => setFilter('unread')}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading conversations…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          // Contacts are unique per (role, id) - id alone collides when a
          // teacher and an admin happen to share one.
          keyExtractor={(c) => `${c.role ?? 'PEER'}-${c.id ?? c.name ?? ''}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <View style={styles.emptyCircle}>
                <Ionicons name="chatbubbles-outline" size={28} color={colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'unread' ? 'Nothing unread' : 'No conversations yet'}
              </Text>
              <Text style={styles.emptyText}>
                {filter === 'unread'
                  ? 'You are all caught up.'
                  : 'Teacher messages will appear here when sent.'}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <ContactCard
              colors={colors}
              styles={styles}
              contact={item}
              onPress={() => router.push({
                pathname: '/conversation',
                params: {
                  contactId: String(item.id ?? ''),
                  name: item.name ?? '',
                  avatar: item.avatar ?? '',
                  // Without this every thread opened as a TEACHER.
                  role: String(item.role ?? 'TEACHER'),
                  subtitle: item.subtitle ?? item.classLabel ?? '',
                  online: item.isOnline ? '1' : '',
                  lastSeen: item.lastSeen ?? '',
                },
              } as any)}
            />
          )}
        />
      )}
    </View>
  );
};

const FilterChip: React.FC<{
  label: string; count: number; active: boolean; onPress: () => void; styles: any;
}> = ({ label, count, active, onPress, styles }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    style={[styles.chip, active && styles.chipActive]}
  >
    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    {count > 0 && (
      <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text>
    )}
  </TouchableOpacity>
);

const ContactCard: React.FC<{
  contact: ChatContact; onPress: () => void; colors: ColorPalette; styles: any;
}> = ({ contact, onPress, colors, styles }) => {
  const name = contact.name || 'Contact';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '').join('');
  const unread = contact.unreadCount ?? 0;
  const hasUnread = unread > 0;

  // "Grade 5 · James, Mary" - which child this teacher actually teaches is
  // the thing a parent with several children needs to see first.
  const children = (contact.childNames ?? []).filter(Boolean);
  const context = [contact.subtitle || contact.classLabel, children.join(', ')]
    .filter(Boolean).join(' · ');

  const preview = contact.lastMessage
    ? `${contact.lastMessageWasMe ? 'You: ' : ''}${contact.lastMessage}`
    : 'No messages yet';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, hasUnread && styles.cardUnread]}
    >
      <View style={styles.avatarContainer}>
        {contact.avatar ? (
          <Image source={{ uri: contact.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initials || '?'}</Text>
          </View>
        )}
        {contact.isOnline && <View style={styles.onlineDot} />}
      </View>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.topLine}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {!!contact.lastMessageTime && (
            <Text style={[styles.timeText, hasUnread && styles.timeUnread]}>
              {formatRelative(contact.lastMessageTime)}
            </Text>
          )}
        </View>

        {!!context && (
          <Text style={styles.context} numberOfLines={1}>{context}</Text>
        )}

        <View style={styles.bottomLine}>
          <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>
            {preview}
          </Text>
          {hasUnread ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : (
            <Feather name="chevron-right" size={15} color={colors.textTertiary} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },

    controls: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 4 },
    searchInner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.card,
      borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    },
    searchInput: { flex: 1, fontSize: 13.5, color: c.text, fontWeight: '500', padding: 0 },

    chipRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, height: 32, borderRadius: 9,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipLabel: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
    chipLabelActive: { color: '#FFFFFF', fontWeight: '800' },
    chipCount: { fontSize: 11, fontWeight: '800', color: c.textTertiary },
    chipCountActive: { color: 'rgba(255,255,255,0.85)' },

    listContent: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24 },

    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card,
      borderWidth: 1, borderColor: c.border,
      borderRadius: 14, padding: 11, marginBottom: 8,
    },
    cardUnread: { borderColor: c.primary },

    avatarContainer: { position: 'relative' },
    avatar: { width: 46, height: 46, borderRadius: 14 },
    avatarFallback: {
      width: 46, height: 46, borderRadius: 14,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { color: c.primary, fontSize: 15, fontWeight: '900' },
    onlineDot: {
      position: 'absolute', bottom: -2, right: -2,
      width: 13, height: 13, borderRadius: 7,
      backgroundColor: c.success,
      // Ringed in the CARD colour, not the page background - the dot sits on
      // the card, and a background-coloured ring floated in dark mode.
      borderWidth: 2, borderColor: c.card,
    },

    topLine: { flexDirection: 'row', alignItems: 'center' },
    name: { flex: 1, fontSize: 14, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    timeText: { fontSize: 11, color: c.textTertiary, fontWeight: '600', marginLeft: 8 },
    timeUnread: { color: c.primary, fontWeight: '800' },

    context: { fontSize: 10.5, color: c.textTertiary, fontWeight: '600', marginTop: 1 },

    bottomLine: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    preview: { flex: 1, fontSize: 12.5, color: c.textSecondary, fontWeight: '500' },
    previewUnread: { color: c.text, fontWeight: '700' },
    unreadBadge: {
      backgroundColor: c.primary,
      minWidth: 20, height: 20, paddingHorizontal: 6,
      borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8,
    },
    unreadCount: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    loadingText: { fontSize: 12.5, color: c.textSecondary, marginTop: 12, fontWeight: '500' },
    emptyCircle: {
      width: 56, height: 56, borderRadius: 18,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: c.text },
    emptyText: {
      fontSize: 12.5, color: c.textSecondary, marginTop: 6,
      textAlign: 'center', paddingHorizontal: 40, lineHeight: 17,
    },
  });
}
