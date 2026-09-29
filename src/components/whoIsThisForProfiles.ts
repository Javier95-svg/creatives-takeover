import type { UserType } from "@/lib/accountTypes";

export const WHO_IS_THIS_FOR_ACCOUNT_TYPES = [
  { id: "founder", label: "Founder", promise: "I have a project.", next: "Keep your work in one place and see what to do next.", access: "open" },
  { id: "builder", label: "Builder", promise: "I have an idea.", next: "Find who needs it, test it, and start building.", access: "open" },
  { id: "mentor", label: "Mentor", promise: "I help people learn.", next: "Share advice with people building a business.", access: "invitation" },
  { id: "marketplace", label: "Marketplace", promise: "I offer a service.", next: "Help with work like design, marketing, or technology.", access: "invitation" },
  { id: "investor", label: "Investor", promise: "I back new businesses.", next: "Find projects that fit what you want to support. Matching opens after review.", access: "open" },
] as const satisfies readonly { id: UserType; label: string; promise: string; next: string; access: "open" | "invitation" }[];

export type AudienceAccountType = (typeof WHO_IS_THIS_FOR_ACCOUNT_TYPES)[number];

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
    status: "You have an idea and are deciding what to build",
    description:
      "You have an idea. Before you spend months building it, find out who needs it and what problem it solves. Show people a simple version and listen to what they say. Then decide what to build next.",
    indicators: [
      "You have an idea but have not tested it with many people.",
      "You are unsure who needs it most.",
      "You want to learn before spending a lot of time or money.",
    ],
    tools: [
      {
        key: "icp_builder",
        name: "ICP Builder",
        href: "/icp-builder",
        description:
          "Find the people you want to help and the problem they have.",
      },
      {
        key: "demo_studio",
        name: "Demo Studio",
        href: "/demo-studio/try",
        description:
          "Show people what your idea could do and see how they respond.",
      },
      {
        key: "pmf_lab",
        name: "PMF Lab",
        href: "/pmf-lab",
        description:
          "Use what you learn to decide what to build next.",
      },
    ],
  },
  {
    id: "post_launch",
    label: "Profile 2 · Post-launch",
    headline: "You shipped. Now growth still depends on you.",
    status: "Your product is live and you are looking for a way to grow",
    description:
      "Your product is live, but finding new users still takes a lot of effort. Pick one group of people to reach and try one way to reach them. See who tries your product and who comes back, then use what you learn to grow.",
    indicators: [
      "New users show up sometimes, but you are not sure why.",
      "You try many ways to reach people and do not know which works.",
      "You want to know why people stay or leave.",
    ],
    tools: [
      {
        key: "gtm_strategist",
        name: "GTM Strategist",
        href: "/go-to-market",
        description:
          "Choose who to reach, what to say, and one way to try it.",
      },
      {
        key: "traction_engine",
        name: "Traction Engine",
        href: "/traction-engine",
        description:
          "See who joins and comes back, then keep or change your plan.",
      },
    ],
  },
];
