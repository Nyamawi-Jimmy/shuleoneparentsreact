// Plans & subscriptions — mirrors the web ParentSubscriptions page:
// value banner → Free vs Premium comparison → billing-period picker →
// family package → per-child list (trial / subscribe / cancel / resume) →
// payment panel (promo code, M-Pesa STK, card via Paystack) → history.
// All data comes from the same /parent/billing endpoints the web uses.

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { GradientAppBar } from '../../components/GradientAppBar';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useAuth } from '../../context/AuthContext';
import { useParentProfile } from '../../context/ParentProfileContext';
import { useBilling, useBillingPaymentPoller } from '../../hooks/useBilling';
import {
  startTrial, mpesaCheckoutChild, mpesaCheckoutFamily, cancelChildSubscription, resumeChildSubscription,
  paystackCheckoutChild, paystackCheckoutFamily, listBillingPlans, fetchParentPromo, paystackQs,
} from '../../api/billing';
import { BillingPayment, BillingPlanRow, PromoResult } from '../../api/billing.types';
import { normalizeKenyanPhone } from '../../api/fees.types';

const PERIODS = [
  { id: 'MONTHLY', label: 'Monthly' },
  { id: 'TERMLY', label: 'Termly' },
  { id: 'ANNUAL', label: 'Annual' },
] as const;
type Period = typeof PERIODS[number]['id'];
const PERIOD_UNIT: Record<Period, string> = { MONTHLY: 'month', TERMLY: 'term', ANNUAL: 'year' };

const COMPARISON: [string, boolean, boolean][] = [
  ['Fee balance, receipts & M-Pesa payments', true, true],
  ['School announcements, diary & messages', true, true],
  ['AI homework helper (step-by-step guidance)', false, true],
  ['Adaptive revision paths & practice for every subject', false, true],
  ['Coding & robotics lessons + projects', false, true],
  ['Live bus map & stop-by-stop tracking', false, true],
  ['Weekly progress insight & next-best-action', false, true],
];

const kes = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;
const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
const validEmail = (e?: string | null) => /.+@.+\..+/.test(String(e || ''));

interface Target { kind: 'child' | 'family'; studentId?: number; label: string }

