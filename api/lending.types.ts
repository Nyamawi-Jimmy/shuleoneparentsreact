// ShuleOne Lend — fee financing built on the family's own payment history.
//
// Mirrors the parent-scoped DTOs in LmsBackNew
// (com.educraft.lmsbacknew.parent.dto.lending.*), which in turn proxy the
// scoring engine in the school backend. Nearly every field is nullable
// because the upstream chain degrades rather than failing: when the lending
// service is unreachable the summary comes back with `unavailable: true` and
// empty lists instead of an error.

import { Money, moneyToNumber } from './fees.types';

/** One weighted input to the credit score, with its human explanation. */
export interface ScoreFactor {
  key: string | null;
  label: string | null;
  /** Weight out of 100. Sent as a number upstream; treat defensively. */
  weight: number | null;
  /** Display string upstream ("11 of 12 terms"), a number in some mocks. */
  raw: string | number | null;
  /** 0..1 — how well the family scored on this factor. */
  normalized: number | null;
  contribution: number | null;
  detail: string | null;
}

export interface CreditScore {
  studentId: number | null;
  admNo: string | null;
  studentName: string | null;
  className: string | null;
  parentName: string | null;
  parentPhone: string | null;
  /** 300–850, or null when there is no fee history to score yet. */
  score: number | null;
  /** A | B | C | D | E | NEW */
  band: string | null;
  bandLabel: string | null;
  eligibleAmount: Money;
  /** Thin file — scored, but off too few terms to be confident. */
  lowData: boolean | null;
  consentGranted: boolean | null;
  factors: ScoreFactor[] | null;
  dataPoints: Record<string, unknown> | null;
  /** ISO-8601 string, not an epoch. */
  computedAt: string | null;
}

export interface LoanOffer {
  productId: number | null;
  bankId: number | null;
  bankName: string | null;
  bankCode: string | null;
  /** Hex accent the bank card is themed from. */
  logoColor: string | null;
  productName: string | null;
  description: string | null;
  purpose: string | null;
  /** Percent per year, reducing balance. */
  annualRate: Money;
  processingFeeRate: Money;
  minAmount: Money;
  /** The pre-qualified ceiling for this family — there is no separate max. */
  offerAmount: Money;
  maxTermMonths: number | null;
  /** Quoted at maxTermMonths, not at whatever term the parent picks. */
  monthlyInstallment: Money;
  totalRepayable: Money;
}

export interface LoanApplication {
  id: number | null;
  studentId: number | null;
  admNo: string | null;
  studentName: string | null;
  className: string | null;
  parentName: string | null;
  parentPhone: string | null;
  bankId: number | null;
  bankName: string | null;
  bankCode: string | null;
  logoColor: string | null;
  productId: number | null;
  productName: string | null;
  amount: Money;
  termMonths: number | null;
  monthlyInstallment: Money;
  purpose: string | null;
  scoreSnapshot: number | null;
  bandSnapshot: string | null;
  /** PENDING | APPROVED | REJECTED | DISBURSED */
  status: string | null;
  decisionNote: string | null;
  /** PARENT_PORTAL | SCHOOL_OFFICE */
  appliedVia: string | null;
  receiptId: number | null;
  receiptNo: string | null;
  createdAt: string | null;
  decidedAt: string | null;
  disbursedAt: string | null;
}

export interface LendingChild {
  studentId: number | null;
  studentName: string | null;
  admNo: string | null;
  schoolId: number | null;
  schoolName: string | null;
  className: string | null;
  score: CreditScore | null;
  /** Stays empty until the parent grants consent for this child. */
  offers: LoanOffer[] | null;
}

export interface LendingSummary {
  parentId: number | null;
  parentName: string | null;
  parentPhone: string | null;
  /** Always true in the prototype — the feature is a preview. */
  comingSoon: boolean | null;
  /** The lending service could not be reached; show a retry, not an error. */
  unavailable: boolean | null;
  children: LendingChild[] | null;
  /** Family-wide, newest first — spans every child. */
  applications: LoanApplication[] | null;
}

export interface ConsentRequest {
  studentId: number;
  granted: boolean;
}

export interface ConsentResult {
  studentId: number | null;
  granted: boolean | null;
}

export interface LoanApplicationRequest {
  studentId: number;
  bankId: number | null;
  productId: number | null;
  amount: number;
  termMonths: number;
  purpose: string | null;
}

// ── Pure helpers ────────────────────────────────────────────────────────────

/** Score range the dial is drawn against. */
export const SCORE_MIN = 300;
export const SCORE_MAX = 850;

/** Position of a score on the 300–850 dial, as a 0–100 percentage. */
export function scoreToPercent(score: number | null | undefined): number {
  if (score == null || !Number.isFinite(score)) return 0;
  const pct = ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100;
  return Math.max(0, Math.min(100, pct));
}

/**
 * Band semantics, resolved against the live palette so both themes work.
 * A/B are healthy, C is watch-it, D/E need work, NEW has no history at all.
 */
export function bandColorKey(band: string | null | undefined): 'success' | 'warning' | 'danger' | 'textTertiary' {
  switch ((band ?? '').toUpperCase()) {
    case 'A':
    case 'B':
      return 'success';
    case 'C':
      return 'warning';
    case 'D':
    case 'E':
      return 'danger';
    default:
      return 'textTertiary';
  }
}

/** Soft companion to bandColorKey, for chip backgrounds. */
export function bandSoftKey(band: string | null | undefined): 'successSoft' | 'warningSoft' | 'dangerSoft' | 'backgroundAlt' {
  switch (bandColorKey(band)) {
    case 'success': return 'successSoft';
    case 'warning': return 'warningSoft';
    case 'danger': return 'dangerSoft';
    default: return 'backgroundAlt';
  }
}

