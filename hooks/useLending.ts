import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getLendingSummary, setLendConsent, submitLoanApplication } from '../api/lending';
import { LendingSummary, LoanApplicationRequest, adaptSummary } from '../api/lending.types';
import { ApiError } from '../config/api';

/**
 * ShuleOne Lend — parent-level, unlike most parent hooks.
 *
 * One call returns every child with their own score and offers, so this
 * deliberately does NOT key off useSelectedChild: a parent comparing what two
 * children qualify for should not have to switch the app-wide child first.
 *
 * `consent` and `apply` are imperative actions that resolve to an error string
 * (or null on success) rather than throwing, so screens can render the bank's
 * reason inline instead of wrapping every call site in try/catch.
 */
export function useLending() {
  const { accessToken, user } = useAuth();

  const [data, setData] = useState<LendingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || user?.userType !== 'PARENT') {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const d = await getLendingSummary(accessToken);
      setData(adaptSummary(d));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load ShuleOne Lend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, user?.userType]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /**
   * Reload without clearing what is on screen. Used after consent and after
   * applying, where flashing a spinner over a score the parent is reading
   * would feel like the app lost their data.
   */
  const silentRefresh = useCallback(async () => {
    if (!accessToken) return;
    try {
      const d = await getLendingSummary(accessToken);
      setData(adaptSummary(d));
    } catch {
      // Keep the current view; the action that triggered this already reported.
    }
  }, [accessToken]);

  const consent = useCallback(async (studentId: number, granted: boolean): Promise<string | null> => {
    if (!accessToken) return 'You are signed out.';
    try {
      await setLendConsent(accessToken, studentId, granted);
      await silentRefresh();
      return null;
    } catch (e) {
      return e instanceof ApiError ? e.message : 'Could not save your choice.';
    }
  }, [accessToken, silentRefresh]);

  const apply = useCallback(async (req: LoanApplicationRequest): Promise<string | null> => {
    if (!accessToken) return 'You are signed out.';
    try {
      await submitLoanApplication(accessToken, req);
      await silentRefresh();
      return null;
    } catch (e) {
      return e instanceof ApiError ? e.message : 'Could not send your application.';
    }
  }, [accessToken, silentRefresh]);

  return {
    data,
    children: data?.children ?? [],
    applications: data?.applications ?? [],
    /** True when the service is up but previewing; drives the "coming soon" badge. */
    comingSoon: data?.comingSoon !== false,
    /** True when the lending service could not be reached — retry, not an error. */
    unavailable: data?.unavailable === true,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
    consent,
    apply,
  };
}
