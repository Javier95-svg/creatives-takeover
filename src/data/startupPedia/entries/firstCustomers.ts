import type { PediaEntry } from "../types.ts";

// First customers and validation, written from the questions founders asked
// most on Reddit in Oct–Nov 2026: "how do I find customers to talk to?",
// "how do I validate a B2B idea without it being awkward?", "how do solo
// technical founders get better at sales?", "I built it and nobody came",
// validation that never turns into payment, and "how do you find a good idea?".

const PG_DS = "https://paulgraham.com/ds.html";
const PG_IDEAS = "https://paulgraham.com/startupideas.html";
const PG_GROWTH = "https://paulgraham.com/growth.html";
const MOM_TEST = "https://www.momtestbook.com/";
const BLANK_STARTUP = "https://steveblank.com/2010/01/25/whats-a-startup-first-principles/";

export const firstCustomerEntries: PediaEntry[] = [
  {
    slug: "how-to-find-customers-to-talk-to",
    kind: "guide",
    topic: "validation",
    audiences: ["founder", "builder"],
    title: "How to Find Customers to Talk To (Before You Build)",
    metaTitle: "How to Find Customers to Talk To Before You Build",
    metaDescription:
      "Where to find people for customer discovery interviews, what to write so they say yes, how many conversations you need and how to turn each one into the next.",
    aliases: ["find people to interview", "customer discovery", "find interviewees", "who to talk to", "how to find customers"],
    answer:
      "Name a narrow group first, then go where they already are: people you know one step away, job-title searches on LinkedIn, industry communities, forums where they complain about the problem, and events. Ask for 15–20 minutes to learn how they handle the problem today, not to pitch, and end every call by asking who else you should talk to.",
    steps: [
      {
        title: "Write down exactly who you need",
        body: "One sentence: role, type of company or situation, and the problem. \"Operations managers at independent car dealerships who schedule service bays by hand\" finds people; \"small businesses\" does not. Your [ideal customer profile](/startup-pedia/ideal-customer-profile) is the starting point.",
      },
      {
        title: "Start one step from your network",
        body: "List friends, former colleagues and classmates who are in the group or know someone who is. Ask them for introductions, not for opinions.",
      },
      {
        title: "Search where they gather",
        body: "Search LinkedIn by job title and industry, join the communities they use, and read the threads where they complain about the problem.",
      },
      {
        title: "Send a short, honest request",
        body: "Say you are researching the problem, that you are not selling anything yet and that you need 15–20 minutes.",
      },
      {
        title: "Ask for the next conversation",
        body: "At the end of every call, ask who else has this problem. Referrals turn ten conversations into thirty.",
      },
    ],
    sections: [
      {
        id: "where",
        heading: "Where to find people to interview",
        body: "- **Your extended network:** former colleagues, alumni groups, family friends who work in the industry.\n- **LinkedIn:** search by job title, company size and location; message people with a specific reason for choosing them.\n- **Communities:** Reddit, Slack and Discord groups, Facebook groups and forums for the profession. Read the rules and contribute before you ask.\n- **Public complaints:** reviews of competing products, support forums and threads where people describe the problem in their own words.\n- **Events and associations:** trade shows, meetups and industry associations put dozens of your targets in one room.\n- **Walk in:** for local businesses, visiting at a quiet hour often works better than email. Paul Graham's essay on doing things that don't scale describes founders recruiting their first users by hand in exactly this way.",
      },
      {
        id: "message",
        heading: "What to write",
        body: "A message that works is short and specific:\n\n\"Hi Ana, I saw your post about juggling service-bay bookings. I'm researching how independent dealerships handle scheduling and I'm not selling anything. Could I ask you a few questions for 15 minutes this week? I'm happy to share what I learn from other dealerships.\"\n\nOffering to share what you learn gives people a reason to say yes. Then follow the interview rules in [customer interview questions](/startup-pedia/customer-interview-questions): ask about what they did in the past, not what they would do in the future.",
      },
      {
        id: "how-many",
        heading: "How many conversations you need",
        body: "Aim for 10–15 conversations with one narrow group before drawing conclusions. If the same problems, workarounds and words keep coming up, you are learning something. If every conversation is different, your group is too broad: narrow it and start again. Record each conversation in the same format so you can compare them, and track your progress as described in [measuring customer discovery progress](/startup-pedia/measuring-customer-discovery-progress).",
      },
      {
        id: "cant-find",
        heading: "If you cannot find anyone",
        body: "If you cannot find 20 people to talk to, that is information too. Either the group is very small, it gathers somewhere you have not found yet, or you are describing it in your own words instead of theirs. Search for the problem, not your solution, and look at who is talking about it.",
      },
    ],
    roleNotes: {
      founder: "Book the first five conversations this week, even if your message is not perfect. You will improve it faster by sending it.",
      builder: "If you are technical, treat interviews like debugging: you are collecting evidence about how the system (the customer's work) behaves today.",
    },
    faqs: [
      {
        question: "How do you find customers to talk to in the first place?",
        answer: "Define a narrow group, ask your network for introductions, search LinkedIn by job title, join the communities where they discuss the problem, and ask every person you speak to for a referral.",
      },
      {
        question: "How many customer interviews should I do?",
        answer: "Around 10–15 with one narrow group before drawing conclusions. Keep going until the same problems keep repeating.",
      },
      {
        question: "Should I pay people for interviews?",
        answer: "For business customers, a sincere request and an offer to share what you learn usually work. Small incentives can help for consumer interviews, but they attract people who want the reward.",
      },
    ],
    sources: [
      { title: "Do Things That Don't Scale", publisher: "Paul Graham", url: PG_DS },
      { title: "The Mom Test", publisher: "Rob Fitzpatrick", url: MOM_TEST },
      { title: "What's A Startup? First Principles", publisher: "Steve Blank", url: BLANK_STARTUP },
    ],
    relatedSlugs: ["customer-interview-questions", "how-to-validate-a-b2b-idea", "ideal-customer-profile", "measuring-customer-discovery-progress"],
    cta: {
      label: "Define who to talk to",
      href: "/icp-builder",
      description: "ICP Builder drafts an ideal customer profile with cited competitor research, so you know exactly who to look for.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
  {
    slug: "how-to-validate-a-b2b-idea",
    kind: "guide",
    topic: "validation",
    audiences: ["founder", "builder", "mentor"],
    title: "How to Validate a B2B Startup Idea (Without It Being Awkward)",
    metaTitle: "How to Validate a B2B Startup Idea",
    metaDescription:
      "Validate a B2B idea with business buyers: frame conversations as research, ask about their current process and costs, and ask for a pilot or commitment.",
    aliases: ["b2b validation", "validate b2b saas idea", "talk to business customers", "b2b customer discovery", "validate an idea with businesses"],
    answer:
      "Validate a B2B idea by learning how businesses handle the problem today, what it costs them and who decides to pay for a fix. Frame every conversation as research into their process, not a pitch, so it never feels awkward. The idea is validated when a buyer commits to something: time for a pilot, a letter of intent or a payment.",
    sections: [
      {
        id: "why-different",
        heading: "Why B2B validation is different",
        body: "In business-to-business markets the person with the problem, the person who would use your product and the person who pays are often different people. A dealership mechanic may hate the scheduling system, but the general manager signs the contract. Validation has to cover all three: is the problem real, would the users adopt a new tool, and is there a budget owner who cares enough to pay?\n\nThe good news is that business customers are easier to find and more willing to talk than consumers, because the problem costs them money.",
      },
      {
        id: "not-awkward",
        heading: "How to make it not awkward",
        body: "Awkwardness comes from pitching. People feel pressured to be polite about your idea. Remove the pitch:\n\n- Open with \"I'm researching how dealerships handle X\" rather than \"I'm building Y\".\n- Ask about their current process: \"Walk me through the last time this happened.\"\n- Ask what it costs: hours, errors, lost sales, staff turnover.\n- Ask what they have already tried, and what they pay for today.\n\nRob Fitzpatrick's book *The Mom Test* is built on this idea: ask about people's lives and past behaviour, which they know, rather than their opinion of your idea, which they will be polite about. More questions are in [customer interview questions](/startup-pedia/customer-interview-questions).",
      },
      {
        id: "signals",
        heading: "Signals that mean something",
        body: "Strong signals:\n\n- They already spend money or staff time on a workaround.\n- They describe the problem before you mention it.\n- They introduce you to a colleague or their boss.\n- They agree to a paid or time-boxed pilot.\n- They sign a [letter of intent or pre-order](/startup-pedia/pre-sales-and-letters-of-intent).\n\nWeak signals: \"That's interesting\", \"I'd use that\", \"Send me something when it's ready.\" Compliments are not commitments.",
      },
      {
        id: "process",
        heading: "A four-week B2B validation plan",
        body: "1. **Week 1:** define one segment (industry, company size, role) and list 50 companies. See [how to find customers to talk to](/startup-pedia/how-to-find-customers-to-talk-to).\n2. **Week 2:** hold 8–10 research conversations with people who have the problem.\n3. **Week 3:** speak to 3–5 budget owners. Show a simple mockup or concept page and ask what would have to be true for them to pay.\n4. **Week 4:** ask for a commitment: a pilot with success criteria, a letter of intent or a deposit. Count how many say yes.\n\nIf no one commits after real conversations, change the segment, the problem or the offer before you build.",
      },
      {
        id: "example",
        heading: "Example: an idea for car dealerships",
        body: "A founder thinks independent car dealerships need better service-bay scheduling. Instead of asking \"would you use this?\", she visits six dealerships and asks service managers to show her how they booked yesterday's appointments. Four use whiteboards and phone calls; two lost bookings last month. She then meets three general managers, shows a one-page concept and offers a 60-day pilot at a reduced price. Two agree. That is evidence worth building on.",
      },
    ],
    roleNotes: {
      founder: "Always ask who else is involved in buying. If you only ever speak to users, you have validated half the sale.",
      mentor: "Ask founders what commitment their best prospect has made. It cuts through enthusiastic interview notes.",
    },
    faqs: [
      {
        question: "How do you validate a B2B idea without it being awkward?",
        answer: "Present yourself as researching their process rather than pitching. Ask them to walk you through the last time the problem happened, what it cost and what they tried.",
      },
      {
        question: "When is a B2B idea validated?",
        answer: "When buyers commit something that costs them: a pilot with clear success criteria, a letter of intent, a deposit or a paid contract. Positive feedback alone does not count.",
      },
      {
        question: "Who should I talk to in a B2B company?",
        answer: "The people who feel the problem, the people who would use the product and the budget owner who would pay for it. They are often different people.",
      },
    ],
    sources: [
      { title: "The Mom Test", publisher: "Rob Fitzpatrick", url: MOM_TEST },
      { title: "What's A Startup? First Principles", publisher: "Steve Blank", url: BLANK_STARTUP },
      { title: "Do Things That Don't Scale", publisher: "Paul Graham", url: PG_DS },
    ],
    relatedSlugs: ["how-to-find-customers-to-talk-to", "pre-sales-and-letters-of-intent", "customer-interview-questions", "how-to-validate-a-startup-idea"],
    cta: {
      label: "Build a validation plan",
      href: "/validate",
      description: "Validate turns your customer hypothesis into a testable plan with the evidence to collect.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
  {
    slug: "pre-sales-and-letters-of-intent",
    kind: "guide",
    topic: "validation",
    audiences: ["founder", "builder", "investor"],
    title: "Pre-Sales and Letters of Intent: Validation That Pays",
    metaTitle: "Pre-Sales and Letters of Intent: Validation That Pays",
    metaDescription:
      "How to turn interest into commitment before you build: pre-orders, deposits, paid pilots and letters of intent, what each proves and how to ask for them.",
    aliases: ["pre-sell", "presales", "letter of intent", "loi", "paid pilot", "validation vs payment", "pre-order"],
    answer:
      "Pre-selling means asking customers to commit before the product is finished: a pre-order, a deposit, a paid pilot or a signed letter of intent. It is the strongest validation you can get, because it tests whether people will pay rather than whether they say they like the idea. Ask once the problem is clear and you can describe a specific first version.",
    sections: [
      {
        id: "why",
        heading: "Why interest is not validation",
        body: "Many founders run interviews, get encouraging answers, build the product and then find nobody pays. The gap is between what people say and what they do. As Steve Blank puts it, \"Most of the time the darn customers don't behave as you predicted.\" A commitment that costs the customer something, such as money, time or reputation, is the only reliable way to close that gap before you build.",
      },
      {
        id: "ladder",
        heading: "The commitment ladder",
        body: "From weakest to strongest:\n\n1. **Email signup or waitlist:** a small step. Useful for consumer products if many of the right people sign up. See [waitlist before MVP](/startup-pedia/waitlist-before-mvp).\n2. **Time:** agreeing to a second meeting, a demo with their team or a trial with real data.\n3. **Introduction:** putting you in front of their boss or budget owner.\n4. **Letter of intent (LOI):** a signed document stating the intention to buy on described terms once the product meets agreed criteria. Most are not binding, but a signature from a budget owner is a serious signal.\n5. **Deposit or pre-order:** money paid in advance, refundable or not.\n6. **Paid pilot:** a paid, time-boxed trial with success criteria agreed in advance.",
      },
      {
        id: "how-to-ask",
        heading: "How to ask",
        body: "Ask at the end of a conversation where the customer has described the problem in detail. Be specific about what they get, when and at what price:\n\n\"Based on what you've told me, we're building X to solve Y. We'll have a first version in eight weeks. We're taking five pilot customers at $500 a month for three months, refundable if it doesn't cut your booking time in half. Would you be one of them?\"\n\nA clear offer with a clear outcome is easier to say yes to than \"would you pay for this?\" If they hesitate, ask what would have to be true for them to say yes. That answer is your product specification.",
      },
      {
        id: "consumer",
        heading: "For consumer products",
        body: "Individual customers rarely sign letters of intent. Use a concept page with a price and a pre-order or deposit button, and measure how many visitors from your target audience try to pay. Even a refundable $5 deposit separates real interest from curiosity. Tell people honestly what they are paying for and when they will get it.",
      },
      {
        id: "what-if-no",
        heading: "If nobody commits",
        body: "That is the cheapest failure you will ever have. Look at the reasons: the problem is not painful enough, the wrong person was asked, the price is wrong or the offer was vague. Change one thing and ask again. If a dozen qualified buyers still say no, the evidence is telling you to change the idea. See [signs your startup idea is good](/startup-pedia/signs-your-startup-idea-is-good).",
      },
    ],
    roleNotes: {
      founder: "Count commitments, not compliments. Five paid pilots beat fifty enthusiastic interviews.",
      investor: "Pre-sales and paid pilots are among the clearest early evidence a pre-revenue team can show.",
    },
    faqs: [
      {
        question: "Is a letter of intent legally binding?",
        answer: "Most letters of intent used for validation are written to be non-binding. Their value is the signal that a budget owner put their name to it. Take legal advice if you intend it to bind.",
      },
      {
        question: "Can you pre-sell a product that doesn't exist yet?",
        answer: "Yes, if you are honest about what exists, what the customer will get and when, and you offer a refund if you cannot deliver.",
      },
      {
        question: "How many pre-sales do I need before building?",
        answer: "There is no fixed number, but a handful of paying or committed customers from one clear segment is far stronger evidence than any number of interviews.",
      },
    ],
    sources: [
      { title: "What's A Startup? First Principles", publisher: "Steve Blank", url: BLANK_STARTUP },
      { title: "The Mom Test", publisher: "Rob Fitzpatrick", url: MOM_TEST },
      { title: "Do Things That Don't Scale", publisher: "Paul Graham", url: PG_DS },
    ],
    relatedSlugs: ["how-to-validate-a-b2b-idea", "waitlist-before-mvp", "signs-your-startup-idea-is-good", "how-to-validate-a-startup-idea"],
    cta: {
      label: "Publish a concept page",
      href: "/demo-studio",
      description: "Demo Studio publishes a concept page that collects signups, so you can test demand before you build.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
  {
    slug: "how-to-find-a-startup-idea",
    kind: "guide",
    topic: "validation",
    audiences: ["founder", "builder"],
    title: "How to Find a Good Startup Idea",
    metaTitle: "How to Find a Good Startup Idea (and Test It Fast)",
    metaDescription:
      "Where good startup ideas come from: problems you have seen up close, work that is tedious for others and changes in technology, plus a quick way to test one.",
    aliases: ["startup ideas", "how to come up with a startup idea", "find a saas idea", "business idea", "what should I build"],
    answer:
      "Good startup ideas usually come from noticing problems, not from brainstorming. Look at work you know well, problems you or people around you have, tasks others avoid because they are tedious, and what new technology makes possible. Then test the idea quickly with real conversations before you build anything.",
    sections: [
      {
        id: "notice",
        heading: "Notice problems instead of inventing ideas",
        body: "Paul Graham's essay on startup ideas opens with: \"The way to get startup ideas is not to try to think of startup ideas.\" Ideas that are brainstormed tend to sound plausible but solve problems nobody has. Y Combinator calls ideas that grow out of founders' own experience \"organic\" ideas, and they tend to be better because the founder already knows the problem is real.\n\nA practical way to start is to keep a list for two weeks of every time you or someone around you is frustrated, waits, does something by hand or pays for something clumsy.",
      },
      {
        id: "where",
        heading: "Where to look",
        body: "- **Your work:** processes in your industry that are still run on spreadsheets, email or paper.\n- **Your skills:** if you are a developer, the tools developers complain about; if you are a nurse, the admin nurses hate.\n- **Tedious work:** problems others avoid because they are boring or hard. Paul Graham calls this the schlep, and notes that a startup will be laborious whatever you choose, so an unglamorous problem is no reason to avoid it.\n- **Change:** new technology, regulation or behaviour that makes something possible or necessary for the first time.\n- **Communities:** threads where people ask for a tool, complain about an existing one or describe their workaround.",
      },
      {
        id: "full-stack-dev",
        heading: "If you can build but don't know what to build",
        body: "Developers often start with the solution. Turn it around: pick a group you can reach, such as freelancers, clinics or online sellers, talk to ten of them about their week and write down every manual or repeated task. Choose the one that comes up most often and costs the most time or money. That is a better starting point than any list of SaaS ideas, because you will already have ten people to test it with.",
      },
      {
        id: "test",
        heading: "Test an idea in two weeks",
        body: "1. Write the idea as \"[group] struggles with [problem] and currently [workaround].\"\n2. Talk to 10 people in the group. See [how to find customers to talk to](/startup-pedia/how-to-find-customers-to-talk-to).\n3. Check the [signs that a startup idea is good](/startup-pedia/signs-your-startup-idea-is-good): frequency, cost, existing spending, urgency.\n4. Ask for a small commitment, such as a waitlist signup or a pilot.\n\nIf you are choosing between several ideas, test them against the same criteria and compare the evidence rather than your enthusiasm.",
      },
      {
        id: "doubt",
        heading: "When you swing between \"this will work\" and \"this is pointless\"",
        body: "Every founder does. The fix is to replace feelings with evidence: set a weekly number you can move (conversations held, signups, commitments) and judge the idea by the trend, not by your mood on a given day. If the evidence stays flat after a fair test, change the idea; if it moves, keep going.",
      },
    ],
    roleNotes: {
      founder: "Pick the idea you can test fastest with people you can reach, not the one that sounds biggest.",
      builder: "Your technical skill is an advantage once you know the problem. Spend the first two weeks on conversations, not code.",
    },
    faqs: [
      {
        question: "How do you find a good startup idea?",
        answer: "Notice problems in work and life you know well, especially tedious ones and ones new technology makes solvable, then test the idea with real conversations before building.",
      },
      {
        question: "What is an organic startup idea?",
        answer: "Y Combinator's term for an idea that grows out of the founders' own experience, rather than one invented in a brainstorm.",
      },
      {
        question: "How do I choose between several startup ideas?",
        answer: "Test each one against the same criteria (how often the problem occurs, what it costs, whether people already pay to solve it) and pick the one with the strongest evidence.",
      },
    ],
    sources: [
      { title: "How to Get Startup Ideas", publisher: "Paul Graham", url: PG_IDEAS },
      { title: "Do Things That Don't Scale", publisher: "Paul Graham", url: PG_DS },
    ],
    relatedSlugs: ["signs-your-startup-idea-is-good", "how-to-validate-a-startup-idea", "how-to-find-customers-to-talk-to", "startup-idea-validation-tools"],
    cta: {
      label: "Compare your ideas",
      href: "/decision-sprint",
      description: "Decision Sprint compares ideas side by side against the same criteria.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
  {
    slug: "sales-for-technical-founders",
    kind: "guide",
    topic: "growth",
    audiences: ["founder", "builder", "mentor"],
    title: "Sales for Technical Founders: How to Sell When You'd Rather Build",
    metaTitle: "Sales for Technical Founders: A Practical Guide",
    metaDescription:
      "How solo technical founders can learn founder-led sales: build a prospect list, run discovery calls, demo the outcome, follow up and track a simple pipeline.",
    aliases: ["founder led sales", "technical founder sales", "how to sell as a developer", "solo founder sales", "b2b sales for founders"],
    answer:
      "Sales for a technical founder is a repeatable process, not a personality: build a short list of the right prospects, have conversations about their problem, show how your product changes the outcome, ask for a clear next step and follow up. Paul Graham notes that at least one founder, usually the CEO, has to spend a lot of time on sales; early on, that is you.",
    steps: [
      {
        title: "Build a list of 50 prospects",
        body: "Named people at companies that fit your [ideal customer profile](/startup-pedia/ideal-customer-profile). Fifty well-chosen names beat five hundred scraped ones.",
      },
      {
        title: "Start conversations, not pitches",
        body: "Reach out with a specific reason and ask for a short call about their problem. See [cold email for startups](/startup-pedia/cold-email-for-startups).",
      },
      {
        title: "Run a discovery call",
        body: "Spend most of the call asking how they handle the problem today, what it costs and who else is involved.",
      },
      {
        title: "Demo the outcome, not the features",
        body: "Show the one workflow that solves the problem they just described, using their words.",
      },
      {
        title: "Ask for a next step and follow up",
        body: "Every call ends with a dated next step: a trial, a meeting with the budget owner, a pilot. Follow up within 24 hours.",
      },
    ],
    sections: [
      {
        id: "mindset",
        heading: "Why technical founders struggle with sales, and why they shouldn't",
        body: "Many developers think of sales as persuasion. Early sales is closer to debugging: you are finding out whether a specific customer has a specific problem and whether your product fixes it. You already have the most useful sales skill, which is understanding exactly what the product can and cannot do. Customers trust a founder who answers technical questions honestly more than a polished pitch.",
      },
      {
        id: "collison",
        heading: "Do it by hand first",
        body: "In \"Do Things That Don't Scale\", Paul Graham writes that \"the most common unscalable thing founders have to do at the start is to recruit users manually.\" He describes Stripe's founders setting new users up on the spot rather than sending a link, a technique Y Combinator calls the \"Collison installation\". The lesson for technical founders is to stay with the customer until they are using the product, rather than hoping a signup turns into usage.",
      },
      {
        id: "discovery",
        heading: "Discovery questions that work",
        body: "- \"Walk me through the last time this happened.\"\n- \"What did it cost you, in hours or money?\"\n- \"What have you tried already? Why didn't it work?\"\n- \"Who else would be involved in deciding to fix this?\"\n- \"If this worked, what would change for you next month?\"\n\nListen for numbers and names. They tell you the size of the problem and who the buyer is. More in [customer interview questions](/startup-pedia/customer-interview-questions).",
      },
      {
        id: "pipeline",
        heading: "Track a simple pipeline",
        body: "A spreadsheet is enough: one row per prospect with the stage (contacted, call held, demo, pilot, paying), the next step and its date. Review it weekly. The numbers tell you where you are stuck: few replies means the list or message is wrong; calls but no pilots means the offer or the fit is wrong. Block a fixed sales time in your calendar, for example every morning before you code, so building never crowds it out.",
      },
      {
        id: "pricing",
        heading: "Asking for money",
        body: "Ask for payment earlier than feels comfortable. A paid pilot tells you more than a free trial, and charging something from the start avoids the hard conversation later. See [pre-sales and letters of intent](/startup-pedia/pre-sales-and-letters-of-intent).",
      },
    ],
    roleNotes: {
      founder: "Set a weekly target for conversations, not just closed deals. Conversations are the input you control.",
      builder: "If you are the technical co-founder, join sales calls. Hearing the problem first-hand makes your product decisions better.",
      mentor: "Role-play a discovery call with a technical founder. One practice session usually removes most of the fear.",
    },
    faqs: [
      {
        question: "How do solo technical founders get better at sales?",
        answer: "By treating sales as a process: a short list of the right prospects, discovery calls about their problem, a demo of the outcome, a clear next step and weekly review of a simple pipeline.",
      },
      {
        question: "Should a technical founder hire a salesperson early?",
        answer: "Usually not before you have closed the first customers yourself. You need to learn what sells and why before you can teach someone else.",
      },
      {
        question: "How much time should a founder spend on sales?",
        answer: "Early on, a large share of the week. Paul Graham notes that at least one founder, usually the CEO, has to spend a lot of time on sales and marketing.",
      },
    ],
    sources: [
      { title: "Do Things That Don't Scale", publisher: "Paul Graham", url: PG_DS },
      { title: "The Mom Test", publisher: "Rob Fitzpatrick", url: MOM_TEST },
    ],
    relatedSlugs: ["cold-email-for-startups", "how-to-get-your-first-100-users", "pre-sales-and-letters-of-intent", "go-to-market-strategy"],
    cta: {
      label: "Plan your outreach",
      href: "/go-to-market",
      description: "GTM Strategist ranks channels against your weekly time and budget and gives you a six-week plan with outreach assets.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
  {
    slug: "built-it-nobody-came",
    kind: "guide",
    topic: "growth",
    audiences: ["founder", "builder", "mentor"],
    title: "Built It and Nobody Came: How to Diagnose Why",
    metaTitle: "Built It and Nobody Came? How to Diagnose Why",
    metaDescription:
      "Launched and no one signed up or paid? Find where your funnel breaks (traffic, signups, activation or payment) and what to change at each stage.",
    aliases: ["no users after launch", "no customers", "nobody signs up", "launched and no traction", "few signups no paying customers"],
    answer:
      "When nobody comes, find where the funnel breaks. No visitors is a distribution problem; visitors who don't sign up is a message or audience problem; signups who never use it is an activation or product problem; users who won't pay is a value or pricing problem. Measure each stage for one week, fix the first broken one and talk to the people who dropped off.",
    sections: [
      {
        id: "funnel",
        heading: "Find the stage that breaks",
        body: "Write down last week's numbers for each stage:\n\n1. **Reach:** how many people from your target audience saw the product?\n2. **Signup:** how many of them signed up or got in touch?\n3. **Activation:** how many reached the core outcome (sent the first invoice, booked the first appointment)?\n4. **Return:** how many came back the following week?\n5. **Payment:** how many paid?\n\nThe first stage with a very small number is your problem. Fixing later stages first is wasted work: better pricing does not help if no one sees the page.",
      },
      {
        id: "no-reach",
        heading: "No visitors: a distribution problem",
        body: "\"Building is easy and marketing is hard\" is a common complaint, and for good reason. Most products do not spread by themselves. If few people from your audience have seen the product, go to them directly: personal outreach, communities, partners who already reach them. See [how to get your first 100 users](/startup-pedia/how-to-get-your-first-100-users) and [go-to-market strategy](/startup-pedia/go-to-market-strategy).",
      },
      {
        id: "no-signups",
        heading: "Visitors but no signups: a message or audience problem",
        body: "Either the wrong people are arriving or the right people do not understand why it matters to them. Check where visitors come from. Then rewrite the first line of your page in the customer's own words, describing the problem and the outcome rather than features. Five short conversations with people who left without signing up usually show the gap.",
      },
      {
        id: "no-activation",
        heading: "Signups but no usage: an activation or problem gap",
        body: "Onboard the next ten users yourself, on a call, and watch where they get stuck. If they get stuck on setup, shorten it. If they finish setup and still don't come back, the problem may not be painful enough, or you are solving it for the wrong group. That is a validation question, not a growth one; see [how to validate a startup idea](/startup-pedia/how-to-validate-a-startup-idea).",
      },
      {
        id: "no-payment",
        heading: "Usage but no payment: a value or pricing problem",
        body: "\"I already know my ICP, I have no paying customers yet, and only a few signups\" is a common situation. Ask your most active users directly what it would take for them to pay, and offer a paid plan or pilot with a clear outcome. If even active users will not pay anything, the product may be nice to have rather than necessary. [Pre-sales and letters of intent](/startup-pedia/pre-sales-and-letters-of-intent) shows how to test payment before building more.",
      },
      {
        id: "pace",
        heading: "How fast is fast enough?",
        body: "Paul Graham writes that a good growth rate during Y Combinator is 5–7% a week, and 10% a week is exceptional. Use it as a reference for weekly progress once you have users, not as a verdict in the first month. What matters most early is that the number moves in the right direction week after week.",
      },
    ],
    roleNotes: {
      founder: "Pick one stage to fix this week and one number to move. Changing everything at once makes it impossible to learn what worked.",
      mentor: "Ask for the funnel numbers before giving advice. Most \"nobody came\" problems are one specific stage.",
    },
    faqs: [
      {
        question: "Why does nobody use my product after launch?",
        answer: "Usually because one funnel stage is broken: not enough of the right people see it, the message does not land, setup is too hard, or the problem is not painful enough. Measure each stage to find out which.",
      },
      {
        question: "I know my ICP but have no paying customers. What should I do?",
        answer: "Check whether those customers actually see your product, then ask your most active users what would make them pay and offer a paid pilot with a clear outcome.",
      },
      {
        question: "Should I add more features if nobody signs up?",
        answer: "Rarely. Low signups are usually a distribution or message problem. Features help only once people are using the product and asking for them.",
      },
    ],
    sources: [
      { title: "Do Things That Don't Scale", publisher: "Paul Graham", url: PG_DS },
      { title: "Startup = Growth", publisher: "Paul Graham", url: PG_GROWTH },
      { title: "What's A Startup? First Principles", publisher: "Steve Blank", url: BLANK_STARTUP },
    ],
    relatedSlugs: ["how-to-get-your-first-100-users", "go-to-market-strategy", "pre-sales-and-letters-of-intent", "product-market-fit"],
    cta: {
      label: "Track your funnel weekly",
      href: "/traction-engine",
      description: "Traction Engine logs weekly acquisition experiments and cohort retention, so you can see which stage is improving.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
];
