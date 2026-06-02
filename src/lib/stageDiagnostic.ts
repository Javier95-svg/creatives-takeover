export type FounderStageId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type StageId = FounderStageId;

export type ProductStatus =
  | "idea_only"
  | "prototype_demo"
  | "mvp_beta"
  | "live_product"
  | "scaling_product";

export type CustomerTesting =
  | "no_one"
  | "friends_family"
  | "target_customers"
  | "paying_customers"
  | "repeat_customers";

export type MainFocus =
  | "shape_idea"
  | "prototype"
  | "validate_demand"
  | "build_product"
  | "launch_market"
  | "grow_channels"
  | "raise_capital";

export type TractionSignal =
  | "none"
  | "waitlist_interest"
  | "active_users"
  | "revenue"
  | "repeatable_growth";

export type FounderBlocker =
  | "customer_clarity"
  | "demand_validation"
  | "product_build"
  | "go_to_market"
  | "traction_growth"
  | "fundraising"
  | "solo";

export type FundraisingStatus =
  | "not_now"
  | "preparing"
  | "talking_investors"
  | "raising_now";

export type FounderStageQuizAnswersV3 = {
  productStatus: ProductStatus;
  tractionSignal: TractionSignal;
  blocker: FounderBlocker;
  // Asked conditionally (only when blocker === "fundraising").
  fundraisingStatus?: FundraisingStatus;
  // Retained for backward compatibility with legacy quiz payloads; no longer
  // collected in the streamlined onboarding quiz.
  customerTesting?: CustomerTesting;
  mainFocus?: MainFocus;
};

export type FounderStageDiagnosticResult = {
  assignedStage: FounderStageId;
  confidence: number;
  stageScores: Record<FounderStageId, number>;
  primarySignals: string[];
  conflictFlags: string[];
};

export type FounderStageQuestionDef = {
  id: keyof FounderStageQuizAnswersV3;
  question: string;
  description?: string;
  options: { value: FounderStageQuizAnswersV3[keyof FounderStageQuizAnswersV3]; label: string }[];
};

export type QuizAnswers = {
  q1: "have_idea" | "actively_building" | "launched" | "ready_to_raise";
  q2:
    | "dont_know_customer"
    | "not_sure_anyone_pays"
    | "need_build_help"
    | "feeling_alone";
  q3: "no" | "yes_friends" | "yes_strangers";
  q4:
    | "more_than_year"
    | "six_to_twelve"
    | "three_to_six"
    | "less_than_three"
    | "already_launched";
  q5:
    | "just_starting"
    | "have_clarity"
    | "validating"
    | "building"
    | "post_launch";
};

export type StageMeta = {
  id: FounderStageId;
  name: string;
  label: string;
  description: string;
  topFocus: { label: string; href: string }[];
};

// Streamlined to 3 linear stage questions. Product status + traction + primary
// blocker triangulate the founder stage; the blocker doubles as the primary
// pain (mentor matching + dashboard). Fundraising status is asked conditionally.
export const FOUNDER_STAGE_QUESTIONS: FounderStageQuestionDef[] = [
  {
    id: "productStatus",
    question: "What best describes your product today?",
    options: [
      { value: "idea_only", label: "I only have an idea" },
      { value: "prototype_demo", label: "I have a prototype, mockup, demo, or early concept" },
      { value: "mvp_beta", label: "I have an MVP or beta version" },
      { value: "live_product", label: "My product is live" },
      { value: "scaling_product", label: "My product is live and I am growing users/revenue" },
    ],
  },
  {
    id: "tractionSignal",
    question: "What traction do you have today?",
    options: [
      { value: "none", label: "No traction yet" },
      { value: "waitlist_interest", label: "Waitlist, signups, or early interest" },
      { value: "active_users", label: "Active users or beta testers" },
      { value: "revenue", label: "Revenue or paying customers" },
      { value: "repeatable_growth", label: "Repeatable growth channel or retention signal" },
    ],
  },
  {
    id: "blocker",
    question: "Where do you need the most help?",
    options: [
      { value: "customer_clarity", label: "Knowing exactly who the customer is" },
      { value: "demand_validation", label: "Proving people want it / will pay" },
      { value: "product_build", label: "Building and shipping the product" },
      { value: "go_to_market", label: "Launching and finding channels" },
      { value: "traction_growth", label: "Growing users and revenue" },
      { value: "fundraising", label: "Investors and fundraising" },
      { value: "solo", label: "Guidance and accountability (building alone)" },
    ],
  },
];

// Shown only when blocker === "fundraising", to separate Traction from Fundraising.
export const FUNDRAISING_STATUS_QUESTION: FounderStageQuestionDef = {
  id: "fundraisingStatus",
  question: "Are you actively fundraising right now?",
  options: [
    { value: "not_now", label: "Not yet — just planning ahead" },
    { value: "preparing", label: "Preparing deck/materials" },
    { value: "talking_investors", label: "Talking to investors" },
    { value: "raising_now", label: "Actively raising a round" },
  ],
};

