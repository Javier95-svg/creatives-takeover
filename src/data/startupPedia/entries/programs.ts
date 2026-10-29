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
    relatedSlugs: ["accelerator-software-compared", "how-accelerators-measure-startup-progress", "startup-cohort-progress-report-template", "startup-accelerator-alternatives"],
    cta: {
      label: "See the 30-day pilot",
      href: "/enterprise",
      description: "A 30-day founder validation pilot for 5 to 10 startups, with a program dashboard, weekly follow-up and a final cohort report. Pricing is set per program.",
    },
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "accelerator-software-compared",
    kind: "guide",
    topic: "programs",
    audiences: ["program", "mentor", "investor"],
    title: "Accelerator and Incubator Software Compared (2026)",
    metaTitle: "Accelerator and Incubator Software Compared (2026)",
    metaDescription:
      "Dealum, Startup Science, Cohortly, Catalyzer, macohort, GrowthApp, Founders360, IdeaBuddy and more compared by the job each one does for programs.",
    aliases: [
      "accelerator management software comparison",
      "best accelerator software",
      "incubator management software",
      "cohort management platform",
      "dealum alternatives",
      "growthapp alternatives",
    ],
    answer:
      "Accelerator and incubator software falls into four groups by the job it does: running the program (applications, cohorts, mentors, reporting), monitoring cohort progress, giving founders a workspace the program can see into, and community or learning delivery. Decide which job you most need done, then compare the tools in that group.",
    sections: [
      {
        id: "how-we-compared",
        heading: "How this comparison was made",
        body: "Creatives Takeover publishes this page and offers a program pilot, so we have tried to be fair. Each product is described from its own public website as of October 2026, not from hands-on testing, and we avoid ranking competitors. Several publish prices; we leave them out because they change, so check each site. If something here is out of date, contact us and we will correct it.",
      },
      {
        id: "program-operations",
        heading: "1. Running the program: applications, cohorts, mentors and reporting",
        body: "- **Dealum:** manages startups \"from the application to graduation to closing their first round and exit\", with applications and voting, portfolio management, an investor network, a data room, events, analytics and export. Strong where investor relationships matter.\n- **Startup Science:** runs applications, scoring, cohorts, advisors, perks and reporting on one shared founder record under your own brand, and says founders use it free.\n- **Cohortly:** an all-in-one platform for programs and batches, applications, a startup portfolio, mentor booking, events, communications and shared resources.\n- **Catalyzer:** tracks founders \"from application to outcome\", with cohort management, a client CRM, intake, session tracking, impact surveys and reporting to funders. Its site offers a free hub to start.\n\n**Consider this group if** you run applications and selection, manage many mentors and events, or need a long-term record of every company.",
      },
      {
        id: "progress-monitoring",
        heading: "2. Monitoring cohort progress",
        body: "- **macohort:** an accelerator workspace for cohort health, stage progress, weekly founder reporting and flags for at-risk startups.\n- **Founder Identity HQ:** one workspace to manage founders, monitor cohort progress, track interventions and produce stakeholder-ready reports. Its site says it is onboarding a limited number of partners.\n\n**Consider this group if** your main pain is chasing weekly updates and spotting struggling teams. Check where the progress data comes from: founder reports, staff entries or founders' own work.",
      },
      {
        id: "founder-workspaces",
        heading: "3. Founder workspaces the program can see into",
        body: "- **GrowthApp:** teams follow a guided eight-step path and produce deliverables such as a Lean Canvas, buyer persona, customer interviews and a pitch deck, while program staff see every team's progress and mentors get read-only access.\n- **Founders360:** a suite of AI agents for research, GTM, legal drafts, finance, HR and pitch decks, sharing context between them and licensed to a whole cohort.\n- **IdeaBuddy:** guided business planning and idea validation for founders, with solutions for incubators, accelerators and business schools.\n- **Creatives Takeover:** founders work through customer definition, demand validation, demos and evidence scoring in their own free accounts. In our [30-day pilot](/enterprise) for 5 to 10 startups, your team sees every startup's stage, interviews, experiments and check-ins on one screen, we follow up with quiet teams and send a weekly summary, and we write the final cohort report. Staff see progress, not the content of founders' work. It is not an application, investor CRM or course platform.\n\n**Consider this group if** you want progress to come from the work founders do, with less staff time spent collecting updates. The tools differ in emphasis: deliverables and templates, AI agents, business plans, or customer evidence and decisions.",
      },
      {
        id: "community-learning",
        heading: "4. Community and learning delivery",
        body: "- **Acterio:** a branded platform for professional communities, including founder communities, with membership, events, cohort management and shared resources.\n- **Teachfloor:** a cohort-based learning platform for courses, peer review, live sessions and learning paths. Its homepage targets academies and training teams rather than startup programs specifically.\n\n**Consider this group if** your program is mainly community or curriculum. These sit well alongside a progress or founder-workspace tool.",
      },
      {
        id: "how-to-choose",
        heading: "How to choose",
        body: "1. Name the one job you most need done: selection, program operations, progress visibility, or delivery.\n2. Shortlist two or three tools from the matching group. Many programs combine one tool for operations with another for founders' work.\n3. Ask each vendor where the progress data comes from and what founders see.\n4. Run a pilot with a few teams before committing a whole cohort, and judge it on whether you could write your funder report from it.\n\nThe [what to look for guide](/startup-pedia/founder-progress-tracking-software) lists the criteria in more detail.",
      },
    ],
    roleNotes: {
      program: "Small programs often get the most from one founder-side tool plus a spreadsheet, and add an operations platform only when applications and mentor scheduling become the bottleneck.",
      investor: "If you sponsor programs, ask which tool produces the progress data in their reports. It tells you how much the numbers can be trusted.",
    },
    faqs: [
      {
        question: "What is the best accelerator management software?",
        answer: "There is no single best one. Operations platforms such as Dealum, Startup Science, Cohortly and Catalyzer suit applications and program management; tools such as macohort and Founder Identity HQ focus on monitoring progress; GrowthApp, Founders360, IdeaBuddy and Creatives Takeover focus on founders' own work.",
      },
      {
        question: "Can a small accelerator start with a free tool?",
        answer: "Yes. Some platforms offer free tiers or trials, and many small programs start with spreadsheets plus one founder-side tool before buying a full operations platform.",
      },
      {
        question: "Should accelerator software replace mentors and curriculum?",
        answer: "No. Good tools save staff time and make progress visible so mentors and sessions can focus where they are needed.",
      },
    ],
    sources: [
      { title: "Dealum for accelerators", publisher: "Dealum", url: "https://dealum.com/solutions/accelerator" },
      { title: "Startup Science", publisher: "Startup Science", url: "https://startupscience.io/" },
      { title: "Cohortly", publisher: "Cohortly", url: "https://help.cohortos.io/welcome-to-cohortly/" },
      { title: "Catalyzer for accelerators", publisher: "Catalyzer", url: "https://www.catalyzerapp.com/accelerators" },
      { title: "macohort", publisher: "macohort", url: "https://macohort.com/" },
      { title: "Founder Identity HQ", publisher: "Founder Identity HQ", url: "https://founderidentityhq.com/" },
      { title: "GrowthApp", publisher: "GrowthApp", url: "https://www.growthapp.co/en" },
      { title: "Founders360 for institutions", publisher: "Founders360", url: "https://www.founders360.world/institutions" },
      { title: "IdeaBuddy", publisher: "IdeaBuddy", url: "https://ideabuddy.com/" },
      { title: "Acterio", publisher: "Acterio", url: "https://www.acterio.com/" },
      { title: "Teachfloor", publisher: "Teachfloor", url: "https://www.teachfloor.com/" },
    ],
    relatedSlugs: ["founder-progress-tracking-software", "how-accelerators-measure-startup-progress", "startup-cohort-progress-report-template"],
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
  {
    slug: "measuring-customer-discovery-progress",
    kind: "guide",
    topic: "programs",
    audiences: ["founder", "mentor", "program"],
    title: "How to Measure Customer Discovery Progress",
    metaTitle: "How to Measure Customer Discovery Progress",
    metaDescription:
      "Measure customer discovery by evidence, not activity: qualified conversations, confirmed problems, commitments and decisions, with a simple weekly view.",
    aliases: ["customer discovery metrics", "measure customer interviews", "discovery progress", "validation metrics", "customer development metrics"],
    answer:
      "Measure customer discovery by the evidence it produces, not by activity: how many conversations were with people who match your target customer, how many confirmed the problem with a recent example, how many made a commitment such as a pilot, a deposit or an introduction, and what decision the team made as a result.",
    sections: [
      {
        id: "why-count-evidence",
        heading: "Why the number of interviews is not enough",
        body: "\"We spoke to 40 people\" sounds like progress, but it says nothing about who those people were or what the team learned. Friends, other founders and people outside the target market are easy to reach and tend to be polite, so the count rises while the evidence stays weak.\n\nDiscovery is progressing when each week the team knows more about one specific customer: what problem they have, how they handle it today and whether they would act to solve it. The measures below track that.",
      },
      {
        id: "what-to-measure",
        heading: "Five measures that show real progress",
        body: "1. **Qualified conversations:** conversations with people who match the [ideal customer profile](/startup-pedia/ideal-customer-profile). Agree the criteria before counting.\n2. **Problem confirmed with a recent example:** the person described the last time the problem happened, what it cost them and what they did about it. Opinions about the future do not count.\n3. **Existing workarounds:** how many already spend time or money on a fix, such as a spreadsheet, an agency or a competitor. A problem nobody works around is rarely urgent.\n4. **Commitments:** a follow-up meeting, an introduction to a colleague, a pilot, a pre-order or a deposit. Commitments cost the customer something, which is why they are stronger than compliments.\n5. **Decisions:** what the team changed because of what it heard, for example narrowing the customer, dropping a feature or stopping the idea.",
      },
      {
        id: "weekly-view",
        heading: "A simple weekly view",
        body: "Keep one row per week with the five numbers and one sentence on what the team now believes. After three or four weeks the pattern is usually clear: either confirmed problems and commitments rise as the customer gets narrower, or they stay flat, which is itself a useful result.\n\nThe [customer interview questions](/startup-pedia/customer-interview-questions) guide covers how to run each conversation so the answers are usable, and [how to validate a startup idea](/startup-pedia/how-to-validate-a-startup-idea) covers what to do with the evidence.",
      },
      {
        id: "example",
        heading: "Example",
        body: "A founder building scheduling software for physiotherapy clinics holds 12 conversations in two weeks. Only 7 are with clinic owners; the rest are therapists who do not choose software. Of the 7, 5 describe a recent double-booking problem and 4 already pay a receptionist to fix schedules by hand. Two agree to a free pilot. The founder narrows the target to owners of clinics with three or more therapists and stops interviewing individual therapists. The weekly view shows 7 qualified conversations, 5 confirmed problems, 4 workarounds, 2 commitments and 1 decision.",
      },
      {
        id: "mistakes",
        heading: "Common mistakes",
        body: "- Counting every conversation, including friends and other founders.\n- Treating \"I would use that\" as confirmation. It is an opinion about the future.\n- Pitching the solution during the interview, which turns discovery into a sales call.\n- Measuring only at the end, when there is no time left to change direction.",
      },
    ],
    roleNotes: {
      founder: "Report the five numbers to yourself every week. If confirmed problems and commitments are flat after a month, change who you are talking to before you build more.",
      mentor: "Ask for the last week's qualified conversations and the decision they led to. It moves the session from opinions to evidence.",
      program: "The same five numbers, collected the same way for every team, make discovery comparable across a cohort.",
    },
    faqs: [
      {
        question: "How many customer interviews are enough?",
        answer: "There is no fixed number. Many teams see clear patterns after 10 to 20 qualified conversations with one customer segment. Stop when new conversations stop changing what you believe, not when you reach a target.",
      },
      {
        question: "What counts as a qualified customer conversation?",
        answer: "A conversation with someone who matches your target customer criteria and has the problem you are studying, agreed before you start counting. Friends, investors and other founders usually do not qualify.",
      },
      {
        question: "What is the strongest signal in customer discovery?",
        answer: "A commitment that costs the customer something: time for a follow-up, an introduction, a pilot, a pre-order or money. Compliments and \"I would use it\" are the weakest signals.",
      },
    ],
    sources: [
      { title: "The Mom Test", publisher: "Rob Fitzpatrick", url: "https://www.momtestbook.com/" },
      { title: "Startup School: How to Talk to Users", publisher: "Eric Migicovsky", url: "https://ericmigi.com/blog/startup-school-how-to-talk-to-users" },
      { title: "Principles", publisher: "The Lean Startup", url: "https://theleanstartup.com/principles" },
    ],
    relatedSlugs: ["customer-interview-questions", "how-to-validate-a-startup-idea", "how-accelerators-measure-startup-progress", "ideal-customer-profile"],
    cta: {
      label: "Log interviews in Validate",
      href: "/validate",
      description: "Turn interview notes into a structured validation plan with the evidence in one place.",
    },
    publishedAt: "2026-10-29",
    modifiedAt: "2026-10-29",
  },
  {
    slug: "how-mentors-track-founder-progress",
    kind: "guide",
    topic: "programs",
    audiences: ["mentor", "program", "founder"],
    title: "How Mentors Track Founder Actions Between Sessions",
    metaTitle: "How Mentors Track Founder Actions Between Sessions",
    metaDescription:
      "A simple way for mentors to track what founders commit to and do between sessions: agreed actions, evidence, a short check-in and a review at the next meeting.",
    aliases: ["mentor follow up", "mentoring action items", "track mentee progress", "mentor accountability", "mentoring session notes"],
    answer:
      "Mentors track founder progress by ending every session with one to three specific actions, each with an owner, a date and the evidence that will show it happened, then opening the next session by reviewing that evidence before giving new advice.",
    sections: [
      {
        id: "why-it-matters",
        heading: "Why advice gets lost between sessions",
        body: "Most mentoring sessions end with good ideas and no record of who will do what. Two weeks later both sides remember the conversation differently, the founder has done something else, and the next session starts from scratch. The advice was not wrong; nothing connected it to action.\n\nTracking actions does not mean managing the founder. The founder decides what to do. The mentor's job is to make the commitment specific enough that both can tell, next time, whether it happened and what it taught.",
      },
      {
        id: "end-of-session",
        heading: "End each session with agreed actions",
        body: "In the last five minutes, agree one to three actions and write them down where both can see them:\n\n- **The action:** specific and small enough for the time available, for example \"hold five conversations with clinic owners\", not \"do more customer research\".\n- **The date:** usually the next session.\n- **The evidence:** what the founder will bring back, such as interview notes, a landing page with numbers or a decision.\n\nAsk the founder to state the actions in their own words. If they cannot, the session was not clear enough.",
      },
      {
        id: "between-sessions",
        heading: "Between sessions: a short check-in, not supervision",
        body: "A brief message halfway between sessions, asking what is done and what is blocked, catches problems early. Keep it to two questions. If a founder is stuck on something the mentor can unblock with an introduction or a quick answer, that is the moment to help.\n\nAvoid daily follow-ups. Founders have many priorities, and a mentor who chases every task quickly becomes a manager the founder did not ask for.",
      },
      {
        id: "next-session",
        heading: "Start the next session with the evidence",
        body: "Open by reviewing each action: done, partly done or not done, and what the evidence showed. An action that was not done is useful information too; it may mean the founder disagreed, lacked time or hit a blocker. Ask which, without judgement.\n\nOver several sessions, the record shows whether the founder is moving: more [qualified customer conversations](/startup-pedia/measuring-customer-discovery-progress), clearer decisions, a narrower customer. Programs that collect the same record for every team can use it in their [cohort reports](/startup-pedia/startup-cohort-progress-report-template).",
      },
      {
        id: "example",
        heading: "Example",
        body: "A mentor meets a founder every two weeks. At the end of the first session they agree two actions: interview five owners of independent gyms and draft a one-page offer. At the midpoint check-in the founder has held two interviews and asks for an introduction, which the mentor makes. The next session opens with four interviews held, a recurring complaint about failed membership payments and a revised offer focused on that. The mentor's advice now builds on evidence rather than on the founder's first idea.",
      },
    ],
    roleNotes: {
      mentor: "One to three actions, each with a date and evidence, is enough. Review them at the start of every session before giving new advice.",
      program: "Ask mentors to record agreed actions in one shared place. It shows which teams are moving between sessions, not only in them.",
      founder: "Write the actions down yourself and bring the evidence, even when an action failed. It makes every session more useful.",
    },
    faqs: [
      {
        question: "How many action items should come out of a mentoring session?",
        answer: "One to three. More than that and most will not get done before the next session, which teaches both sides to ignore the list.",
      },
      {
        question: "Should mentors follow up with founders between sessions?",
        answer: "A short check-in halfway between sessions is useful: what is done and what is blocked. More frequent follow-ups tend to feel like supervision.",
      },
      {
        question: "What if the founder did not do the agreed actions?",
        answer: "Ask why before moving on. The answer is often more useful than the action would have been: the founder may disagree with the direction, be short of time or be blocked by something the mentor can help with.",
      },
    ],
    sources: [
      { title: "The Techstars Mentor Manifesto", publisher: "Techstars", url: "https://www.techstars.com/the-line/advice/mentor-manifesto" },
      { title: "The Mom Test", publisher: "Rob Fitzpatrick", url: "https://www.momtestbook.com/" },
    ],
    relatedSlugs: ["measuring-customer-discovery-progress", "how-accelerators-measure-startup-progress", "startup-cohort-progress-report-template", "founder-progress-tracking-software"],
    cta: {
      label: "Explore mentorship",
      href: "/mentorship",
      description: "Founders on Creatives Takeover can find experts in specific fields.",
    },
    publishedAt: "2026-10-29",
    modifiedAt: "2026-10-29",
  },
  {
    slug: "accelerator-vs-incubator",
    kind: "term",
    topic: "programs",
    audiences: ["founder", "builder", "program"],
    title: "Accelerator vs Incubator: What Is the Difference?",
    metaTitle: "Accelerator vs Incubator: What Is the Difference?",
    metaDescription:
      "Accelerators run short, fixed cohorts and often invest for equity; incubators support earlier ideas for longer, usually with space and services. How to choose.",
    aliases: ["incubator vs accelerator", "startup incubator", "business incubator", "what is an accelerator", "what is an incubator"],
    answer:
      "A startup accelerator is a fixed-length program, often around three months, that takes a cohort of startups, usually invests a small amount for equity and ends with a demo day. An incubator supports earlier-stage ideas for longer and more flexibly, typically with workspace, advice and services, and usually takes no equity.",
    sections: [
      {
        id: "accelerators",
        heading: "What an accelerator is",
        body: "Accelerators select startups in batches (cohorts) through a competitive application. For a few months the teams get structured programming, mentors, deadlines and access to investors, and the program usually ends with a demo day where founders pitch.\n\nMany accelerators invest in each company in exchange for equity. Terms vary widely. As one example, Y Combinator's standard deal is $500,000: $125,000 for 7% of the company on a post-money SAFE, plus $375,000 on an uncapped SAFE with a most favored nation provision. Smaller programs invest less or nothing at all.",
      },
      {
        id: "incubators",
        heading: "What an incubator is",
        body: "Incubators are often run by universities, local governments, corporations or nonprofits. They tend to admit startups on a rolling basis rather than in cohorts, support them for months or years rather than weeks, and focus on helping an idea or an early company get established: workspace, advice, training, introductions and sometimes shared services such as legal or accounting help.\n\nMost incubators do not take equity, though some charge rent or fees. Because they are less selective and less time-bound, they suit founders who are still shaping the idea.",
      },
      {
        id: "differences",
        heading: "The main differences",
        body: "- **Stage:** accelerators usually want a team with a product or early evidence; incubators often take earlier ideas.\n- **Length:** accelerators run for a fixed few months; incubators are open-ended or last a year or more.\n- **Intake:** accelerators admit cohorts; incubators often admit continuously.\n- **Money:** accelerators often invest for equity; incubators rarely invest and usually take no equity.\n- **Ending:** accelerators end with a demo day aimed at fundraising; incubators end when the company is ready to move on.\n\nThe labels are used loosely, and many programs mix both models, so read each program's terms rather than relying on the name.",
      },
      {
        id: "choosing",
        heading: "Which one fits your startup",
        body: "If you are still testing whether the problem is real, an incubator or a structured way to [validate the idea](/startup-pedia/how-to-validate-a-startup-idea) on your own is usually a better fit than an accelerator, which will expect evidence. If you already have customers or a working product and want to raise a round, an accelerator's investor network and deadlines can help. If neither fits your timing, [accelerator alternatives](/startup-pedia/startup-accelerator-alternatives) explains how to get the same benefits separately.",
      },
    ],
    roleNotes: {
      founder: "Before applying, check the equity and the terms, not just the brand. A program is worth the equity only if it gives you something you cannot get another way.",
      program: "Founders compare programs by what they leave with. Tracking their evidence during the program makes that easier to show.",
    },
    faqs: [
      {
        question: "Do incubators take equity?",
        answer: "Most do not. Many are run by universities, governments or nonprofits and are funded by grants or fees. Some private incubators do take a small stake, so check the terms.",
      },
      {
        question: "Is an accelerator or an incubator better for a first-time founder?",
        answer: "It depends on your stage. With an idea and no evidence yet, an incubator or a structured validation process usually fits better. With a product and early customers, an accelerator can help you grow and raise.",
      },
      {
        question: "How long do accelerator programs last?",
        answer: "Most run for around three to six months and end with a demo day. Incubators usually last longer, from several months to a few years.",
      },
    ],
    sources: [
      { title: "What Startup Accelerators Really Do", publisher: "Harvard Business Review", url: "https://hbr.org/2016/03/what-startup-accelerators-really-do" },
      { title: "The YC Deal", publisher: "Y Combinator", url: "https://www.ycombinator.com/deal" },
    ],
    relatedSlugs: ["startup-accelerator-alternatives", "startup-funding-stages", "pre-seed-vs-seed-funding", "how-accelerators-measure-startup-progress"],
    cta: {
      label: "Find accelerator programs",
      href: "/accelerator-hunt",
      description: "Accelerator Hunt lets you browse accelerator programs and filter them by industry and stage.",
    },
    publishedAt: "2026-10-29",
    modifiedAt: "2026-10-29",
  },
];
