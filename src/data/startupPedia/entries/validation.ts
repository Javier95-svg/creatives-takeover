import type { PediaEntry } from "../types.ts";

export const validationEntries: PediaEntry[] = [
  {
    slug: "startup-idea-validation-tools",
    kind: "guide",
    topic: "validation",
    audiences: ["founder", "builder", "mentor", "program"],
    title: "Startup Idea Validation Tools: What to Use at Each Step",
    metaTitle: "Startup Idea Validation Tools: What to Use at Each Step",
    metaDescription:
      "Tools to validate a startup idea at each step: defining your customer, interviews, demand tests and scoring evidence. Plus a lean setup for solo founders.",
    aliases: ["idea validation tool", "business idea validation tool", "startup validation software", "validation tools for solo founders", "ai idea validator"],
    answer:
      "No single tool validates an idea for you. You need one tool for each step: defining the customer, finding and interviewing them, testing demand with a page or offer, and scoring the evidence. Choose the simplest tool that does each job, and judge any tool by whether it gets you real customer behavior, not just an opinion about your idea.",
    sections: [
      {
        id: "by-step",
        heading: "Tools for each step",
        body: "### 1. Define who you are validating with\nA worksheet or an ICP tool that makes you choose one segment, its pain and where to find it. See [ideal customer profile](/startup-pedia/ideal-customer-profile).\n\n### 2. Find people to talk to\nProfessional networks, communities, forums and search tools where your segment already gathers, plus a simple tracker of who you contacted. See [how to find your target audience](/startup-pedia/how-to-find-your-target-audience).\n\n### 3. Run and record interviews\nA scheduling link, a video-call tool, and somewhere to keep notes in the customer's own words. Record only with permission. Use these [interview questions](/startup-pedia/customer-interview-questions).\n\n### 4. Test demand\nA landing-page or form builder for a [waitlist](/startup-pedia/waitlist-before-mvp), a clickable demo, or a payment link for pre-orders. A small, targeted ad budget can bring qualified visitors if your channels are slow.\n\n### 5. Measure and decide\nA survey tool for the [PMF survey](/startup-pedia/product-market-fit-survey-questions) once you have users, analytics on your page, and a written decision rule: build, narrow, change direction or stop.",
      },
      {
        id: "ai-validators",
        heading: "What about AI idea validators?",
        body: "AI tools can quickly draft a customer profile, list risky assumptions, suggest interview questions and summarise notes, which saves real time. What they cannot produce is evidence: only real customers' behavior tells you whether people will act. Use AI to prepare and organise the work, then spend the saved time talking to customers.",
      },
      {
        id: "solo-founders",
        heading: "For solo founders",
        body: "Working alone, the risk is spending weeks on setup instead of evidence. Keep the stack small:\n\n- one place for your customer profile, interview notes and decisions,\n- one page or demo to test demand,\n- a fixed weekly rhythm, for example three hours: two for conversations, one for reviewing what you learned.\n\nIf a tool takes longer to set up than the test it supports, skip it.",
      },
      {
        id: "creatives-takeover",
        heading: "Doing it in Creatives Takeover",
        body: "Creatives Takeover puts these steps in one place, so the evidence from each step carries into the next:\n\n- [ICP Builder](/icp-builder) turns your idea into a saved customer profile (included in the free plan).\n- [Validate](/validate) gives you a structured plan to test demand and log what you find.\n- [Demo Studio](/demo-studio) builds an interactive demo and a public page with signup capture.\n- [PMF Lab](/pmf-lab) scores the evidence you collected.\n- [Decision Sprint](/decision-sprint) compares several ideas against the same criteria.\n\nIt is **not** a survey panel, an ad platform or a call-recording tool. If you need those, use a specialised tool alongside it.",
      },
    ],
    roleNotes: {
      founder: "Pick tools after you choose the test, not before. The test decides what you need.",
      mentor: "When a founder asks which tool to use, ask which step they are on first. Most are trying to automate a step they have not done by hand yet.",
      program: "Giving every team in a cohort the same validation workflow makes their evidence comparable. See how accelerators measure startup progress.",
    },
    faqs: [
      {
        question: "What is the best tool to validate a startup idea?",
        answer: "There is no single best tool. Use one for each step: defining the customer, interviewing, testing demand and scoring evidence. The best setup is the simplest one that gets you real customer behavior.",
      },
      {
        question: "Can an AI tool validate my startup idea?",
        answer: "It can help you prepare: drafting a customer profile, assumptions and interview questions. Validation itself needs evidence from real customers, such as conversations, signups or payments.",
      },
      {
        question: "Which validation tools suit solo founders?",
        answer: "A small stack: one place for your customer profile, notes and decisions, one landing page or demo for demand tests, and a fixed weekly rhythm for customer conversations.",
      },
    ],
    sources: [
      { title: "The Mom Test", publisher: "Rob Fitzpatrick", url: "https://www.momtestbook.com/" },
      {
        title: "How to Test Your Idea: Start With the Most Critical Hypotheses",
        publisher: "Strategyzer",
        url: "https://www.strategyzer.com/library/how-to-test-your-idea-start-with-the-most-critical-hypotheses",
      },
    ],
    relatedSlugs: ["how-to-validate-a-startup-idea", "customer-interview-questions", "waitlist-before-mvp", "product-market-fit-survey-questions"],
    cta: {
      label: "Start with your customer",
      href: "/icp-builder",
      description: "ICP Builder is the first step: it turns your idea into a saved customer profile you can validate. Included in the free plan.",
    },
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "how-to-validate-a-startup-idea",
    kind: "guide",
    topic: "validation",
    audiences: ["founder", "builder", "mentor", "program"],
    title: "How to Validate a Startup Idea Before You Build",
    metaTitle: "How to Validate a Startup Idea Before You Build",
    metaDescription:
      "A step-by-step way to validate a startup idea: pick one customer, test the pain, measure real behavior and set a rule for when to build.",
    aliases: ["idea validation", "validate business idea", "startup validation", "test a startup idea"],
    answer:
      "To validate a startup idea, pick one specific customer, confirm they already struggle with the problem, and get them to take a small action, such as booking a call, joining a waitlist or paying a deposit, before you build. Validation is evidence of behavior, not opinions about your idea.",
    steps: [
      {
        title: "Write down the riskiest assumption",
        body: "Every idea rests on a few beliefs. Usually the riskiest is that a particular group has this problem badly enough to change what they do. Write it as one sentence you could prove wrong, for example: \"Freelance designers lose at least two hours a week chasing late invoices.\"",
      },
      {
        title: "Choose one customer segment",
        body: "Validation fails when the customer is \"everyone\". Pick the group with the sharpest pain that you can reach this week. Our [ideal customer profile](/startup-pedia/ideal-customer-profile) entry explains how to narrow it.",
      },
      {
        title: "Interview for past behavior",
        body: "Talk to 5 to 10 people in that segment. Ask about the last time the problem happened, what they did, what it cost and what they have already tried. Do not pitch. Use the questions in [customer interview questions](/startup-pedia/customer-interview-questions).",
      },
      {
        title: "Test the promise with a small action",
        body: "Put the outcome you promise on a simple page and ask for a real step: join a waitlist, book a call, reply to an email or pay a refundable deposit. The [waitlist or MVP](/startup-pedia/waitlist-before-mvp) guide covers how to set this up.",
      },
      {
        title: "Score the evidence against a rule you set in advance",
        body: "Before you look at the results, write the threshold that would justify building, for example \"8 of 10 interviewees describe the problem unprompted and 30% of qualified visitors join the waitlist\". Then decide: build, narrow the segment, change the promise or stop.",
      },
    ],
    sections: [
      {
        id: "what-validation-is",
        heading: "What counts as validation",
        body: "Validation is any evidence that a specific customer has a painful problem and will act to solve it. The strongest evidence is behavior that costs the customer something: time, money, reputation or effort. The weakest is a compliment.\n\nA useful way to rank what you collect:\n\n- **Strong:** pre-orders, paid pilots, deposits, people switching from a tool they pay for, repeat usage of a rough version.\n- **Medium:** waitlist signups from people who match your customer profile, booked calls, people introducing you to colleagues with the same problem.\n- **Weak:** \"I would use that\", likes, survey answers about future behavior, interest from friends and family.\n\nIf most of your evidence sits in the weak row, you have not validated the idea yet, however positive it feels.",
      },
      {
        id: "pain-before-solution",
        heading: "Validate the pain before the solution",
        body: "Founders often test the solution first and the problem second, which is backwards. If nobody struggles with the problem, the quality of your solution does not matter. Ask how people handle the problem today. A painful workaround, such as a spreadsheet maintained every Friday, an assistant hired for the task or a tool bought and abandoned, is a strong sign the problem is real and that budget may exist.\n\nOnce the pain is clear, test whether your proposed outcome is the one they want. Only then does it make sense to test a specific product.",
      },
      {
        id: "example",
        heading: "Example",
        body: "A founder wants to build scheduling software for physiotherapy clinics. Instead of building, she calls 12 clinic managers. Nine describe double-bookings and no-shows without being prompted, and six already pay for a reminder service they dislike. She builds a one-page offer promising \"fewer no-shows without a new booking system\" and asks managers to book a 20-minute setup call. Seven of the twelve book. That is enough evidence to build a narrow first version for clinic managers, and not for the yoga studios and dentists she originally had in mind.",
      },
      {
        id: "common-mistakes",
        heading: "Common mistakes",
        body: "- **Asking people if they like the idea.** Most people are polite. Ask about their past instead.\n- **Testing with the wrong people.** Feedback from people who do not have the problem is noise.\n- **Moving the goalposts.** If you decide the threshold after seeing the results, you will always find a reason to build.\n- **Treating a waitlist as product-market fit.** Signups show interest in a promise. [Product-market fit](/startup-pedia/product-market-fit) needs usage, retention or payment.",
      },
    ],
    roleNotes: {
      founder: "Run this before you commit months of work or raise money on the idea. The evidence also becomes the first slides of your pitch deck.",
      mentor: "Ask founders for their written decision rule and the evidence against it. It turns a vague catch-up into a concrete review.",
      program: "Validation evidence is a better progress signal than attendance. Ask every team for interviews logged, the action they asked customers to take and the result.",
    },
    faqs: [
      {
        question: "What is the fastest way to validate a startup idea?",
        answer: "Define one narrow customer, talk to 5 to 10 of them about the problem, then ask them to take a small step such as booking a call or joining a waitlist. You can do this in one or two weeks without building anything.",
      },
      {
        question: "How many customer interviews do I need?",
        answer: "There is no fixed number, but patterns usually appear after 5 to 10 conversations with the same segment. Stop when new interviews mostly repeat what you have heard.",
      },
      {
        question: "Does a waitlist prove product-market fit?",
        answer: "No. A waitlist shows interest in a promise. Product-market fit needs stronger evidence, such as repeat usage, retention or customers paying.",
      },
      {
        question: "Can I validate an idea without a product?",
        answer: "Yes. Interviews, a landing page, a manual version of the service or a clickable demo can all produce real evidence before any code exists.",
      },
    ],
    sources: [
      {
        title: "How to Test Your Idea: Start With the Most Critical Hypotheses",
        publisher: "Strategyzer",
        url: "https://www.strategyzer.com/library/how-to-test-your-idea-start-with-the-most-critical-hypotheses",
      },
      { title: "The Mom Test", publisher: "Rob Fitzpatrick", url: "https://www.momtestbook.com/" },
      { title: "YC's Essential Startup Advice", publisher: "Y Combinator", url: "https://www.ycombinator.com/blog/ycs-essential-startup-advice" },
    ],
    relatedSlugs: ["customer-interview-questions", "waitlist-before-mvp", "signs-your-startup-idea-is-good", "ideal-customer-profile", "product-market-fit"],
    cta: {
      label: "Plan your validation",
      href: "/validate",
      description: "Validate turns these steps into a structured plan for testing demand and logging the evidence.",
    },
    publishedAt: "2026-05-17",
    modifiedAt: "2026-10-25",
    legacySlugs: ["how-to-validate-startup-idea"],
  },
  {
    slug: "customer-interview-questions",
    kind: "guide",
    topic: "validation",
    audiences: ["founder", "builder", "mentor", "program"],
    title: "Customer Interview Questions That Reveal Real Demand",
    metaTitle: "Customer Interview Questions for Startups (With Examples)",
    metaDescription:
      "The customer interview questions that reveal real pain and spending, the ones to avoid, and how to run and record a discovery interview.",
    aliases: ["customer discovery questions", "user interview questions", "problem interview", "customer interview template"],
    answer:
      "Good customer interview questions ask about the past, not the future: the last time the problem happened, what the person did, what it cost and what they have already tried. Avoid asking whether they would use or buy your idea, because people answer that politely, not honestly.",
    sections: [
      {
        id: "principles",
        heading: "Three rules for discovery interviews",
        body: "1. **Talk about their life, not your idea.** Keep your product out of the conversation until the end, if you mention it at all.\n2. **Ask about specifics in the past.** \"Tell me about the last time\" produces facts. \"Would you ever\" produces guesses.\n3. **Listen far more than you talk.** Aim to speak for less than a fifth of the call. Follow-up questions such as \"why was that hard?\" and \"what happened next?\" do most of the work.",
      },
      {
        id: "questions",
        heading: "The questions",
        body: "### Context\n\n- What does a typical week look like in your role?\n- Where does [the problem area] fit into that week?\n\n### The last time it happened\n\n- Tell me about the last time you dealt with [the problem].\n- What were you trying to get done?\n- What made it hard?\n- What happened as a result?\n\n### Current workarounds\n\n- How do you handle this today?\n- What tools, people or spreadsheets are involved?\n- What have you tried that did not work? Why did you stop?\n\n### Cost and priority\n\n- Roughly how much time or money does this cost you in a month?\n- Have you paid for anything to fix it? How much?\n- Where does this rank against the other problems on your plate?\n\n### Closing\n\n- Who else deals with this problem that I should talk to?\n- Can I follow up when I have something to show you?",
      },
      {
        id: "avoid",
        heading: "Questions to avoid",
        body: "- **\"Would you use a product that…?\"** People say yes to be helpful.\n- **\"How much would you pay for…?\"** Hypothetical prices are unreliable. Ask what they pay today instead.\n- **\"Do you think this is a good idea?\"** You are asking for a compliment, not information.\n- **Leading questions** such as \"Isn't it frustrating when…?\" put the answer in their mouth.",
      },
      {
        id: "running-the-interview",
        heading: "Running and recording the interview",
        body: "Book 20 to 30 minutes and tell the person you are researching a problem, not selling. Take notes in their words, not your summary, because exact phrases become your marketing copy later. Straight after each call, write three lines: the strongest pain you heard, the evidence behind it (a workaround, money spent, time lost) and anything that contradicts your assumptions.\n\nAfter 5 to 10 interviews, put the notes side by side. Look for problems described unprompted by most people, the same workaround appearing again and again, and existing spend. Those patterns are your validation evidence.",
      },
      {
        id: "example",
        heading: "Example",
        body: "Weak: \"Would you use an app that reminds you to send invoices?\" (Answer: \"Sure, probably.\")\n\nStrong: \"Tell me about the last invoice that was paid late.\" (Answer: \"A client paid 47 days late in March. I sent four emails and had to delay paying my own contractor.\") The second answer tells you the pain, its cost and the current workaround, which is manual chasing by email.",
      },
    ],
    roleNotes: {
      founder: "Interview before you build and again after launch. The questions change but the habit of asking about the past does not.",
      mentor: "Ask to read a founder's raw interview notes, not their summary. Leading questions and missing follow-ups are easy to spot.",
      program: "A shared interview template across a cohort makes evidence comparable between teams.",
    },
    faqs: [
      {
        question: "What are the best customer interview questions?",
        answer: "Questions about past behavior: the last time the problem happened, what the person did about it, what it cost and what they have tried. They reveal real demand without leading the answer.",
      },
      {
        question: "How many customer interviews should I do?",
        answer: "Usually 5 to 10 with the same segment before patterns are clear. Stop when answers start repeating, then interview a different segment if you need to compare.",
      },
      {
        question: "Should I pitch my idea during a customer interview?",
        answer: "Not in the main part of the interview. Pitching makes people polite rather than honest. If you show the idea at all, do it in the last few minutes, after you have learned about their problem.",
      },
      {
        question: "How do I find people to interview?",
        answer: "Start where your target customers already gather: professional communities, forums, LinkedIn, events and your own network's introductions. Ask each interviewee who else you should talk to.",
      },
    ],
    sources: [
      { title: "The Mom Test", publisher: "Rob Fitzpatrick", url: "https://www.momtestbook.com/" },
      {
        title: "Startup School Week 1 Recap: Kevin Hale and Eric Migicovsky",
        publisher: "Y Combinator",
        url: "https://www.ycombinator.com/blog/startup-school-week-1-recap-kevin-hale-and-eric-migicovsky/",
      },
      { title: "Practical Design: User Observation", publisher: "Y Combinator", url: "https://www.ycombinator.com/blog/practical-design-user-observation" },
    ],
    relatedSlugs: ["how-to-validate-a-startup-idea", "signs-your-startup-idea-is-good", "ideal-customer-profile", "product-market-fit-survey-questions"],
    cta: {
      label: "Log interviews in Validate",
      href: "/validate",
      description: "Turn interview notes into a structured validation plan with the evidence in one place.",
    },
    publishedAt: "2026-06-06",
    modifiedAt: "2026-10-25",
    legacySlugs: ["customer-interview-questions"],
  },
  {
    slug: "waitlist-before-mvp",
    kind: "guide",
    topic: "validation",
    audiences: ["founder", "builder"],
    title: "Waitlist or MVP: Which Should You Build First?",
    metaTitle: "Waitlist or MVP First? How Founders Should Decide",
    metaDescription:
      "Build a waitlist first when the risk is demand, and an MVP first when the risk is delivery. How to decide, set up the test and read the results.",
    aliases: ["landing page test", "fake door test", "smoke test", "pre-launch waitlist"],
    answer:
      "Build a waitlist first when your biggest unknown is whether people want the outcome. Build an MVP first when demand is already clear and the unknown is whether your product can deliver the outcome. Let the riskiest assumption decide.",
    sections: [
      {
        id: "decide",
        heading: "Decide by the riskiest assumption",
        body: "Ask which of these would kill the idea fastest if it turned out to be false:\n\n- **Demand risk:** \"Will anyone care enough to act?\" Start with a waitlist or landing page. It takes days, not months.\n- **Delivery risk:** \"Can we actually produce this outcome?\" Start with the smallest [MVP](/startup-pedia/minimum-viable-product) or a manual version of the service that proves you can deliver.\n\nMost early ideas carry demand risk, which is why a waitlist is usually the better first test. Products whose edge is technical, such as a new model or hardware, may need to prove delivery first.",
      },
      {
        id: "good-waitlist",
        heading: "What a useful waitlist page needs",
        body: "A generic \"coming soon, sign up\" page tests nothing. A useful one makes a specific promise to a specific person:\n\n- **Headline:** the outcome, for whom. \"Get paid on time without chasing clients, for freelance designers.\"\n- **Two or three lines** on how it works and what it replaces.\n- **One call to action** that costs a little effort: email plus one qualifying question, a short survey or booking a call.\n- **A follow-up plan:** email every signup within a day and ask what made them join.\n\nDrive qualified traffic to it from the places your [ideal customer](/startup-pedia/ideal-customer-profile) already spends time. Fifty visitors who match your profile tell you more than five thousand who do not.",
      },
      {
        id: "reading-results",
        heading: "How to read the results",
        body: "Look at who signed up, not just how many. Signups that match your customer profile and answer your follow-up question are real signal. Anonymous signups from a broad audience are not.\n\nUseful numbers to track are the conversion rate from qualified visitors to signups, the share of signups who reply to a follow-up, and how many agree to a call. Set the threshold that would justify building before you launch the page.\n\nIf nobody joins, that is valuable too. Before you drop the idea, check the audience, the channel and the promise. A better headline sent to the right people often changes the result.",
      },
      {
        id: "example",
        heading: "Example",
        body: "Two founders want to build a tool that turns customer support tickets into product roadmap themes. Their risk is demand: do product managers care enough? They publish a page aimed at product managers at 20 to 200 person software companies, post it in three product communities and send it to 40 people from their network. Of 180 qualified visitors, 31 join and answer a question about their current process. Twelve agree to a call. That is enough to build a narrow first version. Had it been 3 signups, they would have rewritten the promise and tested again before writing any code.",
      },
    ],
    roleNotes: {
      founder: "A waitlist also gives you your first launch audience. Keep in touch with signups while you build.",
      builder: "If you have an idea but no product yet, a waitlist is the cheapest way to find out whether the idea deserves your time.",
    },
    faqs: [
      {
        question: "Should I build a waitlist before an MVP?",
        answer: "Yes, if you still need evidence of demand. A waitlist takes days and tells you whether the promise and the audience are right before you spend months building.",
      },
      {
        question: "How many waitlist signups are enough?",
        answer: "It depends on your market and price. A better question is whether signups match your target customer and respond to follow-up. Set your threshold before launching the page.",
      },
      {
        question: "What if nobody joins my waitlist?",
        answer: "Treat it as information. Check that the right people saw it, that the promise is specific and that the call to action is clear, then test again before dropping the idea.",
      },
      {
        question: "Is a waitlist the same as a fake door test?",
        answer: "They are closely related. Both measure interest in something that does not exist yet. A fake door test usually sits inside an existing product, while a waitlist is a standalone page.",
      },
    ],
    sources: [
      { title: "Principles", publisher: "The Lean Startup", url: "https://theleanstartup.com/principles" },
    ],
    relatedSlugs: ["how-to-validate-a-startup-idea", "minimum-viable-product", "product-hunt-launch-guide", "signs-your-startup-idea-is-good"],
    cta: {
      label: "Build a demo page",
      href: "/demo-studio",
      description: "Demo Studio publishes a proof page with signup capture, so you can test the promise before building the product.",
    },
    publishedAt: "2026-05-17",
    modifiedAt: "2026-10-25",
    legacySlugs: ["waitlist-before-mvp"],
  },
  {
    slug: "signs-your-startup-idea-is-good",
    kind: "guide",
    topic: "validation",
    audiences: ["founder", "builder", "mentor", "investor"],
    title: "Signs Your Startup Idea Is Good (and When to Drop It)",
    metaTitle: "Signs Your Startup Idea Is Good, and When to Drop It",
    metaDescription:
      "The signals that a startup idea is worth building, such as pull, existing spend and urgency, plus the red flags that mean you should narrow or stop.",
    aliases: ["is my startup idea good", "startup idea red flags", "when to pivot", "good business idea"],
    answer:
      "A startup idea is good when people show pull, not just interest: they already spend money or time on the problem, they ask when they can use your solution, and they want it fixed now. Polite enthusiasm without any change in behavior is not a signal.",
    sections: [
      {
        id: "green-flags",
        heading: "Signs the idea is worth pursuing",
        body: "- **People already pay to solve it.** Existing spend, even on a poor alternative, proves budget and pain. Ask what they use today and what it costs.\n- **Pull instead of push.** Strangers ask when it will be ready, forward your page to colleagues or offer to pay early. You are not having to persuade them.\n- **Urgency.** The problem is something people are trying to fix this month, not \"someday\".\n- **A specific segment feels it most.** You can name the type of person, their situation and where to find them.\n- **The pain repeats.** It comes up every week or every month, which makes repeat usage likely.\n- **Painful workarounds.** Spreadsheets, manual processes or hired help built around the problem.",
      },
      {
        id: "red-flags",
        heading: "Red flags",
        body: "- **\"I'd use it if it were free.\"** That usually means the problem is not worth paying to solve.\n- **Everyone is the customer.** If you cannot name the first segment, you cannot reach it.\n- **Only friends and family are excited.** They are rarely the target customer and rarely honest about it.\n- **No workaround exists.** If nobody has tried to solve the problem, it may not hurt enough.\n- **Interest without action.** People say it is a great idea but will not book a call, join a list or introduce you to anyone.",
      },
      {
        id: "narrow-or-stop",
        heading: "Narrow, change or stop?",
        body: "Weak signals do not always mean a bad idea. Before you stop, try changing one variable at a time:\n\n1. **Narrow the segment.** A problem that is mild for everyone can be severe for one group.\n2. **Sharpen the pain.** Focus on the part of the problem people already spend money on.\n3. **Change the promise.** Lead with the outcome customers describe, in their words.\n\nIf two or three focused rounds still produce no urgency, no workarounds and no action, move your energy elsewhere. Stopping an idea early is a good use of [validation](/startup-pedia/how-to-validate-a-startup-idea), not a failure.",
      },
      {
        id: "example",
        heading: "Example",
        body: "A founder pitching a meal-planning app to \"busy people\" gets plenty of compliments and almost no signups. Interviews show the pain is mild for most people but severe for parents of children with food allergies, who spend hours checking labels and already pay for specialist recipe services. She narrows to that group, and 40% of the parents she speaks to join a waitlist. The idea was not bad. It was aimed at the wrong segment.",
      },
    ],
    roleNotes: {
      investor: "Existing spend and pull are the same signals you look for in diligence. Ask founders to show the behavior, not describe the enthusiasm.",
      mentor: "When a founder is attached to an idea, ask which red flags they have checked for. It is a gentler way to start the narrow-or-stop conversation.",
    },
    faqs: [
      {
        question: "How do I know if my startup idea is good?",
        answer: "Look for behavior: people already paying for workarounds, asking for access, and wanting the problem solved soon. Approval without action is a weak signal.",
      },
      {
        question: "What are the red flags of a bad startup idea?",
        answer: "An audience of \"everyone\", interest only when it is free, no existing workarounds, excitement only from friends and family, and people who praise it but will not take any next step.",
      },
      {
        question: "Should I drop an idea with no traction?",
        answer: "Not straight away. First test a narrower segment, a sharper version of the pain and a clearer promise. If focused tests still show no urgency, redirect your effort.",
      },
    ],
    sources: [
      { title: "The Mom Test", publisher: "Rob Fitzpatrick", url: "https://www.momtestbook.com/" },
      { title: "How to Get Startup Ideas", publisher: "Paul Graham", url: "https://paulgraham.com/startupideas.html" },
    ],
    relatedSlugs: ["how-to-validate-a-startup-idea", "customer-interview-questions", "ideal-customer-profile", "waitlist-before-mvp"],
    cta: {
      label: "Compare your ideas",
      href: "/decision-sprint",
      description: "Decision Sprint scores ideas side by side against the same criteria, so you can pick the strongest one.",
    },
    publishedAt: "2026-06-06",
    modifiedAt: "2026-10-25",
    legacySlugs: ["signs-your-startup-idea-is-good"],
  },
  {
    slug: "product-market-fit-survey-questions",
    kind: "guide",
    topic: "validation",
    audiences: ["founder", "builder", "investor"],
    title: "Product-Market Fit Survey Questions for Early Startups",
    metaTitle: "Product-Market Fit Survey Questions (and How to Score Them)",
    metaDescription:
      "The product-market fit survey questions to ask early users, including the very disappointed question, plus who to survey and how to read the results.",
    aliases: ["pmf survey", "sean ellis test", "very disappointed survey", "40% rule"],
    answer:
      "The best-known product-market fit survey asks active users how they would feel if they could no longer use the product. If around 40% or more answer \"very disappointed\", that is a commonly used sign of strong fit. Follow-up questions about who benefits most and why tell you how to improve.",
    sections: [
      {
        id: "core-question",
        heading: "The core question",
        body: "\"How would you feel if you could no longer use [product]?\"\n\n- Very disappointed\n- Somewhat disappointed\n- Not disappointed\n- I no longer use it\n\nThis question, popularised by growth advisor Sean Ellis, measures whether the product has become necessary rather than nice to have. The 40% \"very disappointed\" benchmark is a rule of thumb from comparing many startups, not a law. Use it to track your own trend over time.",
      },
      {
        id: "follow-ups",
        heading: "Follow-up questions",
        body: "- What type of person do you think would benefit most from [product]?\n- What is the main benefit you get from [product]?\n- How can we improve [product] for you?\n- What would you use instead if [product] were no longer available?\n\nThe answers from the \"very disappointed\" group matter most. Their description of the main benefit and of the ideal user tells you who your best customers are and what to emphasise in your [positioning](/startup-pedia/startup-positioning-examples).",
      },
      {
        id: "who-to-survey",
        heading: "Who to survey, and when",
        body: "Survey people who have used the product recently and enough to judge it, for example at least twice in the last two weeks. Including people who signed up and never came back will drag the score down and tell you little.\n\nYou need a reasonable number of responses before the percentage means anything. With very few users, read each answer individually and pair the survey with interviews.\n\nBefore you have a product, this survey does not apply. Use [customer interview questions](/startup-pedia/customer-interview-questions) about current behavior instead.",
      },
      {
        id: "reading-results",
        heading: "Reading the results",
        body: "Segment the answers. A score of 25% overall can hide 55% among one type of user, which is a strong clue about your real [ideal customer](/startup-pedia/ideal-customer-profile).\n\nCombine the survey with behavioral data: retention, frequency of use and willingness to pay. A high survey score with poor retention, or the other way round, means one of the signals is misleading and is worth investigating.",
      },
      {
        id: "example",
        heading: "Example",
        body: "A team surveys 120 active users of its note-taking app. Overall, 28% say very disappointed. Among researchers who use it to organise interview transcripts, the figure is 52%. Their main benefit is \"finding quotes again in seconds\". The team narrows its marketing and roadmap to researchers, and three months later the overall score is 41%.",
      },
    ],
    roleNotes: {
      founder: "Run the survey at regular intervals, such as every quarter, so you can see whether changes to the product move the number.",
      investor: "Ask for the raw responses and the segment breakdown, not just the headline percentage.",
    },
    faqs: [
      {
        question: "What is the most important product-market fit survey question?",
        answer: "\"How would you feel if you could no longer use this product?\" The share of active users answering \"very disappointed\" shows whether the product has become necessary.",
      },
      {
        question: "What is the 40% rule for product-market fit?",
        answer: "It is a rule of thumb that if about 40% or more of active users would be very disappointed without your product, you likely have strong product-market fit. Treat it as a guide, not a guarantee.",
      },
      {
        question: "Can surveys replace user interviews?",
        answer: "No. Surveys show patterns across many users, while interviews explain why those patterns exist. Use both.",
      },
    ],
    sources: [
      {
        title: "How Superhuman Built an Engine to Find Product/Market Fit",
        publisher: "First Round Review",
        url: "https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/",
      },
      { title: "The Only Thing That Matters", publisher: "Marc Andreessen", url: "https://pmarchive.com/guide_to_startups_part4.html" },
    ],
    relatedSlugs: ["product-market-fit", "customer-interview-questions", "how-to-validate-a-startup-idea", "net-promoter-score"],
    cta: {
      label: "Score your PMF evidence",
      href: "/pmf-lab",
      description: "PMF Lab scores the demand evidence you have collected and recommends whether to build now or keep validating.",
    },
    publishedAt: "2026-05-17",
    modifiedAt: "2026-10-25",
    legacySlugs: ["product-market-fit-survey-questions"],
  },
];