export const SubscriptionsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { accessToken } = useAuth();
  const { parent } = useParentProfile();
  const { status, history, loading, refreshing, refresh } = useBilling();

  const [plans, setPlans] = useState<BillingPlanRow[]>([]);
  const [period, setPeriod] = useState<Period>('MONTHLY');
  const [target, setTarget] = useState<Target | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<(PromoResult & { code: string }) | null>(null);
  const [promoErr, setPromoErr] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [phase, setPhase] = useState<'idle' | 'mpesa' | 'paystack'>('idle');
  const [payment, setPayment] = useState<BillingPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    if (!accessToken) return;
    listBillingPlans(accessToken).then((p) => setPlans(Array.isArray(p) ? p : [])).catch(() => {});
  }, [accessToken]));

  const { done } = useBillingPaymentPoller(payment?.id ?? null, {
    onSuccess: () => { setPhase('idle'); setPayment(null); setTarget(null); refresh(); },
    onFailure: () => { setPhase('idle'); setPayment(null); setError('Payment was not completed.'); },
  });

  // Raw status payload — same field names the web reads.
  const raw = (status?.raw ?? {}) as any;
  const children: any[] = raw.children ?? status?.childStatuses ?? [];
  const family = raw.family ?? { numChildren: 0, amountKes: 0 };
  const childMonthlyKes = Number(raw.childMonthlyKes ?? (family.numChildren === 1 ? family.amountKes : 0)) || 0;
  const periodUnit = PERIOD_UNIT[period];
  const clampSeats = (n: number) => Math.max(1, Math.min(4, n || 1));
  const periodPriceFor = (seats: number) => {
    const r = plans.find((p) => p.numLearners === clampSeats(seats) && p.period === period);
    return r ? Number(r.amountKes) : null;
  };
  const childPeriodKes = periodPriceFor(1) ?? childMonthlyKes;
  const familyPeriodKes = periodPriceFor(family.numChildren) ?? (Number(family.amountKes) || 0);
  const selectedAmount = target ? (target.kind === 'family' ? familyPeriodKes : childPeriodKes) : 0;
  const chargedAmount = promo?.newAmountKes != null ? promo.newAmountKes : selectedAmount;
  const activeChildren = children.filter((c) => c.active);
  const cardEmailReady = raw.parentEmailAvailable === true || validEmail(raw.parentEmail || parent?.email);

  const clearPromo = () => { setPromo(null); setPromoErr(null); };
  const pick = (t: Target) => { setError(null); clearPromo(); setTarget(t); };
  const pickPeriod = (p: Period) => { setPeriod(p); clearPromo(); };

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code || !target || !accessToken) return;
    setPromoErr(null);
    try {
      const r = await fetchParentPromo(accessToken, code, target.kind, target.studentId ?? null, period);
      if (r?.valid) setPromo({ ...r, code });
      else { setPromo(null); setPromoErr('That code isn’t valid.'); }
    } catch { setPromo(null); setPromoErr('Could not check that code.'); }
  };

  const payMpesa = async () => {
    if (!target || !accessToken || phase !== 'idle') return;
    const phoneNorm = normalizeKenyanPhone(phone);
    if (!phoneNorm) { setError('Enter a valid M-Pesa phone number.'); return; }
    setError(null); setPhase('mpesa');
    try {
      const body = { phone: phoneNorm, period, code: promo?.code ?? null };
      const p = target.kind === 'family'
        ? await mpesaCheckoutFamily(accessToken, { ...body, numLearners: family.numChildren })
        : await mpesaCheckoutChild(accessToken, target.studentId!, body);
      setPayment(p);
    } catch (e: any) { setPhase('idle'); setError(e?.message || 'Could not start M-Pesa payment.'); }
  };

  const payCard = async () => {
    if (!target || !accessToken || phase !== 'idle') return;
    if (!cardEmailReady) { setError('Card payment needs an email address — add one in Settings, or use M-Pesa.'); return; }
    setError(null); setPhase('paystack');
    try {
      const qs = paystackQs(period, promo?.code ?? null);
      const p = target.kind === 'family'
        ? await paystackCheckoutFamily(accessToken, { numLearners: family.numChildren }, qs)
        : await paystackCheckoutChild(accessToken, target.studentId!, {}, qs);
      const url = (p?.raw as any)?.redirectUrl || (p?.raw as any)?.authorizationUrl;
      if (p && url) { setPayment(p); Linking.openURL(String(url)); }
      else { setPhase('idle'); setError('Card payment is currently unavailable.'); }
    } catch (e: any) { setPhase('idle'); setError(e?.message || 'Could not start card payment.'); }
  };

  const doTrial = async (studentId: number) => {
    if (!accessToken || busyId != null) return;
    setBusyId(studentId); setError(null);
    try { await startTrial(accessToken, studentId); refresh(); }
    catch (e: any) { setError(e?.message || 'Could not start the trial.'); }
    finally { setBusyId(null); }
  };
  const doCancel = async (studentId: number) => {
    if (!accessToken || busyId != null) return;
    setBusyId(studentId); setError(null);
    try { await cancelChildSubscription(accessToken, studentId); refresh(); }
    catch (e: any) { setError(e?.message || 'Could not cancel.'); }
    finally { setBusyId(null); }
  };
  const doResume = async (studentId: number) => {
    if (!accessToken || busyId != null) return;
    setBusyId(studentId); setError(null);
    try { await resumeChildSubscription(accessToken, studentId); refresh(); }
    catch (e: any) { setError(e?.message || 'Could not resume.'); }
    finally { setBusyId(null); }
  };

  return (
    <View style={styles.root}>
      <GradientAppBar title="Subscriptions" subtitle="Per child, or the whole family at a discount" showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        >
          {loading && !status ? (
            <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : (
            <>
              {/* Value banner — the web's gradient statement panel */}
              <LinearGradient colors={['#7C3AED', '#DB2777']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
                <View style={styles.bannerCircleA} />
                <View style={styles.bannerCircleB} />
                <Text style={styles.bannerTitle}>Give your children the best advantage</Text>
                <Text style={styles.bannerSub}>
                  Adaptive learning, coding & robotics, weekly insights, and live bus tracking — everything below unlocks with Premium.
                </Text>
              </LinearGradient>

              {/* Free vs Premium comparison */}
              <View style={styles.tableCard}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <Text style={[styles.tableLabel, { fontFamily: fonts.bold, color: colors.text }]}>What you get</Text>
                  <Text style={styles.tableColHead}>Free</Text>
                  <Text style={[styles.tableColHead, { color: colors.primary }]}>Premium</Text>
                </View>
                {COMPARISON.map(([label, free, prem], i) => (
                  <View key={label} style={[styles.tableRow, i > 0 && styles.divider]}>
                    <Text style={styles.tableLabel}>{label}</Text>
                    <Text style={[styles.tableTick, { color: free ? colors.success : colors.textTertiary }]}>{free ? '✓' : '—'}</Text>
                    <Text style={[styles.tableTick, { color: prem ? colors.success : colors.textTertiary }]}>{prem ? '✓' : '—'}</Text>
                  </View>
                ))}
              </View>

              {/* Billing period */}
              <Text style={styles.kicker}>BILLING PERIOD</Text>
              <View style={styles.periodRow}>
                {PERIODS.map((po) => {
                  const r = plans.find((p) => p.numLearners === 1 && p.period === po.id);
                  const active = period === po.id;
                  const savings = Number(r?.savingsPct || 0);
                  return (
                    <TouchableOpacity key={po.id} activeOpacity={0.8} onPress={() => pickPeriod(po.id)}
                      style={[styles.periodBtn, active && { borderColor: colors.primary, backgroundColor: colors.primarySofter }]}>
                      <Text style={[styles.periodLabel, active && { color: colors.primary }]}>{po.label}</Text>
                      {savings > 0 && (
                        <Text style={styles.periodSave}>
                          {po.id === 'ANNUAL' && savings >= 16 ? `${Math.round(12 * savings / 100)} months free` : `save ${savings}%`}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Family package */}
              {activeChildren.length > 1 && (
                <View style={styles.familyCard}>
                  <View style={styles.popularRibbon}><Text style={styles.popularRibbonText}>MOST POPULAR</Text></View>
                  <View style={styles.familyTop}>
                    <View style={styles.familyIcon}>
                      <MaterialCommunityIcons name="account-group" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.familyTitle}>Family package</Text>
                      <Text style={styles.familyDesc}>{family.note || `Covers all ${family.numChildren} active children.`}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.familyPrice}>{kes(familyPeriodKes)}</Text>
                      <Text style={styles.familyPer}>/ {periodUnit}</Text>
                    </View>
                  </View>
                  <TouchableOpacity activeOpacity={0.85}
                    onPress={() => pick({ kind: 'family', label: `Family package · ${family.numChildren} ${family.numChildren === 1 ? 'child' : 'children'}` })}>
                    <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.familyBtn}>
                      <Text style={styles.familyBtnText}>
                        {target?.kind === 'family' ? 'Selected — choose how to pay below' : 'Subscribe the whole family'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {/* Per-child list */}
              <Text style={styles.sectionTitle}>Your children</Text>
              {children.length === 0 ? (
                <View style={styles.emptyCard}><Text style={styles.emptyText}>No children found on your account yet.</Text></View>
              ) : (
                <View style={styles.listCard}>
                  {children.map((c, i) => {
                    const expiry = fmtDate(c.entitlementExpiresAt || c.planExpiresAt || c.trialExpiresAt);
                    const isTrial = c.plan === 'TRIAL' || c.trialActive;
                    const selected = target?.kind === 'child' && target.studentId === c.studentId;
                    const busy = busyId === c.studentId;
                    return (
                      <View key={c.studentId ?? i} style={[styles.childRow, i > 0 && styles.divider]}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={styles.childNameRow}>
                            <Text style={styles.childName} numberOfLines={1}>{c.name || `Student ${c.studentId}`}</Text>
                            {!c.active && <View style={styles.inactiveChip}><Text style={styles.inactiveChipText}>INACTIVE</Text></View>}
                          </View>
                          <Text style={styles.childMeta} numberOfLines={1}>
                            {c.className || '—'}
                            {c.premiumActive
                              ? isTrial ? ` · Trial until ${expiry}`
                                : c.cancelAtPeriodEnd ? ` · Premium ends ${expiry}` : ` · Premium until ${expiry}`
                              : c.trialAvailable ? ' · Free · trial available' : ' · Free'}
                          </Text>
                          <View style={styles.childActions}>
                            {c.premiumActive ? (
                              c.cancelAtPeriodEnd ? (
                                <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.primary }]} disabled={busy}
                                  activeOpacity={0.85} onPress={() => doResume(c.studentId)}>
                                  {busy ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.actBtnText}>Resume</Text>}
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity style={styles.cancelBtn} disabled={busy}
                                  activeOpacity={0.8} onPress={() => doCancel(c.studentId)}>
                                  {busy ? <ActivityIndicator size="small" color={colors.danger} /> : <Text style={styles.cancelBtnText}>Cancel</Text>}
                                </TouchableOpacity>
                              )
                            ) : (
                              <>
                                {c.trialAvailable && (
                                  <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.purple }]} disabled={busy}
                                    activeOpacity={0.85} onPress={() => doTrial(c.studentId)}>
                                    {busy ? <ActivityIndicator size="small" color="#FFF" /> : (
                                      <><Ionicons name="sparkles" size={12} color="#FFF" /><Text style={styles.actBtnText}>Start trial</Text></>
                                    )}
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                  style={[styles.actBtn, { backgroundColor: selected ? colors.success : '#059669' }]}
                                  activeOpacity={0.85}
                                  onPress={() => pick({ kind: 'child', studentId: c.studentId, label: c.name || `Student ${c.studentId}` })}>
                                  <Ionicons name="sparkles" size={12} color="#FFF" />
                                  <Text style={styles.actBtnText}>{selected ? 'Selected' : `Subscribe · ${kes(childPeriodKes)}`}</Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Payment panel — appears once a target is chosen */}
              {target && (
                <View style={styles.payCard}>
                  <View style={styles.payHead}>
                    <Text style={styles.payFor} numberOfLines={1}>
                      <Text style={{ color: colors.textTertiary }}>Paying for: </Text>{target.label}
                    </Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.payAmount}>{kes(chargedAmount)}<Text style={styles.payPer}> / {periodUnit}</Text></Text>
                      {promo && <Text style={styles.payWas}>{kes(selectedAmount)}</Text>}
                    </View>
                  </View>

                  {phase === 'mpesa' && payment && !done ? (
                    <View style={styles.waitBox}>
                      <ActivityIndicator size="small" color={colors.warning} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.waitTitle}>Check your phone for the M-Pesa prompt</Text>
                        <Text style={styles.waitSub}>Waiting for confirmation…</Text>
                      </View>
                    </View>
                  ) : phase === 'paystack' && payment && !done ? (
                    <View style={styles.waitBox}>
                      <ActivityIndicator size="small" color={colors.info} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.waitTitle}>Finish the card payment in your browser</Text>
                        <Text style={styles.waitSub}>We’ll confirm it here automatically.</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.inline}>
                        <TextInput style={styles.input} value={promoInput} onChangeText={setPromoInput}
                          placeholder="Discount or referral code" placeholderTextColor={colors.textTertiary} autoCapitalize="characters" />
                        <TouchableOpacity style={[styles.applyBtn, !promoInput.trim() && { opacity: 0.4 }]}
                          disabled={!promoInput.trim()} activeOpacity={0.8} onPress={applyPromo}>
                          <Text style={styles.applyBtnText}>Apply</Text>
                        </TouchableOpacity>
                      </View>
                      {promo && <Text style={styles.promoOk}>Code applied — {promo.percentOff}% off{promo.label ? ` · ${promo.label}` : ''}</Text>}
                      {promoErr && <Text style={styles.promoErr}>{promoErr}</Text>}

                      <View style={styles.inline}>
                        <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                          keyboardType="phone-pad" placeholder="07XX XXX XXX" placeholderTextColor={colors.textTertiary} />
                        <TouchableOpacity style={styles.mpesaBtn} activeOpacity={0.85} onPress={payMpesa}>
                          <Ionicons name="phone-portrait-outline" size={14} color="#FFF" />
                          <Text style={styles.mpesaBtnText}>M-Pesa</Text>
                        </TouchableOpacity>
                      </View>

                      {!cardEmailReady && (
                        <View style={styles.emailNote}>
                          <Text style={styles.emailNoteText}>
                            Card payment needs an email for checkout and receipts. Continue with M-Pesa, or{' '}
                            <Text style={{ fontFamily: fonts.bold, textDecorationLine: 'underline' }}
                              onPress={() => router.push('/settings' as any)}>add an email in Settings</Text>.
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity style={[styles.cardPayBtn, !cardEmailReady && { backgroundColor: colors.textTertiary }]}
                        activeOpacity={0.85} disabled={!cardEmailReady} onPress={payCard}>
                        <Ionicons name="card-outline" size={15} color="#FFF" />
                        <Text style={styles.cardPayBtnText}>Pay with card</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setTarget(null); setError(null); clearPromo(); }}>
                        <Text style={styles.payCancel}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              {error && (
                <View style={styles.errRow}>
                  <Ionicons name="alert-circle" size={15} color={colors.danger} />
                  <Text style={styles.errText}>{error}</Text>
                </View>
              )}

              {/* Payment history */}
              {history.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Payment history</Text>
                  <View style={styles.listCard}>
                    {history.map((h, i) => {
                      const r = (h.raw ?? {}) as any;
                      const st = String(h.status || r.status || '').toUpperCase();
                      const tone = st === 'SUCCESS' ? colors.success : st === 'PENDING' ? colors.warning : colors.danger;
                      const provider = r.provider === 'MPESA' || h.channel === 'MPESA' ? 'M-Pesa'
                        : r.provider === 'PAYSTACK' || h.channel === 'PAYSTACK' ? 'Card' : (r.provider || h.channel || '—');
                      const scope = r.scope === 'FAMILY' ? `Family (${r.numChildren ?? ''})` : '1 child';
                      const amount = Number(r.amountKes ?? h.amount ?? 0);
                      return (
                        <View key={`${h.id}-${i}`} style={[styles.historyRow, i > 0 && styles.divider]}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.historyTitle}>{kes(amount)} · {scope}</Text>
                            <Text style={styles.historyMeta} numberOfLines={1}>
                              {fmtDate(h.date || r.createdAt)} · {provider}{r.receipt ? ` · ${r.receipt}` : ''}
                            </Text>
                          </View>
                          <Text style={[styles.historyStatus, { color: tone }]}>
                            {st === 'SUCCESS' ? 'Paid' : st === 'PENDING' ? 'Pending' : st === 'CANCELLED' ? 'Cancelled' : 'Failed'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16 },
    center: { padding: 44, alignItems: 'center' },

    banner: {
      borderRadius: 20, padding: 18, overflow: 'hidden',
      marginTop: -20, marginBottom: 18,
      shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25, shadowRadius: 18, elevation: 7,
    },
    bannerCircleA: { position: 'absolute', right: -40, top: -56, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.1)' },
    bannerCircleB: { position: 'absolute', left: -32, bottom: -48, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.07)' },
    bannerTitle: { color: '#FFF', fontSize: 17.5, fontFamily: fonts.extrabold, letterSpacing: -0.3, lineHeight: 22 },
    bannerSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12.5, fontFamily: fonts.regular, marginTop: 5, lineHeight: 18 },

    tableCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: 'hidden', marginBottom: 20 },
    tableHead: { backgroundColor: c.backgroundAlt },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 13 },
    tableLabel: { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 16, paddingRight: 8 },
    tableColHead: { width: 56, textAlign: 'center', fontSize: 11.5, fontFamily: fonts.bold, color: c.textTertiary },
    tableTick: { width: 56, textAlign: 'center', fontSize: 13, fontFamily: fonts.extrabold },
    divider: { borderTopWidth: 1, borderTopColor: c.border },

    kicker: { fontSize: 10.5, fontFamily: fonts.bold, color: c.textTertiary, letterSpacing: 1, marginBottom: 8 },
    periodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    periodBtn: {
      flex: 1, alignItems: 'center', borderWidth: 1.5, borderColor: c.border,
      borderRadius: 13, paddingVertical: 10, backgroundColor: c.card,
    },
    periodLabel: { fontSize: 12.5, fontFamily: fonts.bold, color: c.text },
    periodSave: { fontSize: 10, fontFamily: fonts.bold, color: c.success, marginTop: 2 },

    familyCard: {
      borderWidth: 1.5, borderColor: c.primary + '55', backgroundColor: c.primarySofter,
      borderRadius: 18, padding: 15, paddingTop: 18, marginBottom: 20,
    },
    popularRibbon: {
      position: 'absolute', top: -10, left: 16,
      backgroundColor: c.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3,
    },
    popularRibbonText: { color: '#FFF', fontSize: 9, fontFamily: fonts.extrabold, letterSpacing: 0.8 },
    familyTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
    familyIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: c.primary + '1F', alignItems: 'center', justifyContent: 'center' },
    familyTitle: { fontSize: 14.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    familyDesc: { fontSize: 12, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2, lineHeight: 17 },
    familyPrice: { fontSize: 19, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.4 },
    familyPer: { fontSize: 10.5, fontFamily: fonts.regular, color: c.textTertiary },
    familyBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 13 },
    familyBtnText: { color: '#FFF', fontSize: 13.5, fontFamily: fonts.bold },

    sectionTitle: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.4, marginBottom: 12 },
    listCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, marginBottom: 20, overflow: 'hidden' },
    emptyCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 22, alignItems: 'center', marginBottom: 20 },
    emptyText: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary },

    childRow: { paddingHorizontal: 14, paddingVertical: 12 },
    childNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    childName: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2, flexShrink: 1 },
    inactiveChip: { borderWidth: 1, borderColor: c.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
    inactiveChipText: { fontSize: 8.5, fontFamily: fonts.bold, color: c.textTertiary, letterSpacing: 0.8 },
    childMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    childActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    actBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8,
    },
    actBtnText: { color: '#FFF', fontSize: 12, fontFamily: fonts.bold },
    cancelBtn: {
      borderWidth: 1.5, borderColor: c.danger + '55', borderRadius: 10,
      paddingHorizontal: 13, paddingVertical: 8,
    },
    cancelBtnText: { color: c.danger, fontSize: 12, fontFamily: fonts.bold },

    payCard: { backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 15, marginBottom: 14, gap: 10 },
    payHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
    payFor: { flex: 1, fontSize: 13, fontFamily: fonts.bold, color: c.text },
    payAmount: { fontSize: 16.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3 },
    payPer: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary },
    payWas: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary, textDecorationLine: 'line-through' },
    inline: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 11,
      backgroundColor: c.background, paddingHorizontal: 12, height: 44,
      fontSize: 13, fontFamily: fonts.regular, color: c.text,
    },
    applyBtn: {
      borderRadius: 11, backgroundColor: c.primarySoft,
      paddingHorizontal: 16, justifyContent: 'center',
    },
    applyBtnText: { color: c.primary, fontSize: 13, fontFamily: fonts.bold },
    promoOk: { fontSize: 11.5, fontFamily: fonts.bold, color: c.success },
    promoErr: { fontSize: 11.5, fontFamily: fonts.regular, color: c.danger },
    mpesaBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 11, backgroundColor: '#059669',
      paddingHorizontal: 15, justifyContent: 'center',
    },
    mpesaBtnText: { color: '#FFF', fontSize: 13, fontFamily: fonts.bold },
    emailNote: { borderWidth: 1, borderColor: c.warning + '55', backgroundColor: c.warningSoft, borderRadius: 10, padding: 10 },
    emailNoteText: { fontSize: 11.5, fontFamily: fonts.regular, color: c.warning, lineHeight: 16 },
    cardPayBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
      backgroundColor: '#4F46E5', borderRadius: 11, paddingVertical: 12,
    },
    cardPayBtnText: { color: '#FFF', fontSize: 13.5, fontFamily: fonts.bold },
    payCancel: { textAlign: 'center', fontSize: 12, fontFamily: fonts.semibold, color: c.textTertiary, paddingVertical: 4 },

    waitBox: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 1, borderColor: c.warning + '55', backgroundColor: c.warningSoft,
      borderRadius: 12, padding: 12,
    },
    waitTitle: { fontSize: 12.5, fontFamily: fonts.bold, color: c.text },
    waitSub: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 1 },

    errRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, paddingHorizontal: 2 },
    errText: { flex: 1, fontSize: 12.5, fontFamily: fonts.medium, color: c.danger },

    historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
    historyTitle: { fontSize: 13, fontFamily: fonts.bold, color: c.text },
    historyMeta: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    historyStatus: { fontSize: 11.5, fontFamily: fonts.bold },
  });
}
