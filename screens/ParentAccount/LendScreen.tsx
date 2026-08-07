// ShuleOne Lend — fee financing built on the family's own payment history.
//
// The argument the screen has to make, in order: here is the score your own
// fee payments earned you, here is exactly how it was worked out, here is what
// partner banks will lend against it, and here is what you've applied for. The
// score breakdown sits before the offers deliberately — a parent should
// understand the number before being sold against it.
//
// Everything is a preview: the figures are real (computed from this family's
// actual billing and receipts) but no bank is contacted and no money moves.

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientAppBar } from '../../components/GradientAppBar';
import { LoanApplySheet } from '../../components/LoanApplySheet';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useLending } from '../../hooks/useLending';
import { moneyToNumber } from '../../api/fees.types';
import {
  LendingChild, LoanOffer, LoanApplication, CreditScore, ScoreFactor,
  scoreToPercent, bandColorKey, bandSoftKey, factorColorKey, statusMeta,
  purposeLabel, formatRate, dataPointLabel, formatDataPoint, SCORE_MIN, SCORE_MAX,
} from '../../api/lending.types';

const ksh = (n: number): string => `KSh ${(Number.isFinite(n) ? n : 0).toLocaleString('en-KE')}`;
const fmtDate = (s?: string | null): string => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

type Section = 'score' | 'offers' | 'applications';

