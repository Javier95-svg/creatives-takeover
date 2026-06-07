import type { IcpDraftDocument } from "@/lib/icpBuilderSession";

export type IcpPreviewExplainerKey = "customer" | "pain" | "build" | "moat";

export interface IcpPreviewSectionExplainer {
  what: string;
  why: string;
  how: string;
}

export type IcpSampleProfileKey =
  | "ai_powered_personal_finance_coach"
  | "creator_analytics_growth_platform"
  | "sustainability_compliance_consulting"
  | "ai_voice_assistant_for_seniors";

export interface IcpSamplePreviewProfile {
  key: IcpSampleProfileKey;
  label: string;
  draft: IcpDraftDocument;
}

const aiPoweredPersonalFinanceCoachDraft: IcpDraftDocument = {
  gatePreview: {
    personaName: "Financially anxious millennial professional",
    roleLine: "Early-career knowledge worker trying to stay on top of cash flow, debt, and savings goals.",
    painLine:
      "I use three money apps and still do not know if I am actually improving or just reacting month to month.",
  },
  customer: {
    personaName: "Financially anxious millennial professional",
    roleLine:
      "Early-career salaried or freelance professional trying to manage variable expenses, debt payoff, and savings goals without feeling overwhelmed every payday.",
    metaLine:
      "US and UK | Ages 24-38 | $45k-$120k income | Uses 2-4 fintech tools already",
    summary:
      "This draft focuses on digitally comfortable young professionals who already care about their money but still struggle to translate budgeting, spending, and saving data into calm, confident decisions. They are not beginners to personal finance content. They are stuck between generic advice and the day-to-day reality of irregular expenses, rising costs, and inconsistent follow-through.",
    behaviors: [
      "Checks banking and budgeting apps multiple times a week after spending spikes or payday hits.",
      "Moves between spreadsheets, finance apps, and note-taking tools to keep goals, bills, and debt plans organized.",
      "Consumes personal finance content on TikTok, YouTube, Reddit, or newsletters but still struggles to apply it consistently.",
    ],
    motivations: [
      "Feel more in control of monthly money decisions without needing to become a finance expert.",
      "Make visible progress on debt, emergency savings, or investing instead of starting over every month.",
      "Replace guilt-driven money management with a realistic routine that adapts to real spending behavior.",
    ],
    whereToFind: [
      "Reddit personal finance communities",
      "Money-focused TikTok and YouTube creators",
      "Monarch, YNAB, and budgeting app communities",
      "Fintech newsletters and podcasts",
      "Career and productivity communities for young professionals",
    ],
    triggerContext:
      "The pain becomes urgent after an expensive month, a missed savings goal, rising debt stress, or a major life change like moving, freelancing, or starting to invest.",
    actionTrigger:
      "They act when they realize tracking alone is not changing behavior and they want proactive guidance instead of another static dashboard.",
    evidence: {
      confidence: "high",
      evidence:
        "The buyer is easy to picture, digitally reachable, and tied to a recurring emotional and financial workflow that already includes messy tool-switching behavior.",
      missingSignalPrompt:
        "Validate whether the first paid wedge is debt reduction, inconsistent cash-flow planning, or goal-based budgeting for young professionals with rising income.",
    },
  },
  pain: {
    quote:
      "I use three money apps and still do not know if I am actually improving or just reacting month to month.",
    rootCause:
      "Most finance tools track transactions well enough, but they do not turn messy real-life spending patterns into guidance that feels specific, timely, and realistic.",
    whyItHurts:
      "The user keeps feeling behind, second-guesses everyday spending, and loses confidence because financial progress depends on willpower rather than a system that adapts to their habits.",
    triggerMoment:
      "The pain spikes after payday, after a category overspend, when bills cluster unexpectedly, or when a financial goal slips for the second or third month in a row.",
    costOfInaction:
      "They stay trapped in reactive budgeting, delay savings and investing goals, and keep bouncing between advice sources without building a durable money routine.",
    evidence: {
      confidence: "high",
      evidence:
        "The pain is frequent, emotional, and measurable. It directly affects trust in the product category and creates room for a more action-oriented wedge.",
      missingSignalPrompt:
        "Pressure-test whether buyers care most about reducing anxiety, improving consistency, or accelerating progress toward one visible financial milestone.",
    },
  },
  build: {
    valueProposition:
      "An AI money coach that turns spending behavior, upcoming obligations, and financial goals into proactive weekly guidance a busy professional can actually follow.",
    replaces: [
      "passive budgeting dashboards",
      "manual spreadsheet planning",
      "generic personal finance content consumption",
    ],
    coreFeatures: [
      {
        title: "Behavior-aware weekly money plan",
        description:
          "Translate spending patterns, bills, and goals into one clear plan for the next seven days instead of another monthly snapshot.",
      },
      {
        title: "Personalized coaching nudges",
        description:
          "Give users context-sensitive prompts around overspending, savings pacing, and tradeoffs before they drift off plan.",
      },
      {
        title: "Goal and cash-flow scenario guidance",
        description:
          "Help users understand how short-term choices affect debt payoff, emergency savings, and investing progress.",
      },
    ],
    outcome:
      "Help users feel more confident, more consistent, and less reactive about money within the first two to four weeks of use.",
    evidence: {
      confidence: "high",
      evidence:
        "The build direction fits the buyer's current workaround stack and points toward a more coach-like product rather than another passive fintech dashboard.",
      missingSignalPrompt:
        "Confirm whether the first paid habit loop should center on weekly planning, savings goals, or debt-payoff coaching.",
    },
  },
  moat: {
    moatType: "Behavior and trust moat",
    edge:
      "The product wins by building a trusted coaching relationship around everyday money behavior, not by trying to out-report every budgeting app in the market.",
    edgeSource:
      "It sits inside a recurring emotional workflow where users already want more timely, personalized guidance than existing tools provide.",
    whyHardToCopy:
      "Most incumbents either focus on transaction tracking or generic education. This wedge depends on turning individual behavior patterns into helpful guidance users trust enough to revisit weekly.",
    incumbentGap:
      "Existing tools show where money went, but they rarely coach the user through what to do next in a way that feels personal and realistic.",
    startupsToStudy: [
      { name: "Monarch Money", url: "https://www.monarchmoney.com" },
      { name: "YNAB", url: "https://www.ynab.com" },
      { name: "Rocket Money", url: "https://www.rocketmoney.com" },
    ],
    evidence: {
      confidence: "medium",
      evidence:
        "The moat becomes stronger if the product creates a repeat guidance habit and improves financial confidence faster than static finance tools do.",
      missingSignalPrompt:
        "Validate whether users will trust AI-generated financial suggestions enough to change behavior without needing a human advisor layer.",
    },
  },
  competition: {
    summary:
      "Consumers already use budgeting apps, banking tools, and finance content, but many still feel unsupported when trying to make better money decisions in the moment.",
    directCompetitors: [
      {
        name: "Monarch Money",
        url: "https://www.monarchmoney.com",
        doesWell: "Provides a polished consolidated money dashboard for budgeting and planning.",
        gap: "Still leans more toward visibility than ongoing coaching tailored to daily behavior shifts.",
      },
      {
        name: "YNAB",
        url: "https://www.ynab.com",
        doesWell: "Creates strong budgeting discipline for users willing to commit to a method.",
        gap: "Can feel rigid or effort-heavy for users who want adaptive guidance rather than a system they must actively maintain.",
      },
      {
        name: "Rocket Money",
        url: "https://www.rocketmoney.com",
        doesWell: "Solves obvious consumer pain around subscriptions and spending awareness.",
        gap: "Does not fully own the coach-like decision layer around long-term money behavior and goal tradeoffs.",
      },
    ],
    exploitableGap:
      "Own the middle ground between transaction visibility and human financial advising by giving young professionals a product that feels proactive, personal, and easy to revisit every week.",
    evidence: {
      confidence: "medium",
      evidence:
        "There is a visible gap between tracking and coaching, but the wedge depends on building trust and behavioral utility fast enough to justify paid retention.",
      missingSignalPrompt:
        "Interview users who already tried budgeting tools but still feel anxious or inconsistent to understand what guidance they wish existed.",
    },
  },
  confidence: {
    level: "high",
    summary:
      "This sample draft has strong consumer pain, a reachable user segment, and a differentiated product angle. It still needs validation on which guidance loop creates willingness to pay fastest.",
    missingSignals: [
      "Which money milestone drives the strongest initial conversion to paid.",
      "How much automation users want before they feel loss of control.",
      "Whether the first loyal segment is salaried professionals, freelancers, or users actively paying down debt.",
    ],
  },
  nextActions: [
    {
      title: "Interview 5 finance-tool switchers",
      description: "Map where budgeting tools stop helping and money anxiety stays high.",
      route: "/pmf-lab",
    },
    {
      title: "Write the coaching-led narrative",
      description: "Turn the pain into sharper messaging around guidance, confidence, and consistency.",
      route: "/demo-studio",
    },
    {
      title: "Scope a weekly coaching MVP",
      description: "Reduce the build to one behavior-aware weekly plan plus one guidance loop.",
      route: "/mvp-builder",
    },
  ],
};

