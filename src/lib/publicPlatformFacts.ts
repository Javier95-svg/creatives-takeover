import { WHO_IS_THIS_FOR_ACCOUNT_TYPES, WHO_IS_THIS_FOR_PROFILES } from '../components/whoIsThisForProfiles.ts';
import { PLAN_MONTHLY_CREDITS, PLAN_PRICING } from '../config/pricing.ts';

/**
 * What Pulse tells visitors who are not signed in.
 *
 * Signed-out Pulse had no facts to work from, so it improvised. This brief is
 * built from the same sources the site renders ("Who is this for?" and the
 * pricing config), so the answers cannot drift from the pages. Import-light so
 * the chatbot-streaming edge function can use it.
 */

// Plan names and what each plan is for, as shown on the pricing page.
const PLAN_COPY = [
  { id: 'rookie', name: 'Rookie', outcome: 'Clarify' },
  { id: 'starter', name: 'Starter', outcome: 'Validate' },
  { id: 'rising', name: 'Rising', outcome: 'Build and Launch' },
  { id: 'pro', name: 'Pro', outcome: 'Accelerate and Fundraise' },
] as const;

function planLine({ id, name, outcome }: (typeof PLAN_COPY)[number]) {
  const price = PLAN_PRICING[id];
  const cost = price.monthly === 0 ? 'free' : `$${price.monthly}/month or $${price.yearly}/year`;
  return `- ${name} (${cost}): ${outcome}. ${PLAN_MONTHLY_CREDITS[id]} monthly credits.`;
}

export function buildPublicPlatformBrief(): string {
  const accounts = WHO_IS_THIS_FOR_ACCOUNT_TYPES.map((account) =>
    `- ${account.label} ("${account.promise}"): ${account.next} ${account.access === 'invitation' ? 'Joining needs an invitation and an admin review.' : 'Anyone can join.'}`,
  ).join('\n');

  const profiles = WHO_IS_THIS_FOR_PROFILES.map((profile) =>
    `- ${profile.label}: ${profile.headline} ${profile.description}\n  Tools: ${profile.tools.map((tool) => `${tool.name} (${tool.href}) - ${tool.description}`).join('; ')}`,
  ).join('\n');

  return `FACTS FOR VISITORS WHO ARE NOT SIGNED IN (use only these for platform questions):

What it is:
Creatives Takeover is a place to turn an idea or an early product into real progress. It gives you tools to test an idea, one place to save your work, and people who can help: mentors, service providers and investors. No application. No cohort. No equity. Creating an account is free.

Who it is for (account types):
${accounts}

The two founder paths:
${profiles}

Pricing (credits pay for the heavier tools; the free plan is enough to start):
${PLAN_COPY.map(planLine).join('\n')}
Full details: /pricing

How to start:
- Type your idea (Idea mode) or what you are building (Product mode) in the box on the homepage. You answer a few quick questions, get a plan with your stage and a first step, then create a free account to save it.
- Mentors and marketplace providers need an invitation. Investors can join; matching opens after review.

How to answer:
- Lead with outcomes for the person (test an idea, find customers, launch, grow), not with technology. Do not describe the platform as an AI product or lead with AI.
- Match the visitor: someone with an idea gets the pre-build path, someone with a live product gets the post-launch path.
- Keep it short: 50-120 words, plain language, and end with one concrete next step (usually the homepage box, a tool link, or /pricing).
- If something is not in these facts, say you are not sure and point to /pricing or /about. Never invent features, numbers, customers or testimonials.`;
}
