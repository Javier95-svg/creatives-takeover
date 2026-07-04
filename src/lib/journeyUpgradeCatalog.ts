import {
  FEATURE_LABELS,
  PLAN_LABELS,
  resolveEntitlement,
  type FeatureKey,
  type MonetizationModel,
  type Plan,
} from "@/config/planPermissions";

export type JourneyStageId =
  | "identity"
  | "prototype"
  | "validation"
  | "build"
  | "stack"
  | "launch"
  | "fundraising";

export interface JourneyToolUpgrade {
  featureKey: FeatureKey;
  toolName: string;
  route: string;
  stage: JourneyStageId;
  outcome: string;
  previewCopy: string;
  proofCopy: string;
  ctaCopy: string;
  fallbackTargetPlan?: Exclude<Plan, "rookie">;
}

export interface JourneyRecommendationSignal {
  hasIcp: boolean;
  hasWaitlist: boolean;
  hasPmf: boolean;
  hasMvp: boolean;
  hasTechStack: boolean;
  hasGtm: boolean;
  hasPitchDeck: boolean;
  investorPressure?: boolean;
  /** Any mentor interaction: saved a mentor, started a conversation, or booked a call. */
  hasMentorInteraction?: boolean;
}

export interface JourneyRecommendation {
  id: string;
  tool: JourneyToolUpgrade;
  currentPlan: Plan;
  targetPlan?: Exclude<Plan, "rookie">;
  isLocked: boolean;
  headline: string;
  description: string;
  primaryLabel: string;
  secondaryLabel?: string;
}

export const PLAN_JOURNEY_PROMISES: Record<Plan, string> = {
  rookie: "Orient and clarify",
  starter: "Validate demand",
  rising: "Build and launch",
  pro: "Fundraise and scale",
};

export const JOURNEY_TOOL_UPGRADES: Record<string, JourneyToolUpgrade> = {
  find_mentor: {
    featureKey: "find_mentor",
    toolName: "Mentor Marketplace",
    route: "/mentorship?mentorSource=dashboard",
    stage: "identity",
    outcome: "Talk to someone who has built one before you sink weeks into the wrong plan.",
    previewCopy: "Save a mentor for free and send your first message free - follow-up messages cost 3 credits each.",
    proofCopy: "Mentor conversations are the most common first action founders take on the platform.",
    ctaCopy: "Message one mentor",
  },
  icp_builder: {
    featureKey: "icp_builder",
    toolName: "ICP Builder",
    route: "/icp-builder",
    stage: "identity",
    outcome: "Clarify who you are building for before spending effort on the wrong audience.",
    previewCopy: "Define the customer, pain, and positioning that every later stage depends on.",
    proofCopy: "Rookie founders start here because customer clarity makes every later tool sharper.",
    ctaCopy: "Build my ICP",
  },
  waitlist_maker: {
    featureKey: "waitlist_maker",
    toolName: "Demo Studio",
    route: "/demo-studio",
    stage: "prototype",
    outcome: "Turn your ICP into a first demand-capture page.",
    previewCopy: "Create a simple offer page to see whether the market responds before you build.",
    proofCopy: "Use Demo Studio to turn positioning into a real traction signal.",
    ctaCopy: "Open Demo Studio",
  },
  pmf_lab: {
    featureKey: "pmf_lab",
    toolName: "PMF Lab",
    route: "/pmf-lab",
    stage: "validation",
    outcome: "Score the evidence behind your idea before moving into build mode.",
    previewCopy: "PMF Lab helps you turn interviews, signups, and objections into a readiness signal.",
    proofCopy: "Starter founders use PMF Lab to turn ICP clarity into validation evidence.",
    ctaCopy: "Preview PMF Lab",
    fallbackTargetPlan: "starter",
  },
  mvp_builder: {
    featureKey: "mvp_builder",
    toolName: "MVP Builder",
    route: "/mvp-builder",
    stage: "build",
    outcome: "Convert validated demand into a focused MVP scope.",
    previewCopy: "MVP Builder helps you shape the first usable version without bloating the product.",
    proofCopy: "Rising moves you from validation to build, stack, and launch in one cockpit.",
    ctaCopy: "Preview MVP Builder",
    fallbackTargetPlan: "rising",
  },
  tech_stack: {
    featureKey: "tech_stack",
    toolName: "Tech Stack Builder",
    route: "/tech-stack",
    stage: "stack",
    outcome: "Choose the tools and budget that fit the MVP you are actually building.",
    previewCopy: "See how your stack, fixed costs, and build constraints connect before you commit.",
    proofCopy: "Rising keeps product scope and technical choices in the same operating layer.",
    ctaCopy: "Preview Tech Stack",
    fallbackTargetPlan: "rising",
  },
  gtm_strategist: {
    featureKey: "gtm_strategist",
    toolName: "GTM Strategist",
    route: "/go-to-market",
    stage: "launch",
    outcome: "Turn validation into a focused launch and acquisition plan.",
    previewCopy: "GTM Strategist narrows your channels and gives you the first plays to run.",
    proofCopy: "Rising helps founders connect the build decision to the launch motion.",
    ctaCopy: "Preview GTM Strategist",
    fallbackTargetPlan: "rising",
  },
  pitch_deck_analyzer: {
    featureKey: "pitch_deck_analyzer",
    toolName: "Pitch Deck Analyzer",
    route: "/pitch-deck-analyzer",
    stage: "fundraising",
    outcome: "Pressure-test your fundraising story before investor outreach.",
    previewCopy: "See where your deck is strong, unclear, or missing investor-ready proof.",
    proofCopy: "Pro is strongest when fundraising becomes the main job.",
    ctaCopy: "Preview Pitch Analyzer",
    fallbackTargetPlan: "rising",
  },
  angels_community: {
    featureKey: "angels_community",
    toolName: "Find Your Angel",
    route: "/investors",
    stage: "fundraising",
    outcome: "Move from research into warmer fundraising relationships.",
    previewCopy: "Find Your Angel opens the investor relationship layer when you are ready to raise.",
    proofCopy: "Use unlimited research views and Find Your Angel when fundraising becomes the main job.",
    ctaCopy: "Preview Find Your Angel",
    fallbackTargetPlan: "pro",
  },
};

