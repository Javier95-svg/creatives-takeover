import type { PediaEntry } from "../types.ts";

// Accelerators from the founder's side: terms, equity and rejection. Written
// from the Reddit questions of Oct–Nov 2026 ("equity vs no-equity accelerator",
// "hidden fees", "rejected from YC, what next"). Program figures come from
// src/data/acceleratorTerms.ts, checked on each program's site on 2026-11-23;
// keep both in step when a program changes its terms.

const YC_DEAL = "https://www.ycombinator.com/deal";
const YC_FAQ = "https://www.ycombinator.com/faq";
const YC_SAFE = "https://www.ycombinator.com/documents";
const TECHSTARS_TERMS = "https://www.techstars.com/newsroom/investment-terms";
const SKYDECK = "https://skydeck.berkeley.edu/program/";
const FI_EQUITY = "https://fi.co/equity";

export const acceleratorGuideEntries: PediaEntry[] = [
  {
    slug: "equity-vs-no-equity-accelerator",
    kind: "guide",
    topic: "programs",
    audiences: ["founder", "builder", "program"],
    title: "Equity vs No-Equity Accelerators: What's the Difference?",
    metaTitle: "Equity vs No-Equity Accelerators: How to Choose",
    metaDescription:
      "What equity accelerators like YC and Techstars take, what no-equity programs offer instead, which ones charge fees, and how to decide if the stake is worth it.",
    aliases: ["no equity accelerator", "equity free accelerator", "accelerator equity", "is an accelerator worth the equity", "accelerator fees"],
    answer:
      "An equity accelerator invests cash and takes a stake in your company, typically 5–8% among the programs we checked. A no-equity program gives support, credits or grants without owning any of the company. The real question is whether what a program gives you is worth more than the share of your company it takes.",
    sections: [
      {
        id: "equity-programs",
        heading: "What equity accelerators take",
        body: "Equity accelerators invest a fixed amount on standard terms. Examples, checked on each program's own site in November 2026:\n\n- [Y Combinator](/insighta/accelerator/y-combinator): $500,000 in total, $125,000 on a post-money SAFE for 7% plus $375,000 on an uncapped SAFE. No fees.\n- [Techstars](/insighta/accelerator/techstars): $220,000 for a minimum of 5%, plus what its uncapped SAFE converts into. No fees.\n- [ERA](/insighta/accelerator/era): $150,000 on a post-money SAFE for 6%.\n- [Berkeley SkyDeck](/insighta/accelerator/berkeley-skydeck): $210,000 for 7.25%, plus a $7,500 program fee.\n- [Startmate](/insighta/accelerator/startmate): A$120,000 for 8%. No fees.\n- [MuckerLab](/insighta/accelerator/muckerlab): typically $100,000–$175,000 for 10–15%.\n\nThe percentage only tells part of the story. A program that adds an uncapped SAFE, like YC and Techstars, will own more after your next priced round than the headline figure. [How to read accelerator terms](/startup-pedia/accelerator-terms-explained) shows how to work it out.",
      },
      {
        id: "no-equity-programs",
        heading: "What no-equity programs offer instead",
        body: "No-equity programs are usually funded by someone with another reason to help you: a corporation that wants you on its platform, a university supporting its students, or a government building a startup ecosystem. Examples:\n\n- [Google for Startups Accelerator](/insighta/accelerator/google-for-startups-accelerator): equity-free, with product credits rather than cash.\n- [Creative Destruction Lab](/insighta/accelerator/creative-destruction-lab): no equity and no fees, with no guaranteed investment.\n- [Start-Up Chile](/insighta/accelerator/start-up-chile): equity-free funding from a government-backed program.\n- [MIT delta v](/insighta/accelerator/mit-delta-v): $75,000 in equity-free funding for its teams.\n- [StartX](/insighta/accelerator/startx): no equity and no fees for Stanford founders.\n\nThe trade-off is that most no-equity programs give little or no cash, and they are less focused on a demo day aimed at investors.",
      },
      {
        id: "fees",
        heading: "Fees: the cost founders often miss",
        body: "Some programs charge a fee instead of, or as well as, taking equity. Berkeley SkyDeck charges $7,500 per startup on top of its 7.25%. TinySeed's fee of $7,450 per founder comes out of its investment. Founder Institute charges an entrance fee that varies by chapter and takes a warrant for 2.5% of future equity. Y Combinator, Techstars and Startmate state that they charge no fees.\n\nIf a program does not publish its fee and equity terms, ask for them in writing before you accept a place. A program that will not tell you is telling you something.",
      },
      {
        id: "decide",
        heading: "How to decide whether the equity is worth it",
        body: "Giving up 7% means you own 7% less of everything the company is ever worth. That is worth paying if the program makes the company more than 7% more valuable, through money you could not otherwise raise, introductions, credibility or speed. Ask yourself:\n\n1. Could you raise the same cash from angels on better terms? See [how to raise from angels](/startup-pedia/how-to-raise-from-angels).\n2. Which specific investors, customers or mentors will you meet that you cannot reach today?\n3. What happened to companies like yours that went through it? Ask alumni directly.\n4. Do you need the structure and deadlines, or could you get them elsewhere? See [accelerator alternatives](/startup-pedia/startup-accelerator-alternatives).\n\nIf the answers are vague, a no-equity program, or no program, may serve you better.",
      },
    ],
    roleNotes: {
      founder: "Compare programs on cash, equity, fees and the introductions you will actually get, not on the brand alone.",
      program: "Founders increasingly compare terms side by side. Publishing your equity, fees and what founders get in return builds trust.",
    },
    faqs: [
      {
        question: "Is it worth giving 7% equity to an accelerator?",
        answer: "It is worth it if the program makes your company more than 7% more valuable: through capital you could not raise otherwise, introductions, credibility or speed. Ask alumni what changed for them.",
      },
      {
        question: "What is a typical accelerator equity stake?",
        answer: "Among the programs we checked, most took 5–8%: Techstars at least 5%, ERA 6%, YC 7% plus an uncapped SAFE, SkyDeck 7.25% and Startmate 8%. Some take more, such as MuckerLab at 10–15% and TinySeed at 10–12%.",
      },
      {
        question: "Do no-equity accelerators give money?",
        answer: "Some do, such as Start-Up Chile and MIT delta v, which give equity-free funding. Many give credits, workspace, mentoring or customer access instead of cash.",
      },
      {
        question: "Can an accelerator take equity and charge a fee?",
        answer: "Yes. Berkeley SkyDeck, for example, takes 7.25% and charges a $7,500 program fee. Always ask for the full terms in writing.",
      },
    ],
    sources: [
      { title: "The YC Deal", publisher: "Y Combinator", url: YC_DEAL },
      { title: "Techstars Investment Terms", publisher: "Techstars", url: TECHSTARS_TERMS },
      { title: "Cohort Program", publisher: "Berkeley SkyDeck", url: SKYDECK },
      { title: "Accelerator", publisher: "Startmate", url: "https://www.startmate.com/accelerator" },
      { title: "FAQ", publisher: "Creative Destruction Lab", url: "https://creativedestructionlab.com/faq/" },
      { title: "Founder Institute equity", publisher: "Founder Institute", url: FI_EQUITY },
    ],
    relatedSlugs: ["accelerator-terms-explained", "startup-accelerator-alternatives", "accelerator-vs-incubator", "rejected-from-an-accelerator-what-next"],
    cta: {
      label: "Compare accelerator programs",
      href: "/accelerator-hunt",
      description: "Accelerator Hunt lets you browse accelerator programs and filter them by industry and stage.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
  {
    slug: "accelerator-terms-explained",
    kind: "guide",
    topic: "programs",
    audiences: ["founder", "builder", "mentor"],
    title: "How to Read Accelerator Terms: Equity, SAFEs and Fees",
    metaTitle: "How to Read Accelerator Terms: Equity, SAFEs and Fees",
    metaDescription:
      "Read an accelerator offer before you sign: the investment instrument, the implied valuation, uncapped SAFEs, program fees, in-kind value and what you commit to.",
    aliases: ["accelerator terms", "accelerator deal", "uncapped safe", "mfn safe", "accelerator program fee", "accelerator contract"],
    answer:
      "To read an accelerator offer, check five things: how much cash you get, the instrument (SAFE, shares, warrant or revenue-based), how much of the company it buys including any uncapped SAFE, any program fee, and what you must commit to, such as relocating. Then divide the cash by the percentage to see the valuation you are accepting.",
    formulas: [
      {
        label: "Implied post-money valuation",
        expression: "Implied valuation = cash invested ÷ ownership taken",
        note: "Y Combinator's first $125,000 for 7%: $125,000 ÷ 0.07 ≈ $1.79M. ERA's $150,000 for 6%: $2.5M.",
      },
    ],
    sections: [
      {
        id: "instruments",
        heading: "The instruments you will see",
        body: "- **Post-money SAFE:** a Simple Agreement for Future Equity that converts into shares at your next priced round. With a post-money SAFE you can calculate exactly what percentage the investor will own. Y Combinator publishes its SAFE forms free and says the post-money SAFE has been its standard since 2018.\n- **Uncapped SAFE with MFN:** converts at the price of your next round, with no cap. \"MFN\" (most favored nation) means the holder can take better terms if you later give them to another SAFE investor. YC's $375,000 and Techstars' $200,000 are uncapped MFN SAFEs.\n- **Common stock:** Techstars buys common stock with $20,000, setting its minimum 5%.\n- **Warrant:** Founder Institute takes a warrant for 2.5% of future equity that activates only at a qualifying financing.\n- **Revenue-based equity:** Fledge invests for shares the company buys back over time from revenue.",
      },
      {
        id: "ownership",
        heading: "Work out what you are really giving",
        body: "Use the formula above for the priced part, then add what any uncapped SAFE will convert into. For example, if you later raise a round at a $10M post-money valuation, a $375,000 uncapped SAFE converts into roughly 3.75% (before the effects of the round itself). On top of YC's 7%, that is closer to 10.75%. The uncapped money is still useful cash; just know it is not free.",
      },
      {
        id: "fees-in-kind",
        heading: "Fees and in-kind value",
        body: "Look for fees: Berkeley SkyDeck charges $7,500 per startup, TinySeed $7,450 per founder taken from the investment, and Founder Institute an entrance fee by chapter. Then separate cash from in-kind value: HAX's first $250,000 is $150,000 in cash and $100,000 in kind. Credits and services are worth something only if you would have paid for them anyway.",
      },
      {
        id: "commitments",
        heading: "What you commit to",
        body: "Terms also include obligations. Some programs expect you to move: Entrepreneur First's second phase is in San Francisco, Parallel18 requires the team leader in Puerto Rico and most HAX teams work from Newark. Check the length, whether you must be full-time, any board or information rights, and whether the program expects to invest in later rounds.",
      },
      {
        id: "checklist",
        heading: "Questions to ask before you sign",
        body: "1. How much cash, and how much is in kind?\n2. What instrument, and what percentage does it buy today?\n3. Is there an uncapped or MFN SAFE, and how much?\n4. Is there a program fee or any other cost?\n5. Do we have to relocate, and for how long?\n6. What rights does the program get (information, pro rata, board)?\n7. Can we see the documents before accepting?\n\nGet the answers in writing, and have a startup lawyer read the documents. Founders regularly ask online whether hidden accelerator fees are normal; asking before you accept costs nothing.",
      },
    ],
    roleNotes: {
      founder: "Put every offer in the same table: cash, in-kind, instrument, ownership, fee, relocation. Differences that look small on the website become clear.",
      mentor: "Offer to read an accelerator offer with a founder before they sign. First-time founders often miss the uncapped SAFE or the fee.",
    },
    faqs: [
      {
        question: "What is an uncapped MFN SAFE?",
        answer: "A SAFE with no valuation cap that converts at your next priced round's price, and whose holder can adopt better terms you later give other SAFE investors.",
      },
      {
        question: "How do I calculate the valuation in an accelerator deal?",
        answer: "Divide the cash by the ownership taken. $125,000 for 7% implies a post-money valuation of about $1.79M; $150,000 for 6% implies $2.5M.",
      },
      {
        question: "Is it normal for accelerators to charge fees?",
        answer: "Some do and some do not. SkyDeck, TinySeed and Founder Institute publish fees; YC, Techstars and Startmate say they charge none. Ask for every fee in writing before accepting.",
      },
    ],
    sources: [
      { title: "The SAFE", publisher: "Y Combinator", url: YC_SAFE },
      { title: "The YC Deal", publisher: "Y Combinator", url: YC_DEAL },
      { title: "Techstars Investment Terms", publisher: "Techstars", url: TECHSTARS_TERMS },
      { title: "Founder Institute equity", publisher: "Founder Institute", url: FI_EQUITY },
      { title: "HAX FAQ", publisher: "HAX", url: "https://hax.co/faq/" },
      { title: "TinySeed program", publisher: "TinySeed", url: "https://tinyseed.com/program" },
    ],
    relatedSlugs: ["equity-vs-no-equity-accelerator", "pre-seed-vs-seed-funding", "founder-vesting", "startup-funding-stages"],
    cta: {
      label: "Compare accelerator programs",
      href: "/accelerator-hunt",
      description: "Accelerator Hunt lets you browse accelerator programs and filter them by industry and stage.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
  {
    slug: "rejected-from-an-accelerator-what-next",
    kind: "guide",
    topic: "programs",
    audiences: ["founder", "builder", "mentor"],
    title: "Rejected From an Accelerator? What to Do Next",
    metaTitle: "Rejected From YC or an Accelerator? What to Do Next",
    metaDescription:
      "What to do after an accelerator rejection: why programs rarely give feedback, how to diagnose what was missing, a 12-week plan and when to reapply or skip it.",
    aliases: ["rejected from yc", "yc rejection", "accelerator rejection", "reapply to yc", "rejected after yc interview"],
    answer:
      "A rejection usually means the program did not see enough evidence yet, or the timing was wrong. Most programs give no detailed feedback (YC only gives it to companies it interviewed), so diagnose the gap yourself, spend 8–12 weeks closing it with measurable progress, then reapply or raise without a program. About half of a typical YC batch applied more than once.",
    steps: [
      {
        title: "Do not wait for feedback",
        body: "Y Combinator, for example, does not give feedback on application results unless you were invited to interview. Assume you will need to find the gap yourself.",
      },
      {
        title: "Diagnose the gap honestly",
        body: "Score your application on four things: team (can you build and sell it?), problem (evidence that people have it), progress (users, revenue, growth) and clarity (can a stranger understand it in two sentences?).",
      },
      {
        title: "Pick the one thing to change",
        body: "Choose the weakest of the four and set a measurable goal for it, such as 20 customer interviews, 10 paying pilots or a working product used weekly by 30 people.",
      },
      {
        title: "Run a 12-week plan with weekly numbers",
        body: "Set weekly targets and record them. Progress over time is the strongest thing you can show in a new application.",
      },
      {
        title: "Decide: reapply, apply elsewhere or skip programs",
        body: "With the evidence in hand, reapply in the next cycle, apply to programs with different terms or raise directly from angels.",
      },
    ],
    sections: [
      {
        id: "why",
        heading: "Why good startups get rejected",
        body: "Top accelerators receive far more applications than they have places, so a rejection says little about whether your company will work. Common reasons are that the team does not yet show it can build and sell the product, the problem lacks evidence, the market looks small, or the application is hard to understand. Timing matters too: the same company can look much stronger three months later.",
      },
      {
        id: "reapply",
        heading: "Reapplying is normal",
        body: "Y Combinator's FAQ says that in a typical batch about half the companies applied multiple times before being accepted, and it encourages founders who were not accepted to apply again. When you reapply, show what changed since last time: the numbers you have now, what you learned and the decisions you made because of it.",
      },
      {
        id: "after-interview",
        heading: "If you were rejected after an interview",
        body: "Reaching the interview means your application was strong enough to look closer. Write down every question you were asked while you still remember them; the questions you struggled with usually point at the gap. If the program sends feedback, treat it as a list of things to prove, not opinions to argue with.",
      },
      {
        id: "meanwhile",
        heading: "What to use in the meantime",
        body: "You do not need to wait for a program. Y Combinator's [Startup School](https://www.startupschool.org/) is a free online course of about seven weeks, with weekly progress check-ins and co-founder matching. Other programs have different terms and criteria: see [equity vs no-equity accelerators](/startup-pedia/equity-vs-no-equity-accelerator) and [accelerator alternatives](/startup-pedia/startup-accelerator-alternatives). And the most direct fix for weak traction is still doing things that don't scale, as in [how to get your first 100 users](/startup-pedia/how-to-get-your-first-100-users).",
      },
    ],
    roleNotes: {
      founder: "Keep a short weekly log of your numbers from today. The next application is much easier to write from a log than from memory.",
      mentor: "Help the founder score their application against team, problem, progress and clarity. An outside view finds the gap faster.",
    },
    faqs: [
      {
        question: "Does YC give feedback when it rejects you?",
        answer: "Its FAQ says it does not provide feedback on application results unless you were invited to interview.",
      },
      {
        question: "Can I reapply to Y Combinator after being rejected?",
        answer: "Yes. YC encourages it and says about half the companies in a typical batch applied more than once before being accepted.",
      },
      {
        question: "What should I change before reapplying?",
        answer: "Show measurable progress since your last application, such as users, revenue, interviews or a working product, and explain what you learned and decided because of it.",
      },
    ],
    sources: [
      { title: "Frequently Asked Questions", publisher: "Y Combinator", url: YC_FAQ },
      { title: "Startup School", publisher: "Y Combinator", url: "https://www.startupschool.org/" },
      { title: "Do Things That Don't Scale", publisher: "Paul Graham", url: "https://paulgraham.com/ds.html" },
    ],
    relatedSlugs: ["startup-accelerator-alternatives", "equity-vs-no-equity-accelerator", "how-to-get-your-first-100-users", "how-to-raise-from-angels"],
    cta: {
      label: "Track weekly progress",
      href: "/traction-engine",
      description: "Traction Engine logs weekly experiments and results, so your next application shows progress over time.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
];