const creatorAnalyticsGrowthPlatformDraft: IcpDraftDocument = {
  gatePreview: {
    personaName: "Multi-platform creator nearing full-time income",
    roleLine: "Independent creator trying to turn content momentum into repeatable growth and revenue.",
    painLine:
      "My metrics are everywhere, and I still cannot tell which content decisions actually grow audience and income.",
  },
  customer: {
    personaName: "Multi-platform creator nearing full-time income",
    roleLine:
      "Independent creator or small creator team monetizing across YouTube, TikTok, Instagram, or newsletters and trying to make content decisions with more confidence.",
    metaLine:
      "50k-500k combined followers | Solo creator or 2-4 person team | Ads, sponsorships, courses, or memberships | Creator-led business",
    summary:
      "This draft focuses on creators who already have audience momentum and some monetization, but still struggle to understand which content patterns, posting rhythms, and audience segments actually drive durable growth and business results. The target buyer is no longer experimenting casually. They are trying to run a media business with tools that still feel fragmented and reactive.",
    behaviors: [
      "Checks platform analytics daily and screenshots metrics because each channel tells a partial story.",
      "Reviews hooks, thumbnails, retention curves, and audience feedback manually before planning the next publishing cycle.",
      "Balances brand deals, launches, and content output while still relying on intuition for most growth decisions.",
    ],
    motivations: [
      "Make clearer decisions about what to publish, where to focus, and what formats actually compound audience growth.",
      "Reduce burnout by replacing endless experimentation with a more trustworthy planning system.",
      "Connect content performance to business outcomes like subscribers, sponsorship leverage, and product sales.",
    ],
    whereToFind: [
      "Creator economy newsletters and podcasts",
      "YouTube, TikTok, and Instagram creator communities",
      "Discord and Slack groups for full-time creators",
      "Creator education programs and mastermind groups",
      "Tools ecosystems around beehiiv, Kajabi, ConvertKit, and Notion",
    ],
    triggerContext:
      "The pain becomes urgent when growth plateaus, a creator hires help, or revenue starts depending on more deliberate cross-platform planning.",
    actionTrigger:
      "They act when they realize the next stage of growth cannot rely on gut feel alone and existing analytics still do not tell them what to do next.",
    evidence: {
      confidence: "high",
      evidence:
        "The buyer has visible pain, a digital-native workflow, and clear willingness to invest in tools that improve content leverage and business predictability.",
      missingSignalPrompt:
        "Validate whether the first paid wedge is for education creators, business creators, or entertainment creators with more frequent publishing cycles.",
    },
  },
  pain: {
    quote:
      "My metrics are everywhere, and I still cannot tell which content decisions actually grow audience and income.",
    rootCause:
      "Creators have access to huge amounts of platform data, but almost none of it translates directly into confident decisions across multiple channels and revenue streams.",
    whyItHurts:
      "They keep overanalyzing past performance, second-guessing content strategy, and spending creative energy on trial-and-error instead of compounding what works.",
    triggerMoment:
      "The pain spikes after a launch underperforms, a creator hires an editor or strategist, or one platform changes enough that the old playbook stops working.",
    costOfInaction:
      "Growth stays inconsistent, burnout increases, and monetization opportunities get left on the table because planning never feels fully informed.",
    evidence: {
      confidence: "high",
      evidence:
        "This is a recurring operational pain with strong emotional and commercial consequences for creators treating content like a real business.",
      missingSignalPrompt:
        "Pressure-test whether buyers care most about audience growth, monetization insight, or content-planning clarity as the first job to solve.",
    },
  },
  build: {
    valueProposition:
      "A creator growth operating layer that turns fragmented cross-platform analytics into clear next-content and next-revenue decisions.",
    replaces: [
      "native platform dashboards",
      "manual content postmortems",
      "spreadsheet planning across channels",
    ],
    coreFeatures: [
      {
        title: "Cross-platform growth view",
        description:
          "Combine audience, retention, and conversion signals across channels so creators can see what patterns travel and what does not.",
      },
      {
        title: "Content pattern recommendations",
        description:
          "Surface which hooks, topics, formats, and posting rhythms are most likely to drive the next round of growth.",
      },
      {
        title: "Monetization impact tracking",
        description:
          "Connect content performance to sponsorship outcomes, product sales, or subscriber growth instead of vanity metrics alone.",
      },
    ],
    outcome:
      "Help creators make faster, calmer, higher-confidence decisions about what to publish and how to grow revenue without burning out.",
    evidence: {
      confidence: "high",
      evidence:
        "The build direction maps tightly to the creator's current data sprawl and points toward a more actionable decision layer than platform-native analytics provide.",
      missingSignalPrompt:
        "Confirm whether the first habit loop should center on weekly planning, content diagnosis, or monetization optimization.",
    },
  },
  moat: {
    moatType: "Workflow and intelligence moat",
    edge:
      "The product wins by becoming the creator's planning and growth interpretation layer, not by trying to replace every native analytics surface.",
    edgeSource:
      "It sits inside a high-frequency workflow where creators already spend time reviewing performance, planning content, and tying output back to business goals.",
    whyHardToCopy:
      "Platform analytics are channel-specific, and generic dashboards rarely speak the language of creator decisions. The moat comes from translating scattered signals into creator-native recommendations.",
    incumbentGap:
      "Most tools either report metrics or manage links and monetization, but they do not fully connect cross-platform performance to a creator's next strategic move.",
    startupsToStudy: [
      { name: "vidIQ", url: "https://vidiq.com" },
      { name: "TubeBuddy", url: "https://www.tubebuddy.com" },
      { name: "HypeAuditor", url: "https://hypeauditor.com" },
    ],
    evidence: {
      confidence: "medium",
      evidence:
        "The moat becomes more credible if the product consistently helps creators plan better content and monetize more effectively than native analytics alone.",
      missingSignalPrompt:
        "Validate whether creators will trust recommendations enough to change publishing behavior rather than just consume more analytics.",
    },
  },
  competition: {
    summary:
      "Creators already use platform analytics, creator education, and niche optimization tools, but they still stitch strategy together manually when planning what to do next.",
    directCompetitors: [
      {
        name: "vidIQ",
        url: "https://vidiq.com",
        doesWell: "Offers strong YouTube-oriented optimization and idea support.",
        gap: "Skews platform-specific and does not fully own cross-platform business planning for diversified creators.",
      },
      {
        name: "TubeBuddy",
        url: "https://www.tubebuddy.com",
        doesWell: "Helps creators improve YouTube workflows and channel optimization.",
        gap: "Feels more tactical than strategic for creators running a broader content business.",
      },
      {
        name: "HypeAuditor",
        url: "https://hypeauditor.com",
        doesWell: "Provides strong analytics around audiences and influencer marketing data.",
        gap: "Leans more toward brand and campaign analysis than creator-side planning and growth decisions.",
      },
    ],
    exploitableGap:
      "Own the segment of serious creators who need a business-minded growth decision layer across channels instead of another analytics tab for one platform.",
    evidence: {
      confidence: "medium",
      evidence:
        "There is room between platform analytics and generic creator tooling, but the wedge depends on making the insights prescriptive enough to influence actual publishing behavior.",
      missingSignalPrompt:
        "Interview creators who already use analytics tools but still rely on instinct for cross-platform strategy and monetization planning.",
    },
  },
  confidence: {
    level: "high",
    summary:
      "This sample draft has a clear operator, frequent workflow pain, and a believable product angle. It still needs validation on which creator segment will pay first for decision support rather than more analytics.",
    missingSignals: [
      "Which creator business model creates the highest urgency for this workflow.",
      "Whether the first champion is the creator, an operator, or a strategist working with them.",
      "What form of recommendation feels actionable without over-automating creative judgment.",
    ],
  },
  nextActions: [
    {
      title: "Interview 5 growth-stage creators",
      description: "Map how they currently turn fragmented analytics into publishing decisions.",
      route: "/pmf-lab",
    },
    {
      title: "Write the creator growth narrative",
      description: "Turn the pain into sharper messaging around clarity, leverage, and calmer decision-making.",
      route: "/demo-studio",
    },
    {
      title: "Scope a creator planning MVP",
      description: "Start with one cross-platform growth view plus one recommendation loop.",
      route: "/mvp-builder",
    },
  ],
};

