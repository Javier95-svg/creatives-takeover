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

export type PublicPulseLink = { route: string; title: string; reason: string };

// The only pages signed-out Pulse may link to. Each one becomes a card under the reply,
// like the action cards in signed-in Pulse.
export const PUBLIC_PULSE_LINKS: readonly PublicPulseLink[] = [
  { route: '/start', title: 'Take the quick quiz', reason: 'A few questions, then your stage and first step.' },
  ...WHO_IS_THIS_FOR_PROFILES.flatMap((profile) => profile.tools.map((tool) => ({ route: tool.href, title: tool.name, reason: tool.description }))),
  { route: '/pricing', title: 'Pricing', reason: 'Compare the free plan and paid plans.' },
  { route: '/mentorship', title: 'Mentorship', reason: 'Meet mentors who help people building a business.' },
  { route: '/marketplace', title: 'Marketplace', reason: 'Find help with design, marketing or technology.' },
  { route: '/signup', title: 'Create a free account', reason: 'Save your work and pick up where you left off.' },
  { route: '/about', title: 'About Creatives Takeover', reason: 'Who we are and why we built it.' },
];

/** Cards for the allowed pages a reply links to, in order, at most two. */
export function extractPublicPulseLinks(content: string): PublicPulseLink[] {
  const found: PublicPulseLink[] = [];
  for (const [, route] of content.matchAll(/\]\((\/[^)\s]*)\)/g)) {
    const link = PUBLIC_PULSE_LINKS.find((candidate) => candidate.route === route.replace(/[?#].*$/, ''));
    if (link && !found.includes(link)) found.push(link);
    if (found.length === 2) break;
  }
  return found;
}

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

Pages you can link to (use these exact paths, nothing else):
${PUBLIC_PULSE_LINKS.map((link) => `- [${link.title}](${link.route}): ${link.reason}`).join('\n')}

How to answer (these rules replace the length and style rules above):
- Very short: 1-3 sentences, at most 60 words. A list only when naming account types or plans, 5 bullets max, one line each. No headings.
- Always include 1 or 2 markdown links to the pages above, written inline, e.g. "Start with the [ICP Builder](/icp-builder)." They become buttons under your reply. Never write bare URLs.
- To get started, link to [Take the quick quiz](/start) rather than sign-up; link [Create a free account](/signup) only when asked about accounts.
- Lead with outcomes for the person (test an idea, find customers, launch, grow), not with technology. Do not describe the platform as an AI product or lead with AI.
- Match the visitor: someone with an idea gets the pre-build path, someone with a live product gets the post-launch path.
- If something is not in these facts, say you are not sure and link to [Pricing](/pricing) or [About Creatives Takeover](/about). Never invent features, numbers, customers or testimonials.`;
}
