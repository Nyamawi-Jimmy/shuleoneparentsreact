import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useSelectedChild } from '../context/SelectedChildContext';
import { getChildEvents } from '../api/calendar';
import { ApiError } from '../config/api';

/**
 * School calendar events for the selected child. Backed by TanStack Query so
 * results are cached per-child and shared across screens.
 */
export function useChildEvents(range?: { from?: string; to?: string }) {
  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();
  const studentId = selectedChild?.studentId ?? null;

  const query = useQuery({
    queryKey: ['calendar', studentId, range?.from ?? null, range?.to ?? null],
    enabled: !!accessToken && studentId != null,
    queryFn: () => getChildEvents(accessToken!, studentId!, range),
  });

  return {
    events: query.data ?? [],
    loading: query.isLoading,
    refreshing: query.isRefetching,
    error: query.isError
      ? query.error instanceof ApiError
        ? query.error.message
        : 'Could not load the school calendar.'
      : null,
    refresh: () => query.refetch(),
    hasChild: studentId != null,
  };
}