export const STAGES: Record<FounderStageId, StageMeta> = {
  1: {
    id: 1,
    name: "Ideation",
    label: "Ideation",
    description:
      "You are exploring the idea and need to clarify the customer, pain point, and concept before you build.",
    topFocus: [
      { label: "Define your ICP", href: "/icp-builder" },
      { label: "Clarify your concept with BizMap AI", href: "/bizmap-ai/chat" },
    ],
  },
  2: {
    id: 2,
    name: "Prototyping / Demo Days",
    label: "Prototyping",
    description:
      "You have a concept worth shaping. The priority is turning it into a prototype, demo, or first testable version.",
    topFocus: [
      { label: "Score your idea", href: "/decision-sprint" },
      { label: "Start your MVP", href: "/mvp-builder" },
    ],
  },
  3: {
    id: 3,
    name: "Validating",
    label: "Validating",
    description:
      "You are testing real demand. The focus is proving people want this enough to sign up, pay, or keep engaging.",
    topFocus: [
      { label: "Run a PMF Lab", href: "/pmf-lab" },
      { label: "Build a waitlist", href: "/waitlist" },
    ],
  },
  4: {
    id: 4,
    name: "Building",
    label: "Building",
    description:
      "You are actively building the product. The priority is shipping a focused MVP and making practical product decisions.",
    topFocus: [
      { label: "Continue building your MVP", href: "/mvp-builder" },
      { label: "Pick your tech stack", href: "/tech-stack" },
    ],
  },
  5: {
    id: 5,
    name: "Launching",
    label: "Launching",
    description:
      "You are taking the product to market. The focus shifts to positioning, launch channels, and first customers.",
    topFocus: [
      { label: "Build your GTM strategy", href: "/go-to-market" },
      { label: "Launch your waitlist", href: "/waitlist" },
    ],
  },
  6: {
    id: 6,
    name: "Distributing (Traction)",
    label: "Traction",
    description:
      "You are live and looking for repeatable growth. The priority is channels, retention, revenue, and traction loops.",
    topFocus: [
      { label: "Grow with Insighta", href: "/insighta" },
      { label: "Build relationships in Community", href: "/mentorship" },
    ],
  },
  7: {
    id: 7,
    name: "Fundraising",
    label: "Fundraising",
    description:
      "You are preparing or actively working an investor process. The priority is your pitch, investor list, traction narrative, and data room.",
    topFocus: [
      { label: "Search VCs", href: "/vc-search" },
      { label: "Analyze your pitch deck", href: "/pitch-deck-analyzer" },
    ],
  },
};

const STAGE_IDS: FounderStageId[] = [1, 2, 3, 4, 5, 6, 7];

function emptyScores(): Record<FounderStageId, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
}

function add(scores: Record<FounderStageId, number>, stage: FounderStageId, value: number) {
  scores[stage] += value;
}

function maxStageFromScores(scores: Record<FounderStageId, number>): FounderStageId {
  return STAGE_IDS.reduce((best, stage) => {
    if (scores[stage] > scores[best]) return stage;
    if (scores[stage] === scores[best] && stage > best) return stage;
    return best;
  }, 1 as FounderStageId);
}

function getMaturityLevel(a: FounderStageQuizAnswersV3) {
  const productLevel: Record<ProductStatus, number> = {
    idea_only: 1,
    prototype_demo: 2,
    mvp_beta: 4,
    live_product: 5,
    scaling_product: 6,
  };
  const customerLevel: Record<CustomerTesting, number> = {
    no_one: 1,
    friends_family: 2,
    target_customers: 3,
    paying_customers: 5,
    repeat_customers: 6,
  };
  const tractionLevel: Record<TractionSignal, number> = {
    none: 1,
    waitlist_interest: 3,
    active_users: 4,
    revenue: 5,
    repeatable_growth: 6,
  };
  const levels = [productLevel[a.productStatus], tractionLevel[a.tractionSignal]];
  if (a.customerTesting) levels.push(customerLevel[a.customerTesting]);
  return Math.max(...levels);
}

function hasFundraisingEvidence(a: FounderStageQuizAnswersV3) {
  return (
    a.productStatus === "scaling_product" ||
    a.productStatus === "live_product" ||
    a.tractionSignal === "revenue" ||
    a.tractionSignal === "repeatable_growth" ||
    a.customerTesting === "paying_customers" ||
    a.customerTesting === "repeat_customers"
  );
}

