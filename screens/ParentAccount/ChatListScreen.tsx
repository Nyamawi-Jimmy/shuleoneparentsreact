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

export const ChatListScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { contacts, loading, refreshing, refresh } = useChatContacts();
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    if (!query.trim()) return contacts;
    const q = query.toLowerCase();
    return contacts.filter((c) =>
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.lastMessage ?? '').toLowerCase().includes(q),
    );
  }, [contacts, query]);

  return (
    <View style={styles.safe}>
      <ParentHeader title="Messages" showBack />

      <View style={styles.searchWrap}>
        <View style={styles.searchInner}>
          <Feather name="search" size={15} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search messages…"
            placeholderTextColor={colors.textTertiary}
          />
          {!!query && (
            <TouchableOpacity hitSlop={8} onPress={() => setQuery('')}>
              <Feather name="x" size={15} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
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
          keyExtractor={(c) => String(c.id ?? c.name)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <View style={styles.emptyCircle}>
                <Ionicons name="chatbubbles-outline" size={28} color={colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>Teacher messages will appear here when sent.</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <ContactRow
              colors={colors}
              styles={styles}
              contact={item}
              onPress={() => router.push({
                pathname: '/conversation',
                params: { contactId: String(item.id ?? ''), name: item.name ?? '', avatar: item.avatarUrl ?? '' },
              } as any)}
            />
          )}
        />
      )}
    </View>
  );
};

const ContactRow: React.FC<{ contact: ChatContact; onPress: () => void; colors: ColorPalette; styles: any }> = ({ contact, onPress, colors, styles }) => {
  const initials = (contact.name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('');
  const hasUnread = (contact.unreadCount ?? 0) > 0;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.row}>
      <View style={styles.avatarContainer}>
        {contact.avatarUrl ? (
          <Image source={{ uri: contact.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initials || '?'}</Text>
          </View>
        )}
        {contact.online && <View style={styles.onlineDot} />}
      </View>

      <View style={{ flex: 1, marginLeft: 14 }}>
        <View style={styles.topLine}>
          <Text style={styles.name} numberOfLines={1}>{contact.name || 'Contact'}</Text>
          {!!contact.lastMessageAt && (
            <Text style={[styles.timeText, hasUnread && styles.timeUnread]}>
              {formatRelative(contact.lastMessageAt)}
            </Text>
          )}
        </View>
        <View style={styles.bottomLine}>
          <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>
            {contact.lastMessage || 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{contact.unreadCount}</Text>
            </View>
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
    searchWrap: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: c.background },
    searchInner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.scheme === 'dark' ? c.card : '#F3F4F6',
      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    },
    searchInput: { flex: 1, fontSize: 13.5, color: c.text, fontWeight: '500', padding: 0 },
    listContent: { paddingHorizontal: 18 },
    divider: { height: 1, backgroundColor: c.border, marginLeft: 70 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    avatarContainer: { position: 'relative' },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    avatarFallback: {
      width: 50, height: 50, borderRadius: 25,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { color: c.primary, fontSize: 15, fontWeight: '900' },
    onlineDot: {
      position: 'absolute', bottom: 0, right: 0,
      width: 14, height: 14, borderRadius: 7,
      backgroundColor: c.success,
      borderWidth: 2, borderColor: c.background,
    },
    topLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    name: { flex: 1, fontSize: 14.5, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    timeText: { fontSize: 11.5, color: c.textTertiary, fontWeight: '600' },
    timeUnread: { color: c.primary, fontWeight: '800' },
    bottomLine: { flexDirection: 'row', alignItems: 'center' },
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
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: c.text },
    emptyText: { fontSize: 12.5, color: c.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 40, lineHeight: 17 },
  });
}
