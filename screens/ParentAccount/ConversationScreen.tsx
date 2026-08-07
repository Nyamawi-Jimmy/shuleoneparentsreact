import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Keyboard,
  Modal, Pressable, Linking,
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
import { MAX_FILE_BYTES, MAX_FILE_LABEL } from '../../api/chat';

// =================================================================
// Conversation - one thread with a teacher or admin.
//
// The header gradient used to be two hardcoded rose hex values. They
// happen to match the light palette, but they are fixed: in dark mode the
// brand lifts to a lighter rose and the header stayed dark, so it no
// longer matched anything else on screen. It reads from the palette now.
//
// Attachments used to open Alert.alert with four buttons, which is an OS
// dialog with no styling and no icons. It is a proper sheet now, and the
// upload reports real progress rather than freezing the send button.
// =================================================================

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

  const params = useLocalSearchParams<{
    contactId?: string; name?: string; avatar?: string; role?: string;
    subtitle?: string; online?: string; lastSeen?: string;
  }>();
  const contactId = params.contactId ? Number(params.contactId) : null;
  const contactName = (params.name as string) || 'Contact';
  const contactAvatar = (params.avatar as string) || '';
  const peerRole = ((params.role as string) || 'TEACHER') as ChatRole;
  const subtitle = (params.subtitle as string) || '';
  const isOnline = !!params.online;
  const lastSeen = (params.lastSeen as string) || '';

  const {
    messages, loading, uploadProgress, error, clearError,
    sendText, sendAttachment, retry,
  } = useChatConversation({ peerId: contactId, peerRole });

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const flatRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  // Upload failures now carry the server's wording (it explains the size cap
  // on a 413); show it once, then clear so it cannot re-fire.
  useEffect(() => {
    if (!error) return;
    Alert.alert('Could not send', error);
    clearError();
  }, [error, clearError]);

  const startCall = () => {
    if (contactId == null) return;
    router.push({
      pathname: '/call',
      params: { mode: 'outgoing', peerId: String(contactId), peerRole: String(peerRole), peerName: contactName },
    } as any);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    try { await sendText(text); }
    catch (e: any) { Alert.alert('Could not send', e?.message ?? 'Try again.'); }
    finally { setSending(false); }
  };

  const guardSize = (size?: number | null): boolean => {
    if (size != null && size > MAX_FILE_BYTES) {
      Alert.alert(
        'File too large',
        `That file is ${formatBytes(size)}. The limit is ${MAX_FILE_LABEL}.`,
      );
      return false;
    }
    return true;
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
      if (!guardSize(file.size)) return;
      setSending(true);
      await sendAttachment({
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'application/octet-stream',
        size: file.size ?? undefined,
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
      if (!guardSize(img.fileSize)) return;
      setSending(true);
      await sendAttachment({
        uri: img.uri,
        name: img.fileName ?? `photo-${Date.now()}.jpg`,
        type: img.mimeType ?? 'image/jpeg',
        size: img.fileSize ?? undefined,
      });
    } catch (e: any) { Alert.alert('Upload failed', e?.message ?? 'Try again.'); }
    finally { setSending(false); }
  };

  const runAttach = (fn: () => void) => { setAttachOpen(false); setTimeout(fn, 220); };

  const initials = contactName.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '').join('');

  const presence = isOnline
    ? 'Online now'
    : lastSeen
      ? `Last seen ${formatRelative(lastSeen)}`
      : subtitle || 'School staff';

  const uploading = uploadProgress != null;

  return (
    <View style={styles.safe}>
      <LinearGradient
        // Palette-driven, so the header follows light/dark like everything else.
        colors={[colors.primaryLight, colors.primary]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerAvatarWrap}>
          <View style={styles.headerAvatar}>
            {contactAvatar ? (
              <Image source={{ uri: contactAvatar }} style={styles.headerAvatarImg} />
            ) : (
              <Text style={styles.headerInitials}>{initials || '?'}</Text>
            )}
          </View>
          {isOnline && <View style={styles.headerOnlineDot} />}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerName} numberOfLines={1}>{contactName}</Text>
          <Text style={styles.headerStatus} numberOfLines={1}>{presence}</Text>
        </View>

        {isCallingSupported() && contactId != null && (
          <TouchableOpacity onPress={startCall} style={styles.callBtn} activeOpacity={0.85} hitSlop={8}>
            <Ionicons name="call" size={18} color="#FFFFFF" />
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

        <View style={[styles.composerWrap, { paddingBottom: (kbUp ? 0 : insets.bottom) + 10 }]}>
          {uploading && (
            <View style={styles.uploadStrip}>
              <View style={styles.uploadTrack}>
                <View style={[styles.uploadFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.uploadLabel}>Uploading… {uploadProgress}%</Text>
            </View>
          )}

          <View style={styles.composer}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setAttachOpen(true)}
              disabled={sending}
              style={[styles.attachBtn, sending && { opacity: 0.5 }]}
            >
              <Feather name="paperclip" size={18} color={colors.primary} />
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
              style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.45 }]}
            >
              {sending && !uploading
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Ionicons name="send" size={17} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <AttachSheet
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onCamera={() => runAttach(() => pickPhoto(true))}
        onPhoto={() => runAttach(() => pickPhoto(false))}
        onFile={() => runAttach(pickDocument)}
        colors={colors}
        styles={styles}
      />
    </View>
  );
};

