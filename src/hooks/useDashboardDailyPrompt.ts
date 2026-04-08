import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  getDailyGoalPromptSnoozeUntil,
  getLocalDateString,
  hasDailyGoalPromptResurfaced,
  hasDailyGoalPromptUnresolved,
  markDailyGoalPromptResurfaced,
} from '@/lib/dailyGoalPrompt';
import { captureEvent } from '@/lib/analytics';

type DailyPromptMode = 'morning' | 'evening';

interface UseDashboardDailyPromptOptions {
  pagePath?: string;
  staleTimeMs?: number;
  onFirstView?: () => void;
}

export interface DashboardDailyPromptState {
  showDailyGoal: boolean;
  modalMode: DailyPromptMode;
  todaysCheckInId: string | null;
  currentStreak: number;
  hasUnresolvedPrompt: boolean;
  unresolvedMode: DailyPromptMode;
  handleDailyGoalOpenChange: (open: boolean) => void;
  handlePromptResume: () => void;
  handleCheckInComplete: () => void;
}

export function useDashboardDailyPrompt(
  options: UseDashboardDailyPromptOptions = {}
): DashboardDailyPromptState {
  const { user } = useAuth();
  const { pagePath = '/dashboard', staleTimeMs = 5 * 60 * 1000, onFirstView } = options;

  const [showDailyGoal, setShowDailyGoal] = useState(false);
  const [modalMode, setModalMode] = useState<DailyPromptMode>('morning');
  const [_hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [todaysCheckInId, setTodaysCheckInId] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [hasUnresolvedPrompt, setHasUnresolvedPrompt] = useState(false);
  const [unresolvedMode, setUnresolvedMode] = useState<DailyPromptMode>('morning');

  const lastFetchTimeRef = useRef<number>(0);
  const hasInitializedRef = useRef<boolean>(false);
  const firstViewCallbackRef = useRef(onFirstView);

  useEffect(() => {
    firstViewCallbackRef.current = onFirstView;
  }, [onFirstView]);

  useEffect(() => {
    if (!user) return;

    const now = Date.now();
    const shouldFetch = !hasInitializedRef.current || (now - lastFetchTimeRef.current > staleTimeMs);

    if (!shouldFetch) {
      return;
    }

    const checkDailyCheckIn = async () => {
      const today = getLocalDateString();
      const currentHour = new Date().getHours();

      const { data: todayCheckIn } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_in_date', today)
        .maybeSingle();

      setHasCheckedInToday(!!todayCheckIn);

      if (todayCheckIn) {
        setTodaysCheckInId(todayCheckIn.id);

        const { data: recentCheckIns } = await supabase
          .from('daily_check_ins')
          .select('check_in_date')
          .eq('user_id', user.id)
          .order('check_in_date', { ascending: false })
          .limit(30);

        if (recentCheckIns) {
          let streak = 0;
          const dates = recentCheckIns.map((checkIn) => checkIn.check_in_date).sort().reverse();

          for (let index = 0; index < dates.length; index += 1) {
            const currentDate = new Date(dates[index]);
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - index);

            if (currentDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
              streak += 1;
            } else {
              break;
            }
          }

          setCurrentStreak(streak);
        }

        if (currentHour >= 18 && todayCheckIn.goal_achieved === null) {
          const nextMode: DailyPromptMode = 'evening';
          const snoozeUntil = getDailyGoalPromptSnoozeUntil(user.id, nextMode, today);
          const isSnoozed = typeof snoozeUntil === 'number' && snoozeUntil > Date.now();

          setModalMode(nextMode);
          setUnresolvedMode(nextMode);
          setHasUnresolvedPrompt(hasDailyGoalPromptUnresolved(user.id, nextMode, today) || isSnoozed);

          if (!isSnoozed) {
            if (typeof snoozeUntil === 'number' && !hasDailyGoalPromptResurfaced(user.id, nextMode, today)) {
              markDailyGoalPromptResurfaced(user.id, nextMode, today);
              captureEvent('daily_prompt_resurfaced', { mode: nextMode, page_path: pagePath });
            }
            setShowDailyGoal(true);
          }
        }
      } else {
        const nextMode: DailyPromptMode = 'morning';
        const snoozeUntil = getDailyGoalPromptSnoozeUntil(user.id, nextMode, today);
        const isSnoozed = typeof snoozeUntil === 'number' && snoozeUntil > Date.now();

        setModalMode(nextMode);
        setUnresolvedMode(nextMode);
        setHasUnresolvedPrompt(hasDailyGoalPromptUnresolved(user.id, nextMode, today) || isSnoozed);

        if (!isSnoozed) {
          if (typeof snoozeUntil === 'number' && !hasDailyGoalPromptResurfaced(user.id, nextMode, today)) {
            markDailyGoalPromptResurfaced(user.id, nextMode, today);
            captureEvent('daily_prompt_resurfaced', { mode: nextMode, page_path: pagePath });
          }
          setShowDailyGoal(true);
        }
      }

      lastFetchTimeRef.current = Date.now();
      hasInitializedRef.current = true;
    };

    void checkDailyCheckIn();
    if (!hasInitializedRef.current) {
      firstViewCallbackRef.current?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, pagePath, staleTimeMs]);

  const handleDailyGoalOpenChange = (open: boolean) => {
    setShowDailyGoal(open);

    if (!open && user) {
      const today = getLocalDateString();
      setHasUnresolvedPrompt(hasDailyGoalPromptUnresolved(user.id, modalMode, today));
      setUnresolvedMode(modalMode);
    }
  };

  const handlePromptResume = () => {
    setModalMode(unresolvedMode);
    setShowDailyGoal(true);
  };

  const handleCheckInComplete = () => {
    setHasCheckedInToday(true);
    setHasUnresolvedPrompt(false);
    if (modalMode === 'morning') {
      setCurrentStreak((previous) => previous + 1);
    }
    lastFetchTimeRef.current = 0;
    hasInitializedRef.current = false;
  };

  return {
    showDailyGoal,
    modalMode,
    todaysCheckInId,
    currentStreak,
    hasUnresolvedPrompt,
    unresolvedMode,
    handleDailyGoalOpenChange,
    handlePromptResume,
    handleCheckInComplete,
  };
}