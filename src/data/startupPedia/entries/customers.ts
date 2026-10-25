import type { PediaEntry } from "../types.ts";

export const customerEntries: PediaEntry[] = [
  {
    slug: "ideal-customer-profile",
    kind: "term",
    topic: "customers",
    audiences: ["founder", "builder", "mentor", "service-provider", "program"],
    title: "Ideal Customer Profile (ICP): What It Is and How to Define One",
    metaTitle: "What Is an Ideal Customer Profile (ICP)? How to Define One",
    metaDescription:
      "An ideal customer profile (ICP) describes the customers most likely to need your product first. What it includes, ICP vs persona, and how to define one.",
    acronyms: ["ICP"],
    aliases: ["ideal customer", "how to define icp", "icp meaning", "best-fit customer"],
    answer:
      "An ideal customer profile (ICP) is a description of the type of customer who gets the most value from your product and is most likely to buy it first. For an early startup, it is the narrow segment with the sharpest pain that you can reach today.",
    sections: [
      {
        id: "what-it-includes",
        heading: "What an ICP includes",
        body: "A useful early-stage ICP answers five questions:\n\n- **Who** is the customer? For business products, the type of company and the role. For consumer products, the situation the person is in.\n- **What job** are they trying to get done, and what blocks them?\n- **How do they cope today?** The current workaround or alternative.\n- **Why now?** The trigger that makes them look for a solution this month.\n- **Where can you reach them?** The communities, events, searches or channels they already use.\n\nA business ICP might read: \"Operations managers at logistics companies with 50 to 300 drivers who still plan routes in spreadsheets and are under pressure to cut fuel costs this year.\"",
      },
      {
        id: "icp-vs-persona",
        heading: "ICP vs buyer persona vs target audience",
        body: "- **Target audience** is the broad group who could use the product. See [how to find your target audience](/startup-pedia/how-to-find-your-target-audience).\n- **ICP** is the best-fit segment inside that audience, defined by pain, urgency and fit rather than demographics.\n- **Buyer persona** is a fictional portrait of an individual within the ICP: their goals, objections and habits. In business sales, one ICP can contain several personas, such as the user, the budget holder and the IT approver.\n\nStart with the ICP. Personas are more useful once you know which segment you are selling to.",
      },
      {
        id: "how-to-define",
        heading: "How to define your ICP",
        body: "1. **List the segments that might have the problem.** Write down five to ten, as specifically as you can.\n2. **Rank them by urgency and reach.** Score each on how painful the problem is, whether they already spend money on it, and how easily you can reach them.\n3. **Pick one.** Choose the segment with the best combination of urgency and reach. You are choosing where to start, not where to stay.\n4. **Write the ICP sentence** using the five questions above.\n5. **Test it.** Interview people who match it. If they do not recognise the pain, adjust the segment rather than the product.\n\nThe [ICP template](/startup-pedia/ideal-customer-profile-template) gives you a fill-in version of these steps.",
      },
      {
        id: "example",
        heading: "Example",
        body: "A founder building bookkeeping software first says the ICP is \"small businesses\". Ranked by urgency and reach, one segment stands out: independent restaurants with two to five locations, whose owners reconcile supplier invoices by hand every week and already pay an outside bookkeeper. That narrower ICP tells her which interviews to run, which features matter (supplier invoice matching) and where to find customers (restaurant owner groups and supplier events).",
      },
      {
        id: "mistakes",
        heading: "Common mistakes",
        body: "- **Describing demographics instead of pain.** \"Women aged 25 to 40\" says nothing about the problem.\n- **Several ICPs at once.** Early on, more than one ICP splits your interviews, message and roadmap.\n- **Never revisiting it.** Your ICP should change as evidence comes in, especially after your first paying customers.",
      },
    ],
    roleNotes: {
      founder: "Your ICP should decide your interview list, your landing page headline and your first channel. If it does not change any of those, it is too vague.",
      "service-provider": "The same exercise applies to a service business: an agency with a sharp ICP wins more of the right clients.",
      program: "Asking every team in a cohort to state its ICP in one sentence is a quick way to see who is ready for validation.",
    },
    faqs: [
      {
        question: "What does ICP stand for?",
        answer: "ICP stands for ideal customer profile: the type of customer who gets the most value from your product and is most likely to buy first.",
      },
      {
        question: "How narrow should an early ICP be?",
        answer: "Narrow enough that you know where to find these customers and what message would make them stop. You can widen it once one segment is clearly working.",
      },
      {
        question: "Should I define my ICP before building an MVP?",
        answer: "Yes. The ICP decides what the MVP needs to prove, which features matter and who you should interview first.",
      },
      {
        question: "Can a startup have more than one ICP?",
        answer: "Later, yes. Early on, one primary ICP keeps your interviews, messaging and product focused.",
      },
    ],
    sources: [
      { title: "The Value Proposition Canvas", publisher: "Strategyzer", url: "https://www.strategyzer.com/library/the-value-proposition-canvas" },
      {
        title: "Market Research and Competitive Analysis",
        publisher: "U.S. Small Business Administration",
        url: "https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis",
      },
    ],
    relatedSlugs: ["ideal-customer-profile-template", "how-to-find-your-target-audience", "unique-selling-proposition", "how-to-validate-a-startup-idea"],
    cta: {
      label: "Build your ICP",
      href: "/icp-builder",
      description: "ICP Builder turns your idea into a saved ideal customer profile you can use for interviews and positioning. Included in the free plan.",
    },
    publishedAt: "2026-05-17",
    modifiedAt: "2026-10-25",
    legacySlugs: ["how-to-define-icp-for-startup"],
  },
  {
    slug: "unique-selling-proposition",
    kind: "term",
    topic: "customers",
    audiences: ["founder", "builder", "service-provider"],
    title: "Unique Selling Proposition (USP): Meaning and Examples",
    metaTitle: "What Is a Unique Selling Proposition (USP)? With Examples",
    metaDescription:
      "A unique selling proposition (USP) is the specific reason a customer should choose you over the alternatives. How to write one, with examples.",
    acronyms: ["USP"],
    aliases: ["unique selling point", "usp meaning", "value proposition", "differentiation"],
    answer:
      "A unique selling proposition (USP) is the one clear reason your target customer should choose you over every alternative, including doing nothing. It names a benefit that matters to that customer and that competitors do not offer in the same way.",
    sections: [
      {
        id: "usp-vs-value-proposition",
        heading: "USP vs value proposition",
        body: "The terms overlap. A **value proposition** explains the value you create for a customer: the problem you solve and the outcome they get. A **USP** is the part of that value which is distinctive, the reason to pick you instead of someone else.\n\nYou can have a clear value proposition without a USP, for example \"accounting software for small businesses\". That describes value but gives no reason to switch from the market leader. A USP adds the difference: \"accounting software that reconciles supplier invoices automatically for restaurants\".",
      },
      {
        id: "what-makes-a-good-usp",
        heading: "What makes a good USP",
        body: "- **Specific.** \"Delivered in 30 minutes\" beats \"fast\".\n- **Important to the customer.** Being the only product in purple is unique, but nobody cares.\n- **Hard to copy, or at least not yet copied.** If every competitor can say the same sentence, it is not a USP.\n- **Provable.** You can show it in a demo, a guarantee or a customer result.\n- **Tied to one customer.** A USP only works for the [ideal customer](/startup-pedia/ideal-customer-profile) who values that difference.",
      },
      {
        id: "how-to-write",
        heading: "How to write your USP",
        body: "1. List the real alternatives your customer uses today, including spreadsheets, agencies and doing nothing.\n2. For each, write what the customer dislikes about it, in their words from interviews.\n3. Find the benefit you deliver that addresses the biggest of those frustrations and that the alternatives do not.\n4. Write it as one sentence: \"Unlike [alternative], we [specific benefit] for [customer].\"\n5. Test it on your landing page or in outreach and keep the version that gets the most qualified responses.",
      },
      {
        id: "examples",
        heading: "Examples",
        body: "- **Weak:** \"High-quality project management software.\" Every competitor says this.\n- **Better:** \"Project management for architecture firms that tracks hours against fee stages automatically.\" Specific customer, specific benefit.\n- **Weak:** \"Affordable legal help for startups.\"\n- **Better:** \"Fixed-price incorporation documents for startup founders, ready in 48 hours.\" Specific outcome, time frame and pricing model.\n\nFor more on turning a USP into a full message, see [startup positioning examples](/startup-pedia/startup-positioning-examples).",
      },
    ],
    roleNotes: {
      "service-provider": "Service businesses often compete on vague claims of quality. A USP built on a specific niche, guarantee or turnaround time stands out far more.",
    },
    faqs: [
      {
        question: "What does USP stand for?",
        answer: "USP stands for unique selling proposition, sometimes called a unique selling point: the distinctive reason a customer should choose you.",
      },
      {
        question: "What is the difference between a USP and a value proposition?",
        answer: "A value proposition describes the value you deliver. A USP is the part of that value that is different from the alternatives and gives a customer a reason to switch.",
      },
      {
        question: "Does every startup need a USP?",
        answer: "Yes. Without one, customers have no reason to move from what they use today, and price becomes the only way to compete.",
      },
    ],
    sources: [
      { title: "The Value Proposition Canvas", publisher: "Strategyzer", url: "https://www.strategyzer.com/library/the-value-proposition-canvas" },
    ],
    relatedSlugs: ["startup-positioning-examples", "ideal-customer-profile", "go-to-market-strategy"],
    cta: {
      label: "Start with your ICP",
      href: "/icp-builder",
      description: "A sharp USP depends on a sharp customer. ICP Builder helps you define who the difference matters to.",
    },
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "tam-sam-som",
    kind: "term",
    topic: "customers",
    audiences: ["founder", "investor", "mentor", "program"],
    title: "TAM, SAM and SOM: How to Size Your Market",
    metaTitle: "TAM, SAM and SOM Explained, With a Worked Example",
    metaDescription:
      "What TAM, SAM and SOM mean, how to calculate each one bottom-up, and how investors read market size slides. Includes a worked example.",
    acronyms: ["TAM", "SAM", "SOM"],
    aliases: ["market size", "total addressable market", "serviceable available market", "serviceable obtainable market", "market sizing"],
    answer:
      "TAM, SAM and SOM are three nested estimates of market size. TAM is the total demand for your type of product, SAM is the part your business model and reach can serve, and SOM is the share you can realistically win in the next few years.",
    formulas: [
      { label: "TAM", expression: "Total potential customers × annual value per customer" },
      { label: "SAM", expression: "Customers you can serve (segment, region, channel) × annual value per customer" },
      { label: "SOM", expression: "SAM × realistic market share in 3 to 5 years" },
    ],
    sections: [
      {
        id: "tam",
        heading: "TAM: total addressable market",
        body: "TAM is the total revenue available if every possible customer bought your type of product. It describes the size of the opportunity, not what you will earn. Investors use it to check that the market could support a large company if you succeed.",
      },
      {
        id: "sam",
        heading: "SAM: serviceable available market",
        body: "SAM is the part of TAM you can actually serve with your product, business model and reach. It excludes segments your product does not fit, regions you cannot sell into and channels you cannot use.",
      },
      {
        id: "som",
        heading: "SOM: serviceable obtainable market",
        body: "SOM is the share of SAM you can realistically capture in the next three to five years, given competitors, your sales capacity and your go-to-market plan. It is the number that should match your revenue forecast.",
      },
      {
        id: "bottom-up",
        heading: "Top-down vs bottom-up",
        body: "A **top-down** estimate starts with a big industry figure from a report and takes a percentage: \"The software market is worth hundreds of billions, and we only need 1%.\" Investors distrust this because it says nothing about how you will win customers.\n\nA **bottom-up** estimate starts with countable customers and a real price: how many companies of your ICP type exist, multiplied by what each would pay per year. It is more work, but it is believable and it connects directly to your [ideal customer profile](/startup-pedia/ideal-customer-profile) and pricing.",
      },
      {
        id: "example",
        heading: "Worked example",
        body: "A startup sells scheduling software to physiotherapy clinics at $1,200 per clinic per year.\n\n- **TAM:** there are roughly 100,000 clinics in the countries where the product could ever be sold. 100,000 × $1,200 = **$120 million** a year.\n- **SAM:** the product only works in English and integrates with two booking systems, which covers about 25,000 clinics. 25,000 × $1,200 = **$30 million**.\n- **SOM:** with a small sales team, winning 4% of SAM in four years is ambitious but defensible. 1,000 clinics × $1,200 = **$1.2 million** a year.\n\nThe numbers here are illustrative. Use counts from industry associations, government business registers or your own research, and show the source for each.",
      },
      {
        id: "mistakes",
        heading: "Common mistakes",
        body: "- Quoting a huge TAM from an unrelated industry report.\n- Assuming a percentage of the market without explaining how you will win it.\n- A SOM that does not match the revenue in your financial model.\n- Counting customers who could never pay your price.",
      },
    ],
    roleNotes: {
      investor: "A bottom-up SOM that matches the founder's go-to-market plan says more about their understanding than a large TAM.",
      founder: "Put the method on the slide, not just the three circles. Showing your working builds trust.",
      program: "Market sizing is a good teaching exercise: it forces teams to count their real customers and confirm their price.",
    },
    faqs: [
      {
        question: "What is the difference between TAM, SAM and SOM?",
        answer: "TAM is the total demand for your type of product, SAM is the part you can serve with your model and reach, and SOM is the share you can realistically win in the next few years.",
      },
      {
        question: "How do you calculate TAM?",
        answer: "Bottom-up: multiply the number of potential customers by the annual value each would pay. Top-down estimates from industry reports are less convincing.",
      },
      {
        question: "What SOM do investors expect?",
        answer: "One that is realistic and consistent with your revenue forecast and go-to-market plan. A small, well-argued SOM is more credible than a large, unexplained one.",
      },
    ],
    sources: [
      {
        title: "Market Research and Competitive Analysis",
        publisher: "U.S. Small Business Administration",
        url: "https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis",
      },
      { title: "Writing a Business Plan", publisher: "Sequoia Capital", url: "https://sequoiacap.com/article/writing-a-business-plan/" },
    ],
    relatedSlugs: ["ideal-customer-profile", "pitch-deck-outline", "startup-funding-stages"],
    cta: {
      label: "Check your pitch deck",
      href: "/pitch-deck-analyzer",
      description: "Pitch Deck Analyzer reviews your deck, including how clearly the market is explained.",
    },
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "ideal-customer-profile-template",
    kind: "guide",
    topic: "customers",
    audiences: ["founder", "builder", "service-provider", "program"],
    title: "Ideal Customer Profile Template for Early-Stage Founders",
    metaTitle: "Ideal Customer Profile Template for Startups (Free to Copy)",
    metaDescription:
      "A fill-in ideal customer profile template for startups: segment, trigger, pain, workaround, buying process and first validation channel, with an example.",
    aliases: ["icp template", "customer profile template", "icp worksheet", "icp checklist"],
    answer:
      "An ICP template is a short worksheet that forces you to make clear choices about your best-fit customer: who they are, what triggers the need, what pain they feel, how they cope today, who decides to buy and where you will reach them. Copy the template below and fill in one segment at a time.",
    sections: [
      {
        id: "template",
        heading: "The template",
        body: "Copy these fields into a document and answer each in one or two sentences.\n\n1. **Segment:** the type of company and role, or for consumers the life situation. Be specific enough to count them.\n2. **Job to be done:** what they are trying to achieve.\n3. **Trigger:** the event that makes them look for help now, such as a new regulation, a growth spurt, a failed tool or a deadline.\n4. **Pain and consequence:** what goes wrong if nothing changes, in time, money, risk or stress.\n5. **Current workaround:** what they use today, and what they dislike about it.\n6. **Existing spend:** what they already pay, in money or hours, to deal with it.\n7. **Buying process:** who uses it, who pays and who can say no.\n8. **Objections:** the reasons they might not switch.\n9. **Where they gather:** communities, events, publications, searches.\n10. **Disqualifiers:** signs a lead looks similar but is not a fit.\n11. **First validation step:** the next test you will run with this segment.",
      },
      {
        id: "example",
        heading: "Filled-in example",
        body: "- **Segment:** Owners of independent dental practices with one to three dentists.\n- **Job:** Keep the appointment book full without hiring more front-desk staff.\n- **Trigger:** A receptionist leaves, or no-shows rise after a price change.\n- **Pain:** Each no-show loses one to two hours of chair time. Staff spend afternoons on reminder calls.\n- **Workaround:** Manual phone calls plus the reminder feature in their practice software, which patients ignore.\n- **Existing spend:** Part of a receptionist's salary. Some practices also pay a reminder service.\n- **Buying process:** The practice owner decides. The office manager uses the product and can block it if it adds work.\n- **Objections:** \"Our software already does reminders\" and \"Patients hate texts.\"\n- **Where they gather:** Regional dental associations, practice management forums, supplier events.\n- **Disqualifiers:** Practices that are part of a group chain with central IT.\n- **First validation step:** Interview eight owners about their last week of no-shows.",
      },
      {
        id: "using-it",
        heading: "How to use the template",
        body: "Fill in one copy per candidate segment, then compare them. The segment with the strongest trigger, clearest existing spend and easiest reach is usually the right [ICP](/startup-pedia/ideal-customer-profile) to start with.\n\nTreat every field as a hypothesis. After [customer interviews](/startup-pedia/customer-interview-questions), update the template with what you learned, especially the trigger and objections, which are hard to guess. Review it again after your first paying customers.",
      },
    ],
    roleNotes: {
      program: "Use the same template across a cohort so mentors and staff can compare teams quickly.",
      "service-provider": "Fill it in for the clients you most enjoy working with and who pay best. It often reveals a niche worth specialising in.",
    },
    faqs: [
      {
        question: "What should an ICP template include?",
        answer: "The customer segment, the trigger that creates the need, the pain and its cost, the current workaround and spend, the buying process, objections, where they gather and the next validation step.",
      },
      {
        question: "Is an ICP the same as a buyer persona?",
        answer: "No. An ICP defines the best-fit customer segment and why they need you now. A persona describes an individual inside that segment, such as the user or the budget holder.",
      },
      {
        question: "How often should I update my ICP?",
        answer: "After every round of interviews early on, and again after your first paying customers. It should follow the evidence.",
      },
    ],
    sources: [
      { title: "The Value Proposition Canvas", publisher: "Strategyzer", url: "https://www.strategyzer.com/library/the-value-proposition-canvas" },
    ],
    relatedSlugs: ["ideal-customer-profile", "how-to-find-your-target-audience", "customer-interview-questions", "startup-positioning-examples"],
    cta: {
      label: "Fill it in with ICP Builder",
      href: "/icp-builder",
      description: "ICP Builder walks you through these choices and saves the result as a customer document. Included in the free plan.",
    },
    publishedAt: "2026-05-17",
    modifiedAt: "2026-10-25",
    legacySlugs: ["ideal-customer-profile-template"],
  },
  {
    slug: "how-to-find-your-target-audience",
    kind: "guide",
    topic: "customers",
    audiences: ["founder", "builder", "service-provider"],
    title: "How to Find Your Target Audience as a Startup",
    metaTitle: "How to Find Your Target Audience for a Startup",
    metaDescription:
      "Find your startup's target audience by following the pain, mapping where people already gather and testing one beachhead segment before expanding.",
    aliases: ["target market", "find target audience", "beachhead market", "who are my customers"],
    answer:
      "Find your target audience by starting from the problem, not a demographic: list who feels it most, find where those people already spend time, and test one narrow segment first. Your first audience is the smallest group with the sharpest pain that you can reach today.",
    steps: [
      {
        title: "List everyone who has the problem",
        body: "Brainstorm every type of person or business that experiences the problem. Do not filter yet. Include adjacent groups you had not considered.",
      },
      {
        title: "Rank them by pain and reach",
        body: "For each group, ask: how painful is it, do they already spend money or time on it, and can I reach them this month? Give each a simple score from 1 to 5 on all three.",
      },
      {
        title: "Find where the top groups gather",
        body: "Look for the forums, professional communities, newsletters, events, search terms and tools each group uses. If you cannot find any gathering places, reaching that group will be slow and expensive.",
      },
      {
        title: "Pick one beachhead segment",
        body: "Choose the group with the best combination of pain and reach. A beachhead is the first market you aim to win completely before expanding into the next.",
      },
      {
        title: "Test with a message",
        body: "Write one message aimed only at that segment and put it in front of them through an interview request, a post or a landing page. Their response tells you whether you have the right audience.",
      },
    ],
    sections: [
      {
        id: "audience-vs-icp",
        heading: "Target audience vs ICP",
        body: "Your target audience is the broader group who could benefit. Your [ideal customer profile](/startup-pedia/ideal-customer-profile) is the precise segment inside it that you pursue first. This guide gets you to a beachhead audience. The ICP entry turns it into a detailed profile.",
      },
      {
        id: "where-to-look",
        heading: "Where to look for your audience",
        body: "- **Online communities:** subreddits, Slack and Discord groups, Facebook groups and niche forums where people ask for help with the problem.\n- **Search:** the questions people type into search engines. Autocomplete and \"people also ask\" boxes reveal their language.\n- **Reviews of competitors:** complaints in app store and software review sites show who is underserved and why.\n- **Professional networks:** LinkedIn groups, industry associations and trade events.\n- **Your own network:** ask for introductions to people in the segment, then ask each of them for one more.",
      },
      {
        id: "example",
        heading: "Example",
        body: "A founder building a tool for managing music lessons lists piano teachers, guitar teachers, music schools, parents and adult learners. Ranking them shows that independent teachers with 15 to 40 students feel the most pain, because they handle scheduling and payments alone, and they gather in large online teacher communities. Music schools have bigger budgets but slower buying processes. She picks independent teachers as her beachhead and plans to approach music schools once she has proof.",
      },
      {
        id: "mistakes",
        heading: "Common mistakes",
        body: "- **Choosing the biggest group instead of the most urgent.** Large audiences with mild pain are hard to convert.\n- **Defining the audience by age and income alone.** These rarely predict whether someone has the problem.\n- **Targeting several segments at once.** Your message becomes generic and none of them responds.",
      },
    ],
    roleNotes: {
      "service-provider": "Picking a beachhead works for services too: \"bookkeeping for veterinary practices\" is easier to market than \"bookkeeping for small businesses\".",
    },
    faqs: [
      {
        question: "How do I find my target audience with no customers yet?",
        answer: "Start from the problem. Find the people already complaining about it or paying for workarounds in communities, reviews and forums, then talk to them.",
      },
      {
        question: "Should my target audience be broad or narrow?",
        answer: "Narrow at first. A narrow beachhead makes your message obvious and easier to validate. You can expand once you win that segment.",
      },
      {
        question: "How is a target audience different from an ICP?",
        answer: "The target audience is the broad group who could benefit. The ICP is the precise segment most likely to need your product first.",
      },
    ],
    sources: [
      {
        title: "Market Research and Competitive Analysis",
        publisher: "U.S. Small Business Administration",
        url: "https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis",
      },
    ],
    relatedSlugs: ["ideal-customer-profile", "ideal-customer-profile-template", "customer-interview-questions", "how-to-get-your-first-100-users"],
    cta: {
      label: "Turn your audience into an ICP",
      href: "/icp-builder",
      description: "ICP Builder turns your chosen segment into a saved ideal customer profile. Included in the free plan.",
    },
    publishedAt: "2026-06-06",
    modifiedAt: "2026-10-25",
    legacySlugs: ["how-to-find-your-target-audience"],
  },
  {
    slug: "startup-positioning-examples",
    kind: "guide",
    topic: "customers",
    audiences: ["founder", "builder", "service-provider"],
    title: "Startup Positioning: A Simple Formula and Examples",
    metaTitle: "Startup Positioning Examples and a Simple Formula",
    metaDescription:
      "Startup positioning examples, a one-sentence formula you can fill in, and how to test whether your positioning makes the right customer care.",
    aliases: ["positioning statement", "startup messaging", "positioning formula", "how to explain my startup"],
    answer:
      "Positioning defines who your product is for, what outcome it creates, what it replaces and why it is different. A simple formula is: \"For [customer], [product] helps [outcome] without [old trade-off].\" If you cannot fill it in clearly, your customer or problem is still too broad.",
    sections: [
      {
        id: "formula",
        heading: "The positioning formula",
        body: "Fill in each part:\n\n- **For** a specific [ideal customer](/startup-pedia/ideal-customer-profile)\n- **who** has a specific problem or trigger\n- **our product** is a category the customer already understands\n- **that** delivers a specific outcome\n- **unlike** the main alternative they use today\n- **we** have a specific difference, your [USP](/startup-pedia/unique-selling-proposition)\n\nThis long version is for your team. The public version is usually one or two lines on your homepage that keep the customer, outcome and difference.",
      },
      {
        id: "examples",
        heading: "Examples, before and after",
        body: "- **Before:** \"An all-in-one platform for modern teams.\"\n  **After:** \"Shift scheduling for restaurants that fills open shifts from your own staff in minutes, not a group chat.\"\n- **Before:** \"Smarter marketing for everyone.\"\n  **After:** \"Weekly social posts for independent gyms, written from your class schedule, so you never post last-minute.\"\n- **Before:** \"The future of freelance payments.\"\n  **After:** \"Invoices for freelance designers that follow up automatically, so you stop chasing clients.\"\n\nEach \"after\" names who it is for, what changes for them and what it replaces.",
      },
      {
        id: "category",
        heading: "Choose a category customers recognise",
        body: "Customers understand new products by comparing them to something they know. If you call your product a \"growth operating system\", nobody knows what to compare it to. If you call it \"invoicing software\", they do, and your difference stands out against that frame. Pick the category that makes your strengths obvious.",
      },
      {
        id: "testing",
        heading: "How to test positioning",
        body: "Show your one-line positioning to people in your target segment and ask them to explain back what the product does and who it is for. If they cannot, it is not clear. Then test versions in the real world: landing page headlines, outreach messages and ad copy. The version that brings the most qualified responses, not the most clicks, wins.\n\nA good message makes the right person ask a specific next question, such as \"does it work with my booking system?\". A weak one gets polite compliments.",
      },
    ],
    roleNotes: {
      founder: "Positioning comes before the landing page and the pitch deck. Both are just positioning written out at length.",
      "service-provider": "Clear positioning lets you charge for expertise instead of hours. Name the client type and outcome you specialise in.",
    },
    faqs: [
      {
        question: "What is startup positioning?",
        answer: "The way you define who the product is for, what problem it solves, what outcome it creates and why it is meaningfully different from the alternatives.",
      },
      {
        question: "Why is my positioning unclear?",
        answer: "Usually because the target customer, the use case or the alternative is too broad. Narrowing the customer often fixes the message.",
      },
      {
        question: "Should positioning come before the landing page?",
        answer: "Yes. The landing page expresses your positioning. If the positioning is unclear, the page will feel generic however well it is designed.",
      },
    ],
    sources: [
      { title: "Positioning resources", publisher: "April Dunford", url: "https://www.aprildunford.com/" },
      { title: "The Value Proposition Canvas", publisher: "Strategyzer", url: "https://www.strategyzer.com/library/the-value-proposition-canvas" },
    ],
    relatedSlugs: ["unique-selling-proposition", "ideal-customer-profile", "go-to-market-strategy", "waitlist-before-mvp"],
    cta: {
      label: "Clarify your customer first",
      href: "/icp-builder",
      description: "Positioning is only as sharp as the customer behind it. ICP Builder helps you define them. Included in the free plan.",
    },
    publishedAt: "2026-05-17",
    modifiedAt: "2026-10-25",
    legacySlugs: ["startup-positioning-examples"],
  },
];
