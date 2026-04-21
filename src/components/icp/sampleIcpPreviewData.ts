import type { IcpDraftDocument } from "@/lib/icpBuilderSession";

export type IcpPreviewExplainerKey = "customer" | "pain" | "build" | "moat";

export interface IcpPreviewSectionExplainer {
  what: string;
  why: string;
  how: string;
}

export type IcpSampleProfileKey =
  | "revops_smb_saas"
  | "d2c_ecommerce_brand"
  | "b2b_professional_services"
  | "early_stage_startup_pre_pmf";

export interface IcpSamplePreviewProfile {
  key: IcpSampleProfileKey;
  label: string;
  draft: IcpDraftDocument;
}

const revOpsSmbSaasDraft: IcpDraftDocument = {
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

const d2cEcommerceBrandDraft: IcpDraftDocument = {
  gatePreview: {
    personaName: "D2C E-commerce brand operator",
    roleLine: "Founder or growth lead at a consumer brand selling online.",
    painLine: "We are paying to acquire customers, but we still cannot tell which buyers will come back.",
  },
  customer: {
    personaName: "D2C E-commerce brand operator",
    roleLine:
      "Founder or growth lead at a 2-20 person D2C e-commerce brand trying to improve repeat purchase performance without wasting more paid spend.",
    metaLine:
      "Shopify-first | Health, beauty, wellness, or lifestyle products | $500k-$8M annual revenue | Lean in-house team",
    summary:
      "This draft focuses on consumer brands that already know how to generate top-of-funnel demand but still struggle to turn first-time buyers into profitable repeat customers. The target operator owns performance, retention, and merchandising decisions closely enough to feel the downside every week.",
    behaviors: [
      "Checks Shopify, Meta, and Klaviyo dashboards every day looking for small retention lifts.",
      "Tests offers, bundles, and email flows manually because lifecycle performance is inconsistent.",
      "Reviews cohort and reorder data before deciding whether to spend more on acquisition.",
    ],
    motivations: [
      "Raise contribution margin by increasing repeat purchase rate instead of buying every sale again.",
      "Understand which customer segments are most likely to reorder before scaling spend.",
      "Create a more reliable retention playbook that does not depend on guesswork or one-off promotions.",
    ],
    whereToFind: [
      "Shopify partner ecosystem",
      "D2C founder and operator Slack groups",
      "Twitter and LinkedIn e-commerce operators",
      "Retention-focused newsletters",
      "Klaviyo and Triple Whale communities",
    ],
    triggerContext:
      "Acquisition costs rise, new customer growth slows, or an investor asks why repeat revenue is not improving with more traffic.",
    actionTrigger:
      "They act when the brand keeps paying for first purchases but post-purchase behavior stays too unpredictable to scale profitably.",
    evidence: {
      confidence: "high",
      evidence:
        "The buyer is clear, the workflow is measurable, and the problem directly affects margin, CAC efficiency, and inventory decisions.",
      missingSignalPrompt:
        "Validate whether the sharpest first wedge is consumables, beauty, or higher-frequency lifestyle products where repeat behavior matters fastest.",
    },
  },
  pain: {
    quote:
      "We can get people to buy once, but we still cannot see early enough who is likely to reorder and which offers actually improve retention.",
    rootCause:
      "Customer behavior data lives across acquisition dashboards, Shopify reports, and lifecycle tools without one clear view of which signals predict repeat purchases.",
    whyItHurts:
      "The operator keeps making discounting and spend decisions with partial information, which compresses margin and makes growth feel fragile.",
    triggerMoment:
      "The pain spikes after a high-spend campaign, before inventory planning, or when a retention push fails to move repeat purchase rate meaningfully.",
    costOfInaction:
      "The brand keeps overpaying for new customers, underinvests in its best cohorts, and misses the window to build predictable repeat revenue.",
    evidence: {
      confidence: "high",
      evidence:
        "The pain is tied to a recurring revenue mechanic with visible operational and financial consequences, which creates real urgency for a D2C operator.",
      missingSignalPrompt:
        "Pressure-test whether the first buying moment is around reorder forecasting, campaign measurement, or lifecycle merchandising decisions.",
    },
  },
  build: {
    valueProposition:
      "A retention intelligence layer that shows which customer cohorts are most likely to reorder, what nudges improve repeat purchase behavior, and where margin is being lost.",
    replaces: [
      "spreadsheet cohort analysis",
      "fragmented Shopify and Klaviyo views",
      "manual campaign postmortems",
    ],
    coreFeatures: [
      {
        title: "Repeat-purchase signal dashboard",
        description:
          "Bring cohort behavior, reorder timing, and campaign response into one retention decision view.",
      },
      {
        title: "Segment-level retention recommendations",
        description:
          "Surface which buyer segments need urgency, replenishment, bundles, or education rather than blanket discounts.",
      },
      {
        title: "Margin-aware experiment tracking",
        description:
          "Measure whether retention tactics actually improve LTV without quietly damaging contribution margin.",
      },
    ],
    outcome:
      "Help the brand operator grow repeat revenue with more confidence, better segmentation, and fewer margin-damaging guesses.",
    evidence: {
      confidence: "high",
      evidence:
        "The product direction fits the operator, the current tool stack, and the exact decisions the team is already making manually.",
      missingSignalPrompt:
        "Confirm whether the first paid use case should anchor on replenishment brands, promotional brands, or subscription-adjacent repeat behavior.",
    },
  },
  moat: {
    moatType: "Decision-support moat",
    edge:
      "The product wins by turning messy retention and merchandising signals into actions a small brand team can use immediately, not by becoming another generic analytics dashboard.",
    edgeSource:
      "It sits close to recurring decisions around lifecycle campaigns, reorder timing, and customer segmentation where lean operators already feel pain.",
    whyHardToCopy:
      "Most tools either optimize campaign execution or report on historical data, but few package retention insight in a way that directly changes weekly D2C operating decisions.",
    incumbentGap:
      "Incumbents provide raw reporting and campaign infrastructure, but smaller brands still need a clearer decision layer to know what will increase repeat buying profitably.",
    startupsToStudy: [
      { name: "RetentionX", url: "https://www.retentionx.com" },
      { name: "Peel", url: "https://www.peelinsights.com" },
      { name: "Triple Whale", url: "https://www.triplewhale.com" },
    ],
    evidence: {
      confidence: "medium",
      evidence:
        "The wedge is strongest if the product can consistently help operators act on retention signals faster than existing reporting tools alone.",
      missingSignalPrompt:
        "Validate whether operators will pay for decision support separately from the analytics and email tools they already use.",
    },
  },
  competition: {
    summary:
      "Brands already use Shopify analytics, lifecycle platforms, and performance dashboards, but they still piece together the retention story manually when deciding what to do next.",
    directCompetitors: [
      {
        name: "Triple Whale",
        url: "https://www.triplewhale.com",
        doesWell: "Combines e-commerce performance data into a more operator-friendly reporting layer.",
        gap: "Still skews broad on measurement rather than the specific repeat-purchase decision layer this buyer wants.",
      },
      {
        name: "RetentionX",
        url: "https://www.retentionx.com",
        doesWell: "Offers strong retention and cohort analytics for e-commerce teams.",
        gap: "Can feel more analytical than prescriptive for lean operators who need action-ready guidance.",
      },
      {
        name: "Klaviyo reporting",
        url: "https://www.klaviyo.com",
        doesWell: "Lives close to the lifecycle execution layer and already has campaign data.",
        gap: "Does not fully connect retention decisions to broader cohort economics and merchandising tradeoffs.",
      },
    ],
    exploitableGap:
      "Own the segment of lean D2C brands that need retention decisions translated into clear weekly actions rather than another reporting surface.",
    evidence: {
      confidence: "medium",
      evidence:
        "There is room between raw analytics and heavyweight retention tooling, but the wedge depends on making insights operational enough to change behavior quickly.",
      missingSignalPrompt:
        "Interview operators who already use analytics tools but still rely on spreadsheets or intuition when choosing retention plays.",
    },
  },
  confidence: {
    level: "high",
    summary:
      "This sample draft has strong operator clarity and a direct link to revenue efficiency, but it still needs live validation on the first retention workflow worth monetizing.",
    missingSignals: [
      "Which retention decision buyers want solved first.",
      "How much margin context needs to be built into the product to feel indispensable.",
      "Whether the first champion is the founder, growth lead, or lifecycle manager.",
    ],
  },
  nextActions: [
    {
      title: "Interview 5 D2C operators",
      description: "Map how they currently make repeat-purchase and retention decisions.",
      route: "/pmf-lab",
    },
    {
      title: "Write retention-focused positioning",
      description: "Translate the pain into a sharper consumer-brand operator narrative.",
      route: "/waitlist",
    },
    {
      title: "Scope a retention MVP",
      description: "Reduce the build to one insight dashboard plus one action layer.",
      route: "/mvp-builder",
    },
  ],
};

const b2bProfessionalServicesDraft: IcpDraftDocument = {
  gatePreview: {
    personaName: "B2B professional services firm",
    roleLine: "Managing partner or operations lead at a consultancy selling to enterprise clients.",
    painLine: "We win good client work, but delivery still depends too much on senior people firefighting every engagement.",
  },
  customer: {
    personaName: "B2B professional services firm",
    roleLine:
      "Managing partner or operations lead at a 10-80 person consultancy or agency trying to standardize delivery quality while still selling bespoke enterprise work.",
    metaLine:
      "Consulting, advisory, or agency model | Mid-market to enterprise clients | Project-based revenue | High reliance on senior staff",
    summary:
      "This draft focuses on services firms that have found demand but now struggle to scale delivery consistency, margin, and client confidence without keeping their most senior people in every project detail. The buyer feels pressure from both sales and delivery because growth exposes the cracks in the operating model.",
    behaviors: [
      "Reviews pipeline and delivery capacity together because new sales create immediate resourcing pressure.",
      "Uses templates, playbooks, and QA checklists inconsistently across teams and engagements.",
      "Gets pulled into escalations when client outcomes vary too much by account lead or delivery team.",
    ],
    motivations: [
      "Improve gross margin by making delivery more repeatable without flattening the firm's expertise.",
      "Protect client trust and retention by reducing execution variability across projects.",
      "Free senior leaders from constant intervention so they can focus on growth, hiring, and key client strategy.",
    ],
    whereToFind: [
      "Agency and consulting operator communities",
      "LinkedIn professional services leaders",
      "EO and peer advisory groups",
      "Operations and delivery podcasts",
      "Professional services software ecosystems",
    ],
    triggerContext:
      "The pain appears when the firm wins more enterprise work, hires quickly, or sees margin pressure because too much delivery knowledge still lives in senior heads.",
    actionTrigger:
      "They act when growth makes it obvious that delivery quality and team utilization are too dependent on ad hoc interventions.",
    evidence: {
      confidence: "high",
      evidence:
        "The buyer owns a recurring operational problem with clear commercial consequences across margin, client satisfaction, and scalability.",
      missingSignalPrompt:
        "Validate whether the first wedge is strategy consultancies, digital agencies, or implementation firms with more structured project workflows.",
    },
  },
  pain: {
    quote:
      "We keep selling high-value work, but every time delivery gets busy the same senior people have to step in and rescue quality.",
    rootCause:
      "The firm has expertise and good client demand, but repeatable delivery systems, resourcing visibility, and knowledge transfer are still too inconsistent.",
    whyItHurts:
      "Senior staff become the bottleneck, junior teams ramp slowly, utilization gets distorted, and the firm cannot scale revenue cleanly without risking client trust.",
    triggerMoment:
      "The pain spikes when multiple enterprise projects overlap, new hires join quickly, or a key client escalates because delivery quality slipped.",
    costOfInaction:
      "The firm limits growth, protects too much work behind senior talent, and sees margin erode because every engagement needs rescue work.",
    evidence: {
      confidence: "high",
      evidence:
        "This is a durable services-firm pain with visible operational owners and strong impact on margin, growth capacity, and retention.",
      missingSignalPrompt:
        "Pressure-test whether the sharpest pain lands in staffing visibility, delivery quality control, or codifying repeatable execution.",
    },
  },
  build: {
    valueProposition:
      "An operating layer for professional services firms that standardizes delivery workflows, exposes resourcing risk early, and makes quality more repeatable across teams.",
    replaces: [
      "scattered playbooks",
      "manual resourcing spreadsheets",
      "partner-led delivery rescue loops",
    ],
    coreFeatures: [
      {
        title: "Engagement health and delivery visibility",
        description:
          "Show which projects are drifting off-plan, where staffing pressure is building, and where execution quality is at risk.",
      },
      {
        title: "Repeatable delivery templates",
        description:
          "Turn high-performing engagement patterns into structured workflows teams can actually follow.",
      },
      {
        title: "Quality and escalation checkpoints",
        description:
          "Create lightweight operating controls that reduce last-minute partner intervention.",
      },
    ],
    outcome:
      "Help the firm scale delivery capacity and margin with less heroics, more consistency, and stronger client confidence.",
    evidence: {
      confidence: "high",
      evidence:
        "The build direction maps directly to a common services-firm bottleneck and fits the current patchwork of spreadsheets, templates, and leadership oversight.",
      missingSignalPrompt:
        "Confirm whether the first paid use case should anchor on staffing visibility, delivery QA, or reusable engagement systems.",
    },
  },
  moat: {
    moatType: "Operational workflow moat",
    edge:
      "The product wins by packaging elite delivery habits into a usable firm operating system, not by acting like generic project management software.",
    edgeSource:
      "It sits at the intersection of delivery quality, staffing, and partner oversight where professional services firms feel compounding friction as they grow.",
    whyHardToCopy:
      "Horizontal PM tools help teams track work, but they rarely encode the commercial and quality-control logic that services firms need to scale expert delivery.",
    incumbentGap:
      "Existing systems manage tasks or resources, but they do not translate the firm's delivery standards into a practical operating cadence leaders can trust.",
    startupsToStudy: [
      { name: "Parallax", url: "https://www.getparallax.com" },
      { name: "Kantata", url: "https://www.kantata.com" },
      { name: "Productive", url: "https://productive.io" },
    ],
    evidence: {
      confidence: "medium",
      evidence:
        "The moat becomes more credible if the workflow meaningfully reduces partner intervention and improves delivery consistency across teams.",
      missingSignalPrompt:
        "Validate whether firms will adopt a new operating layer if they already have PM, PSA, or resource-planning tools in place.",
    },
  },
  competition: {
    summary:
      "Professional services firms already use project management, resource planning, and PSA tools, but many still depend on custom spreadsheets and senior oversight to maintain delivery quality.",
    directCompetitors: [
      {
        name: "Kantata",
        url: "https://www.kantata.com",
        doesWell: "Handles project operations and resource management for larger services organizations.",
        gap: "Can feel heavyweight and systems-oriented for firms mainly trying to standardize delivery quality and partner oversight.",
      },
      {
        name: "Productive",
        url: "https://productive.io",
        doesWell: "Combines agency operations, finance, and project management in one platform.",
        gap: "Still leaves many firms to define their own delivery standards and escalation logic.",
      },
      {
        name: "Parallax",
        url: "https://www.getparallax.com",
        doesWell: "Improves capacity and resource planning for services firms.",
        gap: "Does not fully own the quality-control and repeatable-delivery layer that senior leaders care about.",
      },
    ],
    exploitableGap:
      "Own the wedge where firms need delivery consistency and quality control more than another generic project tracker or finance-heavy PSA system.",
    evidence: {
      confidence: "medium",
      evidence:
        "There is room between task tools and enterprise PSA platforms, but the wedge depends on showing faster operational value than firms can get from internal process clean-up alone.",
      missingSignalPrompt:
        "Interview firms that already bought services software but still rely on partner intervention to keep delivery quality on track.",
    },
  },
  confidence: {
    level: "high",
    summary:
      "This sample draft is grounded in a common scaling problem for services firms, but it still needs buyer interviews to confirm which operational pain gets budgeted first.",
    missingSignals: [
      "Whether the first champion is the managing partner, COO, or delivery lead.",
      "Which workflow creates the fastest visible ROI after onboarding.",
      "How much firms want standardization versus flexibility across engagements.",
    ],
  },
  nextActions: [
    {
      title: "Interview 5 services leaders",
      description: "Map where delivery quality and margin break first as firms grow.",
      route: "/pmf-lab",
    },
    {
      title: "Write a scale-without-firefighting narrative",
      description: "Turn the pain into positioning that speaks to firm operators and partners.",
      route: "/waitlist",
    },
    {
      title: "Scope a services-ops MVP",
      description: "Start with delivery health, staffing risk, and one repeatable workflow system.",
      route: "/mvp-builder",
    },
  ],
};

const earlyStageStartupPrePmfDraft: IcpDraftDocument = {
  gatePreview: {
    personaName: "Early-stage startup (pre-PMF)",
    roleLine: "Founder-led startup still validating its first real customer.",
    painLine: "We keep talking to users and shipping changes, but we still do not know which customer is urgent enough to buy now.",
  },
  customer: {
    personaName: "Early-stage startup (pre-PMF)",
    roleLine:
      "Founder-led startup team of 1-6 people trying to identify the first customer segment with a painful enough problem to drive early traction.",
    metaLine:
      "Pre-seed or bootstrapped | Pre-PMF | Founder selling directly | Iterating on product and messaging weekly",
    summary:
      "This draft focuses on founders who already have a product direction or early prototype but are still unclear about which customer segment feels the problem most urgently. The buyer here is still the founder because the company is using the ICP to guide interviews, positioning, and the first real go-to-market wedge.",
    behaviors: [
      "Runs customer interviews, landing page tests, and product changes in parallel.",
      "Collects a lot of user feedback but struggles to separate curiosity from real buying intent.",
      "Shifts messaging and feature priorities frequently because evidence is still noisy.",
    ],
    motivations: [
      "Find the first segment that will actually commit time, money, or urgency instead of offering polite interest.",
      "Reduce wasted product cycles by building around one painful problem first.",
      "Create enough clarity to support sharper outreach, waitlist copy, and MVP scope decisions.",
    ],
    whereToFind: [
      "Founder communities",
      "Early customer interview channels",
      "Startup accelerators and incubators",
      "LinkedIn and niche operator groups",
      "Reddit and product-specific communities",
    ],
    triggerContext:
      "The pain shows up when a founder keeps hearing mixed feedback, sees weak conversion from broad messaging, or cannot tell which user segment is worth pursuing first.",
    actionTrigger:
      "They act when too many product and go-to-market decisions are blocked by a fuzzy picture of who the first real customer is.",
    evidence: {
      confidence: "high",
      evidence:
        "The ICP use case is tightly matched to a founder-stage workflow where better customer clarity immediately changes what gets built, tested, and said next.",
      missingSignalPrompt:
        "Validate whether the first wedge should anchor on one operator role, one problem moment, or one buying context before expanding the segment.",
    },
  },
  pain: {
    quote:
      "We keep learning interesting things from users, but we still do not know which customer has a painful enough problem to buy now instead of later.",
    rootCause:
      "The founder is collecting fragmented feedback from multiple user types without a disciplined way to separate urgency, frequency, and willingness to act.",
    whyItHurts:
      "Messaging stays broad, roadmap choices stay noisy, and the startup risks burning time building for people who like the idea but do not need it enough.",
    triggerMoment:
      "The pain spikes after weak waitlist conversion, low-energy customer interviews, or repeated product changes that still do not move traction.",
    costOfInaction:
      "The team keeps iterating without signal, spends too long exploring the wrong segment, and delays the moment when traction becomes testable.",
    evidence: {
      confidence: "high",
      evidence:
        "This is one of the most common and consequential pre-PMF founder pains because it affects positioning, product scope, distribution, and early revenue all at once.",
      missingSignalPrompt:
        "Pressure-test which user segment currently feels the problem often enough, painfully enough, and urgently enough to move first.",
    },
  },
  build: {
    valueProposition:
      "A founder-facing ICP and customer validation workspace that turns scattered user feedback into one focused first-customer decision.",
    replaces: [
      "messy interview notes",
      "broad audience guesses",
      "founder intuition-only segmentation",
    ],
    coreFeatures: [
      {
        title: "Segment synthesis workspace",
        description:
          "Organize interview patterns, user types, and problem signals into one comparable view.",
      },
      {
        title: "Urgency and evidence scoring",
        description:
          "Help the founder distinguish interesting feedback from high-priority buying pain.",
      },
      {
        title: "Action-ready ICP output",
        description:
          "Turn the selected wedge into messaging, validation tests, and immediate next steps for building and outreach.",
      },
    ],
    outcome:
      "Help the founder choose one sharper initial customer segment faster and make every next validation step more coherent.",
    evidence: {
      confidence: "high",
      evidence:
        "The product angle is aligned with a real founder workflow where better customer focus has immediate downstream value across discovery and execution.",
      missingSignalPrompt:
        "Confirm whether the first must-have behavior is interview synthesis, segment prioritization, or turning the decision into sharper messaging and tests.",
    },
  },
  moat: {
    moatType: "Workflow and context moat",
    edge:
      "The product wins by helping founders make a better first customer decision inside an already messy validation workflow, not by acting like a generic CRM or notes app.",
    edgeSource:
      "It sits close to founder interviews, segmentation decisions, and early positioning work where teams are highly motivated to get to clarity faster.",
    whyHardToCopy:
      "Founders do not just need storage for notes or broad AI summaries. They need a system that turns noisy evidence into an actionable ICP choice they can build and sell against.",
    incumbentGap:
      "Existing tools capture information, but they rarely structure early customer discovery around one concrete first-segment decision with execution consequences.",
    startupsToStudy: [
      { name: "Delve", url: "https://www.delvetool.com" },
      { name: "Dovetail", url: "https://dovetail.com" },
      { name: "June", url: "https://june.so" },
    ],
    evidence: {
      confidence: "medium",
      evidence:
        "The wedge is credible if founders feel the tool helps them move from ambiguity to one stronger customer decision faster than their current manual process.",
      missingSignalPrompt:
        "Validate whether founders will adopt a dedicated ICP decision workflow rather than relying on docs, spreadsheets, and advisor conversations.",
    },
  },
  competition: {
    summary:
      "Founders already use notes tools, research repositories, AI chats, and analytics products during discovery, but they still struggle to convert all that input into a single usable first-customer decision.",
    directCompetitors: [
      {
        name: "Dovetail",
        url: "https://dovetail.com",
        doesWell: "Stores and synthesizes user research effectively.",
        gap: "Skews toward research teams rather than founder-stage ICP decisions tied to immediate product and GTM choices.",
      },
      {
        name: "Notion",
        url: "https://www.notion.so",
        doesWell: "Acts as a flexible home for interview notes, ideas, and planning.",
        gap: "Requires founders to build their own decision process and does not tell them which segment should win.",
      },
      {
        name: "ChatGPT and generic AI tools",
        url: "https://chat.openai.com",
        doesWell: "Helps summarize and reason through messy information quickly.",
        gap: "Does not provide a structured, repeatable ICP workflow grounded in one evolving startup context.",
      },
    ],
    exploitableGap:
      "Own the gap between information capture and one usable first-customer decision that directly shapes what the founder tests next.",
    evidence: {
      confidence: "medium",
      evidence:
        "There is strong founder pain here, but the wedge depends on making the workflow concrete enough to beat a patchwork of flexible general-purpose tools.",
      missingSignalPrompt:
        "Interview founders who already collect customer feedback but still cannot choose a segment with confidence.",
    },
  },
  confidence: {
    level: "high",
    summary:
      "This sample draft is tightly aligned to a pre-PMF founder problem, but it still needs validation on how much structure founders want before they feel it beats their current ad hoc process.",
    missingSignals: [
      "Which founder stage feels this pain most urgently.",
      "What proof makes the winning segment feel credible enough to act on.",
      "How much automation versus guided judgment founders actually want.",
    ],
  },
  nextActions: [
    {
      title: "Interview 5 pre-PMF founders",
      description: "Map how they currently turn interviews into segment choices.",
      route: "/pmf-lab",
    },
    {
      title: "Write a first-customer clarity narrative",
      description: "Translate the pain into sharper founder-stage positioning.",
      route: "/waitlist",
    },
    {
      title: "Scope an ICP decision MVP",
      description: "Start with one segment comparison workflow and one action-ready output.",
      route: "/mvp-builder",
    },
  ],
};

export const SAMPLE_ICP_PREVIEW_SAMPLES: IcpSamplePreviewProfile[] = [
  {
    key: "revops_smb_saas",
    label: "RevOps-led SMB SaaS",
    draft: revOpsSmbSaasDraft,
  },
  {
    key: "d2c_ecommerce_brand",
    label: "D2C E-commerce Brand",
    draft: d2cEcommerceBrandDraft,
  },
  {
    key: "b2b_professional_services",
    label: "B2B Professional Services Firm",
    draft: b2bProfessionalServicesDraft,
  },
  {
    key: "early_stage_startup_pre_pmf",
    label: "Early-Stage Startup (Pre-PMF)",
    draft: earlyStageStartupPrePmfDraft,
  },
];

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
