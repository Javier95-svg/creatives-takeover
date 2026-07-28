export const WHO_IS_THIS_FOR_AUTOPLAY_MS = 5_000;

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
      "You have an idea that keeps pulling you back, but you still do not know whether the problem is urgent enough for someone else to act on. You may be building alone, learning technical language as you go, or deciding between no-code, a freelancer, or finding a technical partner. Your real concern is not a lack of ideas. It is spending the next three months—and your limited budget—building for the wrong customer or solving a problem people will not prioritize. You want a grounded build, narrow, pivot, or stop decision within 30 days, evidence you can explain, and a next step that does not require pretending you already have certainty.",
    indicators: [
      "You repeatedly refine the concept internally but have limited customer evidence.",
      "You research tools, competitors, and technology because building feels more controllable than approaching customers.",
      "You want confidence before committing meaningful time or money.",
      "You worry that being nontechnical will cause you to choose the wrong product scope or partner.",
      "Your immediate job is deciding whether this idea deserves to be built.",
    ],
    tools: [
      {
        key: "icp_builder",
        name: "ICP Builder",
        href: "/icp-builder",
        description:
          "Turn a broad audience into a specific first customer segment, pain hypothesis, and interview direction.",
      },
      {
        key: "demo_studio",
        name: "Demo Studio",
        href: "/demo-studio/try",
        description:
          "Make the idea tangible enough for prospects to react, commit, or reject before you build the full product.",
      },
      {
        key: "pmf_lab",
        name: "PMF Lab",
        href: "/pmf-lab",
        description:
          "Combine conversations and behavioural signals into an evidence-based Build, Narrow, Pivot, or Stop decision.",
      },
    ],
  },
  {
    id: "post_launch",
    label: "Profile 2 · Post-launch",
    headline: "You shipped. Now growth still depends on you.",
    status: "Live MVP · Fewer than roughly 100 active users · No repeatable acquisition channel",
    description:
      "Your MVP is live, so the question is no longer whether you can ship. The problem is that every new user still seems to require a fresh burst of founder energy. You post across several channels, rewrite the message, watch analytics, and react to individual feedback, but you cannot tell which activity consistently creates qualified users or brings them back. Underneath all that motion is the fear that weak traction means the product is wrong, when the real constraint may be the ICP, positioning, channel, onboarding, or retention. You want a focused acquisition thesis, a weekly testing rhythm, and clear permission to stop tactics that do not compound.",
    indicators: [
      "User growth arrives in isolated spikes rather than through a repeatable channel.",
      "You frequently switch channels or messaging before collecting enough evidence.",
      "Customer, acquisition, and retention data is fragmented across tools or spreadsheets.",
      "You respond to weak traction by adding features because product work feels more concrete than distribution.",
      "Your immediate job is finding which audience, message, channel, and retention behaviour can become repeatable.",
    ],
    tools: [
      {
        key: "gtm_strategist",
        name: "GTM Strategist",
        href: "/go-to-market",
        description:
          "Turn customer language into focused positioning, one channel bet, and a measurable acquisition play.",
      },
      {
        key: "traction_engine",
        name: "Traction Engine",
        href: "/traction-engine",
        description:
          "Review acquisition and retention evidence weekly, then double down, iterate, or stop based on results.",
      },
    ],
  },
];

export const getNextFounderProfileIndex = (currentIndex: number) =>
  (currentIndex + 1) % WHO_IS_THIS_FOR_PROFILES.length;
