import type { IcpDraftDocument } from "@/lib/icpBuilderSession";

export type IcpSamplePreviewMode = "fast" | "guided";

export type IcpSampleSectionKey =
  | "overview"
  | "buyer"
  | "pain"
  | "value"
  | "competition";

export type IcpSampleFieldKey =
  | "targetSegment"
  | "firmographics"
  | "buyerPersona"
  | "psychographics"
  | "painPoints"
  | "goals"
  | "buyingTriggers"
  | "objections"
  | "preferredChannels"
  | "successMetrics";

export interface IcpSampleTooltipCopy {
  what: string;
  why: string;
  how: Record<IcpSamplePreviewMode, string>;
}

export interface IcpSampleSectionAnnotation {
  eyebrow: string;
  what: string;
  why: string;
  how: Record<IcpSamplePreviewMode, string>;
  confidence: Record<IcpSamplePreviewMode, string>;
  missingSignal?: Partial<Record<IcpSamplePreviewMode, string>>;
}

export interface IcpSampleCallout {
  id: string;
  label: string;
  description: string;
  sectionKey: IcpSampleSectionKey;
}

export interface IcpSampleModePresentation {
  title: string;
  helper: string;
  confidenceBadge: string;
}

export interface IcpSamplePreviewData {
  draftByMode: Record<IcpSamplePreviewMode, IcpDraftDocument>;
  modePresentation: Record<IcpSamplePreviewMode, IcpSampleModePresentation>;
  companyContext: string;
  firmographics: Array<{ label: string; value: string }>;
  psychographics: string[];
  objections: string[];
  successMetrics: string[];
  sections: Record<IcpSampleSectionKey, IcpSampleSectionAnnotation>;
  tooltips: Record<IcpSampleFieldKey, IcpSampleTooltipCopy>;
  callouts: IcpSampleCallout[];
}