export function getJourneyTool(featureKey: FeatureKey): JourneyToolUpgrade | undefined {
  return Object.values(JOURNEY_TOOL_UPGRADES).find((tool) => tool.featureKey === featureKey);
}

export function getJourneyToolAccess(tool: JourneyToolUpgrade, plan: Plan) {
  const entitlement = resolveEntitlement(tool.featureKey, plan);
  const rawTargetPlan = entitlement.upgradeTarget ?? tool.fallbackTargetPlan;
  const targetPlan = rawTargetPlan && rawTargetPlan !== "rookie"
    ? rawTargetPlan as Exclude<Plan, "rookie">
    : undefined;

  return {
    entitlement,
    targetPlan,
    isLocked: entitlement.uiMode !== "full",
    monetizationModel: entitlement.monetizationModel as MonetizationModel,
  };
}

export function buildJourneyRecommendation(
  currentPlan: Plan,
  signal: JourneyRecommendationSignal
): JourneyRecommendation {
  const tool = (() => {
    // Human layer first: a mentor conversation is the platform's most common
    // first artifact, so it leads until the user has one.
    if (signal.hasMentorInteraction === false) return JOURNEY_TOOL_UPGRADES.find_mentor;
    if (!signal.hasIcp) return JOURNEY_TOOL_UPGRADES.icp_builder;
    if (!signal.hasWaitlist) return JOURNEY_TOOL_UPGRADES.waitlist_maker;
    if (!signal.hasPmf) return JOURNEY_TOOL_UPGRADES.pmf_lab;
    if (!signal.hasMvp) return JOURNEY_TOOL_UPGRADES.mvp_builder;
    if (!signal.hasTechStack) return JOURNEY_TOOL_UPGRADES.tech_stack;
    if (!signal.hasGtm) return JOURNEY_TOOL_UPGRADES.gtm_strategist;
    if (signal.investorPressure || signal.hasPitchDeck) return JOURNEY_TOOL_UPGRADES.angels_community;
    return JOURNEY_TOOL_UPGRADES.pitch_deck_analyzer;
  })();

  const access = getJourneyToolAccess(tool, currentPlan);
  const targetPlanLabel = access.targetPlan ? PLAN_LABELS[access.targetPlan] : undefined;
  const stageLabel = PLAN_JOURNEY_PROMISES[currentPlan];
  const featureLabel = FEATURE_LABELS[tool.featureKey] ?? tool.toolName;

  return {
    id: `${currentPlan}:${tool.featureKey}:${tool.stage}`,
    tool,
    currentPlan,
    targetPlan: access.targetPlan,
    isLocked: access.isLocked,
    headline: access.isLocked && targetPlanLabel
      ? `Your next step is ${featureLabel} - available on ${targetPlanLabel}.`
      : `Recommended next step: ${featureLabel}`,
    description: access.isLocked && targetPlanLabel
      ? `${tool.outcome} ${targetPlanLabel} is the next journey layer when you are ready.`
      : `${tool.outcome} This fits your current ${stageLabel.toLowerCase()} stage.`,
    primaryLabel: access.isLocked ? tool.ctaCopy.replace("Open", "Preview") : tool.ctaCopy,
    secondaryLabel: access.isLocked && targetPlanLabel ? `See ${targetPlanLabel}` : undefined,
  };
}