export function assignFounderStageV3(a: FounderStageQuizAnswersV3): FounderStageDiagnosticResult {
  const scores = emptyScores();
  const primarySignals: string[] = [];
  const conflictFlags: string[] = [];

  switch (a.productStatus) {
    case "idea_only":
      add(scores, 1, 34);
      add(scores, 2, 8);
      primarySignals.push("idea_only");
      break;
    case "prototype_demo":
      add(scores, 2, 34);
      add(scores, 3, 10);
      primarySignals.push("prototype_or_demo");
      break;
    case "mvp_beta":
      add(scores, 4, 28);
      add(scores, 3, 16);
      add(scores, 5, 6);
      primarySignals.push("mvp_or_beta");
      break;
    case "live_product":
      add(scores, 5, 28);
      add(scores, 6, 12);
      add(scores, 4, 8);
      primarySignals.push("live_product");
      break;
    case "scaling_product":
      add(scores, 6, 34);
      add(scores, 7, 12);
      primarySignals.push("scaling_product");
      break;
  }

  switch (a.customerTesting) {
    case "no_one":
      add(scores, 1, 22);
      add(scores, 2, 8);
      primarySignals.push("no_real_users");
      break;
    case "friends_family":
      add(scores, 2, 20);
      add(scores, 1, 6);
      primarySignals.push("early_network_feedback");
      break;
    case "target_customers":
      add(scores, 3, 24);
      add(scores, 4, 6);
      primarySignals.push("target_customer_testing");
      break;
    case "paying_customers":
      add(scores, 5, 18);
      add(scores, 6, 18);
      add(scores, 7, 8);
      primarySignals.push("paying_customers");
      break;
    case "repeat_customers":
      add(scores, 6, 28);
      add(scores, 7, 12);
      primarySignals.push("repeat_or_retained_usage");
      break;
  }

  switch (a.mainFocus) {
    case "shape_idea":
      add(scores, 1, 28);
      primarySignals.push("clarifying_customer_and_idea");
      break;
    case "prototype":
      add(scores, 2, 28);
      primarySignals.push("prototype_focus");
      break;
    case "validate_demand":
      add(scores, 3, 30);
      primarySignals.push("demand_validation_focus");
      break;
    case "build_product":
      add(scores, 4, 30);
      primarySignals.push("product_build_focus");
      break;
    case "launch_market":
      add(scores, 5, 30);
      primarySignals.push("launch_focus");
      break;
    case "grow_channels":
      add(scores, 6, 32);
      primarySignals.push("growth_channel_focus");
      break;
    case "raise_capital":
      add(scores, 7, 22);
      add(scores, hasFundraisingEvidence(a) ? 7 : 5, hasFundraisingEvidence(a) ? 14 : 6);
      primarySignals.push("capital_focus");
      break;
  }

  switch (a.tractionSignal) {
    case "none":
      add(scores, 1, 14);
      add(scores, 2, 10);
      break;
    case "waitlist_interest":
      add(scores, 3, 22);
      add(scores, 5, 8);
      primarySignals.push("waitlist_or_interest");
      break;
    case "active_users":
      add(scores, 5, 20);
      add(scores, 6, 12);
      primarySignals.push("active_users");
      break;
    case "revenue":
      add(scores, 6, 24);
      add(scores, 7, 10);
      primarySignals.push("revenue_signal");
      break;
    case "repeatable_growth":
      add(scores, 6, 32);
      add(scores, 7, 12);
      primarySignals.push("repeatable_growth");
      break;
  }

  switch (a.blocker) {
    case "customer_clarity":
      add(scores, 1, 20);
      break;
    case "demand_validation":
      add(scores, 3, 20);
      break;
    case "product_build":
      add(scores, 4, 20);
      break;
    case "go_to_market":
      add(scores, 5, 20);
      break;
    case "traction_growth":
      add(scores, 6, 20);
      break;
    case "fundraising":
      add(scores, 7, hasFundraisingEvidence(a) ? 18 : 6);
      add(scores, hasFundraisingEvidence(a) ? 6 : 3, 6);
      break;
    case "solo":
      add(scores, Math.max(1, Math.min(getMaturityLevel(a), 6)) as FounderStageId, 8);
      break;
  }

  switch (a.fundraisingStatus) {
    case "not_now":
      add(scores, 7, -8);
      break;
    case "preparing":
      add(scores, 7, hasFundraisingEvidence(a) ? 16 : 4);
      add(scores, hasFundraisingEvidence(a) ? 6 : 3, 6);
      primarySignals.push("preparing_to_raise");
      break;
    case "talking_investors":
      add(scores, 7, hasFundraisingEvidence(a) ? 30 : 12);
      add(scores, hasFundraisingEvidence(a) ? 6 : 3, 8);
      primarySignals.push("investor_conversations");
      break;
    case "raising_now":
      add(scores, 7, 42);
      primarySignals.push("actively_raising");
      break;
  }

  const hasFundraisingIntent =
    a.mainFocus === "raise_capital" ||
    a.blocker === "fundraising" ||
    Boolean(a.fundraisingStatus && a.fundraisingStatus !== "not_now");

  if (hasFundraisingIntent && !hasFundraisingEvidence(a) && a.fundraisingStatus !== "raising_now") {
    scores[7] = Math.min(scores[7], scores[3] + 4, scores[5] + 4);
    conflictFlags.push("fundraising_intent_without_market_evidence");
  }

  // Decisive Traction -> Fundraising promotion. A founder who explicitly names
  // fundraising as their top need, is actively in a raise, and has real market
  // evidence is in the Fundraising phase even if traction signals are strong.
  if (
    a.blocker === "fundraising" &&
    a.fundraisingStatus &&
    a.fundraisingStatus !== "not_now" &&
    hasFundraisingEvidence(a)
  ) {
    add(scores, 7, 60);
  }

  if (
    (a.productStatus === "idea_only" || a.customerTesting === "no_one") &&
    (a.tractionSignal === "revenue" || a.tractionSignal === "repeatable_growth")
  ) {
    conflictFlags.push("early_product_with_advanced_traction_signal");
  }

  const assignedStage = maxStageFromScores(scores);
  const sorted = STAGE_IDS.map((stage) => scores[stage]).sort((left, right) => right - left);
  const topScore = sorted[0] ?? 0;
  const runnerUp = sorted[1] ?? 0;
  const spread = Math.max(0, topScore - runnerUp);
  const baseConfidence = Math.min(96, Math.max(55, 58 + spread * 2));
  const confidence = Math.max(45, baseConfidence - conflictFlags.length * 28);

  return {
    assignedStage,
    confidence,
    stageScores: scores,
    primarySignals: Array.from(new Set(primarySignals)).slice(0, 6),
    conflictFlags,
  };
}