// =================================================================
// Attach sheet - replaces a bare Alert.alert with something that
// matches the app.
// =================================================================
const AttachSheet: React.FC<{
  visible: boolean; onClose: () => void;
  onCamera: () => void; onPhoto: () => void; onFile: () => void;
  colors: ColorPalette; styles: any;
}> = ({ visible, onClose, onCamera, onPhoto, onFile, colors, styles }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={styles.sheetGrip} />
        <Text style={styles.sheetTitle}>SEND AN ATTACHMENT</Text>
        <View style={styles.sheetRow}>
          <SheetOption styles={styles} colors={colors} icon="camera" label="Camera" onPress={onCamera} />
          <SheetOption styles={styles} colors={colors} icon="image" label="Photo" onPress={onPhoto} />
          <SheetOption styles={styles} colors={colors} icon="file-text" label="File" onPress={onFile} />
        </View>
        <Text style={styles.sheetHint}>Images and PDFs, up to {MAX_FILE_LABEL}.</Text>
      </Pressable>
    </Pressable>
  </Modal>
);

const SheetOption: React.FC<{
  icon: any; label: string; onPress: () => void; colors: ColorPalette; styles: any;
}> = ({ icon, label, onPress, colors, styles }) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.sheetOption}>
    <View style={styles.sheetIconCircle}>
      <Feather name={icon} size={19} color={colors.primary} />
    </View>
    <Text style={styles.sheetOptionLabel}>{label}</Text>
  </TouchableOpacity>
);