const sharedDraft: IcpDraftDocument = {
  gatePreview: {
    personaName: "RevOps-led SMB SaaS team",
    roleLine: "Revenue operations manager at a scaling B2B SaaS company.",
    painLine: "We keep leaking pipeline because every handoff lives in a different tool.",
  },
  customer: {
    personaName: "RevOps-led SMB SaaS team",
    roleLine: "Revenue operations manager at a 20-75 person B2B SaaS company trying to stop pipeline leakage before the next board review.",
    metaLine: "North America and UK | Series A-B SaaS | $2M-$15M ARR | 5-12 person GTM team",
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
    replaces: ["CRM exports", "manual RevOps spreadsheets", "Slack escalation threads"],
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

const fastDraft: IcpDraftDocument = {
  ...sharedDraft,
  customer: {
    ...sharedDraft.customer,
    roleLine:
      "Revenue operations lead at a growing B2B SaaS company trying to make pipeline reporting more trustworthy.",
    metaLine: "B2B SaaS | Growing GTM team | North America or UK",
    summary:
      "Fast mode infers an early ICP for RevOps-led SaaS teams that already feel reporting friction, likely run on a CRM plus spreadsheets, and need one clearer view of pipeline risk.",
    actionTrigger:
      "They start looking for a solution after reporting friction becomes too visible to ignore.",
    evidence: {
      confidence: "medium",
      evidence:
        "The draft is directionally strong, but several specifics are inferred from one founder description rather than confirmed through step-by-step answers.",
      missingSignalPrompt:
        "Sharpen the exact revenue stage, company size, and trigger event before treating this as final messaging.",
    },
  },
  pain: {
    ...sharedDraft.pain,
    quote:
      "We know revenue is slipping somewhere in the process, but it takes too much digging to see where the handoff broke.",
    evidence: {
      confidence: "medium",
      evidence:
        "The pain is believable and commercially relevant, but the emotional language and timing are still partly inferred.",
      missingSignalPrompt:
        "Confirm the first painful meeting, the loudest symptom, and the business cost the buyer already feels today.",
    },
  },
  build: {
    ...sharedDraft.build,
    valueProposition:
      "A clearer operating layer for RevOps teams that need pipeline and handoff risk surfaced sooner.",
    outcome:
      "Help the buyer trust forecast reporting sooner and spend less time reconciling messy signals.",
    evidence: {
      confidence: "medium",
      evidence:
        "The product angle fits the inferred pain, but the first must-have feature still needs validation from live workflow detail.",
      missingSignalPrompt:
        "Decide whether the wedge is forecast trust, handoff visibility, or board-readiness before building too broadly.",
    },
  },
  confidence: {
    level: "medium",
    summary:
      "Fast mode gets to a credible draft quickly, but some specificity is intentionally compressed because it starts from one founder paragraph.",
    missingSignals: [
      "The exact buyer title and budget owner.",
      "The first buying trigger and evaluation window.",
      "Which feature creates habit fastest after onboarding.",
    ],
  },
};

const guidedDraft: IcpDraftDocument = {
  ...sharedDraft,
  customer: {
    ...sharedDraft.customer,
    evidence: {
      confidence: "high",
      evidence:
        "Guided answers supplied the buyer, pain, and workaround separately, which makes the segment definition more precise and easier to message.",
      missingSignalPrompt:
        "Validate whether the first paid wedge is sub-$10M ARR SaaS or broader mid-market RevOps teams.",
    },
  },
  pain: {
    ...sharedDraft.pain,
    evidence: {
      confidence: "high",
      evidence:
        "The pain is sharper because Guided mode captured both the emotional cost and the current workaround before the draft was synthesized.",
      missingSignalPrompt:
        "Interview a few buyers to verify whether the biggest urgency comes before board reviews, during weekly forecast calls, or after missed handoffs.",
    },
  },
  build: {
    ...sharedDraft.build,
    evidence: {
      confidence: "high",
      evidence:
        "The build direction is more defensible because the underlying pain and workaround were explicitly described rather than mostly inferred.",
      missingSignalPrompt:
        "Use PMF Lab or founder interviews to decide which workflow should anchor the first onboarding experience.",
    },
  },
  confidence: {
    level: "high",
    summary:
      "Guided mode produces a stronger draft because each step gives the model cleaner signal about who the buyer is, what hurts, and why they act now.",
    missingSignals: [
      "Which message converts best for RevOps versus sales leadership.",
      "Whether implementation risk or budget resistance is the larger objection in live deals.",
      "Which proof point matters most in the first demo.",
    ],
  },
};

export const SAMPLE_ICP_PREVIEW_DATA: IcpSamplePreviewData = {
  draftByMode: {
    fast: fastDraft,
    guided: guidedDraft,
  },
  modePresentation: {
    fast: {
      title: "Fast Output",
      helper: "Same destination, more inference from a single founder input.",
      confidenceBadge: "More inferred",
    },
    guided: {
      title: "Guided Output",
      helper: "Same destination, with stronger signal from step-by-step founder answers.",
      confidenceBadge: "More validated",
    },
  },
  companyContext:
    "Sample company: SignalStack, a fictional B2B SaaS product that helps RevOps teams spot deal-risk and handoff issues earlier.",
  firmographics: [
    { label: "Industry", value: "B2B SaaS with sales-led or hybrid GTM motion" },
    { label: "Company size", value: "20-75 employees with a 5-12 person GTM team" },
    { label: "Revenue", value: "$2M-$15M ARR" },
    { label: "Geography", value: "North America and UK" },
  ],
  psychographics: [
    "Values operational credibility because leadership decisions depend on cleaner numbers.",
    "Prefers practical workflow gains over broad platform promises.",
    "Feels personal ownership when process gaps create forecast surprises.",
  ],
  objections: [
    "We already have reporting in the CRM and should fix process there first.",
    "Another dashboard will not help if reps do not trust or update the system.",
    "This sounds useful, but we need proof it catches risk earlier than our current ops reviews.",
  ],
  successMetrics: [
    "Forecast confidence improves before the next board cycle.",
    "Manual spreadsheet reconciliation time drops each week.",
    "Deal-risk and handoff issues are surfaced earlier in the pipeline.",
  ],
  sections: {
    overview: {
      eyebrow: "Company Overview / Target Segment",
      what:
        "This section defines the narrowest buyer and company context worth targeting first instead of describing the whole market.",
      why:
        "Early traction usually comes from one painful, reachable wedge. A tighter segment gives you sharper messaging, better channels, and clearer product decisions.",
      how: {
        fast:
          "Fast mode inferred the segment from one founder paragraph, then filled in likely company traits and urgency based on common RevOps patterns.",
        guided:
          "Guided mode used the startup idea plus separate persona, pain, and workaround answers to sharpen who feels this problem first.",
      },
      confidence: {
        fast: "Confidence is good but still broad. Some company traits are educated inference rather than confirmed founder detail.",
        guided:
          "Confidence is stronger because the buyer, problem owner, and current workflow were described explicitly before synthesis.",
      },
      missingSignal: {
        fast: "The exact ARR band and first budget owner still need confirmation.",
      },
    },
    buyer: {
      eyebrow: "Buyer Persona, Motivations, and Channels",
      what:
        "This section shows how the buyer thinks, what they care about, where they already spend attention, and what makes them act now.",
      why:
        "Messaging only converts when it matches both the buyer's internal motivations and the channels where they actually discover solutions.",
      how: {
        fast:
          "Fast mode predicts these patterns from the problem owner and startup category, then compresses them into a likely early-buyer profile.",
        guided:
          "Guided mode improves this section because the pain and workaround answers make the buyer's motivations and urgency more specific.",
      },
      confidence: {
        fast: "Useful for targeting and copywriting, but still needs live interviews to confirm the strongest trigger and channel.",
        guided:
          "Sharper enough to support outreach hypotheses because the buyer context is anchored to clearer pain and timing.",
      },
    },
    pain: {
      eyebrow: "Pain Points and Challenges",
      what:
        "This section captures the emotional quote, root cause, trigger moment, and the real cost of doing nothing.",
      why:
        "Strong pain is what creates urgency. Without a painful problem and a visible downside, the ICP stays interesting but not actionable.",
      how: {
        fast:
          "Fast mode inferred the pain arc from the founder description and common RevOps workflow breakdowns.",
        guided:
          "Guided mode sharpened the pain because the founder described the buyer and workaround separately before the draft was composed.",
      },
      confidence: {
        fast: "The pain is believable but partly inferred, so the exact trigger moment still needs validation.",
        guided:
          "The pain is more defensible because it connects a real workaround to a clearer operational cost.",
      },
    },
    value: {
      eyebrow: "Goals, Desired Outcomes, and Value",
      what:
        "This section translates the ICP into a product angle, core feature set, and the outcome the buyer actually wants to buy.",
      why:
        "Buyers do not purchase features in isolation. They buy a faster, safer, or more reliable outcome tied to their existing pain.",
      how: {
        fast:
          "Fast mode maps the inferred pain to a likely product wedge and outcome, but the first must-have feature is still somewhat compressed.",
        guided:
          "Guided mode connects the build direction to a clearer pain and workaround, which makes the recommended outcome tighter and easier to prioritize.",
      },
      confidence: {
        fast: "Good enough to draft a value proposition, but not yet specific enough to lock an MVP without more validation.",
        guided:
          "Strong enough to guide positioning and early MVP scoping because the draft has better founder signal behind it.",
      },
      missingSignal: {
        fast: "Decide which workflow should anchor the first onboarding promise.",
      },
    },
    competition: {
      eyebrow: "Competitive Context, Objections, and Barriers",
      what:
        "This section explains where the product fits in the market, why the current alternatives are not enough, and what resistance a buyer may still have.",
      why:
        "Realistic ICPs account for switching friction and market alternatives. Otherwise the draft sounds strong in isolation but weak in-market.",
      how: {
        fast:
          "Fast mode interprets likely objections from the current tool stack and competition rather than from explicit founder answers.",
        guided:
          "Guided mode keeps the same market frame, but the sharper pain and workaround make the objection-handling angle more credible.",
      },
      confidence: {
        fast: "Useful for positioning, but still needs live buyer language to know which objection appears first in real conversations.",
        guided:
          "More realistic because the competitive framing now ties back to a validated workflow problem instead of a broad category guess.",
      },
    },
  },
  tooltips: {
    targetSegment: {
      what:
        "The specific slice of the market this draft prioritizes first.",
      why:
        "It matters because early traction usually comes from focus, not breadth.",
      how: {
        fast:
          "Derived from the founder input plus AI inference about urgency and fit.",
        guided:
          "Derived from the founder input plus cleaner step-by-step answers about buyer, pain, and workaround.",
      },
    },
    firmographics: {
      what:
        "Company-level traits like industry, size, revenue band, and geography.",
      why:
        "They matter because they shape sales cycles, budget, and channel strategy.",
      how: {
        fast:
          "Derived from the segment described or inferred from the use case.",
        guided:
          "Derived from the segment described, then tightened by the richer buyer and pain context.",
      },
    },
    buyerPersona: {
      what:
        "The person most likely to feel the pain and champion the purchase.",
      why:
        "It matters because messaging and outreach need a human target, not just a company type.",
      how: {
        fast:
          "Derived from the startup idea and problem owner.",
        guided:
          "Derived from the startup idea, problem owner, and the explicit persona edits the founder supplied.",
      },
    },
    psychographics: {
      what:
        "What this buyer values, fears, and wants to protect.",
      why:
        "It matters because motivation drives action faster than demographics alone.",
      how: {
        fast:
          "Derived from the pain pattern and trigger context.",
        guided:
          "Derived from the pain pattern, trigger context, and the founder's clearer description of the workaround.",
      },
    },
    painPoints: {
      what:
        "The high-friction problem this draft says is worth solving first.",
      why:
        "It matters because strong pain is what creates urgency and conversion.",
      how: {
        fast:
          "Derived from founder input and AI synthesis.",
        guided:
          "Derived from founder input and AI synthesis, with better signal from the guided pain and workaround answers.",
      },
    },
    goals: {
      what:
        "What success looks like after the pain is removed.",
      why:
        "It matters because buyers purchase outcomes, not features.",
      how: {
        fast:
          "Derived from the pain, workaround, and product angle.",
        guided:
          "Derived from the pain, workaround, and a more validated product angle shaped by guided answers.",
      },
    },
    buyingTriggers: {
      what:
        "Events that make the buyer act now instead of later.",
      why:
        "It matters because timing determines conversion likelihood.",
      how: {
        fast:
          "Derived from the trigger context and action trigger logic.",
        guided:
          "Derived from the trigger context and action trigger logic, then sharpened by the guided answers.",
      },
    },
    objections: {
      what:
        "Reasons a buyer may hesitate, delay, or stay with the status quo.",
      why:
        "It matters because adoption friction shapes positioning and onboarding.",
      how: {
        fast:
          "In this preview, shown as an interpreted layer from competition and switching behavior.",
        guided:
          "In this preview, shown as an interpreted layer from competition, switching behavior, and the clearer workflow context.",
      },
    },
    preferredChannels: {
      what:
        "Where this buyer already pays attention or looks for solutions.",
      why:
        "It matters because acquisition only works if you meet them in the right places.",
      how: {
        fast:
          "Derived from behavior and where-to-find signals.",
        guided:
          "Derived from behavior and where-to-find signals, with stronger buyer specificity from guided answers.",
      },
    },
    successMetrics: {
      what:
        "Signals the buyer would use to judge whether the solution is worth it.",
      why:
        "It matters because value must be measurable to stick.",
      how: {
        fast:
          "In this preview, shown as a presenter-level interpretation of the build outcome.",
        guided:
          "In this preview, shown as a presenter-level interpretation of the build outcome, with clearer tie-back to the guided pain and value prop.",
      },
    },
  },
  callouts: [
    {
      id: "smallest-buyer",
      label: "1. Start with the smallest viable buyer",
      description:
        "This sample narrows to RevOps-led SMB SaaS teams instead of trying to describe every GTM operator.",
      sectionKey: "overview",
    },
    {
      id: "trigger-over-title",
      label: "2. The trigger matters more than the title",
      description:
        "The draft identifies the moment that creates urgency, not just the person who feels the pain.",
      sectionKey: "buyer",
    },
    {
      id: "cost-of-inaction",
      label: "3. Pain gets sharper when cost of inaction is concrete",
      description:
        "A good ICP draft makes the downside of doing nothing visible enough to support real buying intent.",
      sectionKey: "pain",
    },
    {
      id: "build-direction",
      label: "4. The best ICP drafts point toward a build direction, not just a persona",
      description:
        "The output should tell you what kind of product promise and feature wedge this customer will buy.",
      sectionKey: "value",
    },
    {
      id: "market-realism",
      label: "5. Competitive context keeps the draft realistic",
      description:
        "The draft becomes more useful when it also shows what the buyer might compare you against or resist.",
      sectionKey: "competition",
    },
  ],
};
