import type { PediaEntry } from "../types.ts";

export const fundraisingEntries: PediaEntry[] = [
  {
    slug: "startup-funding-stages",
    kind: "term",
    topic: "fundraising",
    audiences: ["founder", "investor", "mentor", "program"],
    title: "Startup Funding Stages: From Pre-Seed to IPO",
    metaTitle: "Startup Funding Stages Explained: Pre-Seed to IPO",
    metaDescription:
      "The startup funding stages from bootstrapping and pre-seed to seed, Series A, B, C and an IPO: what each round funds and what investors expect.",
    acronyms: ["IPO"],
    aliases: ["funding rounds", "series a", "series b", "initial public offering", "venture rounds", "bootstrapping"],
    answer:
      "Startups typically raise money in stages: pre-seed and seed to find product-market fit, Series A to build a repeatable growth engine, Series B and later to scale, and sometimes an initial public offering (IPO) when shares are first sold on a stock exchange. Each stage is defined by the evidence you have, not by the amount raised.",
    sections: [
      {
        id: "bootstrapping",
        heading: "Bootstrapping and friends and family",
        body: "Many startups begin with the founders' own money, revenue from early customers or small amounts from people they know. Bootstrapping keeps full ownership and control, and some companies never raise outside money at all.",
      },
      {
        id: "pre-seed-seed",
        heading: "Pre-seed and seed",
        body: "**Pre-seed** funds the team and the insight, often before revenue, to build an MVP and gather first evidence. **Seed** funds early traction: real users or revenue and signs of a repeatable channel. Investors at these stages include angels, accelerators and seed funds. These rounds are often raised on convertible instruments such as SAFEs or convertible notes rather than priced equity. See [pre-seed vs seed funding](/startup-pedia/pre-seed-vs-seed-funding).",
      },
      {
        id: "series-a",
        heading: "Series A",
        body: "Series A is usually the first large priced round led by a venture capital firm. Investors expect clear evidence of [product-market fit](/startup-pedia/product-market-fit) and a growth engine that turns money into customers predictably, shown through metrics such as [MRR](/startup-pedia/mrr-and-arr) growth, retention and [CAC](/startup-pedia/customer-acquisition-cost).",
      },
      {
        id: "series-b-plus",
        heading: "Series B, C and beyond",
        body: "Later rounds fund scaling: larger teams, new markets, new products and sometimes acquisitions. Investors focus on efficiency and market position. Growth equity and, eventually, [private equity](/startup-pedia/venture-capital-vs-private-equity#pe) investors may join at these stages.",
      },
      {
        id: "ipo",
        heading: "IPO: initial public offering",
        body: "An initial public offering is when a private company first sells shares to the public on a stock exchange. It raises capital and lets early investors and employees sell shares, but it brings heavy regulatory, reporting and governance requirements. Most startups never go public. Being acquired is a far more common outcome for those that succeed.",
      },
      {
        id: "dilution",
        heading: "Dilution",
        body: "Each round usually means issuing new shares, which reduces existing owners' percentage. That is expected. The aim is for each round to increase the company's value enough that a smaller share is worth more. Raising more than you need, or at the wrong stage, leads to unnecessary dilution.",
      },
    ],
    roleNotes: {
      founder: "Round names and sizes vary a lot by country and year. Match your raise to the evidence you have and to the milestones the money will reach.",
      program: "Helping founders name their stage honestly, based on evidence, prevents wasted investor meetings.",
    },
    faqs: [
      {
        question: "What are the stages of startup funding?",
        answer: "Commonly bootstrapping, pre-seed, seed, Series A, Series B and later rounds, with an IPO or acquisition as possible outcomes for successful companies.",
      },
      {
        question: "What does IPO stand for?",
        answer: "IPO stands for initial public offering: the first time a private company sells shares to the public on a stock exchange.",
      },
      {
        question: "Do all startups raise venture capital?",
        answer: "No. Many are bootstrapped or funded by revenue, grants or angels. Venture capital suits companies aiming for very fast, large growth.",
      },
    ],
    sources: [
      { title: "A Guide to Seed Fundraising", publisher: "Y Combinator", url: "https://www.ycombinator.com/blog/how-to-raise-a-seed-round" },
      { title: "Documents (including the SAFE)", publisher: "Y Combinator", url: "https://www.ycombinator.com/documents" },
    ],
    relatedSlugs: ["pre-seed-vs-seed-funding", "venture-capital-vs-private-equity", "how-to-find-investors", "employee-stock-option-plan"],
    cta: {
      label: "Check your fundraising readiness",
      href: "/insighta-test",
      description: "The Fundraising Readiness Assessment shows the gaps to fix before you approach investors.",
    },
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "venture-capital-vs-private-equity",
    kind: "term",
    topic: "fundraising",
    audiences: ["founder", "investor", "program"],
    title: "Venture Capital vs Private Equity: Key Differences",
    metaTitle: "Venture Capital vs Private Equity: What's the Difference?",
    metaDescription:
      "Venture capital (VC) backs young, fast-growing startups; private equity (PE) buys into mature companies. How they differ in stage, risk, control and returns.",
    acronyms: ["VC", "PE"],
    aliases: ["venture capital", "private equity", "vc vs pe", "venture capitalist", "growth equity"],
    answer:
      "Venture capital (VC) invests in young, high-growth startups in exchange for minority stakes, expecting most investments to fail and a few to return the fund. Private equity (PE) usually buys majority control of mature, profitable companies and improves them, often using borrowed money.",
    sections: [
      {
        id: "vc",
        heading: "VC: venture capital",
        body: "Venture capital firms raise money from institutions and wealthy individuals and invest it in early and growth-stage startups. They take minority stakes, often a board seat, and support the company through later rounds. Because most startups fail, VCs look for companies that could grow very large, since a few big outcomes must cover all the losses.",
      },
      {
        id: "pe",
        heading: "PE: private equity",
        body: "Private equity firms usually buy established businesses with steady cash flow, often taking full or majority control. They aim to increase value through better operations, acquisitions or financial restructuring, then sell the company several years later. Many deals use significant debt, known as a leveraged buyout.",
      },
      {
        id: "differences",
        heading: "The key differences",
        body: "- **Company stage:** VC backs early or growing startups. PE backs mature, often profitable companies.\n- **Ownership:** VC takes minority stakes. PE usually takes majority or full control.\n- **Risk profile:** VC accepts that many investments fail. PE expects most deals to succeed.\n- **Use of debt:** VC rarely uses it. PE often does.\n- **Source of returns:** VC relies on fast growth and a few large exits. PE relies on operational improvement, debt paydown and resale.",
      },
      {
        id: "middle-ground",
        heading: "The middle ground",
        body: "**Growth equity** sits between the two: minority investments in fast-growing companies that are already proven. Some private equity firms now invest earlier than they used to, and some large venture firms invest at very late stages, so the line has blurred. **Angel investors** are individuals who invest their own money, usually before VCs.",
      },
      {
        id: "for-founders",
        heading: "What it means for founders",
        body: "Early-stage founders deal almost entirely with angels and VCs. Understanding the VC model explains their questions: they need to believe the company could become very large, which is why they focus on market size (see [TAM, SAM and SOM](/startup-pedia/tam-sam-som)) and growth rate. If your business is profitable but unlikely to grow very large, venture capital may not be the right fit, and that is fine.",
      },
    ],
    roleNotes: {
      investor: "Founders often confuse the models. Explaining your fund's stage, check size and return expectations up front saves both sides time.",
    },
    faqs: [
      {
        question: "What is the main difference between VC and PE?",
        answer: "VC invests in young, high-growth startups for minority stakes. PE usually buys control of mature companies and often uses debt.",
      },
      {
        question: "Is venture capital a type of private equity?",
        answer: "Technically yes, since both invest in private companies, but in practice the terms describe very different strategies, stages and risk profiles.",
      },
      {
        question: "Should my startup raise venture capital?",
        answer: "Only if you aim for very fast, large growth and accept dilution and investor expectations that come with it. Many good businesses never raise VC.",
      },
    ],
    sources: [
      {
        title: "Private Equity vs. Venture Capital: What's the Difference?",
        publisher: "Investopedia",
        url: "https://www.investopedia.com/ask/answers/020415/what-difference-between-private-equity-and-venture-capital.asp",
      },
    ],
    relatedSlugs: ["startup-funding-stages", "how-to-find-investors", "pre-seed-vs-seed-funding"],
    cta: {
      label: "Search venture firms",
      href: "/vc-search",
      description: "VC Search filters a venture capital database by stage, geography, sector and check size.",
    },
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "employee-stock-option-plan",
    kind: "term",
    topic: "fundraising",
    audiences: ["founder", "investor", "builder"],
    title: "Employee Stock Option Plan (ESOP): How Startup Equity Works",
    metaTitle: "Employee Stock Option Plan (ESOP): How It Works",
    metaDescription:
      "An employee stock option plan (ESOP) gives staff the right to buy company shares later at a fixed price. Option pools, vesting, cliffs and exercise explained.",
    acronyms: ["ESOP"],
    aliases: ["stock options", "option pool", "vesting schedule", "cliff", "employee equity"],
    answer:
      "An employee stock option plan (ESOP) sets aside a share of a startup's equity, called the option pool, to grant employees the right to buy shares later at a fixed price. If the company's value grows, those options can become valuable, which helps startups attract people they cannot yet pay market salaries.",
    sections: [
      {
        id: "how-it-works",
        heading: "How stock options work",
        body: "1. The company creates an **option pool**, a percentage of its shares reserved for employees.\n2. An employee receives a **grant**: a number of options at a fixed **exercise price** (also called strike price), usually the shares' fair value at the time.\n3. The options **vest** over time, meaning the employee earns the right to them gradually.\n4. The employee can **exercise** vested options by paying the exercise price to get shares.\n5. The shares become valuable to sell if the company is acquired or goes public at a higher value.",
      },
      {
        id: "vesting",
        heading: "Vesting and the cliff",
        body: "A common startup schedule is four years of vesting with a one-year **cliff**: nothing vests in the first year, then 25% vests at the one-year mark and the rest vests monthly or quarterly over the following three years. The cliff protects the company if someone leaves early. Founders often have vesting on their own shares too, for the same reason.",
      },
      {
        id: "pool-size",
        heading: "Option pool size",
        body: "Investors often ask for a pool to be created or enlarged before a priced round, commonly somewhere around 10% to 20% of the company, so that future hires do not dilute them. Size the pool to your actual hiring plan for the next 18 to 24 months rather than a default number, because a larger pool dilutes the founders.",
      },
      {
        id: "naming",
        heading: "A note on the name",
        body: "In the United States, \"ESOP\" usually means an employee stock **ownership** plan, a retirement trust that holds company shares for employees, which is different from startup stock options. In many other countries, ESOP commonly refers to employee stock **option** plans like the one described here. Check which one a document means.",
      },
      {
        id: "taxes",
        heading: "Taxes and rules",
        body: "How options are taxed, and which types exist, varies a lot by country. Some jurisdictions have special schemes for startups with better tax treatment. Get advice from a lawyer or accountant in your country before setting up a plan.",
      },
    ],
    roleNotes: {
      founder: "Explain options clearly when hiring: the number of options, the exercise price, the vesting schedule and the percentage of the company they represent.",
      investor: "Agreeing on the option pool before the round avoids surprises in the cap table after closing.",
    },
    faqs: [
      {
        question: "What is an ESOP in a startup?",
        answer: "A plan that reserves part of the company's shares to grant employees options, which are the right to buy shares later at a fixed price.",
      },
      {
        question: "What is a vesting cliff?",
        answer: "A period, often one year, before any options vest. If the employee leaves before the cliff, they get nothing. After it, a portion vests at once.",
      },
      {
        question: "How big should an option pool be?",
        answer: "Large enough for your hiring plan over the next 18 to 24 months. Pools of roughly 10% to 20% are common, but size it to your real plans.",
      },
    ],
    sources: [
      { title: "Rewarding Talent", publisher: "Index Ventures", url: "https://www.indexventures.com/rewardingtalent/" },
    ],
    relatedSlugs: ["startup-funding-stages", "nda-and-intellectual-property", "venture-capital-vs-private-equity"],
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "nda-and-intellectual-property",
    kind: "term",
    topic: "fundraising",
    audiences: ["founder", "builder", "service-provider", "investor"],
    title: "NDAs and Intellectual Property for Startups",
    metaTitle: "NDAs and Intellectual Property (IP) for Startup Founders",
    metaDescription:
      "What an NDA is and when founders need one, why investors rarely sign them, and the basics of protecting startup intellectual property (IP).",
    acronyms: ["NDA", "IP"],
    aliases: ["non-disclosure agreement", "intellectual property", "confidentiality agreement", "ip assignment", "trademark", "patent"],
    answer:
      "A non-disclosure agreement (NDA) is a contract in which people agree to keep certain information confidential. Intellectual property (IP) is the legal ownership of creations such as code, designs, brand names and inventions. For a startup, the most important step is making sure the company, not individuals, owns its IP.",
    sections: [
      {
        id: "nda",
        heading: "NDA: non-disclosure agreement",
        body: "An NDA defines what information is confidential, what the receiving party may do with it and for how long. It can be one-way (only one side shares secrets) or mutual.\n\n**When founders typically use NDAs:** with contractors and employees (often inside their contracts), in partnership or acquisition talks, and when sharing genuinely sensitive technical or customer data.\n\n**When they usually do not:** most investors, especially venture capitalists, will not sign NDAs to hear a pitch. They see many similar ideas and cannot risk legal claims. Asking can signal inexperience. Share the pitch, and keep truly sensitive details, such as source code or proprietary data, for later stages of diligence.",
      },
      {
        id: "ip",
        heading: "IP: intellectual property",
        body: "The main types of intellectual property relevant to startups:\n\n- **Copyright:** protects original works such as code, text and designs, usually automatically when created.\n- **Trademarks:** protect brand names and logos. Registering them in your key markets prevents others from using confusingly similar names.\n- **Patents:** protect inventions, giving exclusive rights for a period in exchange for public disclosure. They are expensive and slow, so they suit only some startups.\n- **Trade secrets:** valuable information kept confidential, such as algorithms or customer lists, protected by keeping them secret and using NDAs.",
      },
      {
        id: "ownership",
        heading: "Make sure the company owns its IP",
        body: "Investors check that the company owns what it sells. Common problems include code written by a founder before the company existed, work by freelancers without a written assignment, and contributions from a co-founder who left. Fix these early with IP assignment agreements for founders, employees and contractors. It is much cheaper than fixing them during a fundraise or acquisition.",
      },
      {
        id: "disclaimer",
        heading: "Get local advice",
        body: "IP and contract law differ between countries. This entry explains concepts only. Use a qualified lawyer for agreements and registrations.",
      },
    ],
    roleNotes: {
      "service-provider": "Clients will often ask you to assign IP for the work you deliver. Agree what you assign, and what reusable tools you keep, in your contract.",
      investor: "IP assignment from founders and early contractors is one of the first things to check in diligence.",
    },
    faqs: [
      {
        question: "Should I ask investors to sign an NDA?",
        answer: "Usually not. Most investors decline to sign NDAs for pitches. Share your pitch and keep the most sensitive details, such as source code, for later diligence.",
      },
      {
        question: "Do I need to patent my startup idea?",
        answer: "Ideas alone cannot be patented. Some inventions can, but patents are costly and slow. Many software startups rely on speed, trade secrets, copyright and trademarks instead.",
      },
      {
        question: "Who owns the code a freelancer writes for my startup?",
        answer: "It depends on your contract and local law. Without a written IP assignment, the freelancer may own it. Put an assignment clause in every contractor agreement.",
      },
    ],
    sources: [
      { title: "What is Intellectual Property?", publisher: "World Intellectual Property Organization", url: "https://www.wipo.int/about-ip/en/" },
    ],
    relatedSlugs: ["employee-stock-option-plan", "startup-funding-stages", "how-to-find-investors"],
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "pre-seed-vs-seed-funding",
    kind: "guide",
    topic: "fundraising",
    audiences: ["founder", "investor", "mentor", "program"],
    title: "Pre-Seed vs Seed Funding: What's the Difference?",
    metaTitle: "Pre-Seed vs Seed Funding: What Each Stage Expects",
    metaDescription:
      "Pre-seed funds the team and early signal; seed funds early traction. What investors expect at each stage and how to tell which one you are raising.",
    aliases: ["pre-seed round", "seed round", "pre seed vs seed", "angel round"],
    answer:
      "Pre-seed funding backs a team, an insight and early signs that the problem is real, often before revenue. Seed funding backs early traction: real users or revenue and the start of a repeatable way to win customers. Your evidence, not your ambition, decides which round you are raising.",
    sections: [
      {
        id: "pre-seed",
        heading: "What pre-seed investors expect",
        body: "- A credible founding team with a reason to win in this market\n- A sharp insight into a specific problem\n- Early evidence: [customer interviews](/startup-pedia/customer-interview-questions), a waitlist, pilots or a prototype\n- A clear plan for what the money will prove\n\nInvestors are usually angels, accelerators and pre-seed funds. The money typically funds an MVP and the first proof of demand.",
      },
      {
        id: "seed",
        heading: "What seed investors expect",
        body: "- Real usage or revenue from a defined customer\n- Early retention, showing people keep coming back\n- Signs of a repeatable acquisition channel\n- A plan to reach the milestones a Series A investor would want to see\n\nSeed rounds are larger and more competitive, and investors look harder at metrics. See [startup funding stages](/startup-pedia/startup-funding-stages) for what comes next.",
      },
      {
        id: "diagnose",
        heading: "How to tell which stage you are at",
        body: "Ask yourself:\n\n1. Do you have paying customers or consistent active users? If not, you are likely pre-seed.\n2. Do those customers stay and use the product repeatedly? Retention moves you towards seed.\n3. Can you explain where new customers come from, and is that channel growing? A repeatable channel is a seed-stage signal.\n\nPitching a seed round with pre-seed evidence is one of the most common reasons for rejection. Raising the right round at the right size is faster.",
      },
      {
        id: "round-size",
        heading: "How much to raise",
        body: "Round sizes vary widely by country, sector and market conditions, so avoid copying numbers from other companies. Instead, list the milestones that would make the next round easy, estimate what it costs to reach them, and add a buffer. Many founders plan for 18 to 24 months of runway.",
      },
      {
        id: "instruments",
        heading: "How these rounds are structured",
        body: "Pre-seed and seed rounds are often raised on convertible instruments such as SAFEs or convertible notes, which convert into shares at a later priced round. Some seed rounds are priced equity rounds. Get legal advice on the terms in your country.",
      },
    ],
    roleNotes: {
      investor: "Saying clearly which stage you invest at, and what evidence you expect there, saves founders and you from mismatched meetings.",
      program: "Many programs sit at the pre-seed stage. Helping teams build seed-level evidence by demo day is a concrete goal.",
    },
    faqs: [
      {
        question: "What is the difference between pre-seed and seed?",
        answer: "Pre-seed funds the team, insight and early signal. Seed funds early traction, such as revenue, retention and an emerging channel.",
      },
      {
        question: "How much do startups raise at pre-seed and seed?",
        answer: "It varies widely by market and region. Size the round to reach clear milestones over 18 to 24 months rather than copying other companies.",
      },
      {
        question: "Can I skip pre-seed and raise a seed round?",
        answer: "Yes, if you already have seed-level evidence, for example because you bootstrapped to revenue. The label follows the evidence.",
      },
    ],
    sources: [
      { title: "A Guide to Seed Fundraising", publisher: "Y Combinator", url: "https://www.ycombinator.com/blog/how-to-raise-a-seed-round" },
    ],
    relatedSlugs: ["startup-funding-stages", "how-to-find-investors", "pitch-deck-outline"],
    cta: {
      label: "Check your fundraising readiness",
      href: "/insighta-test",
      description: "The Fundraising Readiness Assessment shows whether your evidence matches the stage you want to raise at.",
    },
    publishedAt: "2026-06-06",
    modifiedAt: "2026-10-25",
    legacySlugs: ["pre-seed-vs-seed-funding"],
  },
  {
    slug: "pitch-deck-outline",
    kind: "guide",
    topic: "fundraising",
    audiences: ["founder", "investor", "mentor", "program"],
    title: "Pitch Deck Outline: What to Put on Each Slide",
    metaTitle: "Startup Pitch Deck Outline: What to Put on Each Slide",
    metaDescription:
      "A slide-by-slide startup pitch deck outline: problem, solution, why now, market, traction, business model, competition, team and the ask.",
    aliases: ["pitch deck template", "pitch deck structure", "investor deck", "pitch deck slides"],
    answer:
      "A strong startup pitch deck tells one story in about 10 to 15 slides: the problem, your solution, why now, the market, your traction, the business model, the competition, the team and a specific ask. Each slide should make one point and set up the next.",
    sections: [
      {
        id: "slides",
        heading: "The slides",
        body: "1. **Title:** company name and a one-line description of what you do and for whom.\n2. **Problem:** who has it, how painful it is and how they cope today. Use evidence from customers.\n3. **Solution:** what you built and the outcome it creates. Show the product if you can.\n4. **Why now:** the change in technology, regulation or behavior that makes this possible or urgent today.\n5. **Market:** the size of the opportunity, ideally bottom-up. See [TAM, SAM and SOM](/startup-pedia/tam-sam-som).\n6. **Traction:** your strongest evidence, such as revenue, growth, retention, pilots or waitlist quality.\n7. **Business model:** how you make money, your pricing and the unit economics if you have them.\n8. **Go-to-market:** how you reach customers. See [go-to-market strategy](/startup-pedia/go-to-market-strategy).\n9. **Competition:** the real alternatives, including doing nothing, and why you win.\n10. **Team:** why these people are the right ones to build this.\n11. **The ask:** how much you are raising, what it will fund and the milestones it will reach.",
      },
      {
        id: "traction-first",
        heading: "Lead with your strongest evidence",
        body: "If your traction is impressive, move it earlier, even to slide two or three. Investors decide quickly whether to keep reading, and evidence beats vision. If traction is early, use the strongest validation you have: [customer interviews](/startup-pedia/customer-interview-questions), pilot results or waitlist conversion from your target segment.",
      },
      {
        id: "tips",
        heading: "Writing tips",
        body: "- One idea per slide. If a slide needs a paragraph, split it.\n- Write slide titles as conclusions: \"Clinics lose 12% of revenue to no-shows\", not \"Problem\".\n- Use real numbers and say where they come from.\n- Keep a separate, more detailed version for follow-up meetings and diligence.",
      },
      {
        id: "ask",
        heading: "Make the ask specific",
        body: "\"We are raising $X to reach [milestone] in [months], which sets us up for [next round].\" Tie the money to evidence you will produce, not just to hiring and spending plans.",
      },
    ],
    roleNotes: {
      mentor: "Reading a deck slide titles only is a quick test. The titles alone should tell the whole story.",
      program: "A shared outline across a cohort makes demo-day decks easier for investors to compare.",
    },
    faqs: [
      {
        question: "What slides should a pitch deck have?",
        answer: "Problem, solution, why now, market, traction, business model, go-to-market, competition, team and the ask, in an order that tells one story.",
      },
      {
        question: "How long should a pitch deck be?",
        answer: "Usually 10 to 15 slides for the version you send or present. Keep extra detail in an appendix or a separate deck.",
      },
      {
        question: "What matters most in a pitch deck?",
        answer: "A clear story backed by real evidence of demand, and a specific ask tied to the milestones the round will reach.",
      },
    ],
    sources: [
      { title: "Writing a Business Plan", publisher: "Sequoia Capital", url: "https://sequoiacap.com/article/writing-a-business-plan/" },
      { title: "Pitching Your Early-Stage Startup", publisher: "Stripe Atlas", url: "https://stripe.com/guides/atlas/pitching" },
    ],
    relatedSlugs: ["how-to-get-pitch-deck-feedback", "tam-sam-som", "how-to-find-investors", "pre-seed-vs-seed-funding"],
    cta: {
      label: "Score your deck",
      href: "/pitch-deck-analyzer",
      description: "Pitch Deck Analyzer scores narrative clarity, traction, business model and fundraising readiness.",
    },
    publishedAt: "2026-05-17",
    modifiedAt: "2026-10-25",
    legacySlugs: ["startup-pitch-deck-outline"],
  },
  {
    slug: "how-to-get-pitch-deck-feedback",
    kind: "guide",
    topic: "fundraising",
    audiences: ["founder", "mentor", "investor", "program"],
    title: "How to Get Useful Pitch Deck Feedback",
    metaTitle: "How to Get Pitch Deck Feedback (and What to Ask)",
    metaDescription:
      "How to get honest pitch deck feedback before investors see it: who to ask, the questions to ask them and a checklist investors use when reviewing a deck.",
    aliases: ["pitch deck review", "pitch deck analyzer", "rate my pitch deck", "pitch deck score", "pitch deck evaluator"],
    answer:
      "Get pitch deck feedback from people who resemble your investors, ask specific questions rather than \"what do you think?\", and test whether readers can repeat your story after a quick look. Collect feedback before you contact investors, because you rarely get a second first impression.",
    steps: [
      {
        title: "Do a five-minute test",
        body: "Give someone the deck for five minutes, take it away and ask them to explain what you do, for whom, and why it will work. Gaps in their answer are gaps in your deck.",
      },
      {
        title: "Ask the right people",
        body: "Founders who raised recently at your stage, angels and mentors who invest, and people from your target customer segment, who can check the problem slide. Friends who are not investors mostly give encouragement.",
      },
      {
        title: "Ask specific questions",
        body: "\"Which slide would make you stop reading?\", \"What is the first question you would ask me?\", \"Do you believe the market size?\" and \"Is the ask clear?\" get far more useful answers than \"any thoughts?\".",
      },
      {
        title: "Look for patterns",
        body: "One person's opinion is a data point. When three reviewers stumble on the same slide, fix it.",
      },
      {
        title: "Revise, then test again",
        body: "Change the deck and repeat the five-minute test with someone new.",
      },
    ],
    sections: [
      {
        id: "checklist",
        heading: "What reviewers look for",
        body: "- **Problem and customer:** is the pain real and is the customer specific?\n- **Solution and wedge:** is it clear what you built and why it wins first?\n- **Market and timing:** is the opportunity large and is there a reason it is happening now?\n- **Traction or validation:** is the evidence easy to read and does it show change over time?\n- **Business model:** is it clear how you make money?\n- **Competition:** are the real alternatives named, honestly?\n- **Team:** why are these founders the right ones?\n- **Ask:** is the amount tied to milestones?\n\nThe [pitch deck outline](/startup-pedia/pitch-deck-outline) covers each slide in more detail.",
      },
      {
        id: "traction-legible",
        heading: "Make traction easy to read",
        body: "Reviewers most often struggle with traction slides. Show one clear chart over time, label the metric precisely (\"weekly active clinics\", not \"users\") and add one sentence on why it matters for the next milestone.",
      },
      {
        id: "investor-feedback",
        heading: "Feedback from investors who pass",
        body: "When investors decline, ask politely for the main reason. Many will give a short answer. Patterns across several \"no\"s are the most valuable feedback you can get, because they come from the people you need to convince.",
      },
    ],
    roleNotes: {
      mentor: "Specific feedback on one or two slides is more useful than general reactions to the whole deck.",
      investor: "A one-line reason when you pass helps founders improve, and it is remembered.",
      program: "Structured deck reviews with a shared checklist, before demo day, raise the quality across a cohort.",
    },
    faqs: [
      {
        question: "Where can I get feedback on my pitch deck?",
        answer: "From founders who recently raised at your stage, angels, mentors who invest, accelerator programs and structured tools that score decks against a checklist.",
      },
      {
        question: "What do investors look for first in a pitch deck?",
        answer: "A clear problem and customer, evidence of traction, a credible team and a sensible ask. Many decide within minutes whether to keep reading.",
      },
      {
        question: "Should I get pitch deck feedback before fundraising?",
        answer: "Yes. Fixing an unclear story or weak evidence before outreach avoids wasting first impressions with investors.",
      },
    ],
    sources: [
      { title: "Pitching Your Early-Stage Startup", publisher: "Stripe Atlas", url: "https://stripe.com/guides/atlas/pitching" },
      { title: "Writing a Business Plan", publisher: "Sequoia Capital", url: "https://sequoiacap.com/article/writing-a-business-plan/" },
    ],
    relatedSlugs: ["pitch-deck-outline", "how-to-find-investors", "pre-seed-vs-seed-funding"],
    cta: {
      label: "Analyze your pitch deck",
      href: "/pitch-deck-analyzer",
      description: "Upload your deck to get a score and feedback on narrative, clarity, traction, business model and readiness.",
    },
    publishedAt: "2026-05-17",
    modifiedAt: "2026-10-25",
    legacySlugs: ["pitch-deck-feedback-for-startups"],
  },
  {
    slug: "how-to-find-investors",
    kind: "guide",
    topic: "fundraising",
    audiences: ["founder", "mentor", "program"],
    title: "How to Find Investors for Your Startup",
    metaTitle: "How to Find Investors for Your Startup: A Practical Guide",
    metaDescription:
      "Find the right investors for your startup: define your fit, build a filtered shortlist of VCs and angels, map warm introductions and run a pipeline.",
    aliases: ["find investors", "vc search", "find angel investors", "investor list", "fundraising pipeline"],
    answer:
      "Finding investors is a targeting problem, not a volume problem. Define your stage, sector, location and round size, build a shortlist of investors who fund exactly that, find warm introductions to them, and manage the process like a sales pipeline.",
    steps: [
      {
        title: "Define your investor fit",
        body: "Write down your stage (see [pre-seed vs seed](/startup-pedia/pre-seed-vs-seed-funding)), sector, location, round size and the kind of help you want beyond money. This is your filter.",
      },
      {
        title: "Build a long list",
        body: "Use investor databases, the portfolios of companies similar to yours, recent funding announcements in your sector, angel networks and accelerator investor lists.",
      },
      {
        title: "Filter to a shortlist",
        body: "Keep investors who invest at your stage, in your sector and in your region, with check sizes that fit your round, and who have no direct competitor in their portfolio. A shortlist of a few dozen well-matched investors usually beats hundreds of random ones.",
      },
      {
        title: "Map warm paths",
        body: "For each name, find the shortest real connection: founders they backed, mutual contacts, mentors, programs. A warm introduction from someone the investor trusts gets a far higher response rate than a cold email.",
      },
      {
        title: "Run a pipeline",
        body: "Track every investor's status (contacted, first meeting, follow-up, diligence, decision) and next step. Try to concentrate meetings in a few weeks, which keeps momentum and lets you compare interest.",
      },
    ],
    sections: [
      {
        id: "types",
        heading: "Types of investors",
        body: "- **Angel investors:** individuals investing their own money, often first in.\n- **Pre-seed and seed funds:** small venture funds specialising in early rounds.\n- **Accelerators:** programs that invest small amounts in exchange for equity, alongside support.\n- **Venture capital firms:** larger funds that usually lead later rounds. See [VC vs PE](/startup-pedia/venture-capital-vs-private-equity).\n- **Corporate investors:** investment arms of large companies, often strategic.\n- **Alternatives:** grants, revenue-based financing and crowdfunding, depending on your country and business.",
      },
      {
        id: "cold-outreach",
        heading: "If you have to go in cold",
        body: "A well-researched cold email to a well-matched investor can still work. Mention why them specifically (a portfolio company, a thesis they published), give your strongest evidence in one line and attach or link a short deck. See [cold email for startups](/startup-pedia/cold-email-for-startups) for structure.",
      },
      {
        id: "preparation",
        heading: "Prepare before you contact anyone",
        body: "Have your deck reviewed (see [pitch deck feedback](/startup-pedia/how-to-get-pitch-deck-feedback)), your key metrics ready and a short data room with incorporation documents, cap table and financials. Investors move faster when answers are ready.",
      },
    ],
    roleNotes: {
      mentor: "An introduction from a mentor is often a founder's best route to an investor. Make it when you can honestly vouch for the team.",
      program: "Investor introductions are among the most valued things a program gives founders. Matching on stage and sector, not just inviting everyone to demo day, makes them work.",
    },
    faqs: [
      {
        question: "How do startups find investors?",
        answer: "By building a targeted list filtered by stage, sector, location and check size, then prioritising warm introductions and running the process like a pipeline.",
      },
      {
        question: "Is it better to cold email investors or get introductions?",
        answer: "Warm introductions get much higher response rates, but a researched cold email to a well-matched investor can still work.",
      },
      {
        question: "How many investors should I contact?",
        answer: "Enough well-matched targets to run a real pipeline, often a few dozen. Fit matters far more than volume.",
      },
    ],
    sources: [
      { title: "A Guide to Seed Fundraising", publisher: "Y Combinator", url: "https://www.ycombinator.com/blog/how-to-raise-a-seed-round" },
      { title: "Tips on Formation and Fundraising", publisher: "Y Combinator", url: "https://www.ycombinator.com/blog/startup-formation-and-fundraising/" },
    ],
    relatedSlugs: ["venture-capital-vs-private-equity", "pitch-deck-outline", "pre-seed-vs-seed-funding", "cold-email-for-startups"],
    cta: {
      label: "Build your investor shortlist",
      href: "/vc-search",
      description: "VC Search filters a venture capital database by stage, geography, sector and check size.",
    },
    publishedAt: "2026-06-06",
    modifiedAt: "2026-10-25",
    legacySlugs: ["how-to-find-investors-for-startup", "vc-search-for-startups"],
  },
];