const sustainabilityComplianceConsultingDraft: IcpDraftDocument = {
  gatePreview: {
    personaName: "Mid-market operations lead facing sustainability disclosure pressure",
    roleLine: "Operator at a manufacturing or supply-chain business now being asked for ESG and compliance answers it cannot produce easily.",
    painLine:
      "Big customers keep asking for sustainability documentation, and we are still chasing spreadsheets and suppliers to answer them.",
  },
  customer: {
    personaName: "Mid-market operations lead facing sustainability disclosure pressure",
    roleLine:
      "Operations, compliance, or sustainability lead at a mid-market manufacturer, distributor, or supplier trying to respond to growing ESG and disclosure pressure without building an internal specialist team overnight.",
    metaLine:
      "50-500 employees | B2B industrial or supply-chain business | Enterprise customers | Limited in-house sustainability expertise",
    summary:
      "This draft focuses on mid-market companies that are not climate-tech natives and did not build for sustainability reporting first, but now face increasing pressure from enterprise buyers, procurement teams, regulators, and board stakeholders. The buyer feels the pain operationally because requests keep arriving, data is scattered, and the business risks looking unprepared in high-stakes commercial conversations.",
    behaviors: [
      "Pulls data manually from finance, procurement, facilities, and supplier teams whenever a major customer sends a new request.",
      "Uses spreadsheets, shared drives, and consultant decks as the default system for sustainability and compliance responses.",
      "Balances reporting demands with day-to-day operations because no dedicated in-house team fully owns the workflow.",
    ],
    motivations: [
      "Reduce commercial risk by answering customer and regulator requests with more confidence and less scramble.",
      "Build a repeatable reporting process before disclosure pressure becomes a larger operational burden.",
      "Protect reputation with enterprise buyers while avoiding a full-time headcount commitment too early.",
    ],
    whereToFind: [
      "Manufacturing and operations leadership associations",
      "Procurement and supply-chain communities",
      "LinkedIn sustainability and compliance leaders",
      "Industry conferences focused on ESG and regulation",
      "Consulting and software ecosystems around disclosure and procurement workflows",
    ],
    triggerContext:
      "The pain becomes urgent when a major customer requests supplier disclosures, new regulations approach, or leadership realizes ESG reporting is no longer optional for winning and retaining business.",
    actionTrigger:
      "They act when manual reporting work starts threatening customer confidence, sales cycles, or internal credibility.",
    evidence: {
      confidence: "high",
      evidence:
        "The buyer owns a painful commercial workflow with clear downside across enterprise relationships, audit readiness, and operational overhead.",
      missingSignalPrompt:
        "Validate whether the first sharpest wedge is manufacturing suppliers, food and packaging businesses, or industrial firms selling into enterprise procurement chains.",
    },
  },
  pain: {
    quote:
      "Big customers keep asking for sustainability documentation, and we are still chasing spreadsheets and suppliers to answer them.",
    rootCause:
      "Most mid-market operators do not have one owned system for collecting sustainability data, interpreting requirements, and packaging credible responses for buyers or auditors.",
    whyItHurts:
      "The team scrambles repeatedly, senior operators get dragged into low-leverage reporting work, and the business risks slowing deals or looking non-compliant when stakes are rising.",
    triggerMoment:
      "The pain spikes during procurement reviews, annual reporting cycles, customer renewals, or after a board conversation about regulatory readiness.",
    costOfInaction:
      "The company keeps spending expensive internal time on manual compliance work, risks losing enterprise opportunities, and delays building a scalable response process until pressure becomes worse.",
    evidence: {
      confidence: "high",
      evidence:
        "This pain is recurring, commercially relevant, and increasingly urgent in sectors exposed to supplier scrutiny and sustainability reporting pressure.",
      missingSignalPrompt:
        "Pressure-test whether urgency is driven more by customer procurement, regulation, or board-level risk visibility in the first wedge market.",
    },
  },
  build: {
    valueProposition:
      "A sustainability compliance consulting offer that helps mid-market operators build a repeatable disclosure workflow, close reporting gaps, and respond to customer pressure without chaos.",
    replaces: [
      "ad hoc consultant decks",
      "manual ESG spreadsheet chasing",
      "reactive customer-request fire drills",
    ],
    coreFeatures: [
      {
        title: "Disclosure readiness assessment",
        description:
          "Map current reporting gaps, data sources, and commercial risk exposure across sustainability and compliance requests.",
      },
      {
        title: "Operational reporting playbook",
        description:
          "Turn a scattered response process into a repeatable system for gathering data, coordinating owners, and packaging answers.",
      },
      {
        title: "Priority roadmap for customer and regulatory requirements",
        description:
          "Help teams decide what to fix first so they can satisfy external pressure without overbuilding an internal ESG function too soon.",
      },
    ],
    outcome:
      "Help the operator respond faster, look more credible with buyers, and reduce the internal scramble around sustainability requests.",
    evidence: {
      confidence: "high",
      evidence:
        "The recommended offer aligns with a consulting-led wedge where the buyer needs structure, expertise, and implementation help before they are ready to buy software alone.",
      missingSignalPrompt:
        "Confirm whether the first paid offer should anchor on assessment, roadmap delivery, or ongoing compliance support.",
    },
  },
  moat: {
    moatType: "Expertise and workflow moat",
    edge:
      "The offer wins by combining domain interpretation with practical operational setup, not by acting like generic ESG strategy consulting or software resale.",
    edgeSource:
      "It sits close to the exact reporting and buyer-pressure moments where operators need both clarity and implementation help quickly.",
    whyHardToCopy:
      "Large consultancies are expensive and broad, while software tools assume more process maturity than many mid-market teams actually have. This wedge owns the in-between stage.",
    incumbentGap:
      "Existing options either overwhelm teams with strategy or hand them tooling before the workflow and ownership model are ready.",
    startupsToStudy: [
      { name: "Anthesis", url: "https://www.anthesisgroup.com" },
      { name: "ERM", url: "https://www.erm.com" },
      { name: "Watershed", url: "https://watershed.com" },
    ],
    evidence: {
      confidence: "medium",
      evidence:
        "The moat is strongest if the consulting workflow becomes repeatable enough to feel specialized and practical for one pressured operator segment.",
      missingSignalPrompt:
        "Validate whether buyers prefer a consulting-first relationship or want software paired with advisory support from the start.",
    },
  },
  competition: {
    summary:
      "Buyers already see big-name consultancies, disclosure platforms, and scattered internal process workarounds, but many still lack a practical path from pressure to operational readiness.",
    directCompetitors: [
      {
        name: "Anthesis",
        url: "https://www.anthesisgroup.com",
        doesWell: "Offers broad sustainability strategy and advisory support for larger organizations.",
        gap: "Can feel heavier and more strategic than what a mid-market operator needs to solve near-term reporting pressure.",
      },
      {
        name: "ERM",
        url: "https://www.erm.com",
        doesWell: "Provides deep environmental and regulatory consulting expertise.",
        gap: "Often better suited to larger enterprises than lean operators trying to build a first repeatable compliance workflow.",
      },
      {
        name: "Watershed",
        url: "https://watershed.com",
        doesWell: "Offers strong software-led reporting and emissions management infrastructure.",
        gap: "Assumes more internal process maturity than many mid-market businesses have when pressure first appears.",
      },
    ],
    exploitableGap:
      "Own the segment where mid-market operators need practical sustainability readiness support before heavyweight consulting or software-only solutions feel right.",
    evidence: {
      confidence: "medium",
      evidence:
        "There is a clear services wedge between enterprise-grade sustainability programs and in-house spreadsheet chaos, but positioning and segment focus will matter heavily.",
      missingSignalPrompt:
        "Interview operators who recently faced customer disclosure requests and still lacked a reliable response workflow.",
    },
  },
  confidence: {
    level: "high",
    summary:
      "This sample draft has real commercial urgency and a believable consulting wedge. It still needs validation on which segment feels both enough pressure and enough budget to buy quickly.",
    missingSignals: [
      "Which industries feel the sharpest customer-driven urgency first.",
      "Whether the first champion is operations, procurement, finance, or a newly assigned sustainability owner.",
      "How much of the early offer should be advisory versus implementation support.",
    ],
  },
  nextActions: [
    {
      title: "Interview 5 pressured operators",
      description: "Map the exact disclosure requests and internal scramble they face today.",
      route: "/pmf-lab",
    },
    {
      title: "Write the readiness narrative",
      description: "Turn the pain into positioning around customer pressure, credibility, and response speed.",
      route: "/demo-studio",
    },
    {
      title: "Scope the consulting wedge",
      description: "Start with one readiness assessment plus one repeatable reporting workflow offer.",
      route: "/mvp-builder",
    },
  ],
};

