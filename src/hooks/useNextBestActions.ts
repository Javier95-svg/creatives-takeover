import { useMemo } from 'react';
import { Compass, Handshake, Moon, Star, Target, Trophy, type LucideIcon } from 'lucide-react';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useDailyChallenges } from '@/hooks/useDailyChallenges';
import { useCommitments } from '@/hooks/useCommitments';
import { useReputation } from '@/hooks/useReputation';
import { useAuth } from '@/contexts/AuthContext';
import { BIZMAP_STAGES } from '@/lib/bizmapStages';

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

/** Recommendations follow earned outcomes, never manually checked checklist items. */
export const useNextBestActions = (): NextAction[] => {
  const { user } = useAuth();
  const { currentStage } = useBizMapProgress();
  const { todaysChallenge, isCompleted: challengeDone } = useDailyChallenges(user?.id);
  const { userActiveCommitments } = useCommitments();
  const { reputation } = useReputation(user?.id);

  return useMemo<NextAction[]>(() => {
    const result: NextAction[] = [];
    const hour = new Date().getHours();
    const overdue = userActiveCommitments.find((commitment) => new Date(commitment.target_date) <= new Date());
    if (overdue) {
      result.push({
        id: 'overdue-commitment', title: `Review commitment: "${overdue.commitment_text.slice(0, 40)}${overdue.commitment_text.length > 40 ? '…' : ''}"`,
        description: 'Your commitment deadline has passed. Mark it as achieved or reflect on it.', actionRoute: '/mentorship',
        category: 'community', estimatedMinutes: 5, urgency: 'high', icon: Handshake, reason: 'Commitment deadline reached',
      });
    }

    const stage = BIZMAP_STAGES.find((item) => item.id === currentStage);
    const coreTool = stage?.tools[0];
    if (stage && coreTool) {
      result.push({
        id: 'bizmap-next-stage-outcome', title: `Earn your ${stage.title.toLowerCase()} outcome`,
        description: `Continue your Stage ${stage.numeral} evidence through ${coreTool.name}.`, actionRoute: coreTool.route,
        category: 'bizmap', estimatedMinutes: 15, urgency: 'high', icon: Compass,
        reason: `You're in Stage ${stage.numeral}: ${stage.title}`,
      });
    }

    if (todaysChallenge && !challengeDone) {
      result.push({ id: 'daily-challenge', title: todaysChallenge.challenge_title,
        description: `Earn ${todaysChallenge.reward_points} reputation points by completing today's challenge.`, actionRoute: '/mentorship',
        category: 'community', estimatedMinutes: 10, urgency: hour < 12 ? 'medium' : 'low', icon: Trophy, reason: 'Build your community reputation' });
    }
    if (reputation && reputation.next_level_threshold > 0 && (reputation.total_points / reputation.next_level_threshold) * 100 >= 80) {
      result.push({ id: 'reputation-level', title: `You're ${Math.round(100 - (reputation.total_points / reputation.next_level_threshold) * 100)}% away from Level ${reputation.level + 1}`,
        description: 'Complete a challenge or engage with the community to level up.', actionRoute: '/mentorship', category: 'community', estimatedMinutes: 5, urgency: 'low', icon: Star, reason: `Current level: ${reputation.level_name}` });
    }
    if (hour >= 6 && hour < 12 && result.length < 5) {
      result.push({ id: 'morning-priorities', title: "Set today's top 3 priorities", description: 'Start your morning with clear focus.', actionRoute: '/dashboard', category: 'daily', estimatedMinutes: 3, urgency: 'medium', icon: Target, reason: 'Morning routine' });
    }
    if (hour >= 18 && result.length < 5) {
      result.push({ id: 'evening-reflection', title: 'Log your progress for today', description: "Reflect on what you accomplished and set tomorrow's intentions.", actionRoute: '/dashboard', category: 'daily', estimatedMinutes: 5, urgency: 'low', icon: Moon, reason: 'Evening check-in' });
    }
    const urgency = { high: 0, medium: 1, low: 2 } as const;
    return result.sort((a, b) => urgency[a.urgency] - urgency[b.urgency]).slice(0, 5);
  }, [challengeDone, currentStage, reputation, todaysChallenge, userActiveCommitments]);
};
