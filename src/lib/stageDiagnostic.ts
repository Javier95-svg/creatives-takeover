export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

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
  id: StageId;
  name: string;
  description: string;
  topFocus: { label: string; href: string }[];
};

export const STAGES: Record<StageId, StageMeta> = {
  1: {
    id: 1,
    name: "Identity",
    description:
      "You're at the earliest stage. The priority is getting crystal clear on who you're building for and what problem is worth solving. Lock in your customer and your concept before anything else.",
    topFocus: [
      { label: "Define your ICP", href: "/icp-builder" },
      { label: "Clarify your concept with BizMap AI", href: "/bizmap-ai/chat" },
    ],
  },
  2: {
    id: 2,
    name: "Prototyping",
    description:
      "You have an idea worth exploring. Now it's about pressure testing the concept and shaping the first version of what you'll put in front of real users.",
    topFocus: [
      { label: "Score your idea", href: "/decision-sprint" },
      { label: "Start your MVP", href: "/mvp-builder" },
    ],
  },
  3: {
    id: 3,
    name: "Validation",
    description:
      "You have something real. The focus now is proving people actually want it, not just that they think it's a cool idea. Run real validation and start building demand.",
    topFocus: [
      { label: "Run a PMF Lab", href: "/pmf-lab" },
      { label: "Build a waitlist", href: "/waitlist" },
    ],
  },
  4: {
    id: 4,
    name: "Building",
    description:
      "You've validated the opportunity. Your job right now is shipping the product and making technical decisions that won't slow you down later.",
    topFocus: [
      { label: "Continue building your MVP", href: "/mvp-builder" },
      { label: "Pick your tech stack", href: "/tech-stack" },
    ],
  },
  5: {
    id: 5,
    name: "Launch",
    description:
      "You're ready to take this to market. The focus shifts to go-to-market execution and turning interest into signups, users, and revenue.",
    topFocus: [
      { label: "Build your GTM strategy", href: "/go-to-market" },
      { label: "Launch your waitlist", href: "/waitlist" },
    ],
  },
  6: {
    id: 6,
    name: "Traction",
    description:
      "You're live and need repeatable growth signals. The priority is finding the acquisition channel that works for this product, improving first-month retention, and mapping the path from early users to a scalable traction system.",
    topFocus: [
      { label: "Grow with Insighta", href: "/insighta" },
      { label: "Build relationships in Community", href: "/community" },
    ],
  },
  7: {
    id: 7,
    name: "Fundraising",
    description:
      "You have traction worth raising on. The priority is finding the right investors and walking in prepared with a story that lands.",
    topFocus: [
      { label: "Search VCs", href: "/insighta/vc-search" },
      { label: "Analyze your pitch deck", href: "/insighta/pitch-deck-analyzer" },
    ],
  },
};

export function assignStage(a: QuizAnswers): StageId {
  if (a.q1 === "ready_to_raise") return 7;
  if (a.q1 === "launched") return 5;

  if (a.q1 === "actively_building") {
    if (a.q2 === "dont_know_customer") return 1;
    if (a.q2 === "not_sure_anyone_pays") return 3;
    if (a.q3 === "yes_strangers") return 4;
    return 4;
  }

  // q1 === 'have_idea'
  if (a.q3 === "no") return a.q5 === "just_starting" ? 1 : 2;
  return 2;
}

export function shouldRecommendCofounder(a: QuizAnswers): boolean {
  return a.q2 === "feeling_alone";
}
