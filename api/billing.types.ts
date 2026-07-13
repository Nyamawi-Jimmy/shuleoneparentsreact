// =================================================================
// Billing (Learn+ subscription) types.
// =================================================================

import { Money } from './fees.types';

export type SubscriptionStatus =
  | 'NONE'
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED'
  | string;

export type SubscriptionTier =
  | 'INDIVIDUAL'    // per-child
  | 'FAMILY'        // up to N learners
  | string;

/**
 * Backend returns billing/status as a JSON-encoded string. We define a
 * canonical TS shape and parse defensively.
 */
export interface BillingStatus {
  tier: SubscriptionTier | null;
  status: SubscriptionStatus | null;
  childStatuses?: ChildSubscriptionStatus[];
  family?: FamilySubscriptionStatus;
  /** Suggested per-child amount. */
  pricePerChild?: Money;
  /** Suggested family-plan amount. */
  pricePerFamily?: Money;
  currency?: string | null;
  /** Free-form payload from backend for forward compatibility. */
  raw?: Record<string, any>;
}

export interface ChildSubscriptionStatus {
  studentId: number;
  studentName: string | null;
  status: SubscriptionStatus | null;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  willRenew?: boolean | null;
}

export interface FamilySubscriptionStatus {
  status: SubscriptionStatus | null;
  numLearners?: number | null;
  currentPeriodEnd?: string | null;
  willRenew?: boolean | null;
}

// =================================================================
// Checkout bodies (per OpenAPI)
// =================================================================
export interface MpesaCheckoutBody {
  phone: string;
  numLearners?: number | null;     // family plan only
  period?: string | null;          // MONTHLY | TERMLY | ANNUAL
  code?: string | null;            // promo / referral code
}

/** A priced plan row from /learner/billing/plans (per seats × period). */
export interface BillingPlanRow {
  numLearners?: number | null;
  period?: string | null;        // MONTHLY | TERMLY | ANNUAL
  amountKes?: number | null;
  savingsPct?: number | null;
  [key: string]: any;
}

/** Promo check result from /parent/billing/promo/{code}. */
export interface PromoResult {
  valid?: boolean;
  percentOff?: number | null;
  newAmountKes?: number | null;
  label?: string | null;
  [key: string]: any;
}

export interface PaystackCheckoutBody {
  numLearners?: number | null;
}

// =================================================================
// Payment status (the polled subscription payment, distinct from FeePayment)
// =================================================================
export interface BillingPayment {
  id?: number | null;
  status?: string | null;
  amount?: Money;
  currency?: string | null;
  reference?: string | null;
  channel?: 'MPESA' | 'PAYSTACK' | string | null;
  createdAt?: string | null;
  completedAt?: string | null;
  raw?: Record<string, any>;
}

// =================================================================
// History entry (history endpoint returns `Map[]` per OpenAPI)
// =================================================================
export interface BillingHistoryEntry {
  id?: number | string | null;
  date?: string | null;
  amount?: Money;
  currency?: string | null;
  status?: string | null;
  channel?: string | null;
  description?: string | null;
  reference?: string | null;
  raw: Record<string, any>;
}

// =================================================================
// Helpers
// =================================================================
export function parseBillingStatus(raw: string | object | null | undefined): BillingStatus {
  if (!raw) return { tier: null, status: 'NONE' };
  const obj = typeof raw === 'string'
    ? (() => { try { return JSON.parse(raw); } catch { return {}; } })()
    : (raw as any);
  return {
    tier: obj.tier ?? null,
    status: obj.status ?? null,
    childStatuses: obj.childStatuses ?? obj.children ?? [],
    family: obj.family ?? undefined,
    pricePerChild: obj.pricePerChild ?? obj.individualPrice ?? null,
    pricePerFamily: obj.pricePerFamily ?? obj.familyPrice ?? null,
    currency: obj.currency ?? 'KES',
    raw: obj,
  };
}

export function parseBillingPayment(raw: string | object | null | undefined): BillingPayment {
  if (!raw) return {};
  const obj = typeof raw === 'string'
    ? (() => { try { return JSON.parse(raw); } catch { return {}; } })()
    : (raw as any);
  return {
    id: obj.id ?? null,
    status: obj.status ?? null,
    amount: obj.amount ?? null,
    currency: obj.currency ?? 'KES',
    reference: obj.reference ?? obj.checkoutRequestId ?? null,
    channel: obj.channel ?? null,
    createdAt: obj.createdAt ?? null,
    completedAt: obj.completedAt ?? null,
    raw: obj,
  };
}

export function normalizeHistoryEntry(map: Record<string, any>): BillingHistoryEntry {
  return {
    id: map.id ?? map.paymentId ?? null,
    date: map.date ?? map.createdAt ?? map.completedAt ?? null,
    amount: map.amount ?? null,
    currency: map.currency ?? 'KES',
    status: map.status ?? null,
    channel: map.channel ?? null,
    description: map.description ?? map.plan ?? null,
    reference: map.reference ?? map.mpesaReceipt ?? null,
    raw: map,
  };
}

export function isSubscribed(status: SubscriptionStatus | null | undefined): boolean {
  const s = (status ?? '').toUpperCase();
  return s === 'ACTIVE' || s === 'TRIAL';
}
