/**
 * Step-by-step platform guides for signed-in Pulse.
 *
 * Pulse knew each tool by a one-line purpose, so "how do I use Demo Studio?"
 * got a link card and generic advice. These guides describe the real flow of
 * the product (the actual buttons and pages), are matched lexically like
 * Startup Pedia entries, and ride the answer prompt as verified evidence.
 * Import-light so the chatbot-streaming edge function can use it.
 *
 * Keep each guide in step with the UI it describes; a stale step is worse than
 * no guide. Steps name pages in words, never as paths or URLs.
 */

export interface PulseGuideCard {
  /** A founder tool key (homeToolActions) or a browse id (validateHomeActions). */
  kind: 'tool' | 'browse';
  id: string;
  title: string;
  reason: string;
}

export interface PulseGuide {
  id: string;
  title: string;
  /** Extra words people use for this task, beyond the title. */
  aliases: string[];
  steps: string[];
  card?: PulseGuideCard;
}

export const PULSE_GUIDES: readonly PulseGuide[] = [
  {
    id: 'demo-studio',
    title: 'Create and publish a demo in Demo Studio',
    aliases: ['demo studio', 'product demo', 'interactive demo', 'click-through demo', 'screenshots demo', 'publish demo', 'share demo', 'embed demo', 'demo link'],
    steps: [
      'Open Demo Studio and click "New project", or open an existing project.',
      'Enter the product name and an optional one-line description, then "Create and add screens". The editor opens directly; the story brief is optional.',
      'Add screens with Upload (screenshots), Capture screen, Import webpage (an HTML file saved with SingleFile) or Capture live site (records clicks on a published MVP).',
      'Give each screen a title and caption in the "This screen" tab, or use "Draft captions with AI". Generating costs credits; publishing is free.',
      'In the "Finish" tab set the end button label and destination, whether to ask for an email at the end, the demo colour and the watermark (removable on Rising and Pro).',
      'Clear the "Before you publish" checks: every screen needs a screenshot and a caption, and click targets and the end button must work.',
      'Preview, then Publish. "Share your demo" gives the share link and an embed snippet for other sites.',
      'After sharing, the project page offers the extras: a story brief, a pitch video, and a launch page with a signup form.',
    ],
    card: { kind: 'tool', id: 'demo_studio', title: 'Demo Studio', reason: 'Build and publish the demo step by step.' },
  },
  {
    id: 'launch-page',
    title: 'Publish a launch page for your demo',
    aliases: ['launch page', 'landing page', 'signup page', 'waitlist page', 'launch composer', 'public page', 'launchpad entry'],
    steps: [
      'A launch page needs a published demo and a pitch video first; both are offered on the project page under "After you share".',
      'Open the project\'s Launch page composer.',
      'Set the headline, subheadline, call-to-action label and public slug, choose the look and layout, and write the success message visitors see after signing up.',
      'Publish. The page goes live at its public address with the demo, the pitch video and a signup form; Unpublish takes it down again.',
      '"Share your launch" gives the link, a ready-to-post text and an embed code. You can also turn on email or webhook notifications for new signups.',
      'A published launch page can be entered into the weekly Launchpad round (one entry per round) to collect upvotes from other founders.',
    ],
    card: { kind: 'tool', id: 'demo_studio', title: 'Demo Studio', reason: 'The launch page lives inside your Demo Studio project.' },
  },
  {
    id: 'book-mentor',
    title: 'Book a free discovery call with a mentor',
    aliases: ['book a mentor', 'mentor call', 'discovery call', 'talk to a mentor', 'schedule a mentor', 'mentorship session', 'meet a mentor'],
    steps: [
      'Browse mentors on the Mentorship page. Filter by expertise, stage, language or timezone, and save the ones you like for later.',
      'Open a mentor\'s profile and book a discovery call. Discovery calls are free.',
      'Pick your timezone and propose three times, choose the support type and coaching format, and describe your project so the mentor can prepare.',
      'The mentor confirms one of the times by email; the booking then gets a private Google Meet link.',
      'Follow your requests under My Bookings. Messaging a mentor directly is also free.',
    ],
    card: { kind: 'browse', id: 'mentorship', title: 'Browse mentors', reason: 'Find a mentor and book a discovery call.' },
  },
  {
    id: 'marketplace-contact',
    title: 'Get help from a Marketplace service provider',
    aliases: ['marketplace', 'service provider', 'hire a designer', 'hire a developer', 'hire an agency', 'contact a provider', 'provider email', 'find a freelancer'],
    steps: [
      'Open the Marketplace and browse by category, search, or sort by Featured, Alphabetical or Newest.',
      'Open a provider\'s profile to see their services, portfolio and pricing.',
      'Message the provider from their profile; messaging is free. Revealing a provider\'s direct email address costs credits.',
      'The provider sees your enquiry on their side and replies by message.',
    ],
    card: { kind: 'browse', id: 'marketplace', title: 'Browse the Marketplace', reason: 'Compare providers and start a conversation.' },
  },
  {
    id: 'billing',
    title: 'Upgrade your plan, buy credits and manage billing',
    aliases: ['upgrade', 'upgrade plan', 'change plan', 'downgrade', 'cancel subscription', 'cancel my plan', 'billing', 'invoice', 'receipt', 'buy credits', 'credit pack', 'top up', 'purchase history', 'refund', 'payment'],
    steps: [
      'Compare plans on the Pricing page and choose monthly or yearly. Checkout runs through Stripe and returns you to the app when it completes.',
      'Buy one-time credit packs from the credit badge in the header.',
      'Past payments are listed on the Purchase History page.',
      'There is no in-app page yet to cancel, downgrade or change a subscription: send the request through the Contact page and the team handles it.',
      'Referrals also move your plan up: invite founders from the Referral Program page.',
    ],
    card: { kind: 'browse', id: 'pricing', title: 'See plans and pricing', reason: 'Compare plans and start an upgrade.' },
  },
  {
    id: 'become-mentor-provider',
    title: 'Become a mentor or a service provider',
    aliases: ['become a mentor', 'apply as mentor', 'mentor application', 'list my services', 'become a provider', 'join the marketplace', 'offer services', 'sell services'],
    steps: [
      'Create an account and in onboarding choose "I want to advise people building projects" (mentor) or "I want to deliver services to projects" (provider). No invitation is needed.',
      'Answer the application questions: mentors give a short intro, a link and their monthly time; providers give their business name, link, category, services, ideal customer, portfolio and capacity.',
      'An admin reviews the application; the account opens once it is approved.',
      'Approved mentors handle discovery-call requests under My Bookings; approved providers see who reached out under Enquiries. The public listing is set up together with the team after approval.',
    ],
  },
];

