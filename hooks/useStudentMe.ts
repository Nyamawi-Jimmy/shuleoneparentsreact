import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  getStudentProfile, getStudentAssignments, getStudentLiveClasses,
} from '../api/student';
import { getGamificationState } from '../api/gamification';
import {
  getRecommendedNext, getMastery, getLearnerAccess,
  RecommendedNext, MasteryRow, LearnerAccess,
} from '../api/learner-me';
import {
  StudentProfile, StudentAssignment, StudentLiveClass,
} from '../api/student.types';
import { GamificationState, emptyGamification } from '../api/gamification.types';

// =================================================================
// "Me" dashboard data — mirrors the web StudentDashboard's data set:
// profile, gamification, recommended next, mastery, access, plus the
// partner-school extras (assignments + live classes). Everything is
// fetched in parallel and fails soft so one endpoint can't blank the
// whole dashboard.
// =================================================================

export interface StudentMeData {
  profile: StudentProfile | null;
  game: GamificationState;
  next: RecommendedNext | null;      // null = no recommendation / still loading
  mastery: MasteryRow[];
  access: LearnerAccess | null;
  assignments: StudentAssignment[];
  liveClasses: StudentLiveClass[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useStudentMe(): StudentMeData {
  const { accessToken } = useAuth();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [game, setGame] = useState<GamificationState>(emptyGamification);
  const [next, setNext] = useState<RecommendedNext | null>(null);
  const [mastery, setMastery] = useState<MasteryRow[]>([]);
  const [access, setAccess] = useState<LearnerAccess | null>(null);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [liveClasses, setLiveClasses] = useState<StudentLiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    setError(null);

    // Profile first — the learner endpoints need the studentId.
    let prof: StudentProfile | null = null;
    try {
      prof = await getStudentProfile(accessToken);
      setProfile(prof);
    } catch {
      setError('Could not load your profile — pull to retry.');
    }

    const sid = prof?.studentId ?? null;
    const inSchool = !!prof?.className;

    const [gameR, nextR, mastR, accR, assR, liveR] = await Promise.allSettled([
      getGamificationState(accessToken),
      sid != null ? getRecommendedNext(accessToken, sid) : Promise.resolve(null),
      sid != null ? getMastery(accessToken, sid) : Promise.resolve([]),
      sid != null ? getLearnerAccess(accessToken, sid) : Promise.resolve(null),
      inSchool ? getStudentAssignments(accessToken) : Promise.resolve([]),
      inSchool ? getStudentLiveClasses(accessToken) : Promise.resolve([]),
    ]);

    if (gameR.status === 'fulfilled' && gameR.value) setGame(gameR.value);
    if (nextR.status === 'fulfilled') setNext(nextR.value ?? null);
    if (mastR.status === 'fulfilled') setMastery(Array.isArray(mastR.value) ? mastR.value : []);
    if (accR.status === 'fulfilled') setAccess(accR.value ?? null);
    if (assR.status === 'fulfilled') setAssignments(Array.isArray(assR.value) ? assR.value : []);
    if (liveR.status === 'fulfilled') setLiveClasses(Array.isArray(liveR.value) ? liveR.value : []);

    setLoading(false);
    setRefreshing(false);
  }, [accessToken]);

  // Load on first focus and refresh silently whenever the tab regains focus —
  // mirrors the web dashboard's focus/poll freshness without a timer.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return {
    profile, game, next, mastery, access, assignments, liveClasses,
    loading, refreshing, error,
    refresh: () => load(true),
  };
}