export function createQuizAnswersV3Payload(
  answers: FounderStageQuizAnswersV3,
  result = assignFounderStageV3(answers),
) {
  return {
    version: 3,
    answers,
    assignedStage: result.assignedStage,
    confidence: result.confidence,
    stageScores: result.stageScores,
    primarySignals: result.primarySignals,
    conflictFlags: result.conflictFlags,
  };
}

export function mapFounderStageToBusinessStage(stage: FounderStageId) {
  const map: Record<FounderStageId, string> = {
    1: "idea",
    2: "prototype",
    3: "validation",
    4: "mvp",
    5: "launch",
    6: "traction",
    7: "fundraising",
  };
  return map[stage];
}

export function mapFounderStageToBizMapStage(stage: FounderStageId) {
  const map: Record<FounderStageId, string> = {
    1: "IDENTITY",
    2: "PROTOTYPE",
    3: "VALIDATING",
    4: "BUILDING",
    5: "LAUNCH",
    6: "TRACTION",
    7: "FUNDRAISING",
  };
  return map[stage];
}

export function getStageTaskTemplates(stage: FounderStageId) {
  return STAGES[stage].topFocus;
}

export function legacyAnswersToV3(a: QuizAnswers): FounderStageQuizAnswersV3 {
  return {
    productStatus:
      a.q1 === "have_idea"
        ? "idea_only"
        : a.q1 === "actively_building"
          ? "mvp_beta"
          : a.q1 === "launched"
            ? "live_product"
            : "scaling_product",
    customerTesting:
      a.q3 === "no"
        ? "no_one"
        : a.q3 === "yes_friends"
          ? "friends_family"
          : "target_customers",
    mainFocus:
      a.q1 === "ready_to_raise"
        ? "raise_capital"
        : a.q5 === "validating"
          ? "validate_demand"
          : a.q5 === "building"
            ? "build_product"
            : a.q5 === "post_launch"
              ? "launch_market"
              : a.q5 === "have_clarity"
                ? "prototype"
                : "shape_idea",
    tractionSignal:
      a.q1 === "launched"
        ? "active_users"
        : a.q1 === "ready_to_raise"
          ? "revenue"
          : "none",
    blocker:
      a.q2 === "dont_know_customer"
        ? "customer_clarity"
        : a.q2 === "not_sure_anyone_pays"
          ? "demand_validation"
          : a.q2 === "need_build_help"
            ? "product_build"
            : "solo",
    fundraisingStatus: a.q1 === "ready_to_raise" ? "preparing" : "not_now",
  };
}

export function assignStage(a: QuizAnswers): FounderStageId {
  return assignFounderStageV3(legacyAnswersToV3(a)).assignedStage;
}

export function shouldRecommendCofounder(a: QuizAnswers | FounderStageQuizAnswersV3): boolean {
  if ("q2" in a) return a.q2 === "feeling_alone";
  return a.blocker === "solo";
}
