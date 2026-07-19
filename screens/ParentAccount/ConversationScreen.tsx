import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Keyboard,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useChatConversation } from '../../hooks/useChatConversation';
import { isCallingSupported } from '../../hooks/useCallManager';
import { ChatMessage, ChatRole } from '../../api/chat.types';

export const ConversationScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // Pad by the real status-bar height instead of a hardcoded guess, so the
  // clock/battery/notification icons are never sat on by the header row.
  const insets = useSafeAreaInsets();
  // The composer must clear Android's nav keys when the keyboard is DOWN, but
  // not when it's up — the keyboard covers that strip, and padding for it then
  // would float the input on a dead gap.
  const [kbUp, setKbUp] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKbUp(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKbUp(false),
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  const params = useLocalSearchParams<{ contactId?: string; name?: string; avatar?: string; role?: string }>();
  const contactId = params.contactId ? Number(params.contactId) : null;
  const contactName = (params.name as string) || 'Contact';
  const contactAvatar = (params.avatar as string) || '';
  const peerRole = ((params.role as string) || 'TEACHER') as ChatRole;

  const { messages, loading, sendText, sendAttachment, retry } = useChatConversation({ peerId: contactId, peerRole });

  const startCall = () => {
    if (contactId == null) return;
    router.push({
      pathname: '/call',
      params: { mode: 'outgoing', peerId: String(contactId), peerRole: String(peerRole), peerName: contactName },
    } as any);
  };

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    try { await sendText(text); }
    catch (e: any) { Alert.alert('Could not send', e?.message ?? 'Try again.'); }
    finally { setSending(false); }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['image/*', 'application/pdf'],
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;
      setSending(true);
      await sendAttachment({
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'application/octet-stream',
      });
    } catch (e: any) { Alert.alert('Upload failed', e?.message ?? 'Try again.'); }
    finally { setSending(false); }
  };

  const pickPhoto = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          fromCamera ? 'Camera permission needed' : 'Photos permission needed',
          'Allow access in Settings to send pictures.',
        );
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ['images'] });
      if (result.canceled) return;
      const img = result.assets?.[0];
      if (!img) return;
      setSending(true);
      await sendAttachment({
        uri: img.uri,
        name: img.fileName ?? `photo-${Date.now()}.jpg`,
        type: img.mimeType ?? 'image/jpeg',
      });
    } catch (e: any) { Alert.alert('Upload failed', e?.message ?? 'Try again.'); }
    finally { setSending(false); }
  };

  // Paperclip → choose a source. A single picker meant a parent photographing
  // homework had to save it to files first.
  const handleAttach = () => {
    Alert.alert('Send an attachment', 'What would you like to send?', [
      { text: 'Take a photo', onPress: () => pickPhoto(true) },
      { text: 'Choose a photo', onPress: () => pickPhoto(false) },
      { text: 'Choose a file', onPress: pickDocument },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const initials = contactName.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('');

  return (
    <View style={styles.safe}>
      <LinearGradient
        colors={['#FB7185', '#E11D48']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          {contactAvatar ? (
            <Image source={{ uri: contactAvatar }} style={{ width: 38, height: 38, borderRadius: 19 }} />
          ) : (
            <Text style={styles.headerInitials}>{initials || '?'}</Text>
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerName} numberOfLines={1}>{contactName}</Text>
          <Text style={styles.headerStatus}>School staff</Text>
        </View>
        {isCallingSupported() && contactId != null && (
          <TouchableOpacity onPress={startCall} style={styles.callBtn} activeOpacity={0.85} hitSlop={8}>
            <Ionicons name="call" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading messages…</Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m, i) => String(m.id ?? `${m.time}-${i}`)}
            contentContainerStyle={styles.messagesContent}
            ListEmptyComponent={() => (
              <View style={styles.center}>
                <View style={styles.emptyCircle}>
                  <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.textTertiary} />
                </View>
                <Text style={styles.emptyTitle}>Start the conversation</Text>
                <Text style={styles.emptyText}>Send a message below to {contactName}.</Text>
              </View>
            )}
            renderItem={({ item, index }) => {
              const prev = messages[index - 1];
              const showDate = !prev || !sameDay(prev.time, item.time);
              return (
                <View>
                  {showDate && (
                    <View style={styles.dateSeparator}>
                      <Text style={styles.dateText}>{formatDateLabel(item.time)}</Text>
                    </View>
                  )}
                  <MessageBubble
                    colors={colors} styles={styles}
                    message={item}
                    onRetry={() => retry(item)}
                  />
                </View>
              );
            }}
          />
        )}

        <View style={[styles.composer, { paddingBottom: (kbUp ? 0 : insets.bottom) + 10 }]}>
          <TouchableOpacity activeOpacity={0.7} onPress={handleAttach} style={styles.attachBtn}>
            <Feather name="paperclip" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message…"
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={1000}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSend}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.5 }]}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const MessageBubble: React.FC<{ message: ChatMessage; onRetry: () => void; colors: ColorPalette; styles: any }> = ({ message, onRetry, colors, styles }) => {
  const isMine = message.from === 'me';
  const status = String(message.status ?? '').toUpperCase();
  const isFailed = status === 'FAILED';

  return (
    <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
      <View style={[
        styles.bubble,
        isMine ? styles.bubbleMine : styles.bubbleOther,
        isFailed && styles.bubbleFailed,
      ]}>
        {message.attachmentUrl && (
          <Image source={{ uri: message.attachmentUrl }} style={styles.attachmentImg} />
        )}
        {!!message.text && (
          <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
            {message.text}
          </Text>
        )}
        <View style={styles.bubbleMetaRow}>
          <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : styles.bubbleTimeOther]}>
            {formatTime(message.time)}
          </Text>
          {isMine && (status === 'SENT' || status === 'DELIVERED' || status === 'READ') && (
            <Ionicons name="checkmark-done" size={11} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
          )}
          {isMine && status === 'SENDING' && (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
          )}
        </View>
      </View>
      {isFailed && (
        <TouchableOpacity hitSlop={8} onPress={onRetry} style={styles.retryBtn}>
          <Ionicons name="refresh" size={12} color={colors.danger} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

function formatTime(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return ''; }
}
function sameDay(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  try { return new Date(a).toDateString() === new Date(b).toDateString(); }
  catch { return false; }
}
function formatDateLabel(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  } catch { return ''; }
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.backgroundAlt },
    header: {
      // paddingTop comes from the safe-area inset inline (see component).
      paddingBottom: 14, paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    headerAvatar: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    headerInitials: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
    headerName: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
    headerStatus: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, fontWeight: '500' },
    callBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center', justifyContent: 'center',
    },

    messagesContent: { padding: 14, flexGrow: 1 },
    dateSeparator: { alignItems: 'center', marginVertical: 12 },
    dateText: {
      backgroundColor: c.card,
      paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999,
      fontSize: 11, color: c.textSecondary, fontWeight: '700',
      borderWidth: 1, borderColor: c.border,
    },

    bubbleRow: { marginVertical: 3, flexDirection: 'column', alignItems: 'flex-start' },
    bubbleRowMine: { alignItems: 'flex-end' },
    bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
    bubbleMine: { backgroundColor: c.primary, borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: c.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: c.border },
    bubbleFailed: { borderColor: c.danger, borderWidth: 1 },
    bubbleText: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
    bubbleTextMine: { color: '#FFFFFF' },
    bubbleTextOther: { color: c.text },
    bubbleMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
    bubbleTime: { fontSize: 10, fontWeight: '600' },
    bubbleTimeMine: { color: 'rgba(255,255,255,0.75)' },
    bubbleTimeOther: { color: c.textTertiary },
    attachmentImg: { width: 180, height: 180, borderRadius: 10, marginBottom: 6 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, paddingHorizontal: 4 },
    retryText: { color: c.danger, fontSize: 11, fontWeight: '700' },

    composer: {
      flexDirection: 'row', alignItems: 'flex-end',
      paddingHorizontal: 12, paddingVertical: 10, gap: 8,
      backgroundColor: c.background,
      borderTopWidth: 1, borderTopColor: c.border,
    },
    attachBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: c.scheme === 'dark' ? c.card : '#F3F4F6',
      alignItems: 'center', justifyContent: 'center',
    },
    inputWrap: {
      flex: 1,
      backgroundColor: c.scheme === 'dark' ? c.card : '#F3F4F6',
      borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 8, maxHeight: 110,
    },
    input: { fontSize: 14, color: c.text, fontWeight: '500', padding: 0, minHeight: 22 },
    sendBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: c.primary,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: c.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
    },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
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
