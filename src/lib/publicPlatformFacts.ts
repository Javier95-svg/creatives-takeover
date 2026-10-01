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

export type PublicPulseLink = {
  /** The page the reply names, e.g. /icp-builder. */
  route: string;
  /** Where a click goes. Tools go through the guest quiz first, like the homepage box. */
  destination: string;
  title: string;
  reason: string;
  /** Pre-selects the quiz's first answer so it opens on step 2, as from the homepage. */
  accountType?: 'builder' | 'founder';
};

// The only pages signed-out Pulse may link to. Each one becomes a card under the reply,
// like the action cards in signed-in Pulse.
export const PUBLIC_PULSE_LINKS: readonly PublicPulseLink[] = [
  { route: '/start', destination: '/start', title: 'Take the quick quiz', reason: 'A few questions, then your stage and first step.' },
  ...WHO_IS_THIS_FOR_PROFILES.flatMap((profile) => profile.tools.map((tool) => ({
    route: tool.href,
    // Same hand-off as the homepage box (buildHeroStartPath): quiz first, account last, then the tool.
    destination: `/start?return=${encodeURIComponent(tool.href)}`,
    title: tool.name,
    reason: `${tool.description} Starts with a few quick questions.`,
    accountType: profile.id === 'pre_build' ? 'builder' as const : 'founder' as const,
  }))),
  { route: '/pricing', destination: '/pricing', title: 'Pricing', reason: 'Compare the free plan and paid plans.' },
  { route: '/mentorship', destination: '/mentorship', title: 'Mentorship', reason: 'Meet mentors who help people building a business.' },
  { route: '/marketplace', destination: '/marketplace', title: 'Marketplace', reason: 'Find help with design, marketing or technology.' },
  { route: '/signup', destination: '/signup', title: 'Create a free account', reason: 'Save your work and pick up where you left off.' },
  { route: '/about', destination: '/about', title: 'About Creatives Takeover', reason: 'Who we are and why we built it.' },
];

/** The allowed page a link in a reply points at, or null for anything else. */
export function findPublicPulseLink(href: string | undefined): PublicPulseLink | null {
  if (!href?.startsWith('/')) return null;
  const route = href.replace(/[?#].*$/, '');
  return PUBLIC_PULSE_LINKS.find((candidate) => candidate.route === route) ?? null;
}

/** Cards for the allowed pages a reply links to, in order, at most two. */
export function extractPublicPulseLinks(content: string): PublicPulseLink[] {
  const found: PublicPulseLink[] = [];
  for (const [, route] of content.matchAll(/\]\((\/[^)\s]*)\)/g)) {
    const link = findPublicPulseLink(route);
    if (link && !found.includes(link)) found.push(link);
    if (found.length === 2) break;
  }
  return found;
}

// ---- Questions with written answers ----------------------------------------
// The starter buttons (and the follow-ups offered after each reply) are fixed
// questions, so they get fixed answers: instant, reviewed, and identical every
// time. Only questions the visitor types go to the model.

export type PublicPulseQuestionId = 'who_for' | 'idea' | 'product' | 'cost' | 'get_started';

const PRE_BUILD = WHO_IS_THIS_FOR_PROFILES.find((profile) => profile.id === 'pre_build')!;
const POST_LAUNCH = WHO_IS_THIS_FOR_PROFILES.find((profile) => profile.id === 'post_launch')!;
const toolLink = (tool: { name: string; href: string }) => `[${tool.name}](${tool.href})`;
const paidPlans = PLAN_COPY.filter(({ id }) => PLAN_PRICING[id].monthly > 0);

