// Help & Support — the web Help page's content (contact channels, topics,
// FAQs) in the app's own design: contact tiles up top, searchable FAQ
// accordion, and a hotline footer.

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GradientAppBar } from '../../components/GradientAppBar';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';

const PHONE = '+254700123456';
const PHONE_DISPLAY = '0700 123 456';
const WHATSAPP = 'https://wa.me/254700123456';
const EMAIL = 'support@shuleone.com';

const FAQS: { q: string; a: string }[] = [
  { q: 'How do I pay school fees?',
    a: 'Open Fees from the bottom bar. Tap “Pay with M-Pesa”, confirm the amount, and approve the PIN prompt on your phone. Receipts appear under Fees and in Documents.' },
  { q: 'How can I change my password?',
    a: 'Go to Settings → Security. Enter your current password and the new one — it needs at least 8 characters.' },
  { q: 'My child’s grade looks wrong. Who do I contact?',
    a: 'Open Messages and start a chat with your child’s class teacher. They can clarify or escalate any grading questions.' },
  { q: 'Can I use this app offline?',
    a: 'You’ll need an internet connection. The app reopens recent screens quickly, but live data — lessons, reports, bus tracking and payments — needs a connection.' },
  { q: 'How do I delete my account?',
    a: `Email us at ${EMAIL} or call the hotline. We’ll verify your identity before deleting any account.` },
  { q: 'Is my data safe?',
    a: 'Yes. We use bank-level encryption and never share your child’s data with third parties.' },
];

const TOPICS: { icon: any; lib: 'ion' | 'mci'; title: string; desc: string; tint: string }[] = [
  { icon: 'wallet-outline', lib: 'ion', title: 'Paying school fees', desc: 'M-Pesa, card, or bank', tint: '#059669' },
  { icon: 'school-outline', lib: 'ion', title: 'Understanding reports', desc: 'Reading grades and trends', tint: '#E11D48' },
  { icon: 'checkmark-done-outline', lib: 'ion', title: 'Attendance & lateness', desc: 'Alerts and reporting absence', tint: '#D97706' },
  { icon: 'bus-school', lib: 'mci', title: 'Bus tracking', desc: 'Tracking the bus & contacting the driver', tint: '#2563EB' },
  { icon: 'chatbubbles-outline', lib: 'ion', title: 'Messaging teachers', desc: 'Sending a message and what to expect', tint: '#7C3AED' },
];

export const HelpScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const q = query.trim().toLowerCase();
  const faqs = q
    ? FAQS.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
    : FAQS;

  return (
    <View style={styles.root}>
      <GradientAppBar title="Help & Support" subtitle="FAQs, or reach us by phone, WhatsApp or email" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Contact — dialer-style round actions */}
        <View style={styles.contactRow}>
          {[
            { icon: 'call', tint: '#2563EB', label: 'Call', sub: PHONE_DISPLAY, url: `tel:${PHONE}` },
            { icon: 'logo-whatsapp', tint: '#1FA855', label: 'WhatsApp', sub: '~5 min reply', url: WHATSAPP },
            { icon: 'mail', tint: colors.primary, label: 'Email', sub: '24h reply', url: `mailto:${EMAIL}` },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={styles.contactAction} activeOpacity={0.8}
              onPress={() => Linking.openURL(a.url)}>
              <View style={[styles.contactCircle, { backgroundColor: a.tint }]}>
                <Ionicons name={a.icon as any} size={21} color="#FFF" />
              </View>
              <Text style={styles.contactTitle}>{a.label}</Text>
              <Text style={styles.contactSub}>{a.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Topics */}
        <Text style={styles.sectionTitle}>Popular topics</Text>
        <View style={styles.card}>
          {TOPICS.map((t, i) => (
            <View key={t.title} style={[styles.topicRow, i > 0 && styles.divider]}>
              <View style={[styles.topicIcon, { backgroundColor: t.tint + '1A' }]}>
                {t.lib === 'ion'
                  ? <Ionicons name={t.icon} size={17} color={t.tint} />
                  : <MaterialCommunityIcons name={t.icon} size={17} color={t.tint} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.topicTitle}>{t.title}</Text>
                <Text style={styles.topicDesc} numberOfLines={1}>{t.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>Frequently asked questions</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search the FAQs…"
            placeholderTextColor={colors.textTertiary}
          />
          {query.length > 0 && (
            <TouchableOpacity hitSlop={8} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        {faqs.length === 0 ? (
          <View style={styles.card}><Text style={styles.faqEmpty}>Nothing matches “{query}”.</Text></View>
        ) : (
          faqs.map((f, i) => {
            const open = openIdx === i;
            return (
              <View key={f.q} style={[styles.faqCard, open && { borderColor: colors.primary + '55' }]}>
                <TouchableOpacity style={styles.faqHead} activeOpacity={0.7}
                  onPress={() => setOpenIdx(open ? null : i)}>
                  <View style={[styles.faqBullet, open && { backgroundColor: colors.primary }]}>
                    <Text style={[styles.faqBulletText, open && { color: '#FFF' }]}>Q</Text>
                  </View>
                  <Text style={[styles.faqQ, open && { color: colors.primary }]}>{f.q}</Text>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textTertiary} />
                </TouchableOpacity>
                {open && <Text style={styles.faqA}>{f.a}</Text>}
              </View>
            );
          })
        )}

        {/* Still stuck */}
        <View style={styles.hotlineCard}>
          <View style={[styles.contactIcon, { backgroundColor: colors.primarySoft }]}>
            <MaterialCommunityIcons name="lifebuoy" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hotlineTitle}>Still stuck?</Text>
            <Text style={styles.hotlineText}>Our support team is available Mon–Sat, 8am–6pm.</Text>
          </View>
          <TouchableOpacity style={styles.hotlineBtn} activeOpacity={0.85} onPress={() => Linking.openURL(`tel:${PHONE}`)}>
            <Ionicons name="call" size={13} color="#FFF" />
            <Text style={styles.hotlineBtnText}>Call</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 14 },

    contactRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 22, paddingHorizontal: 8 },
    contactAction: { alignItems: 'center', minWidth: 84 },
    contactCircle: {
      width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center',
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
    },
    contactIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    contactTitle: { fontSize: 12, fontFamily: fonts.bold, color: c.text, marginTop: 8 },
    contactSub: { fontSize: 9.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },

    sectionTitle: { fontSize: 15, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginBottom: 12 },
    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 20 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },

    topicRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 },
    topicIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    topicTitle: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    topicDesc: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 1 },

    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.card, borderRadius: 13, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 12, height: 42, marginBottom: 12,
    },
    searchInput: { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: c.text, paddingVertical: 0 },
    faqCard: {
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 13, marginBottom: 8,
    },
    faqBullet: {
      width: 22, height: 22, borderRadius: 8, backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    faqBulletText: { fontSize: 10.5, fontFamily: fonts.extrabold, color: c.primary },
    faqHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    faqQ: { flex: 1, fontSize: 13, fontFamily: fonts.bold, color: c.text, lineHeight: 18 },
    faqA: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 19, paddingBottom: 12, paddingLeft: 32 },
    faqEmpty: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, paddingVertical: 16, textAlign: 'center' },

    hotlineCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.primarySofter, borderWidth: 1, borderColor: c.primary + '26',
      borderRadius: 16, padding: 14,
    },
    hotlineTitle: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text },
    hotlineText: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2 },
    hotlineBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: c.primary, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 8,
    },
    hotlineBtnText: { color: '#FFF', fontSize: 12.5, fontFamily: fonts.bold },
  });
}
