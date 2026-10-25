import type { PediaEntry } from "../types.ts";

export const growthEntries: PediaEntry[] = [
  {
    slug: "go-to-market-strategy",
    kind: "term",
    topic: "growth",
    audiences: ["founder", "builder", "mentor", "service-provider", "program"],
    title: "Go-to-Market (GTM) Strategy: What It Is and How to Build One",
    metaTitle: "What Is a Go-to-Market (GTM) Strategy? How to Build One",
    metaDescription:
      "A go-to-market (GTM) strategy is your plan for reaching customers and winning them. What it includes, the main GTM motions and an early-stage template.",
    acronyms: ["GTM"],
    aliases: ["gtm meaning", "go to market plan", "launch strategy", "gtm strategy for startups"],
    answer:
      "A go-to-market (GTM) strategy is the plan for how a product reaches its customers: who you target, what you say to them, which channels you use, how they buy and how you measure progress. For an early startup, it should fit on one page and focus on one customer and one or two channels.",
    sections: [
      {
        id: "components",
        heading: "What a GTM strategy includes",
        body: "- **Target customer:** your [ideal customer profile](/startup-pedia/ideal-customer-profile) and the trigger that makes them look for a solution.\n- **Message:** the positioning and promise, in the customer's words. See [positioning examples](/startup-pedia/startup-positioning-examples).\n- **Channels:** where you will reach them, such as communities, search, outbound, partnerships or events.\n- **Motion:** how customers buy, whether self-serve, sales-led or through partners.\n- **Pricing and offer:** what they pay and what they get to start.\n- **Metrics:** the numbers that show whether the plan works, such as replies, signups, activation, [CAC](/startup-pedia/customer-acquisition-cost) and conversion.",
      },
      {
        id: "motions",
        heading: "The main GTM motions",
        body: "- **Product-led:** users sign up and get value on their own, then upgrade. Works for products that are simple to try and cheap to start.\n- **Sales-led:** a person qualifies, demonstrates and negotiates. Works for complex or expensive products with several decision-makers.\n- **Community-led:** a community around the problem or product drives awareness and trust.\n- **Partner-led:** resellers, integrations or other companies bring you customers.\n\nEarly startups often combine one motion with founder-led selling, where the founder personally handles the first customers to learn what works.",
      },
      {
        id: "early-stage",
        heading: "An early-stage GTM in five lines",
        body: "1. **Who:** one segment, with a named trigger.\n2. **Promise:** one sentence a customer would repeat.\n3. **Primary channel:** where that segment already asks for help.\n4. **Weekly experiment:** one test per week, such as a new message, a new community or a new offer.\n5. **Metric:** one number that shows the channel is working, reviewed every week.\n\nTesting too many channels at once makes it impossible to learn which one works. Go deep on one before adding a second.",
      },
      {
        id: "example",
        heading: "Example",
        body: "A startup selling inventory software to independent bike shops sets this GTM: the target is shop owners preparing for spring, when stockouts cost them sales. The promise is \"never run out of your best-selling parts in peak season\". The primary channel is a trade association newsletter and its regional events, with founder-led demos. The weekly experiment tests one new subject line or event follow-up. The metric is demos booked per week, with a target of eight.",
      },
    ],
    roleNotes: {
      founder: "Write your GTM before the product is finished. Testing messages and channels early builds your launch audience and sharpens the product.",
      "service-provider": "Agencies and consultants need a GTM too. A clear niche and one dependable channel beat being everywhere.",
      program: "Ask teams for their one-page GTM before demo day. It shows quickly who has a plan to reach customers and who is hoping.",
    },
    faqs: [
      {
        question: "What does GTM stand for?",
        answer: "GTM stands for go-to-market: the plan for how a product reaches and wins its customers.",
      },
      {
        question: "What is the difference between a GTM strategy and a marketing plan?",
        answer: "A GTM strategy covers the whole path to customers: who, what, channels, sales motion, pricing and metrics. A marketing plan is the detailed set of campaigns that carries part of it out.",
      },
      {
        question: "How many channels should a startup test first?",
        answer: "Usually one or two. Testing too many at once makes it hard to learn which one works.",
      },
      {
        question: "Should GTM work start before the product is finished?",
        answer: "Yes. Early GTM work validates your message, builds a waitlist and starts customer conversations before launch.",
      },
    ],
    sources: [
      {
        title: "What Is a Go-to-Market Strategy? How to Create a GTM Strategy for Startups",
        publisher: "Stripe",
        url: "https://stripe.com/resources/more/what-is-a-go-to-market-strategy-a-quick-gtm-guide-for-startups",
      },
      {
        title: "Make Your Idea a Success With a Solid Go-to-Market Strategy",
        publisher: "AWS Startups",
        url: "https://aws.amazon.com/startups/learn/prove-whats-possible-make-your-idea-success-solid-go-to-market-strategy",
      },
    ],
    relatedSlugs: ["how-to-get-your-first-100-users", "startup-launch-checklist", "startup-positioning-examples", "customer-acquisition-cost"],
    cta: {
      label: "Plan your go-to-market",
      href: "/go-to-market",
      description: "GTM Strategist turns your customer and offer into channel recommendations, messaging and a 30-day launch plan.",
    },
    publishedAt: "2026-05-17",
    modifiedAt: "2026-10-25",
    legacySlugs: ["go-to-market-strategy-for-startup"],
  },
  {
    slug: "how-to-get-your-first-100-users",
    kind: "guide",
    topic: "growth",
    audiences: ["founder", "builder"],
    title: "How to Get Your First 100 Users",
    metaTitle: "How to Get Your First 100 Users for a Startup or SaaS",
    metaDescription:
      "Get your first 100 users with direct outreach, niche communities and hands-on onboarding before paid ads. A week-by-week plan with tracking tips.",
    aliases: ["first users", "first customers", "first users for saas", "early adopters", "do things that don't scale"],
    answer:
      "Your first 100 users usually come from work that does not scale: personal outreach, helpful answers in the communities your ideal customers already use, and onboarding each user yourself. Paid ads rarely work at this stage because you do not yet know which message converts.",
    steps: [
      {
        title: "List where your ICP already gathers",
        body: "Write down five specific places: named communities, forums, newsletters, events or search queries. Your [ICP](/startup-pedia/ideal-customer-profile) should make this list easy. If it does not, narrow the ICP.",
      },
      {
        title: "Collect the phrases customers use",
        body: "Read threads, reviews and interview notes and note how people describe the problem. Use their words in your posts and messages.",
      },
      {
        title: "Be useful before you link",
        body: "Answer questions, share a checklist or teardown, and help people solve the problem. Mention your product only when it genuinely completes the next step. Communities reward help and punish promotion.",
      },
      {
        title: "Reach out one to one",
        body: "Send short personal messages to people who match the ICP, referencing something specific about them. See [cold email for startups](/startup-pedia/cold-email-for-startups).",
      },
      {
        title: "Onboard every user yourself",
        body: "Offer a short call, set things up with them and ask what they expected. Early users who get personal help activate more often and tell you what to fix.",
      },
      {
        title: "Ask for one introduction",
        body: "Once a user gets value, ask who else has the same problem. Referrals from happy users are the cheapest growth you will ever have.",
      },
    ],
    sections: [
      {
        id: "why-unscalable",
        heading: "Why unscalable work comes first",
        body: "Paul Graham's essay \"Do Things That Don't Scale\" describes how many successful companies recruited their first users by hand. Manual work teaches you which message, channel and onboarding step actually work. Once you know that, you can automate and pay for it. Doing it in the opposite order spends money to learn slowly.",
      },
      {
        id: "tracking",
        heading: "What to track",
        body: "Use a tracked link for each channel and measure more than visits:\n\n- Replies and conversations started\n- Signups from people who match the ICP\n- Activation: users who reach the core outcome\n- Users active again a week later\n- Referrals\n\nReview the numbers weekly and put more time into the channel with the best activation, not the most clicks.",
      },
      {
        id: "saas",
        heading: "For SaaS products",
        body: "For software, the same approach applies, with two additions. Offer a personal setup call for every early account, because activation is where most SaaS users drop off. And watch for the moment users first get value, then shorten the path to it. Your first 10 paying customers will teach you more than your first 1,000 free signups.",
      },
      {
        id: "example",
        heading: "Example",
        body: "A founder building a client portal for wedding photographers spends three weeks answering questions in two photographer communities and a popular forum. She shares a free contract checklist, messages 60 photographers whose posts mention client admin, and sets up every new account on a 15-minute call. Week by week she reaches 14, then 37, then 61 and then 102 users. Most come from the forum and from referrals, so she drops the other channels and doubles down there.",
      },
    ],
    roleNotes: {
      builder: "If you are still exploring an idea, these same steps double as validation: the people who respond are your earliest evidence.",
    },
    faqs: [
      {
        question: "How do startups get their first 100 users?",
        answer: "Mostly through manual work: personal outreach, helpful participation in niche communities, hands-on onboarding and referrals, rather than paid ads.",
      },
      {
        question: "Should I run ads to get early users?",
        answer: "Usually not first. Ads cost money before you know which message converts. Manual channels teach you that, and then ads become more efficient.",
      },
      {
        question: "Where do SaaS startups find their first users?",
        answer: "In the communities, searches and networks where their ideal customers already ask about the problem, plus direct outreach and launch platforms once the message is clear.",
      },
      {
        question: "Should I launch on Product Hunt to get first users?",
        answer: "Only if your audience is there and you have prepared. Many startups get more from niche communities first. See the Product Hunt launch guide.",
      },
    ],
    sources: [
      { title: "Do Things That Don't Scale", publisher: "Paul Graham", url: "https://paulgraham.com/ds.html" },
    ],
    relatedSlugs: ["go-to-market-strategy", "cold-email-for-startups", "product-hunt-launch-guide", "startup-launch-checklist"],
    cta: {
      label: "Plan your channels",
      href: "/go-to-market",
      description: "GTM Strategist recommends channels and messaging for reaching your first customers.",
    },
    publishedAt: "2026-06-06",
    modifiedAt: "2026-10-25",
    legacySlugs: ["how-to-get-first-100-users", "first-users-for-saas"],
  },
  {
    slug: "cold-email-for-startups",
    kind: "guide",
    topic: "growth",
    audiences: ["founder", "builder", "service-provider"],
    title: "Cold Email for Startups: How to Write One That Gets Replies",
    metaTitle: "Cold Email for Startups: A Template and Rules That Work",
    metaDescription:
      "Write cold emails that get replies: research the recipient, lead with their problem, keep it short and make one small ask. Template, example and rules.",
    aliases: ["cold outreach", "outbound email", "cold email template", "sales email"],
    answer:
      "A cold email gets replies when it is about the recipient, not you: one researched detail that shows why you are writing to them, their problem in a sentence, how you help, and one small, easy ask. Keep it under about 100 words.",
    sections: [
      {
        id: "structure",
        heading: "The structure",
        body: "1. **Subject line:** short, specific, lower-case often works. \"Late invoices at [company]?\"\n2. **First line:** a real detail about them, such as a post they wrote, a job they are hiring for or a product they launched.\n3. **Problem:** the pain you think they have, in their language.\n4. **Proof:** one line on how you help, ideally with a result for someone similar.\n5. **Ask:** one low-effort next step. \"Worth a 10-minute look?\" beats \"Can we book 30 minutes?\"",
      },
      {
        id: "template",
        heading: "Template",
        body: "Subject: [their problem] at [company]?\n\nHi [name], I saw [specific detail about them].\n\nTeams like yours often [problem] because [reason]. We help [similar customers] [outcome], for example [short result].\n\nWould it be useful if I sent a two-minute video showing how it would work for [company]?\n\n[Your name], [role]",
      },
      {
        id: "example",
        heading: "Example",
        body: "Subject: no-shows at Riverside Physio?\n\nHi Ana, I saw you are hiring a second receptionist at Riverside Physio.\n\nClinics your size often add front-desk staff mainly to handle reminder calls. We send automatic text reminders that work with your booking system, and one three-therapist clinic cut no-shows by about a third in two months.\n\nWould a two-minute video showing how it would look for Riverside be useful?\n\nSam, founder",
      },
      {
        id: "rules",
        heading: "Rules that improve reply rates",
        body: "- **Send fewer, better emails.** Ten researched emails beat a thousand generic ones, and protect your domain's reputation.\n- **Follow up, politely.** One or two short follow-ups a few days apart often get more replies than the first email.\n- **Write like a person.** No marketing language, no images, no attachments.\n- **Measure replies, not opens.** Open tracking is unreliable. Positive replies are what matter.\n- **Follow the law.** Email marketing rules differ by country. Many require you to identify yourself, give a way to opt out and handle personal data properly. Check the rules where your recipients are.",
      },
      {
        id: "learning",
        heading: "Use cold email to learn",
        body: "Early on, cold email is also a research tool. If nobody replies, the problem is likely the audience or the message, not your sending volume. Change one thing at a time, such as the segment, the problem statement or the ask, and compare reply rates over batches of 20 to 30 emails.",
      },
    ],
    roleNotes: {
      "service-provider": "For services, a specific observation about the prospect's business, such as their site speed or ad copy, is the strongest possible first line.",
    },
    faqs: [
      {
        question: "How do I write a cold email that gets replies?",
        answer: "Research the recipient, open with a detail about them, state their problem, show briefly how you help and ask for one small next step. Keep it short.",
      },
      {
        question: "How long should a cold email be?",
        answer: "Short: roughly 50 to 125 words. Long cold emails are skimmed or ignored.",
      },
      {
        question: "How many follow-ups should I send?",
        answer: "One or two, a few days apart, each adding something useful. Stop if the person asks you to.",
      },
      {
        question: "Is cold email legal?",
        answer: "In many countries it is, under conditions such as identifying yourself, offering an opt-out and having a legitimate reason to contact the person. Rules vary, so check them for the countries you email.",
      },
    ],
    sources: [
      {
        title: "CAN-SPAM Act: A Compliance Guide for Business",
        publisher: "U.S. Federal Trade Commission",
        url: "https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business",
      },
      { title: "Do Things That Don't Scale", publisher: "Paul Graham", url: "https://paulgraham.com/ds.html" },
    ],
    relatedSlugs: ["how-to-get-your-first-100-users", "go-to-market-strategy", "how-to-find-investors"],
    cta: {
      label: "Sharpen your messaging",
      href: "/go-to-market",
      description: "GTM Strategist builds positioning and messaging you can use in outreach.",
    },
    publishedAt: "2026-06-06",
    modifiedAt: "2026-10-25",
    legacySlugs: ["cold-email-for-startups"],
  },
  {
    slug: "product-hunt-launch-guide",
    kind: "guide",
    topic: "growth",
    audiences: ["founder", "builder"],
    title: "Product Hunt Launch Guide for Founders",
    metaTitle: "Product Hunt Launch Guide: Before, During and After",
    metaDescription:
      "How to prepare a Product Hunt launch: build an audience first, prepare the listing and first comment, and turn launch-day traffic into retained users.",
    aliases: ["product hunt", "launch on product hunt", "product hunt tips", "launch day"],
    answer:
      "A good Product Hunt launch is mostly preparation: an audience that knows the date, a clear listing with a strong tagline and visuals, a founder comment that frames the problem, and onboarding ready to turn visitors into users. The ranking matters less than the qualified traffic and follow-up.",
    sections: [
      {
        id: "is-it-right",
        heading: "Is Product Hunt right for you?",
        body: "Product Hunt's audience leans towards people who work in technology: makers, designers, developers, marketers and early adopters. It suits products for those people best. If your customers are dentists or farmers, a launch may bring visibility but few customers. Niche communities and [direct outreach](/startup-pedia/how-to-get-your-first-100-users) may serve you better.",
      },
      {
        id: "before",
        heading: "Before launch day",
        body: "- **Build your audience for weeks.** A waitlist, an email list and relationships in the community mean people are ready on the day.\n- **Be active on the platform.** Comment on and support other launches before your own.\n- **Prepare the listing:** a tagline of a few words that names the outcome, a gallery that shows the product in use, a short demo video and accurate topics.\n- **Draft the first comment:** who you are, the problem, why you built it and what feedback you want.\n- **Get onboarding ready.** Make sure sign-up, the first-run experience and support work under load.\n- **Read the platform's current rules** on asking for support. They prohibit some tactics and penalise them.",
      },
      {
        id: "during",
        heading: "On launch day",
        body: "- Launch early in the platform's day so you have the full 24 hours.\n- Tell your audience the launch is live and ask for honest feedback, not just upvotes.\n- Reply to every comment quickly and personally.\n- Watch sign-ups and fix friction in real time.",
      },
      {
        id: "after",
        heading: "After the launch",
        body: "Most of the value comes afterwards. Email everyone who signed up within a day, ask what brought them, and help them reach the core outcome. Add the launch to your other [launch directories](/directories) and channels, and use the comments as customer research for your next [positioning](/startup-pedia/startup-positioning-examples) update.",
      },
      {
        id: "example",
        heading: "Example",
        body: "A team launching a screenshot-annotation tool for designers builds a waitlist of 400 people over six weeks and supports other launches in the design category. On launch day they reply to 140 comments and get 900 sign-ups. They do not reach the top three, but their follow-up emails turn 180 of those sign-ups into weekly active users, more than any other channel delivered that quarter.",
      },
    ],
    roleNotes: {
      founder: "Treat launch day as one event in a launch plan, not the plan itself. See the startup launch checklist.",
    },
    faqs: [
      {
        question: "How do I prepare for a Product Hunt launch?",
        answer: "Build an audience over several weeks, take part in the community, prepare a clear tagline, gallery and founder comment, and make sure onboarding is ready for traffic.",
      },
      {
        question: "Does Product Hunt still drive users?",
        answer: "It can, especially for products aimed at people in technology. Results depend on preparation and on following up with the people who sign up.",
      },
      {
        question: "What is the biggest Product Hunt mistake?",
        answer: "Launching with no audience and no follow-up plan, so a spike of traffic never turns into retained users.",
      },
    ],
    sources: [
      { title: "Launch guide", publisher: "Product Hunt", url: "https://www.producthunt.com/launch" },
    ],
    relatedSlugs: ["startup-launch-checklist", "how-to-get-your-first-100-users", "waitlist-before-mvp"],
    cta: {
      label: "Find more launch platforms",
      href: "/directories",
      description: "Launch Directories lists more than 30 platforms, communities and review sites where you can submit a product launch.",
    },
    publishedAt: "2026-06-06",
    modifiedAt: "2026-10-25",
    legacySlugs: ["product-hunt-launch-guide"],
  },
  {
    slug: "startup-launch-checklist",
    kind: "guide",
    topic: "growth",
    audiences: ["founder", "builder", "mentor", "program"],
    title: "Startup Launch Checklist for First-Time Founders",
    metaTitle: "Startup Launch Checklist: Before, During and After Launch",
    metaDescription:
      "A startup launch checklist covering customer, message, product, analytics, channels and follow-up, so your launch turns attention into learning.",
    aliases: ["launch checklist", "mvp launch checklist", "saas launch checklist", "pre-launch checklist"],
    answer:
      "A startup launch checklist makes sure your customer, message, product, measurement and follow-up are ready before you drive attention. Launch is not a single post. It is a few weeks of releasing in waves, measuring what happens and talking to the people who arrive.",
    sections: [
      {
        id: "before",
        heading: "Before launch",
        body: "**Customer and message**\n\n- One [ideal customer profile](/startup-pedia/ideal-customer-profile), written down\n- A one-line promise tested with real prospects\n- A landing page that names the customer, the outcome and one call to action\n\n**Product**\n\n- The core success path works end to end for a new user\n- Sign-up, payment (if any) and password reset tested\n- A way for users to contact you\n\n**Measurement**\n\n- Analytics on sign-up, activation and the core action\n- Tracked links for every channel\n- A single launch goal, such as 50 activated users\n\n**Legal and basics**\n\n- Privacy policy and terms published\n- Support email monitored\n- Backups and error alerts on",
      },
      {
        id: "during",
        heading: "During launch: release in waves",
        body: "1. **Warm wave:** friends, advisers and waitlist members who will give honest feedback. Fix what breaks.\n2. **Niche wave:** the communities where your ICP gathers. See [first 100 users](/startup-pedia/how-to-get-your-first-100-users).\n3. **Broad wave:** launch platforms, press and social posts. See the [Product Hunt guide](/startup-pedia/product-hunt-launch-guide).\n\nEach wave should improve the next. Keep one person responsible for replying to every comment and message.",
      },
      {
        id: "after",
        heading: "After launch",
        body: "- Email every new user within a day and ask what made them sign up.\n- Interview five to ten new users about what nearly stopped them.\n- Compare channels by activated users, not visits.\n- Write a short launch review: what worked, what did not, what to change next.",
      },
      {
        id: "example",
        heading: "Example",
        body: "A founder launching a budgeting app for freelancers sets a goal of 50 activated users. Week one, 30 waitlist members try it and find two sign-up bugs. Week two, she posts in three freelancer communities and gets 80 sign-ups, of whom 34 activate. Week three, a launch platform brings 400 visits but only 9 activations. Her review shows communities convert four times better, so she plans next month around them.",
      },
    ],
    roleNotes: {
      mentor: "Reviewing a founder's checklist a week before launch catches most avoidable problems, especially missing analytics.",
      program: "A shared launch checklist and goal for every team makes demo-day progress easier to compare and report.",
    },
    faqs: [
      {
        question: "What should a startup do before launch?",
        answer: "Define the customer, test the promise, make sure the core product path works, set up analytics and tracked links, and prepare a follow-up plan for new users.",
      },
      {
        question: "How long should a startup launch take?",
        answer: "The public announcement can happen in a day, but a useful launch usually runs for two to four weeks of waves, measurement and follow-up.",
      },
      {
        question: "What is the biggest launch mistake?",
        answer: "Launching broadly before the customer, message and next step are clear, and without the analytics to learn from the traffic.",
      },
    ],
    sources: [
      {
        title: "What Is a Go-to-Market Strategy? How to Create a GTM Strategy for Startups",
        publisher: "Stripe",
        url: "https://stripe.com/resources/more/what-is-a-go-to-market-strategy-a-quick-gtm-guide-for-startups",
      },
    ],
    relatedSlugs: ["go-to-market-strategy", "product-hunt-launch-guide", "how-to-get-your-first-100-users", "how-to-build-an-mvp"],
    cta: {
      label: "Get a 30-day launch plan",
      href: "/go-to-market",
      description: "GTM Strategist turns this checklist into a launch plan with channels, messaging and priorities.",
    },
    publishedAt: "2026-05-17",
    modifiedAt: "2026-10-25",
    legacySlugs: ["startup-launch-checklist"],
  },
];