export const PUBLIC_PULSE_QUESTIONS: readonly { id: PublicPulseQuestionId; text: string; answer: string }[] = [
  {
    id: 'who_for',
    text: 'Who is Creatives Takeover for?',
    answer: `People turning an idea or an early product into a business.

${WHO_IS_THIS_FOR_ACCOUNT_TYPES.map((account) => `- **${account.label}**: ${account.promise}${account.access === 'invitation' ? ' (by invitation)' : ''}`).join('\n')}

The [quick quiz](/start) finds your path.`,
  },
  {
    id: 'idea',
    text: 'I have an idea. Where do I start?',
    answer: `${PRE_BUILD.headline} Find who needs it with the ${toolLink(PRE_BUILD.tools[0])}, then show people a simple version in ${toolLink(PRE_BUILD.tools[1])} and see how they respond.`,
  },
  {
    id: 'product',
    text: 'I already have a product. How can it help?',
    answer: `${POST_LAUNCH.headline} Choose who to reach and one way to reach them with the ${toolLink(POST_LAUNCH.tools[0])}, then see who joins and comes back in the ${toolLink(POST_LAUNCH.tools[1])}.`,
  },
  {
    id: 'cost',
    text: 'Is it free? What does it cost?',
    answer: `Yes, you can start free: Rookie includes ${PLAN_MONTHLY_CREDITS.rookie} credits a month. Paid plans are ${paidPlans.map(({ id, name }) => `${name} ($${PLAN_PRICING[id].monthly}/month)`).join(', ')}. Compare them on [Pricing](/pricing).`,
  },
  {
    id: 'get_started',
    text: 'How do I get started?',
    answer: 'Take the [quick quiz](/start): a few questions about your idea or product, then your stage and a first step. You create a free account at the end to save it.',
  },
];

/** The buttons shown before the first question. */
export const PUBLIC_PULSE_STARTERS = PUBLIC_PULSE_QUESTIONS.filter(({ id }) => id !== 'get_started').map(({ text }) => text);

// After a reply, offer questions not asked yet. Getting started comes early:
// it is the step that leads into the quiz.
const FOLLOW_UP_ORDER: readonly PublicPulseQuestionId[] = ['get_started', 'cost', 'idea', 'product', 'who_for'];

export function findPublicPulseQuestion(text: string) {
  const normalized = text.trim().toLowerCase();
  return PUBLIC_PULSE_QUESTIONS.find((question) => question.text.toLowerCase() === normalized) ?? null;
}

/** Up to two follow-up buttons: questions from the list the visitor has not asked. */
export function publicPulseFollowUps(askedTexts: readonly string[]): string[] {
  const asked = new Set(askedTexts.map((text) => findPublicPulseQuestion(text)?.id).filter(Boolean));
  return FOLLOW_UP_ORDER.filter((id) => !asked.has(id)).slice(0, 2)
    .map((id) => PUBLIC_PULSE_QUESTIONS.find((question) => question.id === id)!.text);
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
Creatives Takeover is a place to turn an idea or an early product into real progress. It gives you tools to test an idea, one place to save your work, and people who can help: mentors, service providers and investors. There is no application process and the platform takes no equity (mention this only if asked about joining requirements or equity). Creating an account is free.

Who it is for (account types):
${accounts}

The two founder paths:
${profiles}

Pricing (credits pay for the heavier tools; the free plan is enough to start):
${PLAN_COPY.map(planLine).join('\n')}
Full details: /pricing

How to start:
- Type your idea (Idea mode) or what you are building (Product mode) in the box on the homepage. You answer a few quick questions, get a plan with your stage and a first step, then create a free account to save it.
- Mentors and marketplace providers need an invitation and an admin review. Investors join on their own and can see founder matches right away.

Pages you can link to (use these exact paths, nothing else):
${PUBLIC_PULSE_LINKS.map((link) => `- [${link.title}](${link.route}): ${link.reason}`).join('\n')}

How to answer (these rules replace the length and style rules above):
- Very short: 1-3 sentences, at most 60 words. A list only when naming account types or plans, 5 bullets max, one line each. No headings.
- Always include 1 or 2 markdown links to the pages above, written inline, e.g. "Start with the [ICP Builder](/icp-builder)." They become buttons under your reply. Never write bare URLs.
- To get started, link to [Take the quick quiz](/start) rather than sign-up; link [Create a free account](/signup) only when asked about accounts.
- Sound like a knowledgeable guide, not a sales pitch: plain, neutral, factual. No slogans, hype, exclamation marks or persuasive taglines; answer the question and stop.
- Lead with outcomes for the person (test an idea, find customers, launch, grow), not with technology. Do not describe the platform as an AI product or lead with AI.
- Match the visitor: someone with an idea gets the pre-build path, someone with a live product gets the post-launch path.
- If something is not in these facts, say you are not sure and link to [Pricing](/pricing) or [About Creatives Takeover](/about). Never invent features, numbers, customers or testimonials.`;
}
