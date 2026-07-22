import type { FounderAnswerCluster } from "@/data/founderAnswerPages";

export interface FounderAnswerSource {
  title: string;
  publisher: string;
  url: string;
}

interface EvidenceCheck {
  signal: string;
  evidence: string;
  nextAction: string;
}

export interface FounderAnswerEvidenceGuide {
  heading: string;
  introduction: string;
  checks: EvidenceCheck[];
  exampleTitle: string;
  example: string;
  failureModes: string[];
  sources: FounderAnswerSource[];
}

export const FOUNDER_ANSWER_EVIDENCE: Record<FounderAnswerCluster, FounderAnswerEvidenceGuide> = {
  icp: {
    heading: "What counts as strong customer evidence",
    introduction:
      "An ICP becomes useful when it predicts behavior, not when it merely describes demographics. Record what the customer is trying to accomplish, the trigger that makes the problem urgent, the workaround they use today, and the cost of leaving the problem unsolved. Then compare interviews using the same fields so repeated patterns are visible.",
    checks: [
      {
        signal: "Repeated situation",
        evidence: "At least five relevant people describe the same painful job or trigger in their own words.",
        nextAction: "Reuse their language in the ICP statement and the first landing-page promise.",
      },
      {
        signal: "Existing workaround",
        evidence: "Prospects already use spreadsheets, contractors, several tools, or a slow manual process.",
        nextAction: "Document the time, cash, or risk attached to that workaround.",
      },
      {
        signal: "Reachable segment",
        evidence: "You can name communities, job-title lists, events, or search queries where this group gathers.",
        nextAction: "Choose one reachable channel for the next ten conversations.",
      },
    ],
    exampleTitle: "Worked example: narrowing a broad founder audience",
    example:
      "\"Small businesses that need marketing\" is too broad to guide a product. A more testable first ICP is \"solo B2B consultants who have won referrals but cannot publish a credible weekly LinkedIn post without losing billable hours.\" The second version names a situation, a costly workaround, a channel, and a reason to act. It also tells the founder whom to interview and which promise to test next.",
    failureModes: [
      "Combining several customer types because each one could theoretically use the product.",
      "Treating age, location, or company size as proof of a shared urgent problem.",
      "Accepting compliments as evidence without asking about current behavior or spending.",
    ],
    sources: [
      {
        title: "The Value Proposition Canvas",
        publisher: "Strategyzer",
        url: "https://www.strategyzer.com/library/the-value-proposition-canvas",
      },
      {
        title: "How to start a startup: A guide for entrepreneurs",
        publisher: "Stripe Atlas",
        url: "https://stripe.com/resources/more/how-to-start-a-startup-a-guide-for-entrepreneurs",
      },
    ],
  },
  validation: {
    heading: "Use a validation ladder, not one vanity metric",
    introduction:
      "Validation should increase the cost of the commitment step by step. Start with problem evidence, then ask for an action such as a booked call, a referral, a pilot agreement, a deposit, or payment. A waitlist total alone does not show that the right people have the problem or that they will change behavior to solve it.",
    checks: [
      {
        signal: "Problem evidence",
        evidence: "Interviewees independently recall a recent example and explain the consequence of the problem.",
        nextAction: "Write down exact phrases and rank the problems by frequency and severity.",
      },
      {
        signal: "Behavioral intent",
        evidence: "A qualified prospect books a follow-up, shares data, introduces a colleague, or joins a design partnership.",
        nextAction: "Test the smallest useful solution with those prospects before expanding scope.",
      },
      {
        signal: "Economic intent",
        evidence: "A prospect accepts a paid pilot, prepays, signs a letter of intent with real terms, or states a budget owner and process.",
        nextAction: "Compare willingness to pay with the cost of delivering the promised outcome.",
      },
    ],
    exampleTitle: "Worked example: interpreting a waitlist",
    example:
      "Two hundred unqualified email signups from a giveaway are weaker evidence than eight target buyers who complete interviews, three who share their current workflow, and one who pays for a manual pilot. The smaller group reveals the problem, buying process, and delivery constraints. Use the waitlist to recruit evidence, not as a substitute for evidence.",
    failureModes: [
      "Asking whether someone likes an idea instead of reconstructing what they did the last time the problem occurred.",
      "Changing the audience, offer, and channel in the same experiment, making the result impossible to diagnose.",
      "Building more features after weak demand instead of testing whether the problem or promise is wrong.",
    ],
    sources: [
      {
        title: "How to start a startup: A guide for entrepreneurs",
        publisher: "Stripe Atlas",
        url: "https://stripe.com/resources/more/how-to-start-a-startup-a-guide-for-entrepreneurs",
      },
      {
        title: "The Value Proposition Canvas",
        publisher: "Strategyzer",
        url: "https://www.strategyzer.com/library/the-value-proposition-canvas",
      },
    ],
  },
  build: {
    heading: "Define the MVP by the evidence it must produce",
    introduction:
      "An MVP is the smallest reliable experience that tests a risky assumption and delivers one meaningful outcome. Its scope should come from the next decision you need to make. If a concierge service or manual workflow can test the assumption safely, use it before investing in automation.",
    checks: [
      {
        signal: "One measurable outcome",
        evidence: "A user can complete the core job from start to finish and you can observe success or failure.",
        nextAction: "Remove features that do not help produce or measure that outcome.",
      },
      {
        signal: "A real feedback loop",
        evidence: "The product records activation and completion, and every early user has a clear feedback route.",
        nextAction: "Review behavior and interviews together after each small cohort.",
      },
      {
        signal: "Known operating limit",
        evidence: "The team has documented which steps are manual, fragile, or unsuitable for scale.",
        nextAction: "Automate only the bottleneck proven by repeated use.",
      },
    ],
    exampleTitle: "Worked example: reducing a marketplace MVP",
    example:
      "A services marketplace may appear to need profiles, search, reviews, messaging, payments, and dispute handling. The first risky assumption is often whether buyers will accept a curated match. A landing page, structured intake form, manual matching process, and payment link can test that behavior. Build marketplace mechanics only after repeat transactions reveal where manual delivery fails.",
    failureModes: [
      "Calling a long feature backlog an MVP because each feature is individually simple.",
      "Selecting a stack for hypothetical scale before validating the workflow and demand.",
      "Shipping without an activation event, completion event, or method for contacting early users.",
    ],
    sources: [
      {
        title: "How to start a startup: A guide for entrepreneurs",
        publisher: "Stripe Atlas",
        url: "https://stripe.com/resources/more/how-to-start-a-startup-a-guide-for-entrepreneurs",
      },
      {
        title: "The Value Proposition Canvas",
        publisher: "Strategyzer",
        url: "https://www.strategyzer.com/library/the-value-proposition-canvas",
      },
    ],
  },
  launch: {
    heading: "Treat launch as a measured distribution experiment",
    introduction:
      "A launch is useful when it connects a specific audience, promise, channel, and conversion event. Define those four fields before publishing. Evaluate qualified conversations, activations, and retained use alongside traffic so a temporary attention spike is not mistaken for repeatable acquisition.",
    checks: [
      {
        signal: "Audience-channel fit",
        evidence: "The channel contains people with the situation described by the ICP, not just a large general audience.",
        nextAction: "Tailor the launch asset and call to action to that channel's context.",
      },
      {
        signal: "Message-to-activation continuity",
        evidence: "The landing-page promise matches what a new user experiences in the first session.",
        nextAction: "Remove onboarding steps that delay the promised first outcome.",
      },
      {
        signal: "Cohort quality",
        evidence: "You can separate source, signup, activation, and retained use for each launch cohort.",
        nextAction: "Repeat the channel only when qualified activation justifies the effort or spend.",
      },
    ],
    exampleTitle: "Worked example: choosing between attention and traction",
    example:
      "A launch that produces 3,000 visits, 120 signups, and two activated target users may be less useful than a partner webinar with 40 attendees, 12 qualified signups, and seven activations. Report the full funnel by source. The second channel has lower reach but gives a stronger reason to test another partner campaign.",
    failureModes: [
      "Launching everywhere on the same day without source tracking or enough capacity to talk with new users.",
      "Optimizing for votes, impressions, or email volume while the activation event remains undefined.",
      "Changing the product immediately after launch without separating audience mismatch from onboarding friction.",
    ],
    sources: [
      {
        title: "The Product Hunt Launch Guide",
        publisher: "Product Hunt",
        url: "https://www.producthunt.com/launch",
      },
      {
        title: "Google Analytics predefined acquisition reports",
        publisher: "Google for Developers",
        url: "https://developers.google.com/analytics/devguides/reporting/data/v1/predefined-reports",
      },
    ],
  },
  fundraising: {
    heading: "Make every investor claim traceable to evidence",
    introduction:
      "A fundraising narrative should connect the customer problem, market opportunity, product, traction, team advantage, and use of funds. Put a source or calculation behind market figures and label projections as projections. Investor readiness also requires a coherent data room and consistent numbers across the deck, model, cap table, and conversations.",
    checks: [
      {
        signal: "Customer proof",
        evidence: "The deck distinguishes interviews, pilots, revenue, active users, and retention instead of combining them as traction.",
        nextAction: "Use a dated metric snapshot and keep the underlying export available for diligence.",
      },
      {
        signal: "Reproducible market logic",
        evidence: "The market estimate shows source dates, customer count, expected annual value, and assumptions.",
        nextAction: "Include the calculation in an appendix and reconcile it with the operating plan.",
      },
      {
        signal: "Milestone-based raise",
        evidence: "The amount requested maps to runway, hiring, experiments, and a specific next fundable milestone.",
        nextAction: "Prepare base and constrained plans so the story remains credible at different raise sizes.",
      },
    ],
    exampleTitle: "Worked example: replacing an unsupported market slide",
    example:
      "Instead of saying \"the global software market is worth billions,\" start with the reachable segment. For example: 18,000 target companies in the launch geography multiplied by a tested annual contract value of $3,000 produces a $54 million serviceable segment. Cite the company-count source, label the price as tested or assumed, and show how the first channel reaches a subset of those buyers.",
    failureModes: [
      "Using a top-down market statistic with no connection to the customers the startup can actually reach.",
      "Presenting cumulative registrations as active traction or mixing signed, verbal, and hypothetical pipeline.",
      "Seeking capital before explaining which milestone the round is designed to unlock.",
    ],
    sources: [
      {
        title: "A Guide to Seed Fundraising",
        publisher: "Y Combinator",
        url: "https://www.ycombinator.com/blog/how-to-raise-a-seed-round",
      },
      {
        title: "Starting your fundraising pitch deck",
        publisher: "Stripe Atlas",
        url: "https://stripe.com/guides/atlas/pitchdeck",
      },
    ],
  },
};

export function getFounderAnswerEvidence(cluster: FounderAnswerCluster): FounderAnswerEvidenceGuide {
  return FOUNDER_ANSWER_EVIDENCE[cluster];
}
