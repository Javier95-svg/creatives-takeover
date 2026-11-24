import type { PediaEntry } from "../types.ts";

// Cofounders & equity. Written from the questions founders ask most often on
// Reddit (Oct–Nov 2026 report): finding a co-founder, splitting equity,
// vesting, judging a technical co-founder and putting it in writing.
// Every number below is checked against the cited source; legal points are
// general information and say where rules differ by country.

const YC_MATCHING_DATA = "https://www.ycombinator.com/blog/what-do-people-want-in-a-co-founder";
const YC_EQUITY = "https://www.ycombinator.com/blog/splitting-equity-among-founders";
const PG_MISTAKES = "https://paulgraham.com/startupmistakes.html";
const COOLEY_FOUNDER_STOCK = "https://www.cooleygo.com/founder-basics-founders-stock";
const ORRICK_UK_VESTING =
  "https://www.orrick.com/en/tech-studio/resources/faq/What-is-vesting-Should-subscriber-shares-acquired-by-UK-founders-be-subject-to-vesting";

export const cofounderEntries: PediaEntry[] = [
  {
    slug: "how-to-find-a-cofounder",
    kind: "guide",
    topic: "cofounders",
    audiences: ["founder", "builder"],
    title: "How to Find a Co-Founder (and Know It Will Work)",
    metaTitle: "How to Find a Co-Founder (and Know It Will Work)",
    metaDescription:
      "Where founders actually meet co-founders, how to test the fit with a short trial project, and what to settle before anyone receives equity.",
    aliases: ["find a cofounder", "finding a co-founder", "cofounder matching", "how to find a technical cofounder", "cofounder search"],
    answer:
      "Most strong co-founder pairs start from people who have already worked together, so search your own network first, then use co-founder matching platforms and founder communities. Before splitting equity, work on a real, time-boxed project together, agree on hours and roles, and put vesting in place so an early split can be undone fairly.",
    steps: [
      {
        title: "Write down what the company needs, not what you want in a friend",
        body: "List the two or three hardest problems the next 18 months will bring (building the product, selling to a specific buyer, regulation) and the skills that solve them. That list, not a vague wish for \"a technical person\" or \"a business person\", is your search filter.",
      },
      {
        title: "Start with people you have already worked with",
        body: "Former colleagues, classmates you built projects with and people from open-source or side projects are the best pool, because you have already seen how they behave under pressure.",
      },
      {
        title: "Widen the search to matching platforms and communities",
        body: "Post what you are building and the skills you need where founders look: co-founder matching platforms, founder communities, hackathons and meetups in your field.",
      },
      {
        title: "Run a trial project before any equity changes hands",
        body: "Pick a piece of real work that takes two to six weeks, such as ten customer interviews or a working prototype, and do it together with a clear deadline.",
      },
      {
        title: "Settle the hard questions in writing",
        body: "Agree on equity, vesting, roles, time commitment and what happens if one of you leaves, then sign a co-founder agreement.",
      },
    ],
    sections: [
      {
        id: "why-it-matters",
        heading: "Why a co-founder is worth the search",
        body: "Paul Graham's essay on the mistakes that kill startups lists \"Single Founder\" first, arguing that \"starting a startup is too hard for one person.\" A co-founder shares the workload, catches bad ideas early and keeps morale up when progress is slow. The same essay also lists fights between founders as a common failure, which is why choosing well matters as much as finding someone at all.\n\nYou do not need a co-founder to start. Many founders begin alone, [validate the idea](/startup-pedia/how-to-validate-a-startup-idea) and look for a partner once there is evidence worth building on. Evidence also makes you a more attractive partner: people with options join projects that already show demand.",
      },
      {
        id: "where-to-look",
        heading: "Where founders actually find co-founders",
        body: "- **Your own history:** colleagues, classmates and collaborators you have shipped something with.\n- **Co-founder matching platforms:** Y Combinator runs a free co-founder matching platform, and many founder communities, including the [Creatives Takeover co-founder board](/co-founder), let you post what you are building and message founders with complementary skills.\n- **Communities in your field:** industry Slack and Discord groups, open-source projects, hackathons and meetups where the people you need already spend time.\n- **Programs:** accelerators, incubators and university entrepreneurship programs often run co-founder matching sessions. See [accelerator vs incubator](/startup-pedia/accelerator-vs-incubator) for how they differ.\n\nWhen you post, be specific. \"Seeking a technical co-founder for a B2B tool that helps clinics schedule staff; I have run 25 interviews and have three pilot clinics\" gets better replies than \"looking for a CTO for my app idea.\"",
      },
      {
        id: "what-people-look-for",
        heading: "What founders look for in a co-founder",
        body: "Three months after launching its matching platform, Y Combinator published data from about 16,000 profiles. 79% of founders cared that a co-founder could commit a certain number of hours over the next few weeks, more than any other attribute. Engineering was the most wanted skill: 62% of founders preferred a co-founder who does engineering, and among founders who are not engineers, 80% did. Only half cared where their co-founder was located.\n\nThe lesson is that commitment comes first. Agree on hours per week and on when each person can go full-time before you talk about titles.",
      },
      {
        id: "trial-project",
        heading: "How to test the fit with a trial project",
        body: "A trial project shows you how someone works, which a coffee chat cannot. Choose work the company needs anyway, set a deadline and meet weekly. Watch for:\n\n- whether they do what they said they would, on time;\n- how they handle disagreement, and whether decisions get made;\n- whether they talk to customers or avoid them;\n- whether the split of work feels fair to both of you.\n\nSome founders also work through a long list of co-founder questions together, covering money, time, roles and what success means. One pair who met through YC's matching platform answered all 50 questions in First Round's co-founder questionnaire before committing. If you are a non-technical founder, read [how to evaluate a technical co-founder](/startup-pedia/how-to-evaluate-a-technical-cofounder) before the trial starts.",
      },
      {
        id: "before-equity",
        heading: "Before anyone gets equity",
        body: "Decide the [equity split](/startup-pedia/cofounder-equity-split) only after the trial, and put every founder's shares on a [vesting schedule](/startup-pedia/founder-vesting) so that someone who leaves early does not keep a large stake. Then write it down in a [co-founder agreement](/startup-pedia/cofounder-agreement). Paul Graham notes that about 20% of the startups Y Combinator had funded at the time had a founder leave; vesting gives everyone an orderly way out if it happens to you.",
      },
    ],
    roleNotes: {
      founder: "Show progress in your post: interviews run, early users, a prototype. Evidence attracts co-founders who have other options.",
      builder: "If you are the technical person being recruited, ask to see the customer evidence and agree a trial project before committing your evenings.",
    },
    faqs: [
      {
        question: "Can I start a startup without a co-founder?",
        answer: "Yes. Many founders start alone, validate the idea and recruit a co-founder once there is evidence of demand. Investors and accelerators often prefer teams, so plan for how you will cover the skills you lack.",
      },
      {
        question: "Where can I find a technical co-founder?",
        answer: "Start with engineers you have worked with, then use co-founder matching platforms, open-source communities, hackathons and university programs. Be specific about the problem, your progress and what you bring.",
      },
      {
        question: "How long should we work together before deciding?",
        answer: "A trial project of two to six weeks on real work is common. It should be long enough to see how you handle deadlines and disagreement, and short enough that neither of you has invested too much to walk away.",
      },
      {
        question: "Should I give a co-founder equity before we work together?",
        answer: "It is safer to agree the split after a trial and to put all founder shares on a vesting schedule, so equity is earned over time rather than handed out on day one.",
      },
    ],
    sources: [
      { title: "The 18 Mistakes That Kill Startups", publisher: "Paul Graham", url: PG_MISTAKES },
      { title: "What do people want in a co-founder?", publisher: "Y Combinator", url: YC_MATCHING_DATA },
      { title: "Y Combinator Co-Founder Matching", publisher: "Y Combinator", url: "https://www.ycombinator.com/cofounder-matching" },
      { title: "Does co-founder matching work? It did for these YC companies", publisher: "Y Combinator", url: "https://www.ycombinator.com/blog/does-co-founder-matching-work" },
    ],
    relatedSlugs: ["how-to-evaluate-a-technical-cofounder", "cofounder-equity-split", "founder-vesting", "cofounder-agreement"],
    cta: {
      label: "Find a co-founder",
      href: "/co-founder",
      description: "Share what you are building, find founders with complementary skills and start a direct conversation.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
  {
    slug: "cofounder-equity-split",
    kind: "guide",
    topic: "cofounders",
    audiences: ["founder", "builder", "investor"],
    title: "How to Split Equity Between Co-Founders",
    metaTitle: "How to Split Equity Between Co-Founders",
    metaDescription:
      "Equal or unequal? How co-founders split equity, what changes when someone joins after the MVP is built, and why vesting matters more than the percentage.",
    aliases: ["cofounder equity", "founder equity split", "how much equity for a cofounder", "equity for late cofounder", "50/50 equity split"],
    answer:
      "Many experienced investors recommend an equal or close to equal split between co-founders who are committing full-time, because almost all of the work is still ahead. Adjust for real differences in capital, time or risk, not for who had the idea, and put every founder's shares on a vesting schedule so the split stays fair if someone leaves.",
    sections: [
      {
        id: "equal-split",
        heading: "The case for an equal split",
        body: "Y Combinator's Michael Seibel argues for \"equal or close to equal equity splits among founding teams.\" His reasoning is that \"all the work is ahead of you\": it can take seven to ten years to build a company of great value, so a few months of early work or the original idea should not decide ownership for a decade. He also points out that more equity means more motivation, and that investors read a lopsided split as a sign of how the CEO values the other founders.\n\nAn equal split also avoids a long negotiation at the moment you most need to trust each other. If you cannot agree on a split quickly, treat that as information about the partnership.",
      },
      {
        id: "unequal-split",
        heading: "When an unequal split is fair",
        body: "Equal is a starting point, not a rule. Real differences that often justify adjusting the split:\n\n- **Time commitment:** one founder is full-time and the other is part-time for a long period.\n- **Capital:** one founder puts in significant money, which can also be handled as a loan or an investment on separate terms.\n- **Risk:** one founder gives up a salary or a job offer to start now.\n- **Existing assets:** working code, a customer list or intellectual property that the company receives (assign it to the company in writing).\n\nWhat should not count for much on its own is having had the idea. Ideas change; execution decides whether there is a company to own.\n\nResearch by Noam Wasserman, published in Harvard Business Review as \"The Founder's Dilemma\", shows a related trade-off: founders who keep more control often end up with a less valuable company. Holding on to a larger share is not the same as owning more value.",
      },
      {
        id: "late-cofounder",
        heading: "A co-founder who joins after the MVP is built",
        body: "This is one of the most common questions founders ask. If you built a first version alone and a co-founder joins now, you can reasonably keep a larger share, but the gap should reflect what the work is worth to the company today, not the hours you spent. A prototype with no users is worth less than it feels; a product with paying customers is worth more.\n\nPractical options:\n\n- Give yourself a modest premium (for example, the next founder gets a little less than an equal share) and put both of you on the same vesting schedule from now.\n- Credit your earlier work with some vesting already completed, rather than with a much larger percentage.\n- If the new person joins much later, after a funding round or with real traction, the role may be an early employee or executive with an option grant rather than a co-founder. See [employee stock option plans](/startup-pedia/employee-stock-option-plan).",
      },
      {
        id: "vesting",
        heading: "Why vesting matters more than the percentage",
        body: "Any split can turn out wrong if a founder leaves early. [Founder vesting](/startup-pedia/founder-vesting) solves that: shares are earned over time, typically four years with a one-year cliff, and unvested shares go back to the company if someone leaves. Seibel's essay makes the same point: with a proper vesting schedule, a founder who leaves in the first year walks away with nothing.",
      },
      {
        id: "process",
        heading: "A simple process to agree the split",
        body: "1. Each founder writes down, privately, what they expect to contribute over the next two years: hours, money, skills and risk.\n2. Compare notes and discuss the differences, not the percentages.\n3. Start from an equal split and adjust only for differences you both agree are real.\n4. Put everyone on the same vesting schedule.\n5. Record it in a [co-founder agreement](/startup-pedia/cofounder-agreement) and in the company's legal documents with a lawyer in your country.",
      },
    ],
    roleNotes: {
      founder: "If the conversation about equity is painful now, it will be harder later. Have it early, with vesting in place.",
      investor: "A heavily unequal split between full-time founders is worth a question: it often says something about how the team works together.",
    },
    faqs: [
      {
        question: "Should co-founders always split equity 50/50?",
        answer: "Not always, but equal or close to equal is a sensible default for full-time co-founders, because most of the work is still ahead. Adjust for real differences in time, money or risk.",
      },
      {
        question: "How much equity should I offer a co-founder who joins after I built the MVP?",
        answer: "Usually somewhat less than an equal share, reflecting what the product is worth to the company today, with both founders on the same vesting schedule from the day they join.",
      },
      {
        question: "Does the person who had the idea get more equity?",
        answer: "Usually not much more. Ideas change quickly, and the value of the company comes from years of execution. Contributions of money, time and risk are better reasons to adjust a split.",
      },
      {
        question: "Can we change the equity split later?",
        answer: "Yes, but it gets harder after shares are issued and investors are involved. Vesting is the cleaner way to handle a founder who contributes less than expected or leaves.",
      },
    ],
    sources: [
      { title: "How to Split Equity Among Co-Founders", publisher: "Y Combinator", url: YC_EQUITY },
      { title: "The Founder's Dilemma", publisher: "Harvard Business Review", url: "https://hbr.org/2008/02/the-founders-dilemma" },
      { title: "Founder Basics: Founders' Stock", publisher: "Cooley GO", url: COOLEY_FOUNDER_STOCK },
    ],
    relatedSlugs: ["founder-vesting", "cofounder-agreement", "how-to-find-a-cofounder", "employee-stock-option-plan"],
    cta: {
      label: "Find a co-founder",
      href: "/co-founder",
      description: "Share what you are building, find founders with complementary skills and start a direct conversation.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
  {
    slug: "founder-vesting",
    kind: "term",
    topic: "cofounders",
    audiences: ["founder", "builder", "investor"],
    title: "Founder Vesting: Schedules, Cliffs and Re-Vesting",
    metaTitle: "Founder Vesting: Schedules, Cliffs and Re-Vesting",
    metaDescription:
      "What founder vesting is, how the usual four-year schedule with a one-year cliff works, why investors may ask founders to re-vest and what an 83(b) is.",
    aliases: ["vesting schedule", "vesting cliff", "reverse vesting", "re-vesting", "83(b) election", "good leaver bad leaver"],
    answer:
      "Founder vesting means a founder's shares are earned over time: if the founder leaves early, the company can take back the unvested part. The usual schedule is four years with a one-year cliff, so nothing vests in the first year, 25% vests at the first anniversary and the rest vests monthly or quarterly after that.",
    sections: [
      {
        id: "how-it-works",
        heading: "How a vesting schedule works",
        body: "Founders usually receive all their shares on day one, but the company keeps a right to buy back the unvested part if a founder leaves. This is often called reverse vesting. Cooley GO describes the typical US setup: stock \"vests in monthly or quarterly increments over four years\", often with a one-year cliff, and on departure the company can buy back the unvested shares \"at the lower of cost or the then fair market value\", which for founders is usually close to nothing.\n\nA worked example: a founder holds 4,000,000 shares on a four-year schedule with a one-year cliff.\n\n- Leaves after 10 months: 0 shares vested; the company can buy back all 4,000,000.\n- Leaves after 12 months: 1,000,000 shares vested (25%).\n- Leaves after 30 months: 2,500,000 shares vested (30/48).\n- Stays four years: all 4,000,000 vested.",
      },
      {
        id: "why",
        heading: "Why founders should want vesting",
        body: "Vesting protects the founders who stay. Without it, a co-founder who leaves after six months keeps their full stake, and the people still building the company work for years to grow its value. Paul Graham's essay on startup mistakes notes that about 20% of the startups Y Combinator had funded had a founder leave, and recommends vesting \"so there will be an orderly way for people to quit.\" Y Combinator's Michael Seibel calls four years with a one-year cliff a typical setup.\n\nThe cliff is negotiable. Some founders give themselves credit for work done before the company was formed, so part of their shares is already vested.",
      },
      {
        id: "re-vesting",
        heading: "Re-vesting when you raise money",
        body: "If founders did not set up vesting, or most of their shares have already vested, investors may ask for shares to \"revest\" from the date the investment closes. Orrick notes this for UK companies and adds that, as a company matures, the proportion of a founder's shares required to revest should shrink.\n\nRe-vesting terms are negotiable: how many shares, the start date, the length, whether there is a new cliff and whether past service counts. Ask for credit for the time you have already put in.",
      },
      {
        id: "leavers",
        heading: "Good leavers, bad leavers and acceleration",
        body: "Founder documents usually say what happens to shares depending on why someone leaves. In the UK, Orrick describes a typical pattern: a **good leaver** keeps vested shares and loses the unvested ones, while a **bad leaver** (for example, after fraud or gross misconduct) can lose vested and unvested shares. These definitions are often negotiated.\n\n**Acceleration** makes unvested shares vest early. Single-trigger acceleration happens when the company is sold; double-trigger acceleration needs a sale and the founder losing their role within a set period afterwards.",
      },
      {
        id: "83b",
        heading: "The 83(b) election (United States)",
        body: "In the US, founders who receive shares subject to vesting usually file a Section 83(b) election so that they are taxed on the shares' value when they receive them (often close to zero) rather than as each portion vests. The IRS says the election must be filed no later than 30 days after the shares are transferred, and late elections are not accepted. Since November 2024 the IRS offers Form 15620 for this election. Other countries have their own rules, so check with a local adviser.",
      },
    ],
    roleNotes: {
      founder: "Set up vesting when you incorporate, not when an investor asks. It is easier to agree while everyone is committed.",
      investor: "Founder vesting is a basic protection for the company. If it is missing, discuss re-vesting with credit for time served rather than a full reset.",
    },
    faqs: [
      {
        question: "What is a one-year cliff?",
        answer: "A period at the start of the schedule during which nothing vests. If you leave before it ends you keep nothing; at the first anniversary, the first 25% of a four-year schedule vests at once.",
      },
      {
        question: "Why would a mentor or investor ask co-founders to re-vest their shares?",
        answer: "To make sure every founder still has something to earn by staying. It is common when founders had no vesting or most shares had already vested. Negotiate credit for time already served.",
      },
      {
        question: "What happens to my vested shares if I leave?",
        answer: "Normally you keep them, though some agreements, particularly in the UK, let a bad leaver lose vested shares too. What applies to you is in your own founder documents.",
      },
      {
        question: "Do I need to file an 83(b) election?",
        answer: "In the US, founders receiving shares subject to vesting usually should, within 30 days of receiving the shares. Other countries have different rules, so ask a local tax adviser.",
      },
    ],
    sources: [
      { title: "Founder Basics: Founders' Stock", publisher: "Cooley GO", url: COOLEY_FOUNDER_STOCK },
      { title: "UK: What is vesting?", publisher: "Orrick", url: ORRICK_UK_VESTING },
      { title: "Form 15620, Section 83(b) Election", publisher: "Internal Revenue Service", url: "https://www.irs.gov/pub/irs-pdf/f15620.pdf" },
      { title: "How to Split Equity Among Co-Founders", publisher: "Y Combinator", url: YC_EQUITY },
      { title: "The 18 Mistakes That Kill Startups", publisher: "Paul Graham", url: PG_MISTAKES },
    ],
    relatedSlugs: ["cofounder-equity-split", "cofounder-agreement", "employee-stock-option-plan", "pre-seed-vs-seed-funding"],
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
  {
    slug: "how-to-evaluate-a-technical-cofounder",
    kind: "guide",
    topic: "cofounders",
    audiences: ["founder", "builder", "mentor"],
    title: "How to Evaluate a Technical Co-Founder",
    metaTitle: "How to Evaluate a Technical Co-Founder",
    metaDescription:
      "A guide for non-technical founders: how to judge a potential technical co-founder's skills, commitment and fit before you split equity or sign anything.",
    aliases: ["evaluate a cto", "non-technical founder", "vetting a technical cofounder", "how to find a cto", "technical cofounder"],
    answer:
      "As a non-technical founder, judge a technical co-founder on what they have shipped, how they make trade-offs and how they work with you, not on jargon. Look at their past work, ask a trusted engineer to review it, and run a short paid or time-boxed trial on the real product before agreeing on equity.",
    steps: [
      {
        title: "Define the technical problems first",
        body: "Write down the two or three hardest technical problems your product will face in the next 18 months. Someone who has solved similar problems is a better fit than someone with a generally impressive CV.",
      },
      {
        title: "Look at what they have shipped",
        body: "Ask for products, side projects or open-source work that real people used, and what part they built themselves.",
      },
      {
        title: "Borrow technical judgement",
        body: "Ask an engineer you trust, a mentor or a technical adviser to review their work and join one conversation.",
      },
      {
        title: "Run a trial on the real product",
        body: "Build one small, real piece together over a few weeks: a prototype of the core workflow or an integration your first customers need.",
      },
      {
        title: "Check commitment and agree terms",
        body: "Confirm hours, timing for going full-time and expectations about salary, then agree equity with vesting.",
      },
    ],
    sections: [
      {
        id: "why",
        heading: "Why the technical co-founder decision matters",
        body: "In a November 2023 YC post, Dalton Caldwell argues that founders starting a venture-funded technology company need a technical co-founder, and that no-code tools, part-time consultants and development agencies are not a substitute for one. In YC's own matching data, 80% of founders who are not engineers wanted a co-founder who does engineering.\n\nThat does not mean you cannot test the idea first. A clickable prototype or a [no-code first version](/startup-pedia/no-code-vs-code-for-mvp) is a good way to validate demand before you recruit, and it gives a technical candidate something concrete to judge.",
      },
      {
        id: "signals",
        heading: "Signals you can judge without being an engineer",
        body: "- **Shipping record:** have they taken something from idea to real users, and maintained it afterwards?\n- **Trade-offs:** ask how they would build the first version cheaply. Good answers cut scope and choose boring, proven tools; weak answers start with a complex architecture.\n- **Clear explanations:** someone who understands a system deeply can explain it simply. If you never understand their answers, that will not improve under pressure.\n- **Customer curiosity:** do they want to join customer calls, or only receive specifications?\n- **Honesty about limits:** good engineers say \"I don't know, but here is how I'd find out.\"\n- **Reliability:** in the trial, do they deliver what they promised, when they promised it?",
      },
      {
        id: "questions",
        heading: "Questions to ask in the first conversations",
        body: "1. What is the smallest version of this product you would build first, and what would you leave out?\n2. Which parts of this product are technically hard, and which only look hard?\n3. Tell me about something you built that failed. What did you change?\n4. How many hours a week can you give this for the next three months, and when could you go full-time?\n5. How would you choose a tech stack for this, and what would make you change it? (Compare their answer with [how to choose a startup tech stack](/startup-pedia/how-to-choose-a-startup-tech-stack).)\n6. What do you expect in equity, salary and decision-making?",
      },
      {
        id: "red-flags",
        heading: "Red flags",
        body: "- Wants to rebuild everything from scratch before talking to any customers.\n- Insists on a long build before showing anything to users.\n- Asks for a large equity stake with no vesting.\n- Will only work as a paid contractor but wants a co-founder title.\n- Cannot point to anything they built that is in use.\n- Dismisses your role, or you find yourself dismissing theirs.\n\nOne of these is a topic for discussion; several together usually mean the fit is wrong.",
      },
      {
        id: "after",
        heading: "After you decide",
        body: "Agree the [equity split](/startup-pedia/cofounder-equity-split), put both founders on a [vesting schedule](/startup-pedia/founder-vesting) and make sure all code written for the company is assigned to it in a [co-founder agreement](/startup-pedia/cofounder-agreement). Code that legally belongs to one person rather than the company can cause problems when you raise money or sell; see [NDAs and intellectual property](/startup-pedia/nda-and-intellectual-property).",
      },
    ],
    roleNotes: {
      founder: "Bring evidence to the first conversation: interview notes, a waitlist, a prototype. Good technical co-founders are choosing between projects too.",
      builder: "If a non-technical founder is evaluating you, ask to see their customer evidence and how they plan to reach the first users. It is a two-way test.",
      mentor: "Offer to join one technical conversation or review a candidate's work. It is one of the most useful things a mentor can do for a non-technical founder.",
    },
    faqs: [
      {
        question: "How can I evaluate a technical co-founder if I can't code?",
        answer: "Judge their shipping record, how clearly they explain trade-offs and how reliably they deliver in a short trial on real work. Ask a trusted engineer to review their past work.",
      },
      {
        question: "Should I hire a development agency instead of finding a technical co-founder?",
        answer: "An agency can build a first version, but it will not own the product long term. For a venture-funded technology company, many investors expect a technical co-founder.",
      },
      {
        question: "Should a technical co-founder get more equity?",
        answer: "Not automatically. Split based on time, risk and contribution over the coming years, with both founders on the same vesting schedule.",
      },
    ],
    sources: [
      { title: "Why you really DO need a technical co-founder", publisher: "Y Combinator", url: "https://www.ycombinator.com/blog/why-you-really-do-need-a-technical-co-founder" },
      { title: "What do people want in a co-founder?", publisher: "Y Combinator", url: YC_MATCHING_DATA },
      { title: "How to Split Equity Among Co-Founders", publisher: "Y Combinator", url: YC_EQUITY },
    ],
    relatedSlugs: ["how-to-find-a-cofounder", "cofounder-equity-split", "no-code-vs-code-for-mvp", "how-to-choose-a-startup-tech-stack"],
    cta: {
      label: "Find a co-founder",
      href: "/co-founder",
      description: "Share what you are building, find founders with complementary skills and start a direct conversation.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
  {
    slug: "cofounder-agreement",
    kind: "guide",
    topic: "cofounders",
    audiences: ["founder", "builder", "mentor"],
    title: "Co-Founder Agreement: What to Put in Writing",
    metaTitle: "Co-Founder Agreement: What to Put in Writing",
    metaDescription:
      "What a co-founder agreement should settle before you start: equity and vesting, roles, decisions, IP, time commitment and what happens if someone leaves.",
    aliases: ["founders agreement", "cofounder contract", "founder agreement template", "shareholders agreement", "cofounder dispute"],
    answer:
      "A co-founder agreement records what founders agree before it is tested: who owns how much, how shares vest, who decides what, how much time each person commits, that the company owns everything built for it, and what happens if someone leaves. Write it down early, then have a lawyer turn it into the company's legal documents.",
    sections: [
      {
        id: "why",
        heading: "Why put it in writing",
        body: "Founder disputes are common. Paul Graham lists \"Fights Between Founders\" among the mistakes that kill startups and writes that most disputes \"are not due to the situation but the people\", which makes them hard to avoid. A written agreement will not stop disagreements, but it means the big questions were answered while everyone was getting along, and it gives you a process when you are not.\n\nMany of the cofounder questions founders post online (\"am I getting screwed?\", \"he stopped working but still owns half\") would have a clear answer if the founders had written these points down.",
      },
      {
        id: "what-to-include",
        heading: "What to include",
        body: "### Equity and vesting\nEach founder's percentage, the [vesting schedule](/startup-pedia/founder-vesting) (commonly four years with a one-year cliff), any credit for past work and any acceleration on a sale. See [how to split equity](/startup-pedia/cofounder-equity-split).\n\n### Roles and decisions\nWho is responsible for what (product, sales, finance), who has the final say in each area, which decisions need everyone's agreement (raising money, hiring, selling the company) and how a deadlock is broken.\n\n### Time and money\nHours per week, when each founder goes full-time, salaries or no salaries, and how money put into the company is treated (as investment, a loan or a gift).\n\n### Intellectual property\nEverything founders create for the company, including code, designs, domains and customer lists made before incorporation, belongs to the company. Without a written assignment, the person who created it may still own it. See [NDAs and intellectual property](/startup-pedia/nda-and-intellectual-property).\n\n### Leaving\nWhat happens to vested and unvested shares when someone leaves, whether the company can buy shares back and at what price, and any good-leaver or bad-leaver rules. In the UK, for example, a good leaver typically keeps vested shares while a bad leaver can lose them all.\n\n### Confidentiality and competition\nWhat founders may and may not do on the side, and for how long after leaving, within what local law allows.",
      },
      {
        id: "how",
        heading: "How to write one",
        body: "1. Each founder answers the questions above separately, in writing.\n2. Meet and go through the differences one by one. The disagreements you find now are the cheapest you will ever have.\n3. Write a plain-language summary that everyone signs.\n4. When you incorporate, ask a startup lawyer in your country to turn the summary into the company's legal documents (founder share purchase agreements with vesting, IP assignments and a shareholders' agreement or equivalent).\n5. Revisit it when something material changes, such as a founder going part-time or a funding round.",
      },
      {
        id: "templates",
        heading: "Templates and legal advice",
        body: "Templates are useful as checklists, but company law, tax and employment rules differ by country, and a summary signed between founders may not be enforceable on its own. Law firms such as Cooley publish free founder resources; use them to prepare, then get advice before you issue shares. Paying for a few hours of a lawyer's time now is much cheaper than a founder dispute later.",
      },
    ],
    roleNotes: {
      founder: "If raising one of these topics feels awkward, raise it anyway. The awkward conversation now replaces a far worse one later.",
      mentor: "Ask the founders you work with whether they have vesting and an IP assignment in place. Missing either is a common and avoidable problem.",
    },
    faqs: [
      {
        question: "Do we need a co-founder agreement if we are friends?",
        answer: "Yes. Friendships survive disagreements more easily when the big questions were settled in advance. The agreement protects the friendship as much as the company.",
      },
      {
        question: "When should we sign a co-founder agreement?",
        answer: "Before anyone does significant work or receives shares, and certainly before you incorporate or raise money. You can sign a short summary first and formalise it at incorporation.",
      },
      {
        question: "What if a co-founder stops contributing?",
        answer: "With vesting, their unvested shares can return to the company. Without it, you are left negotiating. Define what counts as leaving and how much time each founder commits.",
      },
      {
        question: "Can I use a free template?",
        answer: "As a checklist, yes. Rules differ by country, so have a lawyer turn it into proper documents before shares are issued.",
      },
    ],
    sources: [
      { title: "The 18 Mistakes That Kill Startups", publisher: "Paul Graham", url: PG_MISTAKES },
      { title: "Founder Basics: Founders' Stock", publisher: "Cooley GO", url: COOLEY_FOUNDER_STOCK },
      { title: "UK: What is vesting?", publisher: "Orrick", url: ORRICK_UK_VESTING },
    ],
    relatedSlugs: ["founder-vesting", "cofounder-equity-split", "nda-and-intellectual-property", "how-to-find-a-cofounder"],
    cta: {
      label: "Find a co-founder",
      href: "/co-founder",
      description: "Share what you are building, find founders with complementary skills and start a direct conversation.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
];
