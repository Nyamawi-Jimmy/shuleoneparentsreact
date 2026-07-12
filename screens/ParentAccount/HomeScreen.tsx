import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { ParentHeader } from '../../components/ParentHeader';
import { ChildSwitcherModal } from '../../components/ChildSwitcherModal';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useParentProfile } from '../../context/ParentProfileContext';
import { useChildFees } from '../../hooks/useChildFees';
import { useChildAcademics, useChildAttendance } from '../../hooks/useAcademics';
import { moneyToNumber } from '../../api/fees.types';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1612531048118-826c64158142?w=200&h=200&fit=crop&crop=face';

const formatKsh = (amount: number | null | undefined): string => {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return `KSh ${n.toLocaleString('en-KE')}`;
};

// A self-explanatory menu: every item says exactly what it is.
interface Section {
  key: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  tint: keyof Pick<ColorPalette, 'primary' | 'info' | 'success' | 'warning' | 'purple' | 'danger'>;
  route: string;
  status?: { label: string; tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' };
}

export const HomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { parent } = useParentProfile();
  const { selectedChild: child, children } = useSelectedChild();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const { summary: feesSummary } = useChildFees();
  const { exams } = useChildAcademics();
  const { summary: attendanceSummary } = useChildAttendance();

  if (!child) {
    return (
      <View style={styles.root}>
        <ParentHeader greetingName={parent.firstName} />
      </View>
    );
  }

  const photoUri = (child as any).photoUrl || PLACEHOLDER;
  const hasMultiple = children.length > 1;

  const feesBalance = moneyToNumber(feesSummary?.balance) || (child as any).feesBalance || 0;
  const academicMean = exams?.[0]?.mean || (child as any).academicAverage || '—';
  const attendancePercent = attendanceSummary?.attendanceRate != null
    ? Math.round(attendanceSummary.attendanceRate)
    : ((child as any).attendancePercent ?? 0);

  const firstName = child.firstName || (child as any).firstName || 'your child';

