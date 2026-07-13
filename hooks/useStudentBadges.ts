import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStudentAssignments, getStudentLiveClasses } from '../api/student';
import { dueAssignments, liveNowClasses } from '../api/student.types';

// Tab-bar badge counts, mirroring the web sidebar badges:
//   Tasks  → how many assignments are DUE/OVERDUE
//   Events → how many classes are live right now
// Polls gently (like the web's 60s revalidation) while the tabs are mounted.
const POLL_MS = 60_000;

export function useStudentBadges(): { due: number; live: number } {
  const { accessToken } = useAuth();
  const [due, setDue] = useState(0);
  const [live, setLive] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let off = false;

    const refresh = () => {
      getStudentAssignments(accessToken)
        .then((list) => { if (!off) setDue(dueAssignments(list).length); })
        .catch(() => {});
      getStudentLiveClasses(accessToken)
        .then((list) => { if (!off) setLive(liveNowClasses(list).length); })
        .catch(() => {});
    };

    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => { off = true; clearInterval(t); };
  }, [accessToken]);

  return { due, live };
}
