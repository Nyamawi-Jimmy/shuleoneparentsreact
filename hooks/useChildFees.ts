import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useSelectedChild } from '../context/SelectedChildContext';
import { getChildFees, getChildFeeStatement } from '../api/fees';
import { FeeSummary, FeeStatement } from '../api/fees.types';
import { ApiError } from '../config/api';

interface StatementFilters {
  year?: number;
  term?: number;
}

interface UseChildFeesResult {
  /** Per-child summary (brought forward, term billing, paid, balance). */
  summary: FeeSummary | null;
  /** Statement of debit/credit lines for the selected year/term. */
  statement: FeeStatement | null;
  /** Current statement filters - update via setFilters. */
  filters: StatementFilters;
  setFilters: (f: StatementFilters) => void;
  /** True only on the initial load; false during background refreshes. */
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** Reload both summary and statement now. */
  refresh: () => Promise<void>;
  /** True once the data came from /api (not still pre-network). */
  isFromBackend: boolean;
}

/**
 * Fetch fee summary + statement for the currently selected child.
 *
 * Drop-in usage:
 *   const { summary, statement, loading, refresh } = useChildFees();
 *
 * Re-fetches automatically when:
 *   - The user logs in (token appears)
 *   - The selected child changes
 *   - The screen regains focus (after coming back from another screen)
 *   - Filters change (year/term)
 */
export function useChildFees(initialFilters: StatementFilters = {}): UseChildFeesResult {
  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();

  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [statement, setStatement] = useState<FeeStatement | null>(null);
  const [filters, setFilters] = useState<StatementFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromBackend, setIsFromBackend] = useState(false);

  const studentId = selectedChild?.studentId ?? null;

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || studentId == null) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      // Fetch both in parallel so the screen renders faster
      const [sum, stmt] = await Promise.all([
        getChildFees(accessToken, studentId),
        getChildFeeStatement(accessToken, studentId, filters),
      ]);
      setSummary(sum);
      setStatement(stmt);
      setIsFromBackend(true);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not load fees.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, studentId, filters]);

  // Initial + refetch on focus / studentId / filters
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Also refetch when filters change (focus alone is enough but this
  // keeps the data fresh while still on screen)
  useEffect(() => { load(); }, [filters, load]);

  const refresh = useCallback(() => load(true), [load]);

  return {
    summary,
    statement,
    filters,
    setFilters,
    loading,
    refreshing,
    error,
    refresh,
    isFromBackend,
  };
}
