import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';
import { useSelectedChild } from '../context/SelectedChildContext';
import { getChildLiveClasses, joinChildLiveClass } from '../api/communication';
import { ApiError } from '../config/api';

/**
 * Upcoming live classes for the selected child, plus a join action that fetches
 * the Jitsi joinUrl on demand and opens it in an in-app browser tab.
 */
export function useLiveClasses() {
  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();
  const studentId = selectedChild?.studentId ?? null;
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ['live-classes', studentId],
    enabled: !!accessToken && studentId != null,
    queryFn: () => getChildLiveClasses(accessToken!, studentId!),
  });

  /** Fetch the join URL and open it. Returns an error string on failure, else null. */
  const join = async (liveClassId: number): Promise<string | null> => {
    if (!accessToken || studentId == null) return 'Not signed in.';
    setJoiningId(liveClassId);
    try {
      const { joinUrl } = await joinChildLiveClass(accessToken, studentId, liveClassId);
      if (!joinUrl) return 'This class has no join link yet.';
      await WebBrowser.openBrowserAsync(joinUrl);
      return null;
    } catch (e) {
      return e instanceof ApiError ? e.message : 'Could not join the class.';
    } finally {
      setJoiningId(null);
    }
  };

  return {
    liveClasses: query.data ?? [],
    loading: query.isLoading,
    refreshing: query.isRefetching,
    error: query.isError
      ? query.error instanceof ApiError ? query.error.message : 'Could not load live classes.'
      : null,
    refresh: () => query.refetch(),
    join,
    joiningId,
    hasChild: studentId != null,
  };
}