// =================================================================
// Bubble
// =================================================================
const MessageBubble: React.FC<{
  message: ChatMessage; onRetry: () => void; colors: ColorPalette; styles: any;
}> = ({ message, onRetry, colors, styles }) => {
  const isMine = message.from === 'me';
  const status = String(message.status ?? '').toUpperCase();
  const isFailed = status === 'FAILED';
  const url = message.attachmentUrl;
  const type = String(message.attachmentType ?? '');
  const isImage = !!url && (type.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(url));

  return (
    <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
      <View style={[
        styles.bubble,
        isMine ? styles.bubbleMine : styles.bubbleOther,
        isFailed && styles.bubbleFailed,
      ]}>
        {isImage && (
          <Image source={{ uri: url! }} style={styles.attachmentImg} />
        )}

        {/* A PDF used to be fed to <Image>, which rendered a blank box. */}
        {!!url && !isImage && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Linking.openURL(url).catch(() => {})}
            style={styles.fileCard}
          >
            <View style={styles.fileIcon}>
              <Feather name="file-text" size={16} color={isMine ? '#FFFFFF' : colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={[styles.fileName, isMine ? styles.bubbleTextMine : styles.bubbleTextOther]}
              >
                {message.attachmentName || 'Attachment'}
              </Text>
              {message.attachmentSize != null && (
                <Text style={[styles.fileSize, isMine && { color: 'rgba(255,255,255,0.75)' }]}>
                  {formatBytes(message.attachmentSize)}
                </Text>
              )}
            </View>
            <Feather name="download" size={14} color={isMine ? 'rgba(255,255,255,0.8)' : colors.textTertiary} />
          </TouchableOpacity>
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
            <Ionicons
              name={status === 'READ' ? 'checkmark-done' : 'checkmark'}
              size={12}
              color={status === 'READ' ? '#BAE6FD' : 'rgba(255,255,255,0.7)'}
              style={{ marginLeft: 4 }}
            />
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

// =================================================================
// Helpers
// =================================================================
function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}
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
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingBottom: 16,
      borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
    },
    headerAvatarWrap: { position: 'relative', marginLeft: 10 },
    headerAvatar: {
      width: 38, height: 38, borderRadius: 13,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    headerAvatarImg: { width: 38, height: 38, borderRadius: 13 },
    headerInitials: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
    headerOnlineDot: {
      position: 'absolute', bottom: -2, right: -2,
      width: 12, height: 12, borderRadius: 6,
      backgroundColor: c.success, borderWidth: 2, borderColor: '#FFFFFF',
    },
    headerName: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
    headerStatus: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 1 },
    callBtn: {
      width: 36, height: 36, borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
      alignItems: 'center', justifyContent: 'center',
    },

    messagesContent: { padding: 16, paddingBottom: 20 },
    dateSeparator: { alignItems: 'center', marginVertical: 12 },
    dateText: {
      fontSize: 10.5, fontWeight: '700', color: c.textSecondary,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, overflow: 'hidden',
    },

    bubbleRow: { marginBottom: 8, alignItems: 'flex-start' },
    bubbleRowMine: { alignItems: 'flex-end' },
    bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 12, paddingTop: 9, paddingBottom: 6 },
    bubbleMine: { backgroundColor: c.primary, borderBottomRightRadius: 5 },
    bubbleOther: {
      backgroundColor: c.card, borderBottomLeftRadius: 5,
      borderWidth: 1, borderColor: c.border,
    },
    bubbleFailed: { borderWidth: 1, borderColor: c.danger },
    bubbleText: { fontSize: 13.5, lineHeight: 19 },
    bubbleTextMine: { color: '#FFFFFF' },
    bubbleTextOther: { color: c.text },
    bubbleMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 3 },
    bubbleTime: { fontSize: 9.5, fontWeight: '600' },
    bubbleTimeMine: { color: 'rgba(255,255,255,0.75)' },
    bubbleTimeOther: { color: c.textTertiary },

    attachmentImg: { width: 200, height: 150, borderRadius: 10, marginBottom: 6 },
    fileCard: {
      flexDirection: 'row', alignItems: 'center', gap: 9,
      backgroundColor: 'rgba(127,127,127,0.12)',
      borderRadius: 10, padding: 8, marginBottom: 6, minWidth: 180,
    },
    fileIcon: {
      width: 30, height: 30, borderRadius: 9,
      backgroundColor: 'rgba(127,127,127,0.16)',
      alignItems: 'center', justifyContent: 'center',
    },
    fileName: { fontSize: 12, fontWeight: '700' },
    fileSize: { fontSize: 10, color: c.textTertiary, marginTop: 1, fontWeight: '600' },

    retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingHorizontal: 4 },
    retryText: { fontSize: 11, color: c.danger, fontWeight: '700' },

    composerWrap: {
      backgroundColor: c.card,
      borderTopWidth: 1, borderTopColor: c.border,
      paddingTop: 8,
    },
    uploadStrip: { paddingHorizontal: 16, paddingBottom: 8 },
    uploadTrack: { height: 3, borderRadius: 2, backgroundColor: c.border, overflow: 'hidden' },
    uploadFill: { height: 3, borderRadius: 2, backgroundColor: c.primary },
    uploadLabel: { fontSize: 10.5, color: c.textSecondary, fontWeight: '600', marginTop: 5 },

    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12 },
    attachBtn: {
      width: 42, height: 42, borderRadius: 14,
      backgroundColor: c.primarySofter,
      borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    inputWrap: {
      flex: 1, backgroundColor: c.backgroundAlt,
      borderWidth: 1, borderColor: c.border,
      borderRadius: 21, paddingHorizontal: 16, maxHeight: 110, justifyContent: 'center',
    },
    input: { fontSize: 13.5, color: c.text, paddingVertical: 11, fontWeight: '500' },
    sendBtn: {
      width: 42, height: 42, borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: 'center', justifyContent: 'center',
    },

    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28,
    },
    sheetGrip: {
      width: 40, height: 4, borderRadius: 10,
      backgroundColor: c.border, alignSelf: 'center', marginBottom: 18,
    },
    sheetTitle: {
      fontSize: 10, fontWeight: '800', color: c.textTertiary,
      letterSpacing: 1.2, marginBottom: 14,
    },
    sheetRow: { flexDirection: 'row', gap: 10 },
    sheetOption: {
      flex: 1, alignItems: 'center', paddingVertical: 16,
      backgroundColor: c.backgroundAlt,
      borderWidth: 1, borderColor: c.border, borderRadius: 14,
    },
    sheetIconCircle: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    sheetOptionLabel: { fontSize: 11.5, fontWeight: '700', color: c.text },
    sheetHint: { fontSize: 11, color: c.textTertiary, marginTop: 14, fontWeight: '500' },

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
