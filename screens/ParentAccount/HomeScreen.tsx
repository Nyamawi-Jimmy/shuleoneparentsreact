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
  const feesBalanceDueDate = (child as any).feesBalanceDueDate || '—';
  const academicMean = exams?.[0]?.mean || (child as any).academicAverage || '—';
  const attendancePercent = attendanceSummary?.attendanceRate != null
    ? Math.round(attendanceSummary.attendanceRate)
    : ((child as any).attendancePercent ?? 0);
  const learningStreakDays = (child as any).learningStreakDays ?? 0;

  return (
    <View style={styles.root}>
      <ParentHeader greetingName={parent.firstName || (child as any).firstName} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Child Card */}
        <TouchableOpacity activeOpacity={hasMultiple ? 0.92 : 1} onPress={hasMultiple ? () => setSwitcherOpen(true) : undefined}>
          <LinearGradient
            colors={['#FB7185', '#E11D48']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.childCard}
          >
            <View style={styles.avatarRing}>
              <Image source={{ uri: photoUri }} style={styles.avatarImg} />
            </View>
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{child.fullName}</Text>
              <Text style={styles.childMeta}>
                {(child as any).grade || child.className}  •  {child.className}
              </Text>
              <View style={styles.schoolRow}>
                <Ionicons name="location" size={13} color="#FFF" />
                <Text style={styles.childSchool}>{child.schoolName}</Text>
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

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard colors={colors} styles={styles}
            label="Fees Balance"
            value={formatKsh(feesBalance)}
            valueColor={colors.primary}
            sub={feesBalance > 0 ? `Due on ${feesBalanceDueDate}` : 'No balance'}
            icon={<MaterialCommunityIcons name="wallet-outline" size={16} color={colors.textTertiary} />}
            onPress={() => router.push('/(tabs)/finance' as any)}
          />
          <StatCard colors={colors} styles={styles}
            label="Academic Average"
            value={`${academicMean}${typeof academicMean === 'number' ? '%' : ''}`}
            sub="Good progress"
            icon={<Feather name="trending-up" size={16} color={colors.success} />}
            onPress={() => router.push('/(tabs)/academics' as any)}
          />
          <StatCard colors={colors} styles={styles}
            label="Attendance"
            value={`${attendancePercent}%`}
            sub="This term"
            icon={<Ionicons name="people-outline" size={16} color={colors.success} />}
            onPress={() => router.push('/(tabs)/academics' as any)}
          />
          <StatCard colors={colors} styles={styles}
            label="Learning Streak"
            value={`${learningStreakDays} days`}
            sub="Keep it up! 🔥"
            icon={<Text style={{ fontSize: 14 }}>🔥</Text>}
            onPress={() => router.push('/(tabs)/academics' as any)}
          />
        </View>

        {/* Improvement plan */}
        <TouchableOpacity activeOpacity={0.85} style={styles.planCard} onPress={() => router.push('/(tabs)/academics' as any)}>
          <View style={styles.planIcon}>
            <Ionicons name="locate" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>Recommended improvement plan</Text>
            <Text style={styles.planSub}>Focus on Mathematics & English</Text>
            <Text style={styles.planSubFaint}>Personalized for {child.firstName}'s growth</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <QuickAction styles={styles}
            label="Pay Fees"
            icon={<MaterialCommunityIcons name="credit-card-outline" size={24} color="#FFF" />}
            bg={colors.primary}
            onPress={() => router.push('/(tabs)/finance' as any)}
          />
          <QuickAction styles={styles}
            label="Receipts"
            icon={<Ionicons name="document-text-outline" size={24} color="#FFF" />}
            bg={colors.purple}
            onPress={() => router.push('/(tabs)/finance' as any)}
          />
          <QuickAction styles={styles}
            label="Reports"
            icon={<MaterialCommunityIcons name="file-chart-outline" size={24} color="#FFF" />}
            bg={colors.info}
            onPress={() => router.push('/(tabs)/academics' as any)}
          />
          <QuickAction styles={styles}
            label="Messages"
            icon={<Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFF" />}
            bg={colors.success}
            onPress={() => router.push('/chat' as any)}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ChildSwitcherModal visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </View>
  );
};

const StatCard: React.FC<{
  colors: ColorPalette; styles: any;
  label: string; value: string; sub: string; icon: React.ReactNode;
  valueColor?: string; onPress: () => void;
}> = ({ colors, styles, label, value, sub, icon, valueColor, onPress }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.statCard}>
    <View style={styles.statHeader}>
      <Text style={styles.statLabel}>{label}</Text>
      {icon}
    </View>
    <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    <Text style={styles.statSub}>{sub}</Text>
  </TouchableOpacity>
);

const QuickAction: React.FC<{
  styles: any;
  label: string; icon: React.ReactNode; bg: string; onPress: () => void;
}> = ({ styles, label, icon, bg, onPress }) => (
  <TouchableOpacity style={styles.quickItem} activeOpacity={0.85} onPress={onPress}>
    <View style={[styles.quickIcon, { backgroundColor: bg }]}>{icon}</View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);

// =================================================================
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 18, paddingTop: 8 },

    childCard: {
      flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, marginBottom: 16,
      shadowColor: '#E11D48',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
    },
    avatarRing: {
      width: 64, height: 64, borderRadius: 32,
      borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)',
      overflow: 'hidden', marginRight: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    avatarImg: { width: '100%', height: '100%' },
    childInfo: { flex: 1 },
    childName: { color: '#FFF', fontSize: 19, fontWeight: '800', letterSpacing: -0.2 },
    childMeta: { color: 'rgba(255,255,255,0.95)', fontSize: 13, marginTop: 3, fontWeight: '500' },
    schoolRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    childSchool: { color: '#FFF', fontSize: 12, marginLeft: 4, fontWeight: '500' },
    switchPill: {
      position: 'absolute', top: 12, right: 12,
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
      gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    },
    switchPillText: { color: '#FFF', fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
    statCard: {
      flexBasis: '47%', flexGrow: 1, backgroundColor: c.card,
      padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border,
    },
    statHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    statLabel: { fontSize: 11, color: c.textSecondary, fontWeight: '600' },
    statValue: { fontSize: 18, fontWeight: '800', color: c.text, letterSpacing: -0.3 },
    statSub: { fontSize: 10.5, color: c.textTertiary, marginTop: 2 },

    planCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.primarySoft,
      padding: 14, borderRadius: 14, marginBottom: 20,
    },
    planIcon: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    planTitle: { fontSize: 14, fontWeight: '800', color: c.text },
    planSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    planSubFaint: { fontSize: 11, color: c.textTertiary, marginTop: 1 },

    sectionTitle: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 12, letterSpacing: -0.3 },
    quickGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    quickItem: { flex: 1, alignItems: 'center' },
    quickIcon: {
      width: '100%', aspectRatio: 1, maxHeight: 68, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    quickLabel: { fontSize: 12, color: c.text, marginTop: 8, fontWeight: '600' },
  });
}
