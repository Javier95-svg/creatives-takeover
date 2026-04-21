import type { IcpDraftDocument } from "@/lib/icpBuilderSession";

export type IcpPreviewExplainerKey = "customer" | "pain" | "build" | "moat";

export interface IcpPreviewSectionExplainer {
  what: string;
  why: string;
  how: string;
}

export const SAMPLE_ICP_PREVIEW_DRAFT: IcpDraftDocument = {
  gatePreview: {
    personaName: "RevOps-led SMB SaaS team",
    roleLine: "Revenue operations manager at a scaling B2B SaaS company.",
    painLine: "We keep leaking pipeline because every handoff lives in a different tool.",
  },
  customer: {
    personaName: "RevOps-led SMB SaaS team",
    roleLine:
      "Revenue operations manager at a 20-75 person B2B SaaS company trying to stop pipeline leakage before the next board review.",
    metaLine:
      "North America and UK | Series A-B SaaS | $2M-$15M ARR | 5-12 person GTM team",
    summary:
      "This draft focuses on RevOps-led SaaS teams that already have HubSpot or Salesforce in place, feel pressure to improve forecast accuracy, and need a cleaner way to catch deal-risk signals before leadership asks why revenue slipped again.",
    behaviors: [
      "Audits CRM hygiene every week because pipeline trust is low.",
      "Builds temporary spreadsheet layers when handoffs between SDR, AE, and CS start breaking.",
      "Pulls evidence from Gong, CRM notes, and Slack before board prep.",
    ],
    motivations: [
      "Protect credibility with founders and the board by making pipeline reporting more defensible.",
      "Reduce manual reconciliation work so the GTM team can act on risk earlier.",
      "Create one operating rhythm that sales, success, and leadership all trust.",
    ],
    whereToFind: [
      "RevOps Co-op",
      "LinkedIn RevOps operators",
      "Pavilion",
      "HubSpot and Salesforce communities",
      "Revenue-focused newsletters and podcasts",
    ],
    triggerContext:
      "A missed quarter, a shaky board deck, or a leadership push for better forecast visibility creates urgency.",
    actionTrigger:
      "They act when forecast trust drops enough that leadership starts demanding a new system instead of another spreadsheet patch.",
    evidence: {
      confidence: "high",
      evidence:
        "The persona is tightly aligned to a recurring workflow problem owned by one clear operator with budget influence and cross-functional visibility.",
      missingSignalPrompt:
        "Validate whether the first wedge is RevOps-led companies below $10M ARR or larger GTM teams with more complex handoffs.",
    },
  },
  pain: {
    quote:
      "We keep leaking pipeline because every handoff lives in a different tool, so by the time leadership notices the risk, it is already too late to fix.",
    rootCause:
      "Critical deal, onboarding, and churn signals are scattered across the CRM, call notes, spreadsheets, and Slack rather than living in one operating layer.",
    whyItHurts:
      "The RevOps lead becomes the manual source of truth, forecast trust drops, and every leadership review turns into a clean-up exercise instead of a decision-making moment.",
    triggerMoment:
      "The pain spikes before board meetings, after a missed target, or when leadership asks why pipeline coverage looked healthy but slipped anyway.",
    costOfInaction:
      "Revenue surprises keep happening, reps lose trust in process changes, and the company delays hiring or spend decisions because the number is too noisy.",
    evidence: {
      confidence: "high",
      evidence:
        "The pain is operational, urgent, and measurable. It has a visible owner and a clear financial downside, which makes it a strong early ICP anchor.",
      missingSignalPrompt:
        "Pressure-test whether the first painful moment is forecast accuracy, handoff delays, or post-sale churn visibility so the message stays sharp.",
    },
  },
  build: {
    valueProposition:
      "A revenue signal layer that surfaces deal-risk, handoff breakdowns, and forecast blind spots before they show up in the board deck.",
    replaces: [
      "CRM exports",
      "manual RevOps spreadsheets",
      "Slack escalation threads",
    ],
    coreFeatures: [
      {
        title: "Unified revenue signal dashboard",
        description:
          "Pull risk indicators from CRM activity, call notes, and customer health into one operator view.",
      },
      {
        title: "Handoff and forecast alerts",
        description:
          "Flag stalled deals, missing follow-ups, and cross-functional handoff gaps before they compound.",
      },
      {
        title: "Leadership-ready reporting",
        description:
          "Turn messy operator work into a clean narrative leaders can trust without extra spreadsheet prep.",
      },
    ],
    outcome:
      "Give RevOps a faster way to protect forecast trust, reduce manual reporting work, and catch revenue risk one to two weeks earlier.",
    evidence: {
      confidence: "high",
      evidence:
        "The recommended build direction matches the pain owner, the timing of the problem, and the existing messy workaround stack.",
      missingSignalPrompt:
        "Confirm whether the first paid use case is board-report prep, weekly forecast calls, or post-sale handoff visibility.",
    },
  },
  moat: {
    moatType: "Workflow moat",
    edge:
      "The product wins by becoming the operating layer between fragmented GTM systems, not by replacing the CRM itself.",
    edgeSource:
      "It fits into an already painful weekly workflow and learns from the exact handoff patterns that operators are already stitching together manually.",
    whyHardToCopy:
      "Competitors optimize for broad CRM workflows, while this wedge is built around the specific decisions RevOps teams need to make under board-level pressure.",
    incumbentGap:
      "Incumbents provide storage and reporting, but they do not package scattered risk signals into one practical operating rhythm for smaller GTM teams.",
    startupsToStudy: [
      { name: "Attention", url: "https://www.attention.com" },
      { name: "Scratchpad", url: "https://scratchpad.com" },
      { name: "Clari", url: "https://www.clari.com" },
    ],
    evidence: {
      confidence: "medium",
      evidence:
        "The moat is credible if the workflow becomes sticky and the product keeps surfacing signal earlier than existing reporting setups.",
      missingSignalPrompt:
        "Prove whether operators will trust this layer enough to change their weekly operating rhythm, not just read another dashboard.",
    },
  },
  competition: {
    summary:
      "The market already has CRM systems, forecasting tools, and sales execution add-ons, but smaller GTM teams still bridge the gap with manual operator work.",
    directCompetitors: [
      {
        name: "Clari",
        url: "https://www.clari.com",
        doesWell: "Owns top-down forecasting and enterprise pipeline visibility.",
        gap: "Feels too heavy and expensive for smaller SaaS teams that mostly need cleaner handoffs and signal visibility.",
      },
      {
        name: "Scratchpad",
        url: "https://scratchpad.com",
        doesWell: "Improves rep-side CRM hygiene and pipeline workflows.",
        gap: "Does not fully package the cross-functional revenue-risk layer leadership and RevOps want.",
      },
      {
        name: "HubSpot reporting",
        url: "https://www.hubspot.com",
        doesWell: "Already exists in the stack and is familiar.",
        gap: "Teams still build spreadsheet workarounds because the insight layer is not opinionated enough.",
      },
    ],
    exploitableGap:
      "Own the mid-market wedge where teams are sophisticated enough to feel real pipeline pain but too lean to buy heavyweight enterprise forecasting software.",
    evidence: {
      confidence: "medium",
      evidence:
        "There is a visible gap between generic reporting and expensive enterprise revenue intelligence, but the wedge depends on strong positioning and workflow fit.",
      missingSignalPrompt:
        "Interview buyers who recently tried to fix this with reporting layers or sales tools and still fell back to spreadsheets.",
    },
  },
  confidence: {
    level: "high",
    summary:
      "This sample draft has strong operator clarity, painful timing, and a believable wedge. It still needs live buyer interviews to confirm the first paid use case.",
    missingSignals: [
      "Which exact meeting or workflow makes the buyer feel the pain first.",
      "Whether RevOps owns the budget or needs a sales leader champion to buy.",
      "Which signal source creates the strongest habit loop after onboarding.",
    ],
  },
  nextActions: [
    {
      title: "Interview 5 RevOps leads",
      description: "Pressure-test the trigger moment and current workaround stack.",
      route: "/pmf-lab",
    },
    {
      title: "Draft positioning copy",
      description: "Turn the pain, trigger, and outcome into a sharper offer narrative.",
      route: "/waitlist",
    },
    {
      title: "Scope the MVP",
      description: "Reduce the build to one signal dashboard plus one alert loop.",
      route: "/mvp-builder",
    },
  ],
};

