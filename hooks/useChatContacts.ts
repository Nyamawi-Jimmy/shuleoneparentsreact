import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getChatContacts } from '../api/chat';
import { ChatContact } from '../api/chat.types';
import { ApiError } from '../config/api';

export function useChatContacts() {
  const { accessToken } = useAuth();

  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const list = await getChatContacts(accessToken);
      // Sort: unread first, then most-recent last-message
      const sorted = (list ?? []).slice().sort((a, b) => {
        const uA = a.unreadCount ?? 0;
        const uB = b.unreadCount ?? 0;
        if ((uA > 0) !== (uB > 0)) return uA > 0 ? -1 : 1;
        const tA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const tB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return tB - tA;
      });
      setContacts(sorted);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load chats.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalUnread = contacts.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  return {
    contacts,
    totalUnread,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
  };
}
