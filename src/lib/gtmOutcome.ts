import type { GTMPlanV2 } from "./gtmV2.ts";

export interface GTMOutcomeEvaluation {
  checks: {
    primaryChannel: boolean;
    fallbackChannel: boolean;
    evidenceBackedMessaging: boolean;
    usableCampaignAssets: boolean;
    sixWeekTargets: boolean;
    budgetAndTimeConstraints: boolean;
    killRule: boolean;
    tractionSprintCreated: boolean;
  };
  completionScore: number;
  status: "draft" | "ready" | "verified";
}

export function evaluateGTMOutcome(plan: GTMPlanV2): GTMOutcomeEvaluation {
  const primaryChannel = plan.channels.some((channel) => channel.role === "primary");
  const fallbackChannel = plan.channels.some((channel) => channel.role === "secondary");
  const primaryPlay = plan.plays.find((play) => play.channelId === plan.channels.find((channel) => channel.role === "primary")?.id)
    ?? plan.plays.find((play) => play.status === "active")
    ?? plan.plays[0];
  const evidenceBackedMessaging = Boolean(
    plan.messaging.headline.trim()
      && plan.messaging.hookLine.trim()
      && ((plan.claimAttributions ?? []).some((claim) => !claim.assumption && claim.sourceIds.length > 0)
        || plan.researchSources.length > 0
        || (plan.evidenceItems ?? []).some((item) => item.verified)),
  );
  const usableCampaignAssets = Boolean(
    primaryPlay
      && (plan.assets ?? []).some((asset) => asset.playId === primaryPlay.id && asset.title.trim() && asset.content.trim()),
  );
  const sixWeekTargets = plan.sixWeekPlan.length >= 6
    && plan.sixWeekPlan.slice(0, 6).every((week) => week.objective.trim() && week.actions.some((action) => action.trim()))
    && Boolean(plan.metrics.primaryOutcome.trim() && plan.metrics.leading.length);
  const budgetAndTimeConstraints = Boolean(
    primaryPlay
      && Number.isFinite(primaryPlay.weeklyTimeHours)
      && primaryPlay.weeklyTimeHours > 0
      && Number.isFinite(primaryPlay.weeklyBudget)
      && primaryPlay.weeklyBudget >= 0,
  );
  const killRule = Boolean(primaryPlay?.killRule?.trim());
  const tractionSprintCreated = Boolean(primaryPlay?.tractionSprintId);
  const checks = {
    primaryChannel,
    fallbackChannel,
    evidenceBackedMessaging,
    usableCampaignAssets,
    sixWeekTargets,
    budgetAndTimeConstraints,
    killRule,
    tractionSprintCreated,
  };
  const values = Object.values(checks);
  const completionScore = Math.round((values.filter(Boolean).length / values.length) * 100);
  const planReady = values.slice(0, -1).every(Boolean);

  return {
    checks,
    completionScore,
    status: planReady ? (tractionSprintCreated ? "verified" : "ready") : "draft",
  };
}