/** A factor bar is green when strong, amber mid, rose weak. */
export function factorColorKey(normalized: number | null | undefined): 'success' | 'warning' | 'danger' {
  const n = normalized ?? 0;
  if (n >= 0.65) return 'success';
  if (n >= 0.35) return 'warning';
  return 'danger';
}

export interface StatusMeta {
  label: string;
  colorKey: 'warning' | 'info' | 'danger' | 'success';
  softKey: 'warningSoft' | 'infoSoft' | 'dangerSoft' | 'successSoft';
}

export function statusMeta(status: string | null | undefined): StatusMeta {
  switch ((status ?? '').toUpperCase()) {
    case 'APPROVED':
      return { label: 'Approved', colorKey: 'info', softKey: 'infoSoft' };
    case 'REJECTED':
      return { label: 'Not approved', colorKey: 'danger', softKey: 'dangerSoft' };
    case 'DISBURSED':
      return { label: 'Disbursed', colorKey: 'success', softKey: 'successSoft' };
    default:
      return { label: 'Pending review', colorKey: 'warning', softKey: 'warningSoft' };
  }
}

/** What a loan may be spent on. Matches the purposes the school backend accepts. */
export const PURPOSES: { value: string; label: string }[] = [
  { value: 'SCHOOL_FEES', label: 'School fees' },
  { value: 'TRANSPORT', label: 'School transport' },
  { value: 'LMS_SUBSCRIPTION', label: 'Learning subscription' },
  { value: 'DEVICES_AND_BOOKS', label: 'Devices & books' },
  { value: 'UNIFORM', label: 'Uniform' },
];

export function purposeLabel(purpose: string | null | undefined): string {
  const hit = PURPOSES.find((p) => p.value === purpose);
  return hit ? hit.label : humanizeKey(purpose ?? '');
}

/**
 * Client-side mirror of the server's reducing-balance amortization, used only
 * to preview the installment while the parent drags the amount and term. The
 * figure the bank commits to is always the one the server returns.
 */
export function estimateInstallment(principal: number, annualRatePct: number, months: number): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(months) || months <= 0) return principal;
  const r = (Number.isFinite(annualRatePct) ? annualRatePct : 0) / 100 / 12;
  const m = r === 0 ? principal / months : (principal * r) / (1 - Math.pow(1 + r, -months));
  return Number.isFinite(m) ? Math.round(m * 100) / 100 : 0;
}

export function formatRate(rate: Money): string {
  const n = moneyToNumber(rate);
  // Trim a trailing .0 so 14.0 reads as 14% but 13.5 keeps its half.
  const s = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${s}% p.a.`;
}

/**
 * How each raw data point is labelled and formatted. Keys match the score
 * engine's `dataPoints` map. Anything not listed still renders — humanizeKey
 * splits the camelCase — so a new backend field can never silently vanish.
 */
export const DATA_POINT_META: Record<string, { label: string; kind: 'count' | 'money' | 'days' | 'year' }> = {
  billLines: { label: 'Fee bills raised', kind: 'count' },
  billedTerms: { label: 'Terms billed', kind: 'count' },
  coveredTerms: { label: 'Terms fully paid', kind: 'count' },
  receiptCount: { label: 'Payments made', kind: 'count' },
  totalBilled: { label: 'Total billed', kind: 'money' },
  totalPaid: { label: 'Total paid', kind: 'money' },
  digitalPaid: { label: 'Paid by M-Pesa / bank', kind: 'money' },
  avgTermBilling: { label: 'Average term fee', kind: 'money' },
  currentBalance: { label: 'Current balance', kind: 'money' },
  avgPaymentLagDays: { label: 'Average days to pay', kind: 'days' },
  yearsActive: { label: 'Years at the school', kind: 'count' },
  firstYear: { label: 'First year enrolled', kind: 'year' },
  siblingsEnrolled: { label: 'Siblings enrolled', kind: 'count' },
  feeRemindersReceived: { label: 'Fee reminders received', kind: 'count' },
  remindersRespondedIn14d: { label: 'Reminders paid within 14 days', kind: 'count' },
};

/** "avgPaymentLagDays" → "Avg payment lag days". Last-resort label. */
export function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Render one `dataPoints` entry for display. Null reads as "—", never "null". */
export function formatDataPoint(key: string, value: unknown): string {
  if (value == null) return '—';
  const meta = DATA_POINT_META[key];
  const n = typeof value === 'number' ? value : Number(value);
  if (!meta) return Number.isFinite(n) ? n.toLocaleString('en-KE') : String(value);
  switch (meta.kind) {
    case 'money':
      return `KSh ${(Number.isFinite(n) ? n : 0).toLocaleString('en-KE')}`;
    case 'days':
      return Number.isFinite(n) ? `${Math.round(n)} days` : String(value);
    case 'year':
      return String(value);
    default:
      return Number.isFinite(n) ? n.toLocaleString('en-KE') : String(value);
  }
}

export function dataPointLabel(key: string): string {
  return DATA_POINT_META[key]?.label ?? humanizeKey(key);
}

/**
 * Defensive normalizer — the screen should never have to null-check a list.
 * Mirrors the web client's adaptLendSummary so both stay honest about a
 * missing score object rather than inventing a number.
 */
export function adaptSummary(raw: LendingSummary | null | undefined): LendingSummary {
  return {
    parentId: raw?.parentId ?? null,
    parentName: raw?.parentName ?? null,
    parentPhone: raw?.parentPhone ?? null,
    comingSoon: raw?.comingSoon !== false,
    unavailable: raw?.unavailable === true,
    children: Array.isArray(raw?.children) ? raw!.children! : [],
    applications: Array.isArray(raw?.applications) ? raw!.applications! : [],
  };
}
