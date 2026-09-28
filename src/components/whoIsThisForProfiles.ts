import type { UserType } from "@/lib/accountTypes";

export const WHO_IS_THIS_FOR_AUTOPLAY_MS = 12_000;

export const WHO_IS_THIS_FOR_ACCOUNT_TYPES = [
  { id: "founder", label: "Founder", promise: "Move an existing project forward.", next: "Find the next decision, test demand, and track progress in one workspace.", access: "open", featured: true },
  { id: "builder", label: "Builder", promise: "Turn a new idea into a real venture.", next: "Define a customer, test the promise, and build with evidence.", access: "open", featured: true },
  { id: "mentor", label: "Mentor", promise: "Guide founders through key decisions.", next: "Invitation only.", access: "invitation", featured: false },
  { id: "marketplace", label: "Marketplace provider", promise: "Help ventures with specialist services.", next: "Invitation only.", access: "invitation", featured: false },
  { id: "investor", label: "Investor", promise: "Discover ventures that fit your focus.", next: "Create an account; matching opens after review.", access: "open", featured: false },
] as const satisfies readonly { id: UserType; label: string; promise: string; next: string; access: "open" | "invitation"; featured: boolean }[];

export type FounderProfileId = "pre_build" | "post_launch";

export type FounderProfileToolKey =
  | "icp_builder"
  | "demo_studio"
  | "pmf_lab"
  | "gtm_strategist"
  | "traction_engine";

export type FounderProfileTool = {
  key: FounderProfileToolKey;
  name: string;
  href: string;
  description: string;
};

export type FounderProfileDefinition = {
  id: FounderProfileId;
  label: string;
  headline: string;
  status: string;
  description: string;
  indicators: string[];
  tools: FounderProfileTool[];
};

export const WHO_IS_THIS_FOR_PROFILES: FounderProfileDefinition[] = [
  {
    id: "pre_build",
    label: "Profile 1 · Pre-build",
    headline: "You need evidence before you need code.",
    status: "Deciding whether to build within the next 30 days",
    description:
      "You have an idea, but little proof that the right customers need it. Before spending months building, define a first customer, test the promise with real people, and use what you learn to build, narrow, pivot, or stop. Your saved project keeps that evidence and your next step together.",
    indicators: [
      "You have an idea but limited customer evidence.",
      "You are unsure which customer or problem to focus on.",
      "You want a clear build decision before committing time or money.",
    ],
    tools: [
      {
        key: "icp_builder",
        name: "ICP Builder",
        href: "/icp-builder",
        description:
          "Choose a first customer, urgent problem, and interview direction.",
      },
      {
        key: "demo_studio",
        name: "Demo Studio",
        href: "/demo-studio/try",
        description:
          "Put a testable promise in front of prospects before a full build.",
      },
      {
        key: "pmf_lab",
        name: "PMF Lab",
        href: "/pmf-lab",
        description:
          "Use customer signals to decide whether to build, narrow, pivot, or stop.",
      },
    ],
  },
  {
    id: "post_launch",
    label: "Profile 2 · Post-launch",
    headline: "You shipped. Now growth still depends on you.",
    status: "Live MVP · Fewer than roughly 100 active users · No repeatable acquisition channel",
    description:
      "Your MVP is live, but each new user still takes a fresh push. Focus on one audience, message, and acquisition channel; then review activation and retention each week. Your workspace helps turn those results into a decision to repeat, change, or stop a tactic.",
    indicators: [
      "Growth comes in spikes rather than through a repeatable channel.",
      "You change messages or channels before you can learn what works.",
      "You need a weekly view of qualified users and retention.",
    ],
    tools: [
      {
        key: "gtm_strategist",
        name: "GTM Strategist",
        href: "/go-to-market",
        description:
          "Choose one audience, offer, channel, and measurable acquisition test.",
      },
      {
        key: "traction_engine",
        name: "Traction Engine",
        href: "/traction-engine",
        description:
          "Review growth and retention weekly, then repeat, change, or stop.",
      },
    ],
  },
];

export const getNextFounderProfileIndex = (currentIndex: number) =>
  (currentIndex + 1) % WHO_IS_THIS_FOR_PROFILES.length;
