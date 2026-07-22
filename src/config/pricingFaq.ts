import { PLAN_MONTHLY_CREDITS, PLAN_PRICING } from "./pricing.ts";

export interface PricingFaqItem {
  question: string;
  answer: string;
  relatedQuestions: number[];
}

export const PRICING_FAQS: PricingFaqItem[] = [
  {
    question: "Can I change plans later?",
    answer: `Yes. You can move between Rookie, Starter, Rising, and Pro whenever your workflow changes.

Upgrades unlock the new plan immediately. Downgrades take effect on the next billing cycle so you keep the access, credits, and limits you already paid for until that cycle ends.`,
    relatedQuestions: [1, 3],
  },
  {
    question: "What are credits and how do they work?",
    answer: `Credits are the usage currency for the AI-powered parts of the platform. Every plan includes a monthly credit grant: Rookie gets ${PLAN_MONTHLY_CREDITS.rookie} credits, Starter ${PLAN_MONTHLY_CREDITS.starter} credits, Rising ${PLAN_MONTHLY_CREDITS.rising} credits, and Pro ${PLAN_MONTHLY_CREDITS.pro} credits.

GTM Strategist is available on every plan and uses 6 credits per researched generation; manual edits and weekly reviews are included. Other plan-gated tools follow the comparison table.

ICP Builder stays free across all four plans. Discovery Calls are available on every plan with no monthly cap and cost 10 credits per confirmed booking.`,
    relatedQuestions: [0, 5],
  },
  {
    question: "How should I choose the right plan?",
    answer: `Think about your founder stage, not just the credit number.

Rookie helps you clarify your ICP and first traction asset. Starter is for validating demand with PMF Lab, Email Templates, and more research/community access. Rising is for building and launching with MVP Builder, Tech Stack Builder, GTM Strategist, Directories, and Pitch Deck Analyzer. Pro is for fundraising and scaling with Find Your Angel, unlimited research views, and the largest credit runway.`,
    relatedQuestions: [1, 7],
  },
  {
    question: "Do unused credits roll over to the next month?",
    answer: `No. Included monthly credits reset on your billing-cycle boundary and do not roll over.

If you routinely run out before the cycle ends, you can move up a plan or add a credit pack for a heavier execution window.`,
    relatedQuestions: [0, 1],
  },
  {
    question: "Do you offer refunds?",
    answer: `Paid subscriptions are covered by our standard refund policy. If you need help with a charge or believe something is wrong with billing, contact support and we will review it quickly.

Plan upgrades, renewals, and billing-cycle timing are processed through Stripe.`,
    relatedQuestions: [5, 6],
  },
  {
    question: "Can I cancel anytime?",
    answer: `Yes. There is no long-term lock-in.

If you cancel, your paid access stays active until the end of the current billing period and then your account falls back to Rookie.`,
    relatedQuestions: [0, 4],
  },
  {
    question: "Is my payment information secure?",
    answer: `Yes. Payments are processed through Stripe and we do not store raw card details on our servers.

Billing, renewals, and checkout security run on Stripe's infrastructure rather than custom card handling inside the product.`,
    relatedQuestions: [4, 9],
  },
  {
    question: "What's included in the Rookie plan?",
    answer: `Rookie is free forever and includes ${PLAN_MONTHLY_CREDITS.rookie} credits per month. You get Dashboard Rookie Mode, ICP Builder for free, Demo Studio and MVP Builder with per-action credit usage, Prompt Library access for free models, Insighta Test, Newspaper, Discovery Calls at 10 credits per confirmed booking, and Find a Co-Founder posting at 5 credits per published post.

VC Search and Accelerator Hunt are browse-only on Rookie. GTM Strategist remains available using account credits, while other plan-gated tools follow the comparison table.`,
    relatedQuestions: [1, 2],
  },
  {
    question: "What happens to my data if I downgrade?",
    answer: `Downgrading changes what you can create next, not whether your existing work still exists.

You keep your prior data, but plan-locked actions follow the limits of your new tier. Saved workspaces remain accessible.`,
    relatedQuestions: [0, 3],
  },
  {
    question: "How does billing work?",
    answer: `You can choose monthly or yearly billing on Starter, Rising, and Pro. Current prices are Starter at $${PLAN_PRICING.starter.monthly}/month or $${PLAN_PRICING.starter.yearly}/year, Rising at $${PLAN_PRICING.rising.monthly}/month or $${PLAN_PRICING.rising.yearly}/year, and Pro at $${PLAN_PRICING.pro.monthly}/month or $${PLAN_PRICING.pro.yearly}/year.

Your subscription renews automatically until you cancel. Included credits and quota-limited actions reset on the same billing-cycle anchor rather than a generic calendar month.`,
    relatedQuestions: [0, 5],
  },
  {
    question: "Can I get a custom plan for my team?",
    answer: `Yes. If your team needs custom credit allocations, more seats, or a different support model, contact us directly.

The default self-serve offering centers on Rookie, Starter, Rising, and Pro, while larger team setups can be scoped separately.`,
    relatedQuestions: [0, 9],
  },
];