export const SAMPLE_ICP_SECTION_EXPLAINERS: Record<
  IcpPreviewExplainerKey,
  IcpPreviewSectionExplainer
> = {
  customer: {
    what:
      "This section defines the specific buyer and company context the draft is targeting first.",
    why:
      "It matters because a strong ICP narrows the market to one reachable, painful wedge instead of describing everyone who could maybe buy.",
    how:
      "The Builder generates this from the founder's description of the startup, then synthesizes the likely operator, company traits, motivations, and buying context into one focused segment.",
  },
  pain: {
    what:
      "This section captures the core problem, what causes it, when it becomes urgent, and what it costs to ignore.",
    why:
      "It matters because pain is what creates urgency. If the problem is not painful and time-sensitive, the ICP stays interesting but weak for messaging and sales.",
    how:
      "The Builder turns the founder's problem statement and workflow clues into a sharper pain narrative with a quote, root cause, trigger moment, and cost of inaction.",
  },
  build: {
    what:
      "This section translates the ICP into the product angle, feature wedge, and outcome this customer is most likely to buy.",
    why:
      "It matters because the output should not stop at persona research. It should point toward what to build, what to emphasize, and what result the buyer actually wants.",
    how:
      "The Builder maps the pain, workaround, and desired outcome into a value proposition, a small feature set, and a concrete post-purchase result.",
  },
  moat: {
    what:
      "This section explains why the opportunity is still viable in-market, what competitors already do well, and where the draft sees room to win.",
    why:
      "It matters because a usable ICP has to survive real alternatives, buyer objections, and switching friction instead of looking strong only in isolation.",
    how:
      "The Builder combines the founder's market context with inferred competitive patterns to frame the wedge, the likely objection set, and the angle that incumbents tend to miss.",
  },
};
