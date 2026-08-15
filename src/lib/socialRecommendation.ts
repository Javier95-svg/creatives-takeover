import type { DashboardAction, DashboardPriorityBand } from '@/types/dashboardSnapshot';

const BAND_WEIGHT: Record<DashboardPriorityBand, number> = {
  human_reply: 0,
  human_request: 1,
  urgent_commitment: 2,
  proactive_social: 3,
  general: 4,
};

export function dashboardPriorityBand(action: DashboardAction): DashboardPriorityBand {
  if (action.priorityBand) return action.priorityBand;
  if (action.kind === 'human_reply') return 'human_reply';
  if (action.urgency === 'high' && (action.kind === 'task' || action.dueAt)) return 'urgent_commitment';
  return 'general';
}

export function isReactiveSocialAction(action: DashboardAction) {
  const band = dashboardPriorityBand(action);
  return band === 'human_reply' || band === 'human_request';
}

export function isUrgentCommitment(action: DashboardAction) {
  return dashboardPriorityBand(action) === 'urgent_commitment';
}

export function buildDashboardCandidateQueue(
  baseCandidates: DashboardAction[],
  socialCandidates: DashboardAction[],
): DashboardAction[] {
  const unique = (actions: DashboardAction[]) => {
    const byKey = new Map<string, DashboardAction>();
    actions.forEach((action) => byKey.set(action.key, action));
    return [...byKey.values()];
  };
  const reactive = socialCandidates.filter(isReactiveSocialAction);
  if (reactive.length > 0) {
    return unique([...reactive, ...baseCandidates])
      .sort((left, right) => BAND_WEIGHT[dashboardPriorityBand(left)] - BAND_WEIGHT[dashboardPriorityBand(right)])
      .slice(0, 10);
  }

  const proactive = socialCandidates.find((action) => dashboardPriorityBand(action) === 'proactive_social');
  const hasUrgentCommitment = baseCandidates.some(isUrgentCommitment);
  return unique(proactive && !hasUrgentCommitment ? [proactive, ...baseCandidates] : baseCandidates).slice(0, 10);
}