const aiVoiceAssistantForSeniorsDraft: IcpDraftDocument = {
  gatePreview: {
    personaName: "Remote family caregiver for an aging parent",
    roleLine: "Adult child coordinating reminders, check-ins, and peace of mind from another home or city.",
    painLine:
      "I cannot be there all day, but I still need to know my parent is okay and remembering the important things.",
  },
  customer: {
    personaName: "Remote family caregiver for an aging parent",
    roleLine:
      "Adult child or primary family caregiver supporting an older parent who still lives independently but increasingly needs reminders, check-ins, and low-friction daily support.",
    metaLine:
      "Ages 35-60 | Coordinating care from another home or city | Balancing work, family, and elder care | Household decision-maker",
    summary:
      "This draft focuses on family caregivers who are not looking for a full medical device or assisted-living transition yet. They need a simpler, more reassuring way to help an aging parent remember medications, stay connected, and get help when needed without adding another complicated app or device to the household. The emotional urgency is high because the buyer is balancing love, worry, guilt, and logistics at the same time.",
    behaviors: [
      "Sets manual phone reminders, sticky notes, or repeated check-in calls because support still depends on the caregiver remembering everything.",
      "Researches aging-in-place tools, voice assistants, and caregiver communities late at night while juggling work and family obligations.",
      "Tests low-friction tech options carefully because the older parent may resist anything that feels confusing or infantilizing.",
    ],
    motivations: [
      "Create more peace of mind without needing to call or monitor the parent constantly throughout the day.",
      "Support independence longer while reducing the risk of missed routines, isolation, or preventable emergencies.",
      "Choose a solution the older parent can actually use without a long training curve.",
    ],
    whereToFind: [
      "Caregiver Facebook groups and forums",
      "AARP and aging-in-place communities",
      "Hospital discharge and senior support resource networks",
      "Adult caregiver newsletters and podcasts",
      "Search-driven channels around dementia, elder care, and medication reminders",
    ],
    triggerContext:
      "The pain becomes urgent after a missed medication, a scare at home, a hospital discharge, or the realization that current check-in routines are no longer enough.",
    actionTrigger:
      "They act when the caregiver needs more reassurance and structure but still wants to preserve the older parent's dignity and independence.",
    evidence: {
      confidence: "high",
      evidence:
        "The buyer feels clear emotional and operational pain, has strong motivation to act, and is already piecing together imperfect workarounds to reduce care friction.",
      missingSignalPrompt:
        "Validate whether the first wedge is medication support, social check-ins, or general daily routine assistance for aging-in-place households.",
    },
  },
  pain: {
    quote:
      "I cannot be there all day, but I still need to know my parent is okay and remembering the important things.",
    rootCause:
      "Caregiving support is fragmented across calls, reminders, family coordination, and generic consumer devices that were not designed around older adult usability and caregiver reassurance together.",
    whyItHurts:
      "The caregiver carries constant low-grade stress, the parent may miss key routines, and every small incident makes the family question whether independent living is still sustainable.",
    triggerMoment:
      "The pain spikes after a missed medication, a forgotten appointment, a fall scare, or a week where the caregiver realizes the current support routine is becoming unmanageable.",
    costOfInaction:
      "Stress increases for both caregiver and parent, minor risks compound, and the family may move toward more expensive or premature care decisions because daily support feels unreliable.",
    evidence: {
      confidence: "high",
      evidence:
        "This is a repeated, emotionally charged pain with a clear buyer and a strong willingness to look for simpler, more supportive tools.",
      missingSignalPrompt:
        "Pressure-test whether the first purchase driver is reassurance for the caregiver, usability for the senior, or prevention of missed daily routines.",
    },
  },
  build: {
    valueProposition:
      "A senior-friendly AI voice assistant that helps aging adults remember routines, stay connected, and give family caregivers more peace of mind without adding complexity.",
    replaces: [
      "manual reminder systems",
      "constant caregiver check-in calls",
      "generic smart speaker setups that still need heavy customization",
    ],
    coreFeatures: [
      {
        title: "Simple voice-based reminders and routines",
        description:
          "Guide medication, appointments, hydration, and daily check-ins through a senior-friendly conversational interface.",
      },
      {
        title: "Caregiver reassurance loop",
        description:
          "Provide lightweight confirmations, missed-routine alerts, or summaries so family members know when extra follow-up is needed.",
      },
      {
        title: "Connection and support prompts",
        description:
          "Use voice interactions to reduce isolation, encourage engagement, and make help feel easy to access.",
      },
    ],
    outcome:
      "Help families support independent living longer with less stress, fewer missed routines, and more confidence in the daily care experience.",
    evidence: {
      confidence: "high",
      evidence:
        "The product direction matches the emotional and operational reality of family caregiving and points toward a more senior-native workflow than generic assistants usually provide.",
      missingSignalPrompt:
        "Confirm whether the first must-have value is reminders, caregiver visibility, or low-friction companionship and engagement.",
    },
  },
  moat: {
    moatType: "Trust and workflow moat",
    edge:
      "The product wins by serving both the older adult's usability needs and the caregiver's reassurance needs in one workflow, not by acting like a generic household assistant.",
    edgeSource:
      "It sits inside a repeated care-support routine where trust, simplicity, and family peace of mind matter more than feature breadth.",
    whyHardToCopy:
      "General voice assistants are broad but not designed around elder-care moments, while healthcare products often feel clinical or complex. This wedge needs empathy, simplicity, and dependable caregiver value together.",
    incumbentGap:
      "Most alternatives either optimize for the senior user alone or for monitoring-heavy care tools, leaving a gap for supportive, low-friction day-to-day assistance.",
    startupsToStudy: [
      { name: "ElliQ", url: "https://elliq.com" },
      { name: "CarePredict", url: "https://www.carepredict.com" },
      { name: "Amazon Alexa", url: "https://www.amazon.com/alexa" },
    ],
    evidence: {
      confidence: "medium",
      evidence:
        "The moat becomes stronger if the product creates trust on both sides of the relationship and fits naturally into daily care routines without feeling intrusive.",
      missingSignalPrompt:
        "Validate whether families want supportive voice workflows first or whether they expect more monitoring and healthcare integration from day one.",
    },
  },
  competition: {
    summary:
      "Families already use smart speakers, reminder apps, and caregiver coordination workarounds, but they still struggle to create a senior-friendly daily support system that feels reassuring and easy to maintain.",
    directCompetitors: [
      {
        name: "ElliQ",
        url: "https://elliq.com",
        doesWell: "Focuses directly on older adults with a companionship and engagement angle.",
        gap: "May not fully own the caregiver reassurance and daily routine coordination wedge for broader family support.",
      },
      {
        name: "Amazon Alexa",
        url: "https://www.amazon.com/alexa",
        doesWell: "Provides familiar voice infrastructure and broad consumer adoption.",
        gap: "Requires customization and does not fully package an elder-care-native workflow for families under stress.",
      },
      {
        name: "CarePredict",
        url: "https://www.carepredict.com",
        doesWell: "Offers stronger monitoring and care visibility for senior support environments.",
        gap: "Can feel more monitoring-heavy than what families want when they are still trying to preserve independence at home.",
      },
    ],
    exploitableGap:
      "Own the segment of families who want supportive, low-friction daily assistance for aging in place before they are ready for more clinical or monitoring-heavy solutions.",
    evidence: {
      confidence: "medium",
      evidence:
        "The gap is credible if the product feels materially easier and more reassuring than generic assistants while staying less intimidating than formal care technology.",
      missingSignalPrompt:
        "Interview families who tried reminders, smart speakers, or caregiver apps but still feel daily support is too manual and fragile.",
    },
  },
  confidence: {
    level: "high",
    summary:
      "This sample draft has a strong emotional trigger, a clear buyer, and a believable wedge around aging-in-place support. It still needs validation on the first value promise families are willing to pay for quickly.",
    missingSignals: [
      "Which care scenario creates the fastest purchase urgency.",
      "How much caregiver visibility feels reassuring without feeling invasive.",
      "Whether the first buyer is the adult child, spouse, or care coordinator in the household.",
    ],
  },
  nextActions: [
    {
      title: "Interview 5 family caregivers",
      description: "Map the exact daily routines and scares that make support feel too manual today.",
      route: "/pmf-lab",
    },
    {
      title: "Write the reassurance-led narrative",
      description: "Translate the pain into positioning around peace of mind, independence, and usability.",
      route: "/demo-studio",
    },
    {
      title: "Scope a voice-support MVP",
      description: "Start with reminders, one caregiver reassurance loop, and one connection workflow.",
      route: "/mvp-builder",
    },
  ],
};

export const SAMPLE_ICP_PREVIEW_SAMPLES: IcpSamplePreviewProfile[] = [
  {
    key: "ai_powered_personal_finance_coach",
    label: "AI-Powered Personal Finance Coach",
    draft: aiPoweredPersonalFinanceCoachDraft,
  },
  {
    key: "creator_analytics_growth_platform",
    label: "Creator Analytics & Growth Platform",
    draft: creatorAnalyticsGrowthPlatformDraft,
  },
  {
    key: "sustainability_compliance_consulting",
    label: "Sustainability Compliance Consulting",
    draft: sustainabilityComplianceConsultingDraft,
  },
  {
    key: "ai_voice_assistant_for_seniors",
    label: "AI Voice Assistant for Seniors",
    draft: aiVoiceAssistantForSeniorsDraft,
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
