import type { GTMPlanV2 } from "./gtmV2.ts";

export interface GTMOutcomeEvaluation {
  checks: {
    primaryChannel: boolean;
    fallbackChannel: boolean;
    evidenceBackedMessaging: boolean;
    usableCampaignAssets: boolean;
    sixWeekTargets: boolean;
    budgetAndTimeConstraints: boolean;
    structuredKillRule: boolean;
    tractionSprintCreated: boolean;
    oneOffer: boolean;
    oneMessage: boolean;
    tenProspectSample: boolean;
    acquisitionCycleReady: boolean;
  };
  completionScore: number;
  status: "draft" | "ready";
}

export function evaluateGTMOutcome(plan: GTMPlanV2): GTMOutcomeEvaluation {
  const primaryChannel = plan.channels.some((channel) => channel.role === "primary");
  const fallbackChannel = plan.channels.some((channel) => channel.role === "secondary");
  const primaryPlay = plan.plays.find((play) => play.channelId === plan.channels.find((channel) => channel.role === "primary")?.id)
    ?? plan.plays.find((play) => play.status === "active")
    ?? plan.plays[0];
  const nonAssumptionClaims = (plan.claimAttributions ?? []).filter((claim) => !claim.assumption);
  const evidenceBackedMessaging = Boolean(
    plan.messaging.headline.trim()
      && plan.messaging.hookLine.trim()
      && nonAssumptionClaims.length > 0
      && nonAssumptionClaims.every((claim) => claim.sourceIds.length > 0),
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
  const structuredKillRule = Boolean(
    primaryPlay?.structuredKillRule?.metric.trim()
      && Number.isFinite(primaryPlay.structuredKillRule.threshold)
      && primaryPlay.structuredKillRule.observationWindowWeeks > 0
      && primaryPlay.structuredKillRule.minSampleSize > 0,
  );
  const tractionSprintCreated = Boolean(primaryPlay?.tractionSprintId);
  const oneOffer = Boolean(primaryPlay?.offer.trim());
  const oneMessage = Boolean(primaryPlay?.message.trim());
  const tenProspectSample = (primaryPlay?.structuredKillRule?.minSampleSize ?? 0) >= 10;
  const acquisitionCycleReady = Boolean(primaryChannel && oneOffer && oneMessage && tenProspectSample && structuredKillRule);
  const checks = {
    primaryChannel,
    fallbackChannel,
    evidenceBackedMessaging,
    usableCampaignAssets,
    sixWeekTargets,
    budgetAndTimeConstraints,
    structuredKillRule,
    tractionSprintCreated,
    oneOffer,
    oneMessage,
    tenProspectSample,
    acquisitionCycleReady,
  };
  const values = [primaryChannel, oneOffer, oneMessage, tenProspectSample, budgetAndTimeConstraints, structuredKillRule, acquisitionCycleReady];
  const completionScore = Math.round((values.filter(Boolean).length / values.length) * 100);
  const planReady = values.every(Boolean);

  return {
    checks,
    completionScore,
    // A runnable or activated plan is ready for execution. Verification belongs
    // to the observed market claim, never to the generated plan or sprint.
    status: planReady ? "ready" : "draft",
  };
}
