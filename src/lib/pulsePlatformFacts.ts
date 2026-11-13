import { PLAN_MONTHLY_CREDITS, PLAN_PRICING, TOP_UP_PACKS } from '../config/pricing.ts';
import { MONTHLY_FREE_QUOTAS, PLAN_LABELS, PLAN_SEQUENCE, type Plan } from '../config/planPermissions.ts';
import { CREDIT_COSTS, PLAN_CREDIT_COST_OVERRIDES } from '../config/constants.ts';
import { PROJECT_LIMIT_BY_PLAN } from './projectLimits.ts';
import { PUBLISHED_DEMO_CAP } from './demoStudio/plan.ts';

/**
 * Platform facts for signed-in Pulse.
 *
 * Signed-in Pulse knows the user's own work but had no facts about the product,
 * so pricing, plan and gating questions went unanswered. This brief is built
 * from the same config the product renders (pricing, plan permissions, credit
 * costs), so the answers cannot drift from the pages. Import-light so the
 * chatbot-streaming edge function can use it.
 *
 * Pages are named in words, not paths: the answer prompt forbids URLs outside
 * validated cards, and a path in prose would fight that rule.
 */

function planLine(plan: Plan): string {
  const price = PLAN_PRICING[plan];
  const cost = price.monthly === 0 ? 'free' : `$${price.monthly}/month or $${price.yearly}/year`;
  return `${PLAN_LABELS[plan]} (${cost}, ${PLAN_MONTHLY_CREDITS[plan]} credits/month)`;
}

function perPlan(limits: Record<string, number>): string {
  return PLAN_SEQUENCE.map((plan) => `${PLAN_LABELS[plan]} ${Number.isFinite(limits[plan]) ? limits[plan] : 'unlimited'}`).join(', ');
}

export function buildPulsePlatformFacts(): string {
  const waitlistRookie = PLAN_CREDIT_COST_OVERRIDES.rookie?.WAITLIST_GENERATION ?? CREDIT_COSTS.WAITLIST_GENERATION;
  return [
    'PLATFORM FACTS (verified; use them for pricing, plan, credit and feature-access questions; name pages in words, never as paths or URLs):',
    `- Plans: ${PLAN_SEQUENCE.map(planLine).join('; ')}. Comparing and upgrading happens on the Pricing page. One-time credit packs (${TOP_UP_PACKS.map((pack) => `${pack.credits} for $${pack.priceUsd}`).join(', ')}) are bought from the credit badge in the header.`,
    `- Projects at once: ${perPlan(PROJECT_LIMIT_BY_PLAN)}. The limit message offers archiving a project or upgrading.`,
    `- Credit costs: ICP Builder first draft free, then ${CREDIT_COSTS.ICP_EXTRA_DRAFT}; Demo Studio or waitlist generation ${CREDIT_COSTS.WAITLIST_GENERATION} (${waitlistRookie} on Rookie), publishing free; PMF Lab verdict ${CREDIT_COSTS.PMF_SCORING}; GTM analysis ${CREDIT_COSTS.GTM_ANALYSIS}; Tech Stack ${CREDIT_COSTS.TECH_STACK_GENERATION} (first analysis free); Pitch Deck Analyzer deep audit first free, then ${CREDIT_COSTS.PITCH_DECK_ANALYZER}; MVP Builder per action (generate ${CREDIT_COSTS.APP_BUILDER_GENERATE}, refine ${CREDIT_COSTS.APP_BUILDER_REFINE}, debug ${CREDIT_COSTS.APP_BUILDER_DEBUG}, add page ${CREDIT_COSTS.APP_BUILDER_ADD_PAGE}, add feature ${CREDIT_COSTS.APP_BUILDER_ADD_FEATURE}, deploy ${CREDIT_COSTS.APP_BUILDER_DEPLOY}, export free); revealing a marketplace provider's email ${CREDIT_COSTS.SERVICE_MARKETPLACE_EMAIL}. Free: Pulse, direct messages, mentor discovery calls, co-founder posts, Traction Engine logging.`,
    `- Plan access: Find Your Angel (full angel investor profiles) is part of Pro. VC and accelerator profile opens per month: ${perPlan(MONTHLY_FREE_QUOTAS.vc_profiles)}; directory visits per month: ${perPlan(MONTHLY_FREE_QUOTAS.directory_visits)}. Email Templates are included on Starter and up. First Customer Proof is full on Rising and Pro, preview below that. MVP Builder advanced AI models and the full Prompt Library need Rising or Pro; a custom domain for a published MVP needs Starter or up. Demo watermark removal needs Rising or Pro; published demos at once: ${perPlan(PUBLISHED_DEMO_CAP)}.`,
    '- Accounts: founders and builders join free with no application; mentors and service providers apply at sign-up and an admin reviews it; investors join self-serve. The platform takes no equity.',
    '- Billing runs through Stripe; past payments are on the Purchase History page. There is no in-app page to cancel or change a subscription yet: for billing changes, point the user to the Contact page.',
    'If a pricing, plan or feature fact is not covered here or in saved context, say you are not sure instead of guessing.',
  ].join('\n');
}