export const LendScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const {
    children, applications, comingSoon, unavailable,
    loading, refreshing, error, refresh, consent, apply,
  } = useLending();

  const [pickedId, setPickedId] = useState<number | null>(null);
  const [section, setSection] = useState<Section>('score');
  const [showAllPoints, setShowAllPoints] = useState(false);
  const [applyOffer, setApplyOffer] = useState<LoanOffer | null>(null);
  const [consentBusy, setConsentBusy] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  // The picked child is local to this screen: comparing what two children
  // qualify for shouldn't require switching the app-wide selected child.
  const child: LendingChild | null =
    children.find((c) => c.studentId === pickedId) ?? children[0] ?? null;
  const score: CreditScore | null = child?.score ?? null;
  const offers: LoanOffer[] = child?.offers ?? [];
  const consented = score?.consentGranted === true;
  const scored = score?.score != null;

  const childApplications = useMemo(
    () => applications.filter((a) => child == null || a.studentId === child.studentId),
    [applications, child],
  );

  const handleConsent = async (granted: boolean) => {
    if (child?.studentId == null) return;
    setConsentBusy(true);
    setConsentError(null);
    const msg = await consent(child.studentId, granted);
    setConsentBusy(false);
    if (msg) setConsentError(msg);
    else if (granted) setSection('offers');
  };

  const bandColor = colors[bandColorKey(score?.band)];
  const bandSoft = colors[bandSoftKey(score?.band)];

  return (
    <View style={styles.root}>
      <GradientAppBar
        large
        title="ShuleOne Lend"
        subtitle="Fee financing built on your payment history"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {loading && children.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.centerText}>Reading your fee-payment story…</Text>
          </View>
        ) : unavailable || (error && children.length === 0) ? (
          <View style={styles.stateCard}>
            <View style={[styles.stateIcon, { backgroundColor: colors.warningSoft }]}>
              <MaterialCommunityIcons name="bank-outline" size={26} color={colors.warning} />
            </View>
            <Text style={styles.stateTitle}>Lend preview is warming up</Text>
            <Text style={styles.stateText}>
              {error ?? 'We couldn’t reach the lending service. Your fee data is safe — nothing has been shared.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} activeOpacity={0.8} onPress={refresh}>
              <Ionicons name="refresh" size={15} color={colors.primary} />
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : children.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={[styles.stateIcon, { backgroundColor: colors.backgroundAlt }]}>
              <Ionicons name="people-outline" size={26} color={colors.textTertiary} />
            </View>
            <Text style={styles.stateTitle}>No children on this account yet</Text>
            <Text style={styles.stateText}>
              Once a child is linked to your account, their fee history builds a credit score here.
            </Text>
          </View>
        ) : (
          <>
            {/* Never show a figure without saying what it is first. */}
            <View style={[styles.banner, { backgroundColor: colors.infoSoft }]}>
              <Ionicons name="information-circle" size={17} color={colors.info} />
              <Text style={[styles.bannerText, { color: colors.info }]}>
                {comingSoon
                  ? 'Preview prototype. Loans shown are simulations with placeholder partner banks.'
                  : 'Figures are simulations based on your real fee history.'}
              </Text>
            </View>

            {children.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.childRow}
              >
                {children.map((c) => {
                  const on = c.studentId === child?.studentId;
                  return (
                    <TouchableOpacity
                      key={String(c.studentId)}
                      style={[styles.childPill, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      activeOpacity={0.8}
                      onPress={() => { setPickedId(c.studentId); setShowAllPoints(false); }}
                    >
                      <Text style={[styles.childPillText, on && styles.childPillTextOn]} numberOfLines={1}>
                        {c.studentName ?? 'Child'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* ── Score hero ─────────────────────────────────────────────── */}
            <View style={styles.heroCard}>
              {scored ? (
                <>
                  <View style={styles.heroTop}>
                    <ScoreDial
                      score={score!.score!}
                      color={bandColor}
                      track={colors.backgroundAlt}
                      textColor={colors.text}
                      label={score?.bandLabel ?? ''}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.heroLabel}>Pre-qualified up to</Text>
                      <Text style={styles.heroValue} numberOfLines={1}>
                        {ksh(moneyToNumber(score?.eligibleAmount ?? null))}
                      </Text>
                      <View style={styles.chipRow}>
                        <View style={[styles.chip, { backgroundColor: bandSoft }]}>
                          <Text style={[styles.chipText, { color: bandColor }]}>Band {score?.band}</Text>
                        </View>
                        {score?.lowData === true && (
                          <View style={[styles.chip, { backgroundColor: colors.warningSoft }]}>
                            <Text style={[styles.chipText, { color: colors.warning }]}>Thin file</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.heroFoot}>
                    <View style={[styles.dot, { backgroundColor: consented ? colors.success : colors.textTertiary }]} />
                    <Text style={styles.heroFootText} numberOfLines={2}>
                      Data sharing {consented ? 'on' : 'off'} · {child?.schoolName ?? 'your school'}
                      {score?.computedAt ? ` · updated ${fmtDate(score.computedAt)}` : ''}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.heroEmpty}>
                  <View style={[styles.stateIcon, { backgroundColor: colors.backgroundAlt }]}>
                    <MaterialCommunityIcons name="chart-line" size={26} color={colors.textTertiary} />
                  </View>
                  <Text style={styles.stateTitle}>No fee history yet to score</Text>
                  <Text style={styles.stateText}>
                    {child?.studentName ?? 'This child'} needs a term or two of billing and payments before
                    a credit score can be built.
                  </Text>
                </View>
              )}
            </View>

            {/* ── Section switch ─────────────────────────────────────────── */}
            <View style={styles.segment}>
              {([
                { key: 'score', label: 'Score', icon: 'speedometer-outline' },
                { key: 'offers', label: 'Offers', icon: 'pricetags-outline' },
                { key: 'applications', label: 'Applied', icon: 'document-text-outline' },
              ] as const).map((s) => {
                const on = section === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.segBtn, on && styles.segBtnOn]}
                    activeOpacity={0.85}
                    onPress={() => setSection(s.key)}
                  >
                    <Ionicons name={s.icon} size={15} color={on ? '#FFF' : colors.textSecondary} />
                    <Text style={[styles.segText, on && styles.segTextOn]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Score breakdown ────────────────────────────────────────── */}
            {section === 'score' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>How your score is built</Text>
                {!scored ? (
                  <Text style={styles.emptyLine}>
                    Nothing to break down yet — the score appears once there is fee history.
                  </Text>
                ) : (
                  <>
                    {(score?.factors ?? []).map((f, i) => (
                      <FactorBar key={f.key ?? String(i)} factor={f} styles={styles} colors={colors} />
                    ))}

                    <TouchableOpacity
                      style={styles.moreBtn}
                      activeOpacity={0.75}
                      onPress={() => setShowAllPoints((v) => !v)}
                    >
                      <Text style={[styles.moreBtnText, { color: colors.primary }]}>
                        {showAllPoints ? 'Hide the raw data' : 'See every data point we use'}
                      </Text>
                      <Ionicons
                        name={showAllPoints ? 'chevron-up' : 'chevron-down'}
                        size={15}
                        color={colors.primary}
                      />
                    </TouchableOpacity>

                    {showAllPoints && (
                      <View style={styles.pointGrid}>
                        {Object.entries(score?.dataPoints ?? {}).map(([k, v]) => (
                          <View key={k} style={styles.point}>
                            <Text style={styles.pointLabel} numberOfLines={2}>{dataPointLabel(k)}</Text>
                            <Text style={styles.pointValue} numberOfLines={1}>{formatDataPoint(k, v)}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <Text style={styles.footNote}>
                      Scores run {SCORE_MIN}–{SCORE_MAX} and are recalculated from your own billing and
                      receipts every time you open this page. No credit bureau is involved.
                    </Text>
                  </>
                )}
              </View>
            )}

            {/* ── Offers ─────────────────────────────────────────────────── */}
            {section === 'offers' && (
              <>
                {!consented ? (
                  <View style={[styles.consentCard, { borderColor: colors.purple }]}>
                    <View style={[styles.stateIcon, { backgroundColor: colors.purpleLight }]}>
                      <MaterialCommunityIcons name="shield-check-outline" size={24} color={colors.purpleDeep} />
                    </View>
                    <Text style={styles.consentTitle}>Your data stays yours</Text>
                    <Text style={styles.consentText}>
                      To show what banks will lend, ShuleOne shares a summary of {child?.studentName ?? 'your child'}&apos;s
                      fee-payment history — not your statements or personal details. It is only ever shared with the
                      one bank you choose to apply to, in line with the Kenya Data Protection Act, and you can switch
                      it off again at any time.
                    </Text>
                    {!!consentError && (
                      <Text style={[styles.errorLine, { color: colors.danger }]}>{consentError}</Text>
                    )}
                    <TouchableOpacity activeOpacity={0.85} disabled={consentBusy} onPress={() => handleConsent(true)}>
                      <LinearGradient
                        colors={[colors.purple, colors.purpleDeep]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.consentBtn}
                      >
                        {consentBusy
                          ? <ActivityIndicator color="#FFF" />
                          : <Text style={styles.consentBtnText}>Allow &amp; see my offers</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : offers.length === 0 ? (
                  <View style={styles.stateCard}>
                    <View style={[styles.stateIcon, { backgroundColor: colors.backgroundAlt }]}>
                      <MaterialCommunityIcons name="bank-outline" size={26} color={colors.textTertiary} />
                    </View>
                    <Text style={styles.stateTitle}>No offers right now</Text>
                    <Text style={styles.stateText}>
                      No partner bank lends against a band {score?.band ?? '—'} score yet. Paying this term on
                      time is the fastest way to move up.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.listIntro}>
                      {offers.length} {offers.length === 1 ? 'partner bank is' : 'partner banks are'} ready to lend
                      against this score — cheapest first.
                    </Text>
                    {offers.map((o) => (
                      <OfferCard
                        key={`${o.bankId}-${o.productId}`}
                        offer={o}
                        styles={styles}
                        colors={colors}
                        onApply={() => setApplyOffer(o)}
                      />
                    ))}
                    <TouchableOpacity
                      style={styles.revokeBtn}
                      activeOpacity={0.7}
                      disabled={consentBusy}
                      onPress={() => handleConsent(false)}
                    >
                      <Ionicons name="lock-closed-outline" size={14} color={colors.textTertiary} />
                      <Text style={styles.revokeText}>Stop sharing my fee history</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            {/* ── Applications ───────────────────────────────────────────── */}
            {section === 'applications' && (
              <>
                {childApplications.length === 0 ? (
                  <View style={styles.stateCard}>
                    <View style={[styles.stateIcon, { backgroundColor: colors.backgroundAlt }]}>
                      <Ionicons name="document-text-outline" size={26} color={colors.textTertiary} />
                    </View>
                    <Text style={styles.stateTitle}>Nothing applied for yet</Text>
                    <Text style={styles.stateText}>
                      Applications you send appear here with the bank&apos;s decision.
                    </Text>
                  </View>
                ) : (
                  childApplications.map((a) => (
                    <ApplicationCard key={String(a.id)} app={a} styles={styles} colors={colors} />
                  ))
                )}
              </>
            )}

            <Text style={styles.disclaimer}>
              ShuleOne Lend is coming soon. Figures are simulations based on your real fee history, and partner
              bank names are placeholders.
            </Text>
          </>
        )}
      </ScrollView>

      <LoanApplySheet
        visible={applyOffer != null}
        onClose={() => setApplyOffer(null)}
        offer={applyOffer}
        studentId={child?.studentId ?? null}
        studentName={child?.studentName}
        onSubmit={async (req) => {
          const msg = await apply(req);
          if (!msg) setSection('applications');
          return msg;
        }}
      />
    </View>
  );
};

/**
 * The credit-score dial. Same stroke-offset technique as the fees donut, sized
 * up so the three-digit score can sit inside it, and drawn against the 300–850
 * range rather than 0–100 — a 300 is the floor, not an empty ring.
 */
const ScoreDial: React.FC<{
  score: number; color: string; track: string; textColor: string; label: string;
}> = ({ score, color, track, textColor, label }) => {
  const size = 104, stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = scoreToPercent(score);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontFamily: fonts.extrabold, fontSize: 27, color: textColor, letterSpacing: -1 }}>
        {score}
      </Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 9.5, color, marginTop: 1 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

/** One weighted input, as a labelled bar with the raw figure that produced it. */
const FactorBar: React.FC<{ factor: ScoreFactor; styles: any; colors: ColorPalette }> = ({ factor, styles, colors }) => {
  const pct = Math.max(0, Math.min(1, factor.normalized ?? 0)) * 100;
  const tone = colors[factorColorKey(factor.normalized)];
  return (
    <View style={styles.factor}>
      <View style={styles.factorHead}>
        <Text style={styles.factorLabel} numberOfLines={1}>{factor.label ?? factor.key}</Text>
        <Text style={styles.factorRaw} numberOfLines={1}>{factor.raw != null ? String(factor.raw) : ''}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.backgroundAlt }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: tone }]} />
      </View>
      {!!factor.detail && <Text style={styles.factorDetail} numberOfLines={2}>{factor.detail}</Text>}
    </View>
  );
};

/** One bank's offer, themed from the bank's own accent colour. */
const OfferCard: React.FC<{
  offer: LoanOffer; styles: any; colors: ColorPalette; onApply: () => void;
}> = ({ offer, styles, colors, onApply }) => {
  const accent = offer.logoColor || colors.primary;
  return (
    <View style={[styles.offerCard, { borderColor: accent }]}>
      <View style={styles.offerHead}>
        <View style={[styles.bankMark, { backgroundColor: accent }]}>
          <Text style={styles.bankMarkText}>{offer.bankCode ?? '—'}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.offerBank} numberOfLines={1}>{offer.bankName}</Text>
          <Text style={styles.offerProduct} numberOfLines={1}>{offer.productName}</Text>
        </View>
      </View>

      {!!offer.description && (
        <Text style={styles.offerDesc} numberOfLines={2}>{offer.description}</Text>
      )}

      <View style={styles.offerStats}>
        <OfferStat styles={styles} label="Rate" value={formatRate(offer.annualRate)} />
        <View style={styles.statDivider} />
        <OfferStat styles={styles} label="Up to" value={ksh(moneyToNumber(offer.offerAmount))} />
        <View style={styles.statDivider} />
        <OfferStat styles={styles} label="Term" value={`${offer.maxTermMonths ?? '—'} mo`} />
      </View>

      <View style={styles.offerFoot}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.offerFootLabel}>Est. monthly</Text>
          <Text style={[styles.offerFootValue, { color: accent }]} numberOfLines={1}>
            {ksh(moneyToNumber(offer.monthlyInstallment))}
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.85} onPress={onApply} style={[styles.applyBtn, { backgroundColor: accent }]}>
          <Text style={styles.applyBtnText}>Apply</Text>
          <Ionicons name="arrow-forward" size={15} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const OfferStat: React.FC<{ styles: any; label: string; value: string }> = ({ styles, label, value }) => (
  <View style={styles.stat}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
  </View>
);

/** One application, with the bank's decision and — once disbursed — the receipt. */
const ApplicationCard: React.FC<{ app: LoanApplication; styles: any; colors: ColorPalette }> = ({ app, styles, colors }) => {
  const meta = statusMeta(app.status);
  const accent = app.logoColor || colors.primary;
  return (
    <View style={styles.appCard}>
      <View style={styles.offerHead}>
        <View style={[styles.bankMark, { backgroundColor: accent }]}>
          <Text style={styles.bankMarkText}>{app.bankCode ?? '—'}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.offerBank} numberOfLines={1}>{app.bankName}</Text>
          <Text style={styles.offerProduct} numberOfLines={1}>{app.productName}</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: colors[meta.softKey] }]}>
          <Text style={[styles.chipText, { color: colors[meta.colorKey] }]}>{meta.label}</Text>
        </View>
      </View>

      <Text style={styles.appAmount}>{ksh(moneyToNumber(app.amount))}</Text>
      <Text style={styles.appMeta} numberOfLines={2}>
        {ksh(moneyToNumber(app.monthlyInstallment))} × {app.termMonths ?? '—'} months
        {' · '}{purposeLabel(app.purpose)}
        {app.studentName ? ` · ${app.studentName}` : ''}
        {app.createdAt ? ` · applied ${fmtDate(app.createdAt)}` : ''}
      </Text>

      {app.status?.toUpperCase() === 'REJECTED' && !!app.decisionNote && (
        <Text style={[styles.appNote, { color: colors.danger }]}>{app.decisionNote}</Text>
      )}

      {app.status?.toUpperCase() === 'DISBURSED' && (
        <View style={[styles.disbursed, { backgroundColor: colors.successSoft }]}>
          <Ionicons name="checkmark-circle" size={15} color={colors.success} />
          <Text style={[styles.disbursedText, { color: colors.success }]} numberOfLines={2}>
            {ksh(moneyToNumber(app.amount))} paid to school fees
            {app.receiptNo ? ` · receipt ${app.receiptNo}` : ''}
          </Text>
        </View>
      )}
    </View>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingBottom: 36 },
    center: { padding: 44, alignItems: 'center', gap: 12 },
    centerText: { fontSize: 12.5, fontFamily: fonts.medium, color: c.textTertiary },

    banner: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 9,
      borderRadius: 13, padding: 12, marginTop: 14,
    },
    bannerText: { flex: 1, fontSize: 11.5, fontFamily: fonts.medium, lineHeight: 17 },

    childRow: { gap: 8, paddingVertical: 14, paddingRight: 8 },
    childPill: {
      paddingHorizontal: 15, paddingVertical: 9, borderRadius: 999,
      borderWidth: 1, borderColor: c.border, backgroundColor: c.card, maxWidth: 190,
    },
    childPillText: { fontSize: 12.5, fontFamily: fonts.bold, color: c.textSecondary },
    childPillTextOn: { color: '#FFF' },

    heroCard: {
      backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.border,
      padding: 18, marginTop: 14, marginBottom: 20,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14, shadowRadius: 18, elevation: 6,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    heroLabel: { fontSize: 12, fontFamily: fonts.medium, color: c.textSecondary },
    heroValue: { fontSize: 26, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.8, marginTop: 3 },
    heroFoot: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: c.border,
    },
    heroFootText: { flex: 1, fontSize: 11, fontFamily: fonts.medium, color: c.textTertiary, lineHeight: 16 },
    heroEmpty: { alignItems: 'center', paddingVertical: 8 },
    dot: { width: 7, height: 7, borderRadius: 4 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
    chipText: { fontSize: 10.5, fontFamily: fonts.bold },

    segment: {
      flexDirection: 'row', backgroundColor: c.backgroundAlt, borderRadius: 14,
      padding: 4, marginBottom: 18, gap: 4,
    },
    segBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 10, borderRadius: 11,
    },
    segBtnOn: {
      backgroundColor: c.primary,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
    },
    segText: { fontSize: 12.5, fontFamily: fonts.bold, color: c.textSecondary },
    segTextOn: { color: '#FFF' },

    card: {
      backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border,
      padding: 16, marginBottom: 18,
    },
    cardTitle: { fontSize: 15, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginBottom: 16 },
    emptyLine: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textTertiary, lineHeight: 19 },

    factor: { marginBottom: 15 },
    factorHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
    factorLabel: { flex: 1, fontSize: 12.5, fontFamily: fonts.bold, color: c.text },
    factorRaw: { fontSize: 11.5, fontFamily: fonts.bold, color: c.textSecondary },
    track: { height: 7, borderRadius: 4, overflow: 'hidden' },
    fill: { height: 7, borderRadius: 4 },
    factorDetail: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 5, lineHeight: 16 },

    moreBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
      paddingVertical: 11, marginTop: 4,
    },
    moreBtnText: { fontSize: 12.5, fontFamily: fonts.bold },

    pointGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 4 },
    point: {
      flexGrow: 1, flexBasis: '46%', backgroundColor: c.backgroundAlt,
      borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10,
    },
    pointLabel: { fontSize: 10, fontFamily: fonts.medium, color: c.textTertiary, lineHeight: 14 },
    pointValue: { fontSize: 13.5, fontFamily: fonts.extrabold, color: c.text, marginTop: 3, letterSpacing: -0.2 },

    footNote: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary, lineHeight: 16, marginTop: 14 },

    consentCard: {
      backgroundColor: c.card, borderRadius: 18, borderWidth: 1.5,
      padding: 18, marginBottom: 18, alignItems: 'center',
    },
    consentTitle: { fontSize: 16, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginTop: 4 },
    consentText: {
      fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary,
      lineHeight: 19, textAlign: 'center', marginTop: 9,
    },
    consentBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderRadius: 13, paddingVertical: 13, paddingHorizontal: 26, marginTop: 18,
    },
    consentBtnText: { color: '#FFF', fontSize: 14, fontFamily: fonts.bold },
    errorLine: { fontSize: 12, fontFamily: fonts.medium, marginTop: 12, textAlign: 'center' },

    listIntro: { fontSize: 12, fontFamily: fonts.medium, color: c.textSecondary, lineHeight: 18, marginBottom: 14 },

    offerCard: {
      backgroundColor: c.card, borderRadius: 18, borderWidth: 1.5,
      padding: 16, marginBottom: 14,
    },
    offerHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    bankMark: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    bankMarkText: { color: '#FFF', fontFamily: fonts.extrabold, fontSize: 11.5, letterSpacing: 0.3 },
    offerBank: { fontSize: 14.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3 },
    offerProduct: { fontSize: 11.5, fontFamily: fonts.medium, color: c.textSecondary, marginTop: 1 },
    offerDesc: { fontSize: 12, fontFamily: fonts.regular, color: c.textTertiary, lineHeight: 18, marginTop: 11 },

    offerStats: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.backgroundAlt, borderRadius: 13,
      paddingHorizontal: 13, paddingVertical: 11, marginTop: 14,
    },
    statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: c.border },
    stat: { flex: 1, minWidth: 0 },
    statLabel: {
      fontSize: 9, fontFamily: fonts.bold, color: c.textTertiary,
      letterSpacing: 0.6, textTransform: 'uppercase',
    },
    statValue: { fontSize: 12.5, fontFamily: fonts.extrabold, color: c.text, marginTop: 3, letterSpacing: -0.2 },

    offerFoot: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
    offerFootLabel: { fontSize: 10, fontFamily: fonts.bold, color: c.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase' },
    offerFootValue: { fontSize: 17, fontFamily: fonts.extrabold, letterSpacing: -0.5, marginTop: 2 },
    applyBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11,
    },
    applyBtnText: { color: '#FFF', fontSize: 13.5, fontFamily: fonts.bold },

    revokeBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 13, marginBottom: 4,
    },
    revokeText: { fontSize: 11.5, fontFamily: fonts.medium, color: c.textTertiary },

    appCard: {
      backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border,
      padding: 16, marginBottom: 14,
    },
    appAmount: { fontSize: 21, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.6, marginTop: 14 },
    appMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, lineHeight: 17, marginTop: 4 },
    appNote: { fontSize: 12, fontFamily: fonts.medium, lineHeight: 18, marginTop: 10 },
    disbursed: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12,
    },
    disbursedText: { flex: 1, fontSize: 11.5, fontFamily: fonts.bold, lineHeight: 16 },

    stateCard: {
      backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border,
      padding: 22, marginTop: 16, marginBottom: 18, alignItems: 'center',
    },
    stateIcon: {
      width: 56, height: 56, borderRadius: 28,
      alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    stateTitle: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, textAlign: 'center' },
    stateText: {
      fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary,
      lineHeight: 19, textAlign: 'center', marginTop: 8,
    },
    retryBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.primarySoft, borderRadius: 12,
      paddingHorizontal: 18, paddingVertical: 11, marginTop: 16,
    },
    retryText: { fontSize: 13, fontFamily: fonts.bold, color: c.primary },

    disclaimer: {
      fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary,
      lineHeight: 16, textAlign: 'center', marginTop: 8, paddingHorizontal: 10,
    },
  });
}
