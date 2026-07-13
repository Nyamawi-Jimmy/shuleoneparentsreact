import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientAppBar } from '../../components/GradientAppBar';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useAuth } from '../../context/AuthContext';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useBilling, useBillingPaymentPoller } from '../../hooks/useBilling';
import {
  startTrial, mpesaCheckoutChild, mpesaCheckoutFamily, cancelChildSubscription, resumeChildSubscription,
  paystackCheckoutChild, paystackCheckoutFamily,
} from '../../api/billing';
import { ChildSubscriptionStatus, isSubscribed, BillingPayment } from '../../api/billing.types';
import { moneyToNumber, formatMoney, normalizeKenyanPhone } from '../../api/fees.types';

type Plan = 'individual' | 'family';

export const SubscriptionsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { children: kids } = useSelectedChild();
  const { status, history, loading, refreshing, refresh, error } = useBilling();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan>('individual');
  const [checkoutStudentId, setCheckoutStudentId] = useState<number | null>(null);

  const pricePerChild = moneyToNumber(status?.pricePerChild ?? null) || 499;
  const pricePerFamily = moneyToNumber(status?.pricePerFamily ?? null) || 1499;

  const openCheckout = (plan: Plan, studentId?: number) => {
    setCheckoutPlan(plan);
    setCheckoutStudentId(studentId ?? null);
    setCheckoutOpen(true);
  };

  return (
    <View style={styles.safe}>
      <GradientAppBar title="Plans & subscriptions" subtitle="AI Learning, Coding & live bus tracking" showBack />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading subscriptions…</Text>
          </View>
        ) : (
          <>
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroIconWrap}>
                <MaterialCommunityIcons name="rocket-launch" size={28} color="#fff" />
              </View>
              <Text style={styles.heroTitle}>Unlock Learn+</Text>
              <Text style={styles.heroSubtitle}>
                Premium revision videos, quizzes, exam packs, and progress reports per child.
              </Text>
            </LinearGradient>

            {/* Family plan */}
            <Text style={styles.sectionTitle}>Family Plan</Text>
            <View style={[styles.planCard, isSubscribed(status?.family?.status) && styles.planCardActive]}>
              <View style={styles.planHeader}>
                <View style={styles.planIcon}>
                  <MaterialCommunityIcons name="account-group" size={20} color={colors.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>All children, one price</Text>
                  <Text style={styles.planMeta}>
                    {kids.length > 1 ? `Covers all ${kids.length} children` : 'Covers all children in your account'}
                  </Text>
                </View>
                <PlanStatusPill status={status?.family?.status} colors={colors} styles={styles} />
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceAmount}>{formatMoney(pricePerFamily, 'KSh')}</Text>
                <Text style={styles.pricePer}>/month</Text>
              </View>
              {isSubscribed(status?.family?.status) ? (
                <View style={styles.planActions}>
                  <Text style={styles.activeNote}>Renews {formatDate(status?.family?.currentPeriodEnd) ?? '—'}</Text>
                </View>
              ) : (
                <TouchableOpacity activeOpacity={0.85} style={styles.subscribeBtn} onPress={() => openCheckout('family')}>
                  <Ionicons name="phone-portrait-outline" size={15} color="#fff" />
                  <Text style={styles.subscribeBtnText}>Pay with M-Pesa</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Per-child plans */}
            <Text style={styles.sectionTitle}>Per-child Plans</Text>
            {kids.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Add a child first to subscribe.</Text>
              </View>
            )}
            {kids.map((c) => {
              const childStatus = status?.childStatuses?.find((cs) => cs.studentId === c.studentId);
              return (
                <ChildPlanCard
                  key={c.studentId}
                  colors={colors} styles={styles}
                  childName={c.fullName}
                  classLabel={c.classLabel}
                  childStatus={childStatus}
                  price={pricePerChild}
                  studentId={c.studentId}
                  onSubscribe={() => openCheckout('individual', c.studentId)}
                  refresh={refresh}
                />
              );
            })}

            {/* History */}
            {history.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Payment History</Text>
                <View style={styles.historyCard}>
                  {history.map((h, idx) => (
                    <View
                      key={`${h.id}-${idx}`}
                      style={[styles.historyRow, idx < history.length - 1 && styles.historyRowDivider]}
                    >
                      <View style={[styles.historyIcon, (h.status ?? '').toUpperCase() === 'SUCCESS' && { backgroundColor: colors.successSoft }]}>
                        <Ionicons
                          name={(h.status ?? '').toUpperCase() === 'SUCCESS' ? 'checkmark' : 'time-outline'}
                          size={14}
                          color={(h.status ?? '').toUpperCase() === 'SUCCESS' ? colors.success : colors.warning}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.historyTitle}>{h.description ?? 'Subscription payment'}</Text>
                        <Text style={styles.historyMeta}>
                          {formatDate(h.date) ?? '—'} • {h.channel ?? 'M-Pesa'}
                          {h.reference && ` • ${h.reference}`}
                        </Text>
                      </View>
                      <Text style={styles.historyAmount}>{formatMoney(h.amount ?? null, h.currency ?? 'KSh')}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="warning" size={16} color={colors.danger} />
                <Text style={styles.errorBannerText}>{error}</Text>
                <TouchableOpacity onPress={refresh}><Text style={styles.retryInline}>Retry</Text></TouchableOpacity>
              </View>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <CheckoutSheet
        colors={colors}
        visible={checkoutOpen}
        plan={checkoutPlan}
        studentId={checkoutStudentId}
        numLearners={kids.length}
        priceIndividual={pricePerChild}
        priceFamily={pricePerFamily}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={() => { setCheckoutOpen(false); refresh(); }}
      />
    </View>
  );
};

const ChildPlanCard: React.FC<{
  colors: ColorPalette; styles: any;
  childName: string; classLabel: string;
  childStatus: ChildSubscriptionStatus | undefined;
  price: number; studentId: number | null;
  onSubscribe: () => void; refresh: () => void;
}> = ({ colors, styles, childName, classLabel, childStatus, price, studentId, onSubscribe, refresh }) => {
  const { accessToken } = useAuth();
  const status = childStatus?.status;
  const active = isSubscribed(status);
  const cancelled = (status ?? '').toUpperCase() === 'CANCELLED';

  const handleCancel = async () => {
    if (!studentId || !accessToken) return;
    Alert.alert('Cancel subscription?', `${childName} will lose Learn+ access at end of period.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel', style: 'destructive', onPress: async () => {
        try { await cancelChildSubscription(accessToken, studentId); refresh(); } catch {}
      }},
    ]);
  };
  const handleResume = async () => {
    if (!studentId || !accessToken) return;
    try { await resumeChildSubscription(accessToken, studentId); refresh(); } catch {}
  };
  const handleTrial = async () => {
    if (!studentId || !accessToken) return;
    try { await startTrial(accessToken, studentId); refresh(); } catch {}
  };

  return (
    <View style={[styles.planCard, active && styles.planCardActive]}>
      <View style={styles.planHeader}>
        <View style={[styles.planIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.planTitle}>{childName}</Text>
          {!!classLabel && <Text style={styles.planMeta}>{classLabel}</Text>}
        </View>
        <PlanStatusPill status={status} colors={colors} styles={styles} />
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.priceAmount}>{formatMoney(price, 'KSh')}</Text>
        <Text style={styles.pricePer}>/month</Text>
      </View>

      {active ? (
        <View style={styles.planActions}>
          <Text style={styles.activeNote}>Renews {formatDate(childStatus?.currentPeriodEnd) ?? '—'}</Text>
          <TouchableOpacity onPress={handleCancel} hitSlop={6} style={styles.linkBtn}>
            <Text style={styles.linkBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : cancelled ? (
        <TouchableOpacity activeOpacity={0.85} style={[styles.subscribeBtn, { backgroundColor: colors.purple }]} onPress={handleResume}>
          <Ionicons name="play-circle" size={15} color="#fff" />
          <Text style={styles.subscribeBtnText}>Resume subscription</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ gap: 8 }}>
          <TouchableOpacity activeOpacity={0.85} style={styles.subscribeBtn} onPress={onSubscribe}>
            <Ionicons name="phone-portrait-outline" size={15} color="#fff" />
            <Text style={styles.subscribeBtnText}>Pay with M-Pesa</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleTrial} style={styles.trialBtn} activeOpacity={0.7}>
            <Text style={styles.trialBtnText}>Start 7-day free trial</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const PlanStatusPill: React.FC<{ status: string | null | undefined; colors: ColorPalette; styles: any }> = ({ status, colors, styles }) => {
  const s = (status ?? '').toUpperCase();
  if (!s || s === 'NONE') return null;
  const map: Record<string, { bg: string; color: string }> = {
    ACTIVE:    { bg: colors.successSoft, color: colors.success },
    TRIAL:     { bg: colors.purpleLight, color: colors.purple },
    PAST_DUE:  { bg: colors.warningSoft, color: colors.warning },
    CANCELLED: { bg: colors.scheme === 'dark' ? '#2A3744' : '#f1f1f4', color: colors.textSecondary },
    EXPIRED:   { bg: colors.dangerSoft,  color: colors.danger },
  };
  const m = map[s] ?? { bg: colors.scheme === 'dark' ? '#2A3744' : '#f1f1f4', color: colors.textSecondary };
  return (
    <View style={[styles.statusPill, { backgroundColor: m.bg }]}>
      <Text style={[styles.statusPillText, { color: m.color }]}>{s}</Text>
    </View>
  );
};

const CheckoutSheet: React.FC<{
  colors: ColorPalette;
  visible: boolean; plan: Plan; studentId: number | null;
  numLearners: number; priceIndividual: number; priceFamily: number;
  onClose: () => void; onSuccess: () => void;
}> = ({ colors, visible, plan, studentId, numLearners, priceIndividual, priceFamily, onClose, onSuccess }) => {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { accessToken } = useAuth();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState<BillingPayment | null>(null);

  const { done } = useBillingPaymentPoller(payment?.id ?? null, {
    onSuccess: () => { onSuccess(); },
    onFailure: () => { /* keep modal open */ },
  });

  const handleSubmit = async () => {
    setPhoneError(null);
    const phoneNorm = normalizeKenyanPhone(phone);
    if (!phoneNorm) { setPhoneError('Enter a valid Kenyan phone number'); return; }
    if (!accessToken) return;
    setSubmitting(true);
    try {
      const p = plan === 'family'
        ? await mpesaCheckoutFamily(accessToken, { phone: phoneNorm, numLearners })
        : studentId != null
          ? await mpesaCheckoutChild(accessToken, studentId, { phone: phoneNorm })
          : null;
      if (p) setPayment(p);
    } catch (e: any) { Alert.alert('Checkout failed', e?.message ?? String(e)); }
    finally { setSubmitting(false); }
  };

  // Card payment (Paystack) — the browser handles the card form, exactly like
  // the web page; we then poll the payment until the backend confirms it.
  const [cardBusy, setCardBusy] = useState(false);
  const handleCard = async () => {
    if (!accessToken || cardBusy) return;
    setCardBusy(true);
    try {
      const p = plan === 'family'
        ? await paystackCheckoutFamily(accessToken, { numLearners })
        : studentId != null
          ? await paystackCheckoutChild(accessToken, studentId, {})
          : null;
      const url = (p?.raw as any)?.redirectUrl || (p?.raw as any)?.authorizationUrl;
      if (p && url) {
        setPayment(p);
        Linking.openURL(String(url));
      } else {
        Alert.alert('Card payment unavailable', 'Use M-Pesa, or add your email in Settings first.');
      }
    } catch (e: any) { Alert.alert('Card checkout failed', e?.message ?? String(e)); }
    finally { setCardBusy(false); }
  };

  const amount = plan === 'family' ? priceFamily : priceIndividual;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{plan === 'family' ? 'Family Plan' : 'Subscribe'}</Text>
          <TouchableOpacity hitSlop={8} onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, padding: 18 }}>
          <View style={styles.amountBox}>
            <Text style={styles.amountBoxLabel}>Pay today</Text>
            <Text style={styles.amountBoxValue}>{formatMoney(amount, 'KSh')}</Text>
          </View>

          {!payment ? (
            <>
              <Text style={styles.label}>M-Pesa phone number</Text>
              <View style={[styles.inputWrap, phoneError && { borderColor: colors.danger }]}>
                <Text style={styles.inputPrefix}>+254</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="7XX XXX XXX"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              {phoneError && <Text style={{ color: colors.danger, fontSize: 11.5, marginTop: 4 }}>{phoneError}</Text>}
              <View style={{ flex: 1 }} />
              <TouchableOpacity activeOpacity={0.85} onPress={handleSubmit} disabled={submitting}
                style={[styles.subscribeBtn, submitting && { opacity: 0.6 }]}>
                <Ionicons name="phone-portrait-outline" size={15} color="#fff" />
                <Text style={styles.subscribeBtnText}>{submitting ? 'Sending STK…' : 'Send STK Push'}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} onPress={handleCard} disabled={cardBusy}
                style={[styles.cardBtn, cardBusy && { opacity: 0.6 }]}>
                {cardBusy
                  ? <ActivityIndicator size="small" color={colors.text} />
                  : <><Ionicons name="card-outline" size={15} color={colors.text} /><Text style={styles.cardBtnText}>Pay with card instead</Text></>}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.center}>
              {!done ? (
                <>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.checkoutWait}>Check your phone for the M-Pesa prompt</Text>
                  <Text style={styles.checkoutWaitSmall}>Status: {(payment.status ?? 'PENDING').toString()}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                  <Text style={styles.checkoutWait}>Payment confirmed</Text>
                </>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.backgroundAlt },
    scroll: { paddingHorizontal: 18, paddingTop: 12 },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    loadingText: { fontSize: 11.5, color: c.textSecondary, marginTop: 8, fontWeight: '500' },

    hero: {
      borderRadius: 22, padding: 18, alignItems: 'center', marginBottom: 20,
      shadowColor: c.primary, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
    },
    heroIconWrap: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 6 },
    heroSubtitle: { color: '#fff', opacity: 0.95, fontSize: 13.5, textAlign: 'center', lineHeight: 20 },

    sectionTitle: { fontSize: 17, fontWeight: '700', color: c.text, marginTop: 20, marginBottom: 12 },

    planCard: {
      backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border,
      padding: 12, marginBottom: 8,
    },
    planCardActive: { borderColor: c.success, borderLeftWidth: 3 },
    planHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    planIcon: {
      width: 38, height: 38, borderRadius: 12,
      backgroundColor: c.purpleLight,
      alignItems: 'center', justifyContent: 'center',
    },
    planTitle: { fontSize: 13.5, fontWeight: '700', color: c.text },
    planMeta: { fontSize: 11.5, color: c.textSecondary, marginTop: 1 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
    statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 12 },
    priceAmount: { fontSize: 17, fontWeight: '700', color: c.text },
    pricePer: { fontSize: 11.5, color: c.textSecondary },

    planActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    activeNote: { fontSize: 11.5, color: c.textSecondary, flex: 1 },
    linkBtn: { paddingVertical: 4, paddingHorizontal: 8 },
    linkBtnText: { color: c.danger, fontWeight: '700', fontSize: 12.5 },

    cardBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderWidth: 1, borderColor: c.border,
      paddingVertical: 11, borderRadius: 12, marginTop: 10,
    },
    cardBtnText: { color: c.text, fontSize: 13, fontWeight: '700' },
    subscribeBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: c.primary,
      paddingVertical: 11, borderRadius: 12,
    },
    subscribeBtnText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
    trialBtn: { alignItems: 'center', paddingVertical: 8 },
    trialBtnText: { color: c.primary, fontWeight: '700', fontSize: 12.5 },

    historyCard: {
      backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
    },
    historyRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    historyRowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
    historyIcon: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: c.warningSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    historyTitle: { fontSize: 13.5, fontWeight: '700', color: c.text },
    historyMeta: { fontSize: 11.5, color: c.textTertiary, marginTop: 1 },
    historyAmount: { fontSize: 13.5, fontWeight: '700', color: c.text },

    emptyCard: {
      backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border,
      padding: 16, alignItems: 'center',
    },
    emptyText: { fontSize: 11.5, color: c.textSecondary },

    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.dangerSoft, borderRadius: 12,
      padding: 12, marginTop: 12,
    },
    errorBannerText: { flex: 1, color: c.danger, fontSize: 12.5, fontWeight: '700' },
    retryInline: { color: c.danger, fontWeight: '800', fontSize: 13 },

    sheetHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12,
      backgroundColor: c.background,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    amountBox: {
      backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border,
      padding: 18, marginBottom: 18, alignItems: 'center',
    },
    amountBoxLabel: { fontSize: 11.5, color: c.textSecondary },
    amountBoxValue: { fontSize: 28, fontWeight: '800', color: c.primary, marginTop: 4 },
    label: { fontSize: 11.5, fontWeight: '700', color: c.textSecondary, marginBottom: 6 },
    inputWrap: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 12, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 12,
    },
    inputPrefix: { fontSize: 13.5, color: c.textSecondary, marginRight: 8, fontWeight: '700' },
    input: { flex: 1, fontSize: 13.5, color: c.text, paddingVertical: 12 },
    checkoutWait: { fontSize: 15, fontWeight: '700', color: c.text, marginTop: 12, textAlign: 'center' },
    checkoutWaitSmall: { fontSize: 11.5, color: c.textSecondary, marginTop: 4 },
  });
}