  const sections: Section[] = [
    {
      key: 'academics', title: 'Academics', desc: 'Exam results, grades & report cards',
      icon: <Ionicons name="school-outline" size={22} color={colors.primary} />,
      tint: 'primary', route: '/(tabs)/academics',
    },
    {
      key: 'learning', title: 'Learning', desc: 'Digital lessons, progress & AI insights',
      icon: <Ionicons name="rocket-outline" size={22} color={colors.purple} />,
      tint: 'purple', route: '/learning',
    },
    {
      key: 'fees', title: 'Fees & Payments', desc: 'Balance, statements & pay with M-Pesa',
      icon: <MaterialCommunityIcons name="wallet-outline" size={22} color={colors.info} />,
      tint: 'info', route: '/(tabs)/finance',
      status: feesBalance > 0
        ? { label: formatKsh(feesBalance), tone: 'danger' }
        : { label: 'Cleared', tone: 'success' },
    },
    {
      key: 'attendance', title: 'Attendance', desc: 'Daily presence & this term’s rate',
      icon: <Ionicons name="checkmark-done-outline" size={22} color={colors.success} />,
      tint: 'success', route: '/(tabs)/academics',
      status: { label: `${attendancePercent}%`, tone: attendancePercent >= 90 ? 'success' : 'warning' },
    },
    {
      key: 'messages', title: 'Messages', desc: 'Chat with teachers & the school',
      icon: <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.purple} />,
      tint: 'purple', route: '/chat',
    },
    {
      key: 'diary', title: 'Class Diary', desc: 'Daily notes, homework & teacher comments',
      icon: <Ionicons name="book-outline" size={22} color={colors.warning} />,
      tint: 'warning', route: '/diary',
    },
    {
      key: 'announcements', title: 'Announcements', desc: 'School news, notices & events',
      icon: <Ionicons name="megaphone-outline" size={22} color={colors.primary} />,
      tint: 'primary', route: '/communication',
    },
    {
      key: 'transport', title: 'Transport', desc: 'Live bus tracking & pickup status',
      icon: <MaterialCommunityIcons name="bus-school" size={22} color={colors.info} />,
      tint: 'info', route: '/transport',
    },
  ];

  return (
    <View style={styles.root}>
      <ParentHeader greetingName={parent.firstName || (child as any).firstName} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Child card */}
        <TouchableOpacity activeOpacity={hasMultiple ? 0.92 : 1} onPress={hasMultiple ? () => setSwitcherOpen(true) : undefined}>
          <LinearGradient
            colors={['#6366F1', '#4338CA']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.childCard}
          >
            <View style={styles.avatarRing}>
              <Image source={{ uri: photoUri }} style={styles.avatarImg} />
            </View>
            <View style={styles.childInfo}>
              <Text style={styles.childName} numberOfLines={1}>{child.fullName}</Text>
              <Text style={styles.childMeta} numberOfLines={1}>
                {(child as any).grade || child.className}  •  {child.className}
              </Text>
              <View style={styles.schoolRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.childSchool} numberOfLines={1}>{child.schoolName}</Text>
              </View>
            </View>
            {hasMultiple && (
              <View style={styles.switchPill}>
                <Ionicons name="swap-horizontal" size={14} color="#FFF" />
                <Text style={styles.switchPillText}>Switch</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* At-a-glance metrics */}
        <View style={styles.metrics}>
          <Metric styles={styles}
            label="Fees due"
            value={feesBalance > 0 ? formatKsh(feesBalance) : 'Cleared'}
            valueColor={feesBalance > 0 ? colors.danger : colors.success}
            onPress={() => router.push('/(tabs)/finance' as any)}
          />
          <View style={styles.metricDivider} />
          <Metric styles={styles}
            label="Average"
            value={`${academicMean}${typeof academicMean === 'number' ? '%' : ''}`}
            valueColor={colors.text}
            onPress={() => router.push('/(tabs)/academics' as any)}
          />
          <View style={styles.metricDivider} />
          <Metric styles={styles}
            label="Attendance"
            value={`${attendancePercent}%`}
            valueColor={attendancePercent >= 90 ? colors.success : colors.warning}
            onPress={() => router.push('/(tabs)/academics' as any)}
          />
        </View>

        {/* Self-explanatory menu */}
        <Text style={styles.sectionTitle}>Everything for {firstName}</Text>
        <View style={styles.list}>
          {sections.map((s) => (
            <SectionRow key={s.key} colors={colors} styles={styles} section={s}
              onPress={() => router.push(s.route as any)} />
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <ChildSwitcherModal visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </View>
  );
};

const Metric: React.FC<{
  styles: any; label: string; value: string; valueColor: string; onPress: () => void;
}> = ({ styles, label, value, valueColor, onPress }) => (
  <TouchableOpacity style={styles.metric} activeOpacity={0.7} onPress={onPress}>
    <Text style={[styles.metricValue, { color: valueColor }]} numberOfLines={1}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </TouchableOpacity>
);

const TONE_KEY: Record<string, keyof ColorPalette> = {
  primary: 'primary', success: 'success', warning: 'warning', danger: 'danger', neutral: 'textSecondary',
};

const SectionRow: React.FC<{
  colors: ColorPalette; styles: any; section: Section; onPress: () => void;
}> = ({ colors, styles, section, onPress }) => {
  const tintColor = colors[section.tint];
  const iconBg = softFor(colors, section.tint);
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>{section.icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{section.title}</Text>
        <Text style={styles.rowDesc} numberOfLines={1}>{section.desc}</Text>
      </View>
      {section.status && (
        <View style={[styles.statusPill, { backgroundColor: softForTone(colors, section.status.tone) }]}>
          <Text style={[styles.statusText, { color: colors[TONE_KEY[section.status.tone]] as string }]} numberOfLines={1}>
            {section.status.label}
          </Text>
        </View>
      )}
      <Feather name="chevron-right" size={18} color={colors.textTertiary} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
};

function softFor(c: ColorPalette, tint: string): string {
  switch (tint) {
    case 'primary': return c.primarySoft;
    case 'info': return c.infoSoft;
    case 'success': return c.successSoft;
    case 'warning': return c.warningSoft;
    case 'danger': return c.dangerSoft;
    case 'purple': return c.purpleLight;
    default: return c.backgroundAlt;
  }
}
function softForTone(c: ColorPalette, tone: string): string {
  switch (tone) {
    case 'success': return c.successSoft;
    case 'warning': return c.warningSoft;
    case 'danger': return c.dangerSoft;
    case 'primary': return c.primarySoft;
    default: return c.backgroundAlt;
  }
}

// =================================================================
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 4 },

    childCard: {
      flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, marginBottom: 14,
      shadowColor: '#4338CA',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28, shadowRadius: 18, elevation: 8,
    },
    avatarRing: {
      width: 60, height: 60, borderRadius: 30,
      borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.5)',
      overflow: 'hidden', marginRight: 15,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    avatarImg: { width: '100%', height: '100%' },
    childInfo: { flex: 1 },
    childName: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
    childMeta: { color: 'rgba(255,255,255,0.92)', fontSize: 12.5, marginTop: 3, fontWeight: '500' },
    schoolRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    childSchool: { color: 'rgba(255,255,255,0.92)', fontSize: 12, marginLeft: 3, fontWeight: '500', flexShrink: 1 },
    switchPill: {
      position: 'absolute', top: 12, right: 12,
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
      gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    },
    switchPillText: { color: '#FFF', fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },

    // Metrics strip
    metrics: {
      flexDirection: 'row', alignItems: 'stretch',
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      paddingVertical: 14, marginBottom: 22,
    },
    metric: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
    metricValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
    metricLabel: { fontSize: 11.5, color: c.textSecondary, marginTop: 3, fontWeight: '500' },
    metricDivider: { width: 1, backgroundColor: c.border, marginVertical: 4 },

    sectionTitle: { fontSize: 16, fontWeight: '800', color: c.text, marginBottom: 12, letterSpacing: -0.3 },

    // Self-explanatory list
    list: { gap: 10 },
    row: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      paddingVertical: 13, paddingHorizontal: 14,
    },
    rowIcon: {
      width: 44, height: 44, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', marginRight: 13,
    },
    rowTitle: { fontSize: 15, fontWeight: '700', color: c.text, letterSpacing: -0.2 },
    rowDesc: { fontSize: 12.5, color: c.textSecondary, marginTop: 2 },
    statusPill: {
      paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, marginLeft: 8, maxWidth: 110,
    },
    statusText: { fontSize: 11.5, fontWeight: '700' },
  });
}
