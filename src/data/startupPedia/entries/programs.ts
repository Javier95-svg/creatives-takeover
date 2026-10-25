import type { PediaEntry } from "../types.ts";

export const programEntries: PediaEntry[] = [
  {
    slug: "how-accelerators-measure-startup-progress",
    kind: "guide",
    topic: "programs",
    audiences: ["program", "mentor", "investor"],
    title: "How Accelerators Measure Startup Progress (Beyond Attendance)",
    metaTitle: "How Accelerators Measure Startup Progress Beyond Attendance",
    metaDescription:
      "Measure startup progress in an accelerator or incubator by evidence, not attendance: the leading indicators to track, how to collect them and what to report.",
    aliases: ["accelerator kpis", "accelerator program metrics", "measure accelerator impact", "cohort progress", "incubator metrics"],
    answer:
      "Accelerators measure real startup progress by tracking evidence of work, not attendance: how many target customers each team has talked to, which experiments they ran and what they learned, and what decision they made as a result. Revenue and funding are lagging results; these leading indicators show progress weeks earlier.",
    sections: [
      {
        id: "why-attendance-fails",
        heading: "Why attendance and self-reports are not enough",
        body: "Workshop attendance, mentor-session counts and weekly forms that ask \"how is it going?\" are easy to collect, but they measure participation, not progress. A team can attend everything and still not have spoken to a single customer. Self-reported updates also drift towards optimism, which makes struggling teams hard to spot until demo day.\n\nFunders and university sponsors increasingly ask what founders achieved, not how many sessions ran. That needs evidence the program can point to.",
      },
      {
        id: "leading-indicators",
        heading: "Leading indicators worth tracking",
        body: "For early-stage teams, a small set of indicators tells you most of what you need:\n\n- **Customer conversations:** the number of [discovery interviews](/startup-pedia/customer-interview-questions) with people who match the team's [ideal customer profile](/startup-pedia/ideal-customer-profile), not friends or other founders.\n- **Experiments run:** a landing page, a pilot offer, a pricing test, each with a stated hypothesis and a result.\n- **Decisions made:** build, narrow, change direction or stop, backed by the evidence above.\n- **Stage reached:** for example idea, validated problem, first version, first paying customers.\n- **Check-in consistency:** whether the team reports every week. Teams that go quiet are usually the ones that need help.\n\nPick indicators that fit your cohort's stage. A pre-revenue cohort should not be judged on [MRR](/startup-pedia/mrr-and-arr).",
      },
      {
        id: "lagging-indicators",
        heading: "Lagging indicators, and why they come later",
        body: "Revenue, users, retention, funding raised and jobs created are the outcomes funders care about most, but most of them appear months or years after a program ends. Report them through alumni follow-ups, and use the leading indicators to show progress during the program itself. See [startup funding stages](/startup-pedia/startup-funding-stages) for how outcomes typically unfold.",
      },
      {
        id: "collecting",
        heading: "How to collect it without burdening founders",
        body: "- **Keep the weekly update short.** Two or three minutes: conversations held, experiment status, the decision or blocker.\n- **Prefer data from the work itself** over forms filled in after the fact, for example interviews logged in the same place the team plans them.\n- **Agree definitions at kickoff,** such as what counts as a customer conversation, so numbers are comparable between teams.\n- **Respect founders' privacy.** Staff usually need progress, not the content of every interview. Make clear what the program sees.",
      },
      {
        id: "example",
        heading: "Example",
        body: "A university incubator with eight teams tracks three numbers each week: target-customer conversations, experiments with a result, and the team's current decision. After four weeks, two teams have held no customer conversations at all despite full attendance. The program manager moves mentor time to those two teams. By week eight, one has narrowed its customer and run its first paid pilot. The final report shows each team's evidence and next step, which the sponsor can read without attending a single session.",
      },
      {
        id: "mistakes",
        heading: "Common mistakes",
        body: "- Tracking too many metrics, so founders spend more time reporting than working.\n- Comparing teams at different stages on the same number.\n- Measuring only at demo day, when it is too late to help.\n- Treating funding raised as the main success measure for a pre-seed cohort.",
      },
    ],
    roleNotes: {
      program: "Three to five shared indicators, collected weekly, are enough to see which teams need help and to write a credible report for your funder.",
      mentor: "Ask for the last week's conversations and the decision they led to. It keeps mentoring sessions anchored in evidence.",
      investor: "Programs that track customer evidence give you a better read on a team than a demo-day pitch.",
    },
    faqs: [
      {
        question: "What KPIs should an accelerator track for every founder?",
        answer: "Customer conversations with the target segment, experiments run with results, decisions made, stage reached and weekly check-in consistency. Add revenue and retention only for teams that already have customers.",
      },
      {
        question: "How do accelerators measure impact?",
        answer: "During the program, through leading indicators of founder progress. After it, through alumni follow-ups on revenue, funding, survival and jobs created.",
      },
      {
        question: "How often should founders report progress?",
        answer: "Weekly works for most programs, as long as the update takes a few minutes. Monthly is too slow to catch teams that are stuck.",
      },
    ],
    sources: [
      { title: "The Mom Test", publisher: "Rob Fitzpatrick", url: "https://www.momtestbook.com/" },
      { title: "Principles", publisher: "The Lean Startup", url: "https://theleanstartup.com/principles" },
    ],
    relatedSlugs: ["startup-cohort-progress-report-template", "founder-progress-tracking-software", "customer-interview-questions", "kpis-and-okrs"],
    cta: {
      label: "See the 30-day pilot",
      href: "/enterprise",
      description: "Our 30-day founder validation pilot gives your team one screen with every startup's stage, interviews, experiments and check-ins, plus a final cohort report.",
    },
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "startup-cohort-progress-report-template",
    kind: "guide",
    topic: "programs",
    audiences: ["program", "mentor"],
    title: "Startup Cohort Progress Report Template for Accelerators",
    metaTitle: "Cohort Progress Report Template for Accelerators",
    metaDescription:
      "A cohort progress report template for accelerators and incubators: what to include per startup, a cohort summary, and how to write it for funders.",
    aliases: ["cohort report template", "accelerator report template", "incubator report", "founder progress report", "program report for funders"],
    answer:
      "A useful cohort progress report has two parts: a one-page cohort summary (how many teams moved forward, common blockers, where help is needed) and a short card for each startup with its stage, evidence gathered, decision made and next step. Write it from recorded work, not from impressions.",
    sections: [
      {
        id: "cohort-summary",
        heading: "Part 1: the cohort summary",
        body: "Keep it to one page:\n\n1. **Period covered** and number of startups.\n2. **Movement:** how many teams moved to a later stage, stayed, or stopped.\n3. **Totals:** customer conversations, experiments completed, decisions made.\n4. **Highlights:** two or three concrete results, such as a first paid pilot.\n5. **Common blockers:** the problems several teams share, which tell you what to teach next.\n6. **Where help is needed:** teams that need mentor time or introductions, and why.",
      },
      {
        id: "startup-card",
        heading: "Part 2: one card per startup",
        body: "Copy these fields for each team:\n\n- **Startup and lead founder**\n- **Stage now** and stage at the start of the period\n- **Target customer:** one sentence, see [ideal customer profile](/startup-pedia/ideal-customer-profile)\n- **Evidence this period:** conversations held, experiments run, results\n- **Decision:** build, narrow, change direction or stop, and the reason\n- **Next step** and date\n- **Help requested** from the program\n- **Check-ins completed:** for example 4 of 4",
      },
      {
        id: "example",
        heading: "Filled-in example card",
        body: "- **Startup:** ClinicFlow, led by Ana\n- **Stage:** problem validated (started at idea)\n- **Target customer:** owners of independent physiotherapy clinics with two to five therapists\n- **Evidence:** 11 owner interviews; 8 described no-shows unprompted; a landing page converted 14 of 60 qualified visitors\n- **Decision:** build a narrow first version focused on reminders only\n- **Next step:** five clinics using it by 30 November\n- **Help requested:** introduction to a regional clinic association\n- **Check-ins:** 4 of 4\n\n(This example is illustrative.)",
      },
      {
        id: "for-funders",
        heading: "Writing it for funders and sponsors",
        body: "Funders read many reports. Lead with outcomes in their language, for example jobs, revenue or students supported, then show the evidence behind them. If your funder has a template, map these fields onto it rather than writing two reports. Keep founders' private material, such as interview notes and files, out of the report unless they agree to share it.",
      },
      {
        id: "mistakes",
        heading: "Common mistakes",
        body: "- Writing the report from memory at the end of the program.\n- Listing activities (\"attended 6 workshops\") instead of evidence.\n- Hiding teams that stopped. A well-reasoned stop is a good outcome and funders respect it.\n- Using a different format every cohort, so results cannot be compared over time.",
      },
    ],
    roleNotes: {
      program: "If founders log their work weekly, most of this report writes itself. The hard part is agreeing the fields at kickoff.",
      mentor: "The startup card is also a good agenda for a mentoring session: evidence, decision, next step, help needed.",
    },
    faqs: [
      {
        question: "What should a monthly startup cohort report include?",
        answer: "A one-page cohort summary with movement between stages, totals, highlights and common blockers, plus a short card for each startup covering stage, evidence, decision and next step.",
      },
      {
        question: "How do incubators report outcomes to sponsors and universities?",
        answer: "With evidence-based progress during the program and alumni outcomes such as revenue, funding and jobs afterwards, in the sponsor's own format where one exists.",
      },
      {
        question: "Should founders see their own report card?",
        answer: "Yes. Sharing it keeps the report accurate and makes it useful to the founder as well as the program.",
      },
    ],
    sources: [
      { title: "Principles", publisher: "The Lean Startup", url: "https://theleanstartup.com/principles" },
    ],
    relatedSlugs: ["how-accelerators-measure-startup-progress", "founder-progress-tracking-software", "ideal-customer-profile"],
    cta: {
      label: "See the 30-day pilot",
      href: "/enterprise",
      description: "The pilot ends with a cohort report written from each startup's recorded work, with a next step for every startup and in your funder's format if you share it.",
    },
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "founder-progress-tracking-software",
    kind: "guide",
    topic: "programs",
    audiences: ["program", "mentor"],
    title: "Founder Progress Tracking Software: What Accelerators Should Look For",
    metaTitle: "Founder Progress Tracking Software: What to Look For",
    metaDescription:
      "How accelerators and incubators should choose software to track founder progress across a cohort: the criteria that matter, the main options and trade-offs.",
    aliases: ["accelerator management software", "cohort management software", "incubator management software", "startup program management software", "cohort tracking"],
    answer:
      "Good founder progress tracking software shows each startup's real progress from the work founders already do, rather than from extra forms, while protecting founders' private material. Judge options on where the data comes from, founder consent, staff time, reporting and cost, and pick the type that matches your program's main job.",
    sections: [
      {
        id: "criteria",
        heading: "What to look for",
        body: "- **Where the data comes from.** Self-reported forms are cheap but optimistic. Data captured from founders' actual work, such as interviews and experiments, is more reliable.\n- **Founder consent and privacy.** Founders should see what the program sees and keep private files private. This affects trust and participation.\n- **Staff time.** Count the hours to set up, chase updates and assemble reports. Small programs often have one person doing everything.\n- **Reporting.** Can you export the data and produce a report in your funder's format?\n- **Fit with your program.** It should work alongside your curriculum and mentors, not replace them.\n- **What happens after the program.** Whether founders keep their work and tools when the cohort ends.\n- **Pricing model.** Per seat, per startup or per program, and whether a pilot is possible before committing.",
      },
      {
        id: "options",
        heading: "The main types of option",
        body: "- **Spreadsheets and forms.** Free and flexible; most small programs start here. Weak on reliability and staff time, because every number is typed in by hand.\n- **General workspaces and CRMs.** Flexible databases that can track teams and meetings. Good if you have someone to build and maintain the setup.\n- **Accelerator management platforms.** Usually strongest on applications, selection, events and portfolio data. Check how they measure progress during the program, not only before and after.\n- **Founder-side validation platforms.** Founders do their validation work in the tool, and the program sees progress from that work. Strong on evidence; check what they do not cover, such as applications.",
      },
      {
        id: "where-we-fit",
        heading: "Where Creatives Takeover fits, and where it does not",
        body: "Creatives Takeover is a founder-side platform. In our [30-day pilot](/enterprise) for 5 to 10 startups, founders do their validation work on the platform, and your team sees every startup's stage, interviews, experiments and check-ins on one screen, exportable as a spreadsheet. We follow up with quiet teams, send a weekly summary and write the final cohort report. Staff see progress, not the content of founders' work.\n\nIt is **not** an application or selection tool, a deal-flow or investor CRM, or a curriculum and course platform. If those are your main needs, an accelerator management platform or learning platform is the better fit, and the two can run side by side.",
      },
      {
        id: "how-to-choose",
        heading: "How to choose",
        body: "1. Write down the one job you most need done: selecting startups, running sessions, or seeing and reporting progress.\n2. Count the staff hours you spend on that job today.\n3. Shortlist two or three options of the matching type.\n4. Run a short pilot with a few teams before committing a whole cohort.\n5. Judge it on whether you could write your funder report from it, and on what founders say about it.",
      },
    ],
    roleNotes: {
      program: "Start with the report you need to write at the end and work backwards. The right tool is the one that produces that report from work founders were doing anyway.",
      mentor: "Ask the program what you will be able to see between sessions. Shared progress makes mentoring time far more focused.",
    },
    faqs: [
      {
        question: "What is accelerator management software?",
        answer: "Software that helps accelerators and incubators run their programs. Products differ a lot: some focus on applications and selection, some on events and content, and some on tracking founder progress and reporting.",
      },
      {
        question: "How can a small accelerator manage founders without spreadsheets?",
        answer: "Use a tool where founders' own work creates the progress data, so staff are not retyping updates. Start with a pilot for a few teams to check it saves time.",
      },
      {
        question: "What should accelerator software cost?",
        answer: "It varies widely by model: per seat, per startup or per program. Compare it with the staff hours it saves and ask for a pilot before a full commitment.",
      },
    ],
    sources: [],
    relatedSlugs: ["how-accelerators-measure-startup-progress", "startup-cohort-progress-report-template", "startup-accelerator-alternatives"],
    cta: {
      label: "See the 30-day pilot",
      href: "/enterprise",
      description: "A 30-day founder validation pilot for 5 to 10 startups, with a program dashboard, weekly follow-up and a final cohort report. Pricing is set per program.",
    },
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "startup-accelerator-alternatives",
    kind: "guide",
    topic: "programs",
    audiences: ["founder", "builder", "mentor", "program"],
    title: "Startup Accelerator Alternatives: How to Get the Same Benefits",
    metaTitle: "Startup Accelerator Alternatives for Founders Building Now",
    metaDescription:
      "Alternatives to startup accelerators: how to get structure, mentorship, accountability, funding and credibility without joining a cohort.",
    aliases: ["accelerator alternatives", "rejected from accelerator", "incubator alternatives", "without an accelerator"],
    answer:
      "You can get most of what an accelerator offers without joining one by replacing each benefit separately: a structured method for validation, mentors for feedback, a peer group for accountability, targeted investor research for funding and visible progress for credibility. Start by naming which benefit you actually need.",
    sections: [
      {
        id: "what-accelerators-offer",
        heading: "What accelerators actually give you",
        body: "Accelerators are fixed-length programs, often a few months, that usually offer some combination of:\n\n- A small investment in exchange for equity\n- Structure and deadlines\n- Mentors and expert feedback\n- A peer group of other founders\n- Investor introductions and a demo day\n- Credibility from being selected\n\nThey can be very valuable, but places are limited, schedules are fixed and many take equity. Incubators are similar but usually longer, less structured and sometimes focused on office space and services.",
      },
      {
        id: "alternatives",
        heading: "How to replace each benefit",
        body: "- **Structure:** follow a step-by-step method for [validation](/startup-pedia/how-to-validate-a-startup-idea), building an [MVP](/startup-pedia/minimum-viable-product) and going to market, with your own weekly deadlines.\n- **Mentorship:** find two or three mentors with experience in your market and meet them regularly with specific questions.\n- **Peer accountability:** join or form a small group of founders at a similar stage who share goals and results every week.\n- **Funding:** approach angels and pre-seed funds directly. See [how to find investors](/startup-pedia/how-to-find-investors). Grants and revenue are also options.\n- **Credibility:** traction is the strongest credential. Customer results, a growing user base and public progress speak louder than a program logo.\n- **Investor access:** build relationships over time with updates on your progress, before you need the money.",
      },
      {
        id: "after-rejection",
        heading: "If an accelerator rejected you",
        body: "Rejection usually reflects timing, evidence or fit rather than a final verdict. Ask for feedback if the program offers it, then spend the next few months producing the evidence that was missing: sharper [ICP](/startup-pedia/ideal-customer-profile), real customer interviews, a working product and early traction. Many founders apply again with a much stronger application, and some find they no longer need to.",
      },
      {
        id: "when-to-join",
        heading: "When an accelerator is still the right choice",
        body: "If you need the network of a specific program, are entering an industry where credibility and introductions are hard to get, or benefit from intense deadlines, a good accelerator can be worth the equity. Compare programs carefully on their terms, track record in your sector and what alumni say.",
      },
      {
        id: "example",
        heading: "Example",
        body: "Two founders rejected by an accelerator set themselves a 12-week plan: four weeks of customer interviews, four weeks building a narrow MVP and four weeks of founder-led sales. They join a weekly founder group for accountability and book a monthly call with two mentors from their industry. By the end they have eight paying pilot customers, which gets them introductions to angels that the accelerator would have provided.",
      },
    ],
    roleNotes: {
      founder: "List the three benefits you hoped an accelerator would give you, then find a specific replacement for each.",
      mentor: "Founders without a program often lack accountability more than advice. Regular check-ins on agreed goals are among the most useful things you can offer.",
      program: "Founders compare programs with these alternatives. Programs that produce visible evidence and decisions, not just content, stand out.",
    },
    faqs: [
      {
        question: "What are good alternatives to startup accelerators?",
        answer: "A structured validation method, mentors, a founder peer group, direct outreach to angels and pre-seed funds, and building visible traction.",
      },
      {
        question: "Do I need an accelerator to build a startup?",
        answer: "No. Accelerators help some founders, but many successful startups never joined one.",
      },
      {
        question: "What should I do after an accelerator rejection?",
        answer: "Ask for feedback if possible, then build the missing evidence: a clearer customer, real interviews, a working product and early traction. Reapply or raise independently.",
      },
    ],
    sources: [
      { title: "YC's Essential Startup Advice", publisher: "Y Combinator", url: "https://www.ycombinator.com/blog/ycs-essential-startup-advice" },
    ],
    relatedSlugs: ["how-to-validate-a-startup-idea", "how-to-find-investors", "ideal-customer-profile", "startup-funding-stages"],
    cta: {
      label: "Follow the startup development cycle",
      href: "/bizmap-ai",
      description: "BizMap AI connects validation, ideal customer definition, MVP scoping and go-to-market planning in one guided cycle.",
    },
    publishedAt: "2026-05-17",
    modifiedAt: "2026-10-25",
    legacySlugs: ["accelerator-alternatives"],
  },
];
