import type { PediaEntry } from "../types.ts";

export const metricEntries: PediaEntry[] = [
  {
    slug: "customer-acquisition-cost",
    kind: "term",
    topic: "metrics",
    audiences: ["founder", "investor", "mentor", "program", "service-provider"],
    title: "Customer Acquisition Cost (CAC): Formula and Examples",
    metaTitle: "Customer Acquisition Cost (CAC): Formula and Examples",
    metaDescription:
      "Customer acquisition cost (CAC) is what you spend to win one new customer. The formula, a worked example, blended vs paid CAC and payback period.",
    acronyms: ["CAC"],
    aliases: ["cac meaning", "cost per acquisition", "how to calculate cac", "cac payback"],
    answer:
      "Customer acquisition cost (CAC) is the average amount you spend on sales and marketing to win one new customer. Divide your total sales and marketing costs for a period by the number of new customers you gained in that period.",
    formulas: [
      { label: "CAC", expression: "Total sales and marketing costs ÷ New customers acquired", note: "Use the same period for both, such as one month or one quarter." },
      { label: "CAC payback (months)", expression: "CAC ÷ (Monthly revenue per customer × Gross margin)" },
    ],
    sections: [
      {
        id: "what-to-include",
        heading: "What to include in the cost",
        body: "Include everything you spend to win customers: advertising, sales and marketing salaries (or the share of time founders spend on it), commissions, tools, content production, events and agency fees. Leaving out salaries makes CAC look far better than it is, which is the most common mistake.",
      },
      {
        id: "example",
        heading: "Worked example",
        body: "In one quarter, a startup spends $12,000 on ads, $3,000 on tools and content, and $15,000 on the share of salaries spent on sales and marketing: $30,000 in total. It wins 150 new customers.\n\nCAC = $30,000 ÷ 150 = **$200**.\n\nEach customer pays $50 a month at an 80% gross margin, so each contributes $40 a month. CAC payback = $200 ÷ $40 = **5 months**.",
      },
      {
        id: "blended-vs-paid",
        heading: "Blended vs paid CAC",
        body: "- **Blended CAC** divides all acquisition costs by all new customers, including those who arrived through word of mouth or search. It shows the overall efficiency of the business.\n- **Paid CAC** divides paid-channel spend by customers from paid channels only. It shows whether advertising itself works.\n\nA healthy blended CAC can hide an expensive paid channel, and the other way round. Track both, and track CAC by channel when you can.",
      },
      {
        id: "what-good-looks-like",
        heading: "What good looks like",
        body: "CAC is only meaningful next to how much a customer is worth. A common rule of thumb for subscription businesses is that [customer lifetime value](/startup-pedia/customer-lifetime-value) should be about three times CAC or more, and that payback should be well under a year. Benchmarks vary widely by business model and price, so compare against your own trend over time first.",
      },
      {
        id: "early-stage",
        heading: "CAC at the early stage",
        body: "Before product-market fit, CAC is noisy. Small numbers, founder-led selling and experiments make it swing from month to month. Track it anyway, but focus on whether it falls as you learn which channel and message work. See the [go-to-market strategy](/startup-pedia/go-to-market-strategy) entry.",
      },
    ],
    roleNotes: {
      investor: "Ask whether CAC includes salaries and whether it is blended or paid. The answer changes the number a lot.",
      program: "Teams in a cohort rarely have reliable CAC yet. Cost per qualified conversation or per activated user is a fairer early comparison.",
      "service-provider": "Agencies can show clients their CAC by channel before and after an engagement, which makes results concrete.",
    },
    faqs: [
      {
        question: "What does CAC stand for?",
        answer: "CAC stands for customer acquisition cost: the average sales and marketing spend needed to win one new customer.",
      },
      {
        question: "How do you calculate CAC?",
        answer: "Divide total sales and marketing costs for a period by the number of new customers acquired in the same period.",
      },
      {
        question: "What is a good CAC?",
        answer: "One that is well below what a customer is worth. A common guide is lifetime value of at least three times CAC, with payback in under a year.",
      },
      {
        question: "Should CAC include salaries?",
        answer: "Yes. Sales and marketing salaries are usually the largest acquisition cost. Leaving them out understates CAC.",
      },
    ],
    sources: [
      { title: "16 Startup Metrics", publisher: "Andreessen Horowitz", url: "https://a16z.com/16-startup-metrics/" },
      { title: "SaaS Metrics 2.0", publisher: "David Skok, For Entrepreneurs", url: "https://www.forentrepreneurs.com/saas-metrics-2/" },
    ],
    relatedSlugs: ["customer-lifetime-value", "roi-and-roas", "go-to-market-strategy", "mrr-and-arr"],
    cta: {
      label: "Track your channels weekly",
      href: "/traction-engine",
      description: "Traction Engine logs weekly distribution experiments and measures channel efficiency.",
    },
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "customer-lifetime-value",
    kind: "term",
    topic: "metrics",
    audiences: ["founder", "investor", "mentor", "program"],
    title: "Customer Lifetime Value (LTV): Formula and the LTV:CAC Ratio",
    metaTitle: "Customer Lifetime Value (LTV): Formula and LTV:CAC Ratio",
    metaDescription:
      "Customer lifetime value (LTV) is the gross profit you expect from a customer over the whole relationship. Formulas, a worked example and the LTV:CAC ratio.",
    acronyms: ["LTV", "CLV", "CLTV"],
    aliases: ["lifetime value", "ltv meaning", "ltv cac ratio", "how to calculate ltv"],
    answer:
      "Customer lifetime value (LTV, also CLV) is the total gross profit you expect to earn from an average customer over the whole time they stay with you. Compared with customer acquisition cost, it tells you whether winning customers is profitable.",
    formulas: [
      { label: "LTV (subscriptions)", expression: "Average revenue per customer per month × Gross margin ÷ Monthly churn rate" },
      { label: "LTV (purchases)", expression: "Average order value × Purchases per year × Years as a customer × Gross margin" },
      { label: "LTV:CAC ratio", expression: "LTV ÷ CAC" },
    ],
    sections: [
      {
        id: "example",
        heading: "Worked example",
        body: "A subscription product earns $50 per customer per month at an 80% gross margin, and 4% of customers cancel each month.\n\nLTV = $50 × 0.8 ÷ 0.04 = **$1,000**.\n\nWith a [CAC](/startup-pedia/customer-acquisition-cost) of $200, the LTV:CAC ratio is $1,000 ÷ $200 = **5:1**.\n\nDividing by churn works because a 4% monthly churn implies an average customer lifetime of about 25 months (1 ÷ 0.04).",
      },
      {
        id: "ltv-cac",
        heading: "The LTV:CAC ratio",
        body: "The ratio compares what a customer is worth with what it cost to win them. A widely quoted guide for subscription businesses is about 3:1 or higher. Below 1:1, every new customer loses money. Very high ratios, such as 8:1, can mean you are under-investing in growth.\n\nTreat these as rules of thumb, and check payback time too. A 5:1 ratio that takes four years to recover is risky for a startup with limited cash.",
      },
      {
        id: "revenue-vs-margin",
        heading: "Revenue LTV vs gross-margin LTV",
        body: "Some people calculate LTV with revenue instead of gross profit. That inflates the number, especially for businesses with high delivery costs, such as marketplaces, hardware or services. Use gross margin whenever you compare LTV with CAC.",
      },
      {
        id: "early-stage",
        heading: "LTV at the early stage",
        body: "Young startups do not have enough history to know true lifetime, so early LTV figures rest on assumptions. Show the inputs (price, margin, churn) separately, update them as cohorts mature and avoid presenting a precise LTV from two months of data.",
      },
    ],
    roleNotes: {
      investor: "Ask for the churn rate and margin behind the LTV. A large LTV built on a guessed churn rate tells you little.",
      program: "Teaching teams to show the inputs rather than the final LTV figure leads to more honest reporting.",
    },
    faqs: [
      {
        question: "What does LTV stand for?",
        answer: "LTV stands for lifetime value, or customer lifetime value (CLV): the gross profit you expect from an average customer over the whole relationship.",
      },
      {
        question: "What is a good LTV:CAC ratio?",
        answer: "A common guide for subscription businesses is around 3:1 or higher, together with a payback period of less than a year.",
      },
      {
        question: "How do you calculate LTV for a subscription business?",
        answer: "Multiply average monthly revenue per customer by gross margin, then divide by the monthly churn rate.",
      },
    ],
    sources: [
      { title: "SaaS Metrics 2.0", publisher: "David Skok, For Entrepreneurs", url: "https://www.forentrepreneurs.com/saas-metrics-2/" },
      { title: "16 Startup Metrics", publisher: "Andreessen Horowitz", url: "https://a16z.com/16-startup-metrics/" },
    ],
    relatedSlugs: ["customer-acquisition-cost", "mrr-and-arr", "average-order-value", "saas"],
    cta: {
      label: "Measure retention weekly",
      href: "/traction-engine",
      description: "Traction Engine tracks retention alongside your weekly distribution experiments.",
    },
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "average-order-value",
    kind: "term",
    topic: "metrics",
    audiences: ["founder", "service-provider", "investor"],
    title: "Average Order Value (AOV): Formula and How to Increase It",
    metaTitle: "Average Order Value (AOV): Formula and How to Increase It",
    metaDescription:
      "Average order value (AOV) is the average amount spent per order. The formula, a worked example, why it matters with CAC, and ways to raise it.",
    acronyms: ["AOV"],
    aliases: ["aov meaning", "average basket size", "average transaction value"],
    answer:
      "Average order value (AOV) is the average amount a customer spends in a single order. Divide total revenue by the number of orders in the same period. It matters most for e-commerce, marketplaces and any business where customers buy in separate transactions.",
    formulas: [
      { label: "AOV", expression: "Total revenue ÷ Number of orders", note: "Decide whether revenue includes shipping, tax and discounts, and keep it consistent." },
    ],
    sections: [
      {
        id: "example",
        heading: "Worked example",
        body: "An online store makes $48,000 from 1,200 orders in a month.\n\nAOV = $48,000 ÷ 1,200 = **$40**.\n\nIf it costs $30 in advertising to win a first order, each first order earns back most of its acquisition cost only if the gross margin on $40 is high. Raising AOV to $50 makes the same advertising far more profitable.",
      },
      {
        id: "why-it-matters",
        heading: "Why AOV matters",
        body: "AOV links directly to [customer acquisition cost](/startup-pedia/customer-acquisition-cost). If acquiring a customer costs more than the margin on their first order, you rely on repeat purchases to profit, which makes repeat rate and [lifetime value](/startup-pedia/customer-lifetime-value) critical. Raising AOV is often the fastest way to make paid channels work.",
      },
      {
        id: "how-to-increase",
        heading: "Ways to increase AOV",
        body: "- **Bundles:** sell related items together at a small discount.\n- **Thresholds:** free shipping or a gift above a spend level just over your current AOV.\n- **Cross-sells:** suggest complementary items at checkout.\n- **Upsells:** offer a larger size or better tier.\n- **Volume pricing:** lower unit prices for larger quantities.\n\nTest one change at a time, and watch conversion rate as well. A higher AOV with fewer orders may earn less overall.",
      },
      {
        id: "aov-vs-arpu",
        heading: "AOV vs ARPU",
        body: "AOV is revenue per order. Average revenue per user (ARPU) is revenue per customer over a period, which can include several orders or a subscription. Subscription businesses usually track ARPU and [MRR](/startup-pedia/mrr-and-arr) rather than AOV.",
      },
    ],
    roleNotes: {
      "service-provider": "For productised services, AOV is the average project or package value. Tiered packages are the service equivalent of upsells.",
    },
    faqs: [
      {
        question: "What does AOV stand for?",
        answer: "AOV stands for average order value: total revenue divided by the number of orders in a period.",
      },
      {
        question: "What is a good average order value?",
        answer: "It depends on your product and margins. A useful test is whether the margin on an average order covers a large part of what it costs to acquire that order.",
      },
      {
        question: "How can I increase my average order value?",
        answer: "Bundles, free-shipping thresholds, cross-sells, upsells and volume pricing are the most common methods. Test them one at a time.",
      },
    ],
    sources: [
      { title: "16 Startup Metrics", publisher: "Andreessen Horowitz", url: "https://a16z.com/16-startup-metrics/" },
    ],
    relatedSlugs: ["customer-acquisition-cost", "customer-lifetime-value", "roi-and-roas", "b2b-b2c-d2c"],
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "roi-and-roas",
    kind: "term",
    topic: "metrics",
    audiences: ["founder", "service-provider", "investor"],
    title: "ROI vs ROAS: Return on Investment and Return on Ad Spend",
    metaTitle: "ROI vs ROAS: Formulas, Examples and When to Use Each",
    metaDescription:
      "ROI measures profit from any investment; ROAS measures revenue from advertising. Formulas, a worked example and why a good ROAS can still lose money.",
    acronyms: ["ROI", "ROAS"],
    aliases: ["return on investment", "return on ad spend", "roi meaning", "roas meaning", "break-even roas"],
    answer:
      "Return on investment (ROI) compares the profit an investment produces with its cost. Return on ad spend (ROAS) compares the revenue from an advertising campaign with what you spent on the ads. ROI is about profit across any investment. ROAS is about revenue from ads only.",
    formulas: [
      { label: "ROI", expression: "(Gain from investment − Cost of investment) ÷ Cost of investment × 100%" },
      { label: "ROAS", expression: "Revenue from ads ÷ Ad spend", note: "Usually written as a ratio, such as 4:1, or a multiple, such as 4x." },
      { label: "Break-even ROAS", expression: "1 ÷ Gross margin", note: "At a 50% margin you need at least 2x ROAS to cover product costs." },
    ],
    sections: [
      {
        id: "roi",
        heading: "ROI: return on investment",
        body: "ROI works for any spending decision: a marketing campaign, a new hire, a tool or a piece of equipment. It answers \"did this make more than it cost?\". Its weakness is that it ignores time. A 50% ROI over five years is very different from 50% in three months, so state the period.",
      },
      {
        id: "roas",
        heading: "ROAS: return on ad spend",
        body: "ROAS answers a narrower question: how much revenue did each unit of ad spend bring in? It is useful for comparing campaigns and channels day to day. Its weakness is that it ignores product costs, staff time and returns, so a campaign can have a good ROAS and still lose money.",
      },
      {
        id: "example",
        heading: "Worked example",
        body: "A store spends $2,000 on ads and the ads bring in $8,000 of sales. ROAS = $8,000 ÷ $2,000 = **4x**.\n\nThe products have a 40% gross margin, so the sales earn $3,200 of gross profit. Subtract the $2,000 ad spend and $400 of agency fees, and the profit is $800.\n\nROI = ($3,200 − $2,400) ÷ $2,400 = **33%**.\n\nBreak-even ROAS at a 40% margin is 1 ÷ 0.4 = 2.5x. The campaign is profitable, but less than the 4x figure suggests.",
      },
      {
        id: "when-to-use",
        heading: "When to use each",
        body: "- Use **ROAS** to compare and tune ad campaigns quickly.\n- Use **ROI** to decide whether an investment, including a whole channel, is worth continuing.\n- For subscription products, look beyond the first purchase. Compare [CAC](/startup-pedia/customer-acquisition-cost) with [lifetime value](/startup-pedia/customer-lifetime-value), because a campaign that loses money on the first month can be very profitable over a year.",
      },
    ],
    roleNotes: {
      "service-provider": "Reporting ROI as well as ROAS to clients builds trust, because it shows the result after costs.",
    },
    faqs: [
      {
        question: "What is the difference between ROI and ROAS?",
        answer: "ROI measures profit relative to the cost of any investment. ROAS measures revenue relative to ad spend only, and ignores other costs.",
      },
      {
        question: "What is a good ROAS?",
        answer: "One above your break-even ROAS, which is 1 divided by your gross margin. At a 50% margin, anything above 2x covers product costs, before other expenses.",
      },
      {
        question: "Can a campaign have a good ROAS but negative ROI?",
        answer: "Yes. If margins are thin or other costs are high, revenue can exceed ad spend while the campaign still loses money.",
      },
    ],
    sources: [
      { title: "Return on Investment (ROI)", publisher: "Investopedia", url: "https://www.investopedia.com/terms/r/returnoninvestment.asp" },
    ],
    relatedSlugs: ["customer-acquisition-cost", "average-order-value", "customer-lifetime-value"],
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "kpis-and-okrs",
    kind: "term",
    topic: "metrics",
    audiences: ["founder", "mentor", "program", "investor", "builder"],
    title: "KPIs vs OKRs: What They Are and Which Ones a Startup Needs",
    metaTitle: "KPIs vs OKRs: Meaning, Examples and Startup KPIs by Stage",
    metaDescription:
      "KPIs measure ongoing health; OKRs set ambitious goals for a period. What each means, how they work together and which startup KPIs suit each stage.",
    acronyms: ["KPI", "OKR"],
    aliases: ["key performance indicators", "objectives and key results", "startup kpis", "okr examples", "north star metric"],
    answer:
      "A key performance indicator (KPI) is a number you track continuously to see whether the business is healthy, such as weekly active users or monthly revenue. Objectives and key results (OKRs) are a goal-setting method: an ambitious objective for a period plus a few measurable results that show you achieved it.",
    sections: [
      {
        id: "kpi",
        heading: "KPIs: key performance indicators",
        body: "KPIs are the few numbers that show whether the business is working. Good KPIs are measured the same way every time, reviewed on a fixed rhythm (often weekly) and tied to decisions. If a number moving would not change what you do, it is a metric, not a KPI.",
      },
      {
        id: "okr",
        heading: "OKRs: objectives and key results",
        body: "OKRs were developed at Intel and popularised by John Doerr. An OKR has one qualitative **objective**, such as \"Prove clinics will pay for reminders\", and two to four measurable **key results**, such as \"10 clinics on paid plans\" and \"no-show rate down 25% for pilot clinics\". OKRs usually run for a quarter and are meant to be ambitious. Reaching around 70% of a key result is often treated as a good outcome.",
      },
      {
        id: "together",
        heading: "How they work together",
        body: "KPIs tell you where you stand. OKRs tell you what you are trying to change this quarter. A team might track five KPIs every week and set one OKR to move the one that matters most right now. Early startups rarely need a full OKR system. One objective per quarter with two or three key results is plenty.",
      },
      {
        id: "by-stage",
        heading: "Startup KPIs by stage",
        body: "- **Before launch:** customer interviews completed, waitlist conversion of qualified visitors, number of committed early users.\n- **After launch, before product-market fit:** activation rate, weekly active users, retention by cohort, qualitative feedback. See [product-market fit](/startup-pedia/product-market-fit).\n- **Early revenue:** [MRR](/startup-pedia/mrr-and-arr), churn, [CAC](/startup-pedia/customer-acquisition-cost) by channel, conversion from trial to paid.\n- **Scaling:** [LTV:CAC](/startup-pedia/customer-lifetime-value), payback, net revenue retention, gross margin.\n\nMany teams also choose a single **north star metric** that best captures the value customers get, such as \"weekly appointments confirmed\" for a scheduling tool.",
      },
      {
        id: "example",
        heading: "Example",
        body: "A three-person startup with a new scheduling product tracks four weekly KPIs: new clinics activated, weekly active clinics, appointments confirmed and churned clinics. Its quarterly OKR is \"Prove clinics will pay\", with key results of 10 paying clinics, 80% three-month retention among them and two clinics referring another.",
      },
    ],
    roleNotes: {
      mentor: "Ask founders for their three KPIs and last week's values. If they cannot answer quickly, help them choose before discussing anything else.",
      program: "Agree a small set of stage-appropriate KPIs with each team at the start of the program. It makes progress reporting consistent without forcing every team into the same metrics.",
      investor: "Stage-appropriate KPIs show more judgment than a long dashboard. Ask why each one was chosen.",
    },
    faqs: [
      {
        question: "What is the difference between a KPI and an OKR?",
        answer: "A KPI is an ongoing measure of health. An OKR is a time-bound goal: an objective plus measurable key results you aim to achieve, often within a quarter.",
      },
      {
        question: "How many KPIs should a startup track?",
        answer: "Usually three to five that match your stage. More than that dilutes attention.",
      },
      {
        question: "Do early startups need OKRs?",
        answer: "Not a full system. One clear objective per quarter with two or three key results is usually enough for a small team.",
      },
    ],
    sources: [
      { title: "OKR meaning, definition and examples", publisher: "What Matters", url: "https://www.whatmatters.com/faqs/okr-meaning-definition-example" },
      { title: "16 Startup Metrics", publisher: "Andreessen Horowitz", url: "https://a16z.com/16-startup-metrics/" },
    ],
    relatedSlugs: ["mrr-and-arr", "dau-and-mau", "customer-acquisition-cost", "product-market-fit"],
    cta: {
      label: "Track traction weekly",
      href: "/traction-engine",
      description: "Traction Engine combines consistency, channel efficiency, experiment quality and retention into a weekly Traction Score.",
    },
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "dau-and-mau",
    kind: "term",
    topic: "metrics",
    audiences: ["founder", "investor", "builder"],
    title: "DAU and MAU: Daily and Monthly Active Users Explained",
    metaTitle: "DAU vs MAU: Meaning, Formula and the DAU/MAU Ratio",
    metaDescription:
      "DAU and MAU count daily and monthly active users. How to define an active user, calculate the DAU/MAU stickiness ratio and avoid common mistakes.",
    acronyms: ["DAU", "MAU", "WAU"],
    aliases: ["daily active users", "monthly active users", "stickiness ratio", "dau/mau ratio", "active users"],
    answer:
      "Daily active users (DAU) is the number of unique people who use your product on a given day. Monthly active users (MAU) counts unique users over a 30-day period. Dividing DAU by MAU gives a stickiness ratio that shows how often people come back.",
    formulas: [
      { label: "DAU/MAU (stickiness)", expression: "Average DAU over the month ÷ MAU × 100%" },
    ],
    sections: [
      {
        id: "dau",
        heading: "DAU: daily active users",
        body: "DAU counts unique users who performed a meaningful action on a single day. It suits products meant for daily use, such as messaging, social or productivity apps.",
      },
      {
        id: "mau",
        heading: "MAU: monthly active users",
        body: "MAU counts unique users who were active at least once in a 30-day window. It gives a broader view of reach. Products used weekly often track WAU, weekly active users, as their main measure.",
      },
      {
        id: "define-active",
        heading: "Define \"active\" carefully",
        body: "The most important decision is what counts as active. Opening the app or loading a page is a weak definition and inflates the numbers. Choose an action that reflects real value, such as sending a message, completing a task or confirming a booking. Write the definition down and keep it consistent, or your trend becomes meaningless.",
      },
      {
        id: "example",
        heading: "Worked example",
        body: "A habit-tracking app has 12,000 MAU. Its average DAU over the month is 3,000.\n\nDAU/MAU = 3,000 ÷ 12,000 = **25%**. On a typical day, a quarter of monthly users come back.\n\nAs a rough guide, social and messaging apps often aim much higher, while a tool used weekly by design will naturally show a lower ratio. Compare your ratio with how often the problem actually occurs for your customers.",
      },
      {
        id: "mistakes",
        heading: "Common mistakes",
        body: "- Counting logins or page views as activity.\n- Comparing DAU/MAU across products used at different frequencies.\n- Reporting MAU growth while retention falls. New sign-ups can hide users leaving. Pair active users with cohort retention, as described in [product-market fit](/startup-pedia/product-market-fit).",
      },
    ],
    roleNotes: {
      investor: "Ask how \"active\" is defined before comparing DAU or MAU between companies.",
    },
    faqs: [
      {
        question: "What is the difference between DAU and MAU?",
        answer: "DAU counts unique active users on one day. MAU counts unique active users over a 30-day period.",
      },
      {
        question: "What is a good DAU/MAU ratio?",
        answer: "It depends on how often the product should be used. Daily-use products aim high, while weekly-use tools will be lower by design. Track your own trend first.",
      },
      {
        question: "What counts as an active user?",
        answer: "Someone who performs a meaningful action that reflects real value, such as completing a task, not just opening the app. Define it and keep it consistent.",
      },
    ],
    sources: [
      { title: "16 More Startup Metrics", publisher: "Andreessen Horowitz", url: "https://a16z.com/16-more-startup-metrics/" },
    ],
    relatedSlugs: ["kpis-and-okrs", "product-market-fit", "net-promoter-score"],
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "net-promoter-score",
    kind: "term",
    topic: "metrics",
    audiences: ["founder", "service-provider", "program", "mentor"],
    title: "Net Promoter Score (NPS): Formula, Survey and Examples",
    metaTitle: "Net Promoter Score (NPS): How to Calculate and Use It",
    metaDescription:
      "Net Promoter Score (NPS) measures how likely customers are to recommend you. The survey question, the formula, a worked example and how to use it well.",
    acronyms: ["NPS"],
    aliases: ["nps meaning", "nps survey", "promoters detractors", "how to calculate nps"],
    answer:
      "Net Promoter Score (NPS) measures customer loyalty with one question: how likely are you to recommend us to a friend or colleague, from 0 to 10? Subtract the percentage of detractors (0 to 6) from the percentage of promoters (9 or 10) to get a score between −100 and +100.",
    formulas: [
      { label: "NPS", expression: "% Promoters (9–10) − % Detractors (0–6)", note: "Passives (7–8) count in the total but not in either group." },
    ],
    sections: [
      {
        id: "question",
        heading: "The survey",
        body: "The standard question is: \"On a scale from 0 to 10, how likely are you to recommend [product] to a friend or colleague?\" Follow it with an open question: \"What is the main reason for your score?\" The open answers are usually more useful than the number.\n\nNPS was developed by Fred Reichheld with Bain & Company and Satmetrix.",
      },
      {
        id: "example",
        heading: "Worked example",
        body: "200 customers answer. 110 score 9 or 10 (55% promoters), 50 score 7 or 8 (25% passives) and 40 score 0 to 6 (20% detractors).\n\nNPS = 55% − 20% = **+35**.",
      },
      {
        id: "using-it",
        heading: "How to use NPS well",
        body: "- **Close the loop.** Contact detractors to understand and fix the problem, and ask promoters for reviews or referrals.\n- **Segment it.** NPS by customer type often reveals your real [ideal customer](/startup-pedia/ideal-customer-profile).\n- **Track the trend.** Compare your score over time rather than against other industries, where norms differ a lot.\n- **Survey at the right moment,** such as after a customer has used the product for a while, not on day one.",
      },
      {
        id: "limits",
        heading: "Limits",
        body: "NPS records what people say they would do, not what they do. Small samples swing wildly. For early products, the [PMF survey](/startup-pedia/product-market-fit-survey-questions) and retention data are usually better signals of whether people truly need the product. Use NPS as one input, alongside behavior.",
      },
    ],
    roleNotes: {
      "service-provider": "NPS after each project, with the open question, gives you testimonials from promoters and early warning from detractors.",
      program: "Programs often use NPS to measure founder satisfaction with the program itself. Pair it with outcome measures, since satisfaction and progress are not the same thing.",
    },
    faqs: [
      {
        question: "What does NPS stand for?",
        answer: "NPS stands for Net Promoter Score, a measure of how likely customers are to recommend a product or company.",
      },
      {
        question: "How do you calculate NPS?",
        answer: "Ask customers to rate from 0 to 10 how likely they are to recommend you, then subtract the percentage scoring 0 to 6 from the percentage scoring 9 or 10.",
      },
      {
        question: "What is a good NPS?",
        answer: "Any positive score means more promoters than detractors. Norms vary widely by industry, so compare against your own past scores first.",
      },
    ],
    sources: [
      {
        title: "Measuring Your Net Promoter Score",
        publisher: "Bain & Company",
        url: "https://www.netpromotersystem.com/about/measuring-your-net-promoter-score/",
      },
    ],
    relatedSlugs: ["product-market-fit-survey-questions", "product-market-fit", "kpis-and-okrs", "dau-and-mau"],
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
];
