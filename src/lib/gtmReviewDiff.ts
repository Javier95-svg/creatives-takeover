import type { GTMPlanV2, GTMReviewDecision } from './gtmV2.ts';

// Plain-language list of what a weekly review proposal would change, so the
// founder can compare it with the current plan before applying it.

export const GTM_DECISION_LABELS: Record<GTMReviewDecision, string> = {
  collect_evidence: 'Collect more results',
  double_down: 'Double down',
  iterate: 'Change one thing',
  kill: 'Stop this channel',
};

export interface GTMPlanChanges {
  week: number;
  current: { objective: string; actions: string[] } | null;
  proposed: { objective: string; actions: string[] } | null;
  playChanges: string[];
  assumptionsAdded: string[];
  assumptionsRemoved: string[];
  draftsRewritten: number;
}

export function describeGTMPlanChanges(current: GTMPlanV2, proposed: GTMPlanV2, week: number): GTMPlanChanges {
  const weekOf = (plan: GTMPlanV2) => {
    const found = plan.sixWeekPlan.find((item) => Number(item.week) === week);
    return found ? { objective: found.objective, actions: found.actions } : null;
  };

  const playChanges: string[] = [];
  for (const next of proposed.plays) {
    const before = current.plays.find((play) => play.id === next.id);
    if (!before) continue;
    if (before.status !== next.status) {
      if (next.status === 'paused') playChanges.push(`Pause ${next.channelName}.`);
      else if (next.status === 'active') playChanges.push(`Start ${next.channelName}.`);
      else playChanges.push(`Mark ${next.channelName} as ${next.status}.`);
    }
    if (before.target !== next.target) {
      playChanges.push(`Raise the ${next.channelName} target from ${before.target} to ${next.target} ${next.metric.toLowerCase()} a week.`);
    }
    if (before.message.trim() !== next.message.trim()) {
      playChanges.push(`New ${next.channelName} message: "${next.message.trim()}"`);
    }
  }

  const currentAssumptions = new Set(current.assumptions);
  const proposedAssumptions = new Set(proposed.assumptions);
  const currentDrafts = new Map((current.assets ?? []).map((asset) => [asset.id, asset.content]));

  return {
    week,
    current: weekOf(current),
    proposed: weekOf(proposed),
    playChanges,
    assumptionsAdded: proposed.assumptions.filter((item) => !currentAssumptions.has(item)),
    assumptionsRemoved: current.assumptions.filter((item) => !proposedAssumptions.has(item)),
    draftsRewritten: (proposed.assets ?? []).filter((asset) => currentDrafts.has(asset.id) && currentDrafts.get(asset.id) !== asset.content).length,
  };
}
