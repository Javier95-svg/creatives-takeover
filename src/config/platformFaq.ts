import { PLAN_MONTHLY_CREDITS, PLAN_PRICING } from "./pricing.ts";

export interface PlatformFaqItem {
  question: string;
  answer: string;
}

export const PLATFORM_FAQS: PlatformFaqItem[] = [
  {
    question: "What is Creatives Takeover?",
    answer:
      "Creatives Takeover is an AI-powered startup development platform for first-time founders. It connects customer clarity, validation, MVP building, go-to-market execution, traction, and fundraising preparation in one guided system.",
  },
  {
    question: "How much does Creatives Takeover cost?",
    answer: `Rookie is free with ${PLAN_MONTHLY_CREDITS.rookie} credits per month. Starter is $${PLAN_PRICING.starter.monthly}/month or $${PLAN_PRICING.starter.yearly}/year with ${PLAN_MONTHLY_CREDITS.starter} credits. Rising is $${PLAN_PRICING.rising.monthly}/month or $${PLAN_PRICING.rising.yearly}/year with ${PLAN_MONTHLY_CREDITS.rising} credits. Pro is $${PLAN_PRICING.pro.monthly}/month or $${PLAN_PRICING.pro.yearly}/year with ${PLAN_MONTHLY_CREDITS.pro} credits.`,
  },
  {
    question: "How do credits work?",
    answer:
      "Credits meter AI-powered actions inside the platform. Each plan includes a monthly credit grant, while the pricing comparison identifies which tools and limits are available on each tier. Included credits reset at the billing-cycle boundary and do not roll over.",
  },
  {
    question: "Can I use Creatives Takeover for free?",
    answer: `Yes. Rookie is free without a credit card and includes ${PLAN_MONTHLY_CREDITS.rookie} credits per month. ICP Builder remains free, and the plan includes access to selected founder tools, the answer library, the Newspaper, and community browsing.`,
  },
  {
    question: "Where should a first-time founder start?",
    answer:
      "Start by defining one ideal customer and one painful job worth solving. Then gather customer evidence before building. The Founder Answer Library and ICP Builder are the lowest-friction starting points when the target customer is still unclear.",
  },
  {
    question: "Where can I review how startup data is handled?",
    answer:
      "Review the Privacy Policy and Data Privacy Policy for details about collection, storage, service providers, account rights, and deletion requests. Contact admin@creatives-takeover.com for an account-specific privacy request.",
  },
];