const STOP = new Set(['how', 'do', 'does', 'can', 'i', 'to', 'the', 'a', 'an', 'my', 'me', 'our', 'your', 'in', 'on', 'for', 'with', 'what', 'where', 'is', 'are', 'it', 'this', 'that', 'use', 'using', 'get', 'and', 'or', 'of', 'please', 'help', 'want', 'need']);
const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (value: string) => [...new Set(normalize(value).split(/\s+/).filter(token => token.length > 1 && !STOP.has(token)))];
const includesPhrase = (haystack: string, phrase: string) => haystack === phrase || haystack.includes(` ${phrase} `) || haystack.startsWith(`${phrase} `) || haystack.endsWith(` ${phrase}`);

/** A how-to or "where do I" request, as opposed to a strategy or evidence question. */
export function asksHowTo(message: string): boolean {
  return /\b(how (?:do|can|to|does|should) (?:i|we|you|one)?|how (?:do|does) .* work|where (?:do|can|is|are) (?:i|we|the|my)|walk me through|show me how|step[- ]by[- ]step|what are the steps|guide me|get started with|set up|cancel|upgrade|downgrade|become a|apply (?:as|to be))\b/i.test(message);
}

function scoreGuide(guide: PulseGuide, query: string): number {
  const phrase = normalize(query);
  const queryTokens = tokens(query);
  if (!queryTokens.length) return 0;
  const title = normalize(guide.title);
  const aliases = guide.aliases.map(normalize);
  const body = normalize(guide.steps.join(' '));
  let score = includesPhrase(title, phrase) ? 120 : 0;
  for (const alias of aliases) {
    if (alias === phrase) score += 140;
    else if (includesPhrase(phrase, alias)) score += 60;
  }
  for (const token of queryTokens) {
    if (title.split(' ').includes(token)) score += 24;
    if (aliases.some(alias => alias.split(' ').includes(token))) score += 20;
    if (body.includes(token)) score += 2;
  }
  return score;
}

/**
 * The one guide that answers this message, or null. A how-to phrasing lowers
 * the bar; a plain mention of the task needs a strong match so strategy
 * questions that happen to name a tool are not answered with a tutorial.
 */
export function findPulseGuide(message: string): PulseGuide | null {
  const ranked = PULSE_GUIDES.map(guide => ({ guide, score: scoreGuide(guide, message) }))
    .sort((a, b) => b.score - a.score || a.guide.id.localeCompare(b.guide.id));
  const best = ranked[0];
  if (!best || best.score <= 0) return null;
  const threshold = asksHowTo(message) ? 40 : 100;
  return best.score >= threshold ? best.guide : null;
}

/** The guide as evidence for the answer prompt: title and steps, nothing else. */
export function guideEvidence(guide: PulseGuide): { id: string; title: string; steps: string[] } {
  return { id: guide.id, title: guide.title, steps: guide.steps };
}
