import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  getChatHistory,
  sendChatMessage,
  markChatRead,
  uploadChatAttachment,
} from '../api/chat';
import {
  ChatMessage, ChatRole, SendChatBody, UploadResult,
} from '../api/chat.types';
import { ApiError } from '../config/api';

const POLL_INTERVAL_MS = 4000;

interface UseChatConversationArgs {
  peerId: number | null;
  peerRole: ChatRole | null;
}

/**
 * Conversation hook - manages a single chat thread.
 *
 * - Loads history on mount
 * - Polls every 4 seconds while the screen is active and app is foregrounded
 * - Sends messages optimistically (shows immediately with SENDING status)
 * - Uploads attachments before sending
 * - Marks the thread read on mount / when new messages arrive
 */
export function useChatConversation({ peerId, peerRole }: UseChatConversationArgs) {
  const { accessToken } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(true);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || peerId == null || !peerRole) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const list = await getChatHistory(accessToken, peerId, peerRole);
      setMessages(sortAsc(list ?? []));
      // Mark read after loading
      markChatRead(accessToken, peerId, peerRole).catch(() => {});
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load messages.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, peerId, peerRole]);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Polling lifecycle
  useEffect(() => {
    if (!accessToken || peerId == null || !peerRole) return;

    const poll = async () => {
      if (!isActiveRef.current) return;
      try {
        const list = await getChatHistory(accessToken, peerId, peerRole);
        const sorted = sortAsc(list ?? []);
        setMessages((prev) => mergeMessages(prev, sorted));
      } catch {
        // Silent on poll errors - user will see error on manual refresh
      }
    };

    pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    const onAppStateChange = (state: AppStateStatus) => {
      isActiveRef.current = state === 'active';
      if (state === 'active') poll();
    };
    const sub = AppState.addEventListener('change', onAppStateChange);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      sub.remove();
    };
  }, [accessToken, peerId, peerRole]);

  // ── Send a text message ───
  const sendText = useCallback(async (text: string) => {
    if (!accessToken || peerId == null || !peerRole) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const optimistic: ChatMessage = {
      id: -Date.now(),                // negative id so we can replace on success
      from: 'me',
      text: trimmed,
      time: new Date().toISOString(),
      status: 'SENDING',
      attachmentUrl: null, attachmentName: null,
      attachmentSize: null, attachmentType: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);
    try {
      const sent = await sendChatMessage(accessToken, {
        peerId, peerRole, content: trimmed,
      });
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? sent : m));
    } catch (e) {
      setMessages((prev) => prev.map((m) =>
        m.id === optimistic.id ? { ...m, status: 'FAILED' as const } : m,
      ));
    } finally {
      setSending(false);
    }
  }, [accessToken, peerId, peerRole]);

  // ── Send with an attachment ───
  const sendAttachment = useCallback(async (
    file: { uri: string; name: string; type: string },
    caption?: string,
  ) => {
    if (!accessToken || peerId == null || !peerRole) return;

    const optimistic: ChatMessage = {
      id: -Date.now(),
      from: 'me',
      text: caption ?? null,
      time: new Date().toISOString(),
      status: 'SENDING',
      attachmentUrl: file.uri,
      attachmentName: file.name,
      attachmentSize: null,
      attachmentType: file.type,
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);
    try {
      const upload: UploadResult = await uploadChatAttachment(accessToken, file);
      const body: SendChatBody = {
        peerId, peerRole,
        content: caption ?? null,
        attachmentUrl: upload.url,
        attachmentName: upload.name,
        attachmentSize: upload.size,
        attachmentType: upload.type,
      };
      const sent = await sendChatMessage(accessToken, body);
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? sent : m));
    } catch (e) {
      setMessages((prev) => prev.map((m) =>
        m.id === optimistic.id ? { ...m, status: 'FAILED' as const } : m,
      ));
    } finally {
      setSending(false);
    }
  }, [accessToken, peerId, peerRole]);

  // Retry a failed message
  const retry = useCallback(async (failed: ChatMessage) => {
    if (!failed.text && !failed.attachmentUrl) return;
    setMessages((prev) => prev.filter((m) => m.id !== failed.id));
    if (failed.attachmentUrl && failed.attachmentName) {
      sendAttachment(
        {
          uri: failed.attachmentUrl,
          name: failed.attachmentName,
          type: failed.attachmentType ?? 'application/octet-stream',
        },
        failed.text ?? undefined,
      );
    } else if (failed.text) {
      sendText(failed.text);
    }
  }, [sendText, sendAttachment]);

  return {
    messages,
    loading,
    refreshing,
    sending,
    error,
    refresh: () => load(true),
    sendText,
    sendAttachment,
    retry,
  };
}

// =================================================================
// Helpers
// =================================================================
function sortAsc(list: ChatMessage[]): ChatMessage[] {
  return list.slice().sort((a, b) => {
    const tA = a.time ? new Date(a.time).getTime() : 0;
    const tB = b.time ? new Date(b.time).getTime() : 0;
    return tA - tB;
  });
}

/**
 * Merge polled server messages with local state. Preserves any
 * SENDING/FAILED optimistic messages that haven't been confirmed yet.
 */
function mergeMessages(prev: ChatMessage[], fresh: ChatMessage[]): ChatMessage[] {
  const optimistic = prev.filter((m) =>
    typeof m.id === 'number' && m.id < 0 && (m.status === 'SENDING' || m.status === 'FAILED'),
  );
  const seenIds = new Set(fresh.map((m) => m.id));
  const keptOptimistic = optimistic.filter((o) => !seenIds.has(o.id));
  return [...fresh, ...keptOptimistic].sort((a, b) => {
    const tA = a.time ? new Date(a.time).getTime() : 0;
    const tB = b.time ? new Date(b.time).getTime() : 0;
    return tA - tB;
  });
}
