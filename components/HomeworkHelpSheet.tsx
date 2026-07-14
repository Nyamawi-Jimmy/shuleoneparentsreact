// AI homework helper — a chat sheet that coaches a parent (or student) through
// ONE question without handing over the graded answer. Ported from the web
// HomeworkHelp: opens with an automatic first ask, then follow-ups continue the
// same thread. Wired to POST /api/learner/{studentId}/homework-help.
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getHomeworkHelp } from '../api/learner-me';

interface Props {
  visible: boolean;
  onClose: () => void;
  studentId: number;
  assignmentId: number | null;
  audience: 'PARENT' | 'STUDENT';
  question: { text?: string | null; options?: string | null; markingScheme?: string | null } | null;
}

type Msg = { role: 'me' | 'ai'; text: string };

export const HomeworkHelpSheet: React.FC<Props> = ({ visible, onClose, studentId, assignmentId, audience, question }) => {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const styles = makeStyles(colors);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string>('TUTOR');
  const busyRef = useRef(false);
  const bootRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const sendText = async (text: string) => {
    if (!text || busyRef.current || !accessToken) return;
    busyRef.current = true;
    const history = msgs.map((m) => ({ role: m.role === 'me' ? 'student' : 'helper', text: m.text }));
    setMsgs((m) => [...m, { role: 'me', text }]);
    setBusy(true);
    try {
      const res = await getHomeworkHelp(accessToken, studentId, {
        assignmentId, audience,
        questionText: question?.text, options: question?.options, markingScheme: question?.markingScheme,
        message: text, history,
      });
      if (res?.mode) setMode(res.mode);
      setMsgs((m) => [...m, { role: 'ai', text: res?.reply || 'Tell me what you have tried so far.' }]);
    } catch (e: any) {
      const msg = e?.status === 402
        ? 'This is a premium feature. Add the plan to keep using the helper.'
        : e?.status === 429
          ? 'That’s a lot of help in a short time — give it a minute and try again.'
          : 'I couldn’t reach the helper just now. Try again in a moment.';
      setMsgs((m) => [...m, { role: 'ai', text: msg }]);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // Auto-ask the moment it opens. A remount key (see TaskPlayer) gives a fresh
  // thread each open, so no reset-on-close needed here.
  useEffect(() => {
    if (!visible || bootRef.current || !question?.text) return;
    bootRef.current = true;
    // Deferred a tick so the effect body stays free of synchronous state.
    const t = setTimeout(() => {
      sendText(audience === 'PARENT' ? 'How do I explain this question to my child?' : 'Please explain this question to me.');
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [msgs, busy]);

  const isRevision = mode === 'REVISION';
  const modeLabel = audience === 'PARENT' ? 'Helping you explain' : isRevision ? 'Full solution' : 'Hints only';
  const greeting = audience === 'PARENT'
    ? 'I’ll help you explain this to your child — without giving the graded answer. What part is tricky?'
    : isRevision
      ? 'This one is marked, so we can go through the full solution. What would you like to understand?'
      : 'I’ll help you work it out — not just give the answer. What have you tried so far?';

  const send = () => { const t = input.trim(); if (!t || busy) return; setInput(''); sendText(t); };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.panel}>
          <View style={styles.top}>
            <View style={styles.topIcon}><MaterialCommunityIcons name="robot-happy-outline" size={18} color={colors.purple} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.topTitle}>Homework helper</Text>
              <Text style={styles.topMode}>{modeLabel}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.x}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {!!question?.text && (
            <View style={styles.qBox}>
              <Text style={styles.qText} numberOfLines={3}><Text style={styles.qLabel}>Q: </Text>{question.text}</Text>
            </View>
          )}

          <ScrollView ref={scrollRef} style={styles.body} contentContainerStyle={{ padding: 14, gap: 8 }}>
            <View style={styles.note}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={15} color={colors.warning} />
              <Text style={styles.noteText}>{greeting}</Text>
            </View>
            {msgs.map((m, i) => (
              <View key={i} style={[styles.msgRow, m.role === 'me' && { justifyContent: 'flex-end' }]}>
                <View style={[styles.msg, m.role === 'me' ? styles.msgMe : styles.msgAi]}>
                  <Text style={[styles.msgText, m.role === 'me' && { color: '#FFF' }]}>{m.text}</Text>
                </View>
              </View>
            ))}
            {busy && (
              <View style={styles.msgRow}>
                <View style={[styles.msg, styles.msgAi, { flexDirection: 'row', alignItems: 'center', gap: 7 }]}>
                  <ActivityIndicator size="small" color={colors.purple} />
                  <Text style={styles.msgText}>thinking…</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.foot}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={audience === 'PARENT' ? 'Ask how to explain it…' : 'Ask for a hint…'}
              placeholderTextColor={colors.textTertiary}
              multiline
            />
            <TouchableOpacity style={[styles.send, (!input.trim() || busy) && { opacity: 0.5 }]} onPress={send} disabled={!input.trim() || busy}>
              <Ionicons name="send" size={17} color="#FFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

function makeStyles(c: any) {
  return StyleSheet.create({
    scrim: { flex: 1, backgroundColor: 'rgba(15,17,26,0.5)', justifyContent: 'flex-end' },
    panel: {
      backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      maxHeight: '86%', minHeight: '55%', overflow: 'hidden',
    },
    top: {
      flexDirection: 'row', alignItems: 'center', gap: 11,
      paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    topIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: c.purple + '1A', alignItems: 'center', justifyContent: 'center' },
    topTitle: { fontSize: 15, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3 },
    topMode: { fontSize: 11, fontFamily: fonts.bold, color: c.purple, marginTop: 1 },
    x: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    qBox: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.backgroundAlt, borderBottomWidth: 1, borderBottomColor: c.border },
    qText: { fontSize: 12.5, fontFamily: fonts.medium, color: c.textSecondary, lineHeight: 18 },
    qLabel: { fontFamily: fonts.extrabold, color: c.text },
    body: { flex: 1 },
    note: {
      flexDirection: 'row', gap: 8, alignItems: 'flex-start',
      backgroundColor: c.warningSoft, borderRadius: 13, padding: 12,
    },
    noteText: { flex: 1, fontSize: 12.5, fontFamily: fonts.medium, color: c.text, lineHeight: 18 },
    msgRow: { flexDirection: 'row' },
    msg: { maxWidth: '86%', borderRadius: 15, paddingHorizontal: 12, paddingVertical: 9 },
    msgMe: { backgroundColor: c.primary, borderBottomRightRadius: 5 },
    msgAi: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 5 },
    msgText: { fontSize: 13.5, fontFamily: fonts.regular, color: c.text, lineHeight: 19 },
    foot: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 8,
      paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 22 : 10,
      backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border,
    },
    input: {
      flex: 1, maxHeight: 100, backgroundColor: c.backgroundAlt, borderRadius: 18,
      paddingHorizontal: 14, paddingVertical: 9, fontSize: 13.5, fontFamily: fonts.regular, color: c.text,
    },
    send: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  });
}
