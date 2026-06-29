import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  getBillingStatus, getBillingHistory, getBillingPayment,
} from '../api/billing';
import {
  BillingStatus, BillingHistoryEntry, BillingPayment,
} from '../api/billing.types';
import { ApiError } from '../config/api';

export function useBilling() {
  const { accessToken } = useAuth();

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [history, setHistory] = useState<BillingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const [s, h] = await Promise.all([
        getBillingStatus(accessToken),
        getBillingHistory(accessToken).catch(() => []),
      ]);
      setStatus(s);
      setHistory(h);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load billing.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return {
    status, history, loading, refreshing, error,
    refresh: () => load(true),
  };
}

/**
 * Poll a single billing payment until it terminates (success/failure)
 * or attempts run out. Used for M-Pesa STK status after checkout.
 */
export function useBillingPaymentPoller(
  paymentId: number | null,
  options: {
    onSuccess?: (p: BillingPayment) => void;
    onFailure?: (p: BillingPayment) => void;
    intervalMs?: number;
    maxAttempts?: number;
  } = {},
) {
  const { accessToken } = useAuth();
  const [payment, setPayment] = useState<BillingPayment | null>(null);
  const [done, setDone] = useState(false);
  const attempts = useRef(0);

  useEffect(() => {
    if (!accessToken || paymentId == null) return;
    attempts.current = 0;
    setDone(false);

    const interval = options.intervalMs ?? 3000;
    const max = options.maxAttempts ?? 30;

    const tick = async () => {
      attempts.current += 1;
      try {
        const p = await getBillingPayment(accessToken, paymentId);
        setPayment(p);
        const status = (p.status ?? '').toUpperCase();
        if (status === 'SUCCESS' || status === 'COMPLETED' || status === 'PAID') {
          setDone(true);
          options.onSuccess?.(p);
          return true;
        }
        if (status === 'FAILED' || status === 'CANCELLED') {
          setDone(true);
          options.onFailure?.(p);
          return true;
        }
      } catch { /* keep polling */ }
      return false;
    };

    let cancelled = false;
    const loop = async () => {
      while (!cancelled && attempts.current < max) {
        const finished = await tick();
        if (finished) return;
        await new Promise((r) => setTimeout(r, interval));
      }
      if (!cancelled) setDone(true);
    };
    loop();

    return () => { cancelled = true; };
  }, [accessToken, paymentId]);

  return { payment, done };
}
