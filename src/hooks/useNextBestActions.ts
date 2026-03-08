import { useMemo } from 'react';
import {
  Compass,
  Trophy,
  Handshake,
  Star,
  Zap,
  Target,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useBizMapStageTasks } from '@/hooks/useBizMapStageTasks';
import { useDailyChallenges } from '@/hooks/useDailyChallenges';
import { useCommitments } from '@/hooks/useCommitments';
import { useReputation } from '@/hooks/useReputation';
import { useAuth } from '@/contexts/AuthContext';
import { BIZMAP_STAGES, getNextStage, type BizMapStage } from '@/lib/bizmapStages';

export type ActionCategory = 'bizmap' | 'community' | 'fundraising' | 'daily';
export type ActionUrgency = 'high' | 'medium' | 'low';

export interface NextAction {
  id: string;
  title: string;
  description: string;
  actionRoute: string;
  category: ActionCategory;
  estimatedMinutes: number;
  urgency: ActionUrgency;
  icon: LucideIcon;
  reason: string;
}

export const useNextBestActions = (): NextAction[] => {
  const { user } = useAuth();
  const { currentStage, highestUnlockedStage, stageState } = useBizMapProgress();
  const { nextIncompleteTask, completionPercent } = useBizMapStageTasks(currentStage as BizMapStage | null);
  const { todaysChallenge, isCompleted: challengeDone } = useDailyChallenges(user?.id);
  const { userActiveCommitments } = useCommitments();
  const { reputation } = useReputation(user?.id);

  const actions = useMemo<NextAction[]>(() => {
    const result: NextAction[] = [];
    const hour = new Date().getHours();

    // 1. Overdue commitment
    const overdueCommitment = userActiveCommitments.find((c) => {
      const due = new Date(c.target_date);
      return due <= new Date();
    });
    if (overdueCommitment) {
      result.push({
        id: 'overdue-commitment',
        title: `Review commitment: "${overdueCommitment.commitment_text.slice(0, 40)}${overdueCommitment.commitment_text.length > 40 ? '…' : ''}"`,
        description: 'Your commitment deadline has passed. Mark it as achieved or reflect on it.',
        actionRoute: '/community',
        category: 'community',
        estimatedMinutes: 5,
        urgency: 'high',
        icon: Handshake,
        reason: 'Commitment deadline reached',
      });
    }

    // 2. Next BizMap stage task
    if (nextIncompleteTask) {
      const stageDef = BIZMAP_STAGES.find((s) => s.id === currentStage);
      result.push({
        id: 'bizmap-next-task',
        title: nextIncompleteTask.title,
        description: `Continue your ${stageDef?.title ?? currentStage} stage progress.`,
        actionRoute: nextIncompleteTask.route,
        category: 'bizmap',
        estimatedMinutes: 15,
        urgency: 'high',
        icon: Compass,
        reason: `You're in Stage ${stageDef?.numeral}: ${stageDef?.title}`,
      });
    }

    // 3. Stage completion → next stage unlocked
    const nextStage = getNextStage(currentStage as BizMapStage);
    if (
      nextStage &&
      completionPercent === 100 &&
      (stageState as any)?.[nextStage]?.unlocked &&
      !(stageState as any)?.[nextStage]?.completed
    ) {
      const nextDef = BIZMAP_STAGES.find((s) => s.id === nextStage);
      result.push({
        id: 'stage-unlocked',
        title: `Stage ${nextDef?.numeral} unlocked: ${nextDef?.title}`,
        description: `You've completed the current stage. Start Stage ${nextDef?.numeral} now!`,
        actionRoute: '/bizmap-ai',
        category: 'bizmap',
        estimatedMinutes: 10,
        urgency: 'high',
        icon: Zap,
        reason: `Stage ${BIZMAP_STAGES.find((s) => s.id === currentStage)?.numeral} is complete`,
      });
    }

    // 4. Daily challenge
    if (todaysChallenge && !challengeDone) {
      result.push({
        id: 'daily-challenge',
        title: todaysChallenge.challenge_title,
        description: `Earn ${todaysChallenge.reward_points} reputation points by completing today's challenge.`,
        actionRoute: '/community',
        category: 'community',
        estimatedMinutes: 10,
        urgency: hour < 12 ? 'medium' : 'low',
        icon: Trophy,
        reason: 'Build your community reputation',
      });
    }

    // 5. Close to next reputation level
    if (reputation) {
      const xpPct =
        reputation.next_level_threshold > 0
          ? (reputation.total_points / reputation.next_level_threshold) * 100
          : 0;
      if (xpPct >= 80) {
        result.push({
          id: 'reputation-level',
          title: `You're ${Math.round(100 - xpPct)}% away from Level ${reputation.level + 1}`,
          description: 'Complete a challenge or engage with the community to level up.',
          actionRoute: '/community',
          category: 'community',
          estimatedMinutes: 5,
          urgency: 'low',
          icon: Star,
          reason: `Current level: ${reputation.level_name}`,
        });
      }
    }

    // 6. Morning prompt — set today's priorities
    if (hour >= 6 && hour < 12 && result.length < 5) {
      result.push({
        id: 'morning-priorities',
        title: "Set today's top 3 priorities",
        description: 'Start your morning with clear focus. Define your top priorities for the day.',
        actionRoute: '/dashboard',
        category: 'daily',
        estimatedMinutes: 3,
        urgency: 'medium',
        icon: Target,
        reason: 'Morning routine — set your intentions',
      });
    }

    // 7. Evening reflection
    if (hour >= 18 && result.length < 5) {
      result.push({
        id: 'evening-reflection',
        title: 'Log your progress for today',
        description: 'Reflect on what you accomplished and set tomorrow's intentions.',
        actionRoute: '/dashboard',
        category: 'daily',
        estimatedMinutes: 5,
        urgency: 'low',
        icon: Moon,
        reason: 'Evening check-in routine',
      });
    }

    // Sort: high urgency first, then medium, then low
    const urgencyOrder: Record<ActionUrgency, number> = { high: 0, medium: 1, low: 2 };
    return result.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]).slice(0, 5);
  }, [
    currentStage,
    nextIncompleteTask,
    completionPercent,
    stageState,
    todaysChallenge,
    challengeDone,
    userActiveCommitments,
    reputation,
  ]);

  return actions;
};
