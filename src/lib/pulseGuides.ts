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
  {
    id: 'icp-builder',
    title: 'Define your ideal customer in ICP Builder',
    aliases: ['icp builder', 'icp', 'ideal customer', 'customer profile', 'target customer', 'who to sell to', 'persona', 'define my customer'],
    steps: [
      'Open ICP Builder and pick a mode: "I can describe my startup idea clearly" (fast) or "I\'m still figuring things out" (guided, with more questions).',
      'Answer the questions about the problem, who has it and how they solve it today.',
      'Generate the profile. You get a saved ICP draft with a score and sections on the customer, the pain and the moat.',
      'The first draft on an account is free; each extra draft costs credits. Drafts are saved to the project and can be shared with a public link.',
      'From the draft you can continue into Demo Studio to build a demo for that customer.',
    ],
    card: { kind: 'tool', id: 'icp_builder', title: 'ICP Builder', reason: 'Define the customer step by step.' },
  },
  {
    id: 'pmf-lab',
    title: 'Validate demand in PMF Lab',
    aliases: ['pmf lab', 'pmf', 'product market fit', 'validate demand', 'customer interviews', 'survey', 'verdict', 'validate my idea'],
    steps: [
      'PMF Lab has three steps: "Talk to customers", "Ask product users" and "Get your verdict".',
      'In "Talk to customers", log each real conversation: who you spoke to and what they said, including the strongest quote.',
      'In "Ask product users", share the one-question survey link with people who have used the product; answers land in the lab.',
      'In "Get your verdict", say how you reached people and how many, what would change your mind, what people said about paying, the urgency and the recurring themes, then click "Get my verdict".',
      'The verdict is Build, Narrow, Pivot or Stop, scored out of 100 with the reasons. Scoring costs credits; logging is free. Demo views, clicks and signups count as evidence too.',
    ],
    card: { kind: 'tool', id: 'pmf_lab', title: 'PMF Lab', reason: 'Run the three validation steps.' },
  },
  {
    id: 'gtm-strategist',
    title: 'Plan and run customer acquisition in GTM Strategist',
    aliases: ['gtm', 'gtm strategist', 'go to market', 'go-to-market', 'acquisition', 'first customers', 'sales plan', 'channels', 'pipeline', 'first customer proof', 'plan my launch'],
    steps: [
      'Start with the intake: business type, product and customer (you can import from MVP Builder), then "Check your answers" before the analysis runs. The analysis costs credits.',
      'You get a six-week plan with channels and this week\'s tasks.',
      'Track prospects on the pipeline board (lead, qualified, opportunity, customer, lost) and log each week\'s result with the quick log.',
      'Run the weekly review: wins, misses, objections, customer language and blockers. GTM Strategist proposes changes you can apply or dismiss.',
      'First Customer Proof (10 prospects, 10 messages, a decision) runs fully on Rising and Pro; other plans see a preview.',
    ],
    card: { kind: 'tool', id: 'gtm_strategist', title: 'GTM Strategist', reason: 'Plan the channels and run the weekly loop.' },
  },
  {
    id: 'mvp-builder',
    title: 'Build and publish an MVP in MVP Builder',
    aliases: ['mvp builder', 'app builder', 'build my app', 'build an mvp', 'build my mvp', 'publish my app', 'custom domain', 'deploy my app', 'prototype app'],
    steps: [
      'Describe the app in the chat; MVP Builder generates it and shows a live preview. Each action (generate, refine, debug, add a page or feature, deploy) is billed in credits; the first build is a one-time free gift.',
      'Keep refining in the chat. "Version history" lets you go back to an earlier version.',
      '"Publish" runs a pre-publish check, then puts the app on a public creatives-takeover.com address. Starter and up can connect their own domain.',
      'Forms in the app save signups and requests to the "Leads" tab, with "Download CSV".',
      '"Export" downloads the whole project as a ZIP for free. GitHub and Supabase integrations are available from the builder.',
      'Rookie and Starter use the free models; Rising and Pro default to a stronger model. The Pulse bubble is hidden on this page because MVP Builder has its own chat.',
    ],
    card: { kind: 'tool', id: 'mvp_builder', title: 'MVP Builder', reason: 'Build, publish and export the app.' },
  },
  {
    id: 'traction-engine',
    title: 'Log weekly traction in Traction Engine',
    aliases: ['traction engine', 'traction', 'weekly log', 'retention', 'channel experiments', 'growth signals', 'log my week'],
    steps: [
      'Each week, add the channel experiments you ran and the buyer or retention signal that matters, then "Save this week" (you can update it later).',
      'Set a target for each experiment; the page and Pulse compare the recorded result with the target.',
      'Logging is free. A streak of logged weeks shows on the page, and the log is the evidence later stages and investors ask for.',
    ],
    card: { kind: 'tool', id: 'traction_engine', title: 'Traction Engine', reason: 'Log this week\'s experiments and signals.' },
  },
  {
    id: 'founder-id',
    title: 'Set up and share your Founder ID',
    aliases: ['founder id', 'public profile', 'my profile', 'profile link', 'username', 'share my profile', 'support my work', 'project updates', 'profile page'],
    steps: [
      'Every founder and builder account has a Founder ID: a public page with a short link made from your name and a permanent founder number. "Create your Founder ID" on the Founder ID page starts it; "Edit Founder ID" on your profile changes it.',
      'It has three parts: Profile (project, links, socials, Connect and Message); "Support my work" (links to Patreon, PayPal, Buy Me a Coffee, Ko-fi, Stripe, GitHub Sponsors or Open Collective, with payment on the provider\'s page); and "Project Updates" (posts with photos or YouTube, scheduling, pinning, likes, comments and reposts).',
      'A six-item checklist on the profile tracks completeness. Changing your name changes the short link, so links shared before stop working.',
      'Filled-in Founder IDs can be found by search engines unless you opt out in Edit Founder ID.',
    ],
  },
  {
    id: 'launchpad',
    title: 'Enter a weekly Launchpad round',
    aliases: ['launchpad', 'launch round', 'weekly round', 'upvotes', 'launch my product', 'launch week', 'winners', 'enter my launch'],
    steps: [
      'Launchpad runs weekly rounds that start on Monday at 00:00 UTC. You need a published Demo Studio launch page to enter.',
      'On Launchpad, "Enter your launch" and pick the launch page. One entry per round.',
      'Other founders upvote during the round, and last week\'s winners are shown on the page. "Withdraw" pulls your launch from the round.',
    ],
    card: { kind: 'tool', id: 'launchpad', title: 'Launchpad', reason: 'Enter this week\'s round.' },
  },
  {
    id: 'cohort',
    title: 'Join a program cohort and send weekly check-ins',
    aliases: ['cohort', 'program', 'accelerator program', 'join code', 'check-in', 'check in', 'my program', 'what does my program see', 'leave cohort', 'incubator'],
    steps: [
      'Programs send a join link with a code. Open it, review what is shared and what stays private, then join ("Create your free account to join" if you have no account yet).',
      'What the program sees: your name and email, your stage and completed tasks, counts of assumptions, interviews, evidence, experiments and decisions, and your weekly check-ins. Files, idea details and messages stay private.',
      'Your dashboard shows the cohort view with this week\'s plan and the weekly check-in (four questions); "My workspace" switches back to your tools. You can "Edit check-in" after sending.',
      'If the program includes a pilot plan, your account is raised to it for the cohort dates and never lowered. "Leave cohort" stops the sharing; your account and work stay as they are.',
    ],
  },
  {
    id: 'project-setup',
    title: 'Bring an existing project into the platform',
    aliases: ['project setup', 'import my project', 'add my project', 'upload my deck', 'bring my project', 'add a project', 'second project', 'new project'],
    steps: [
      'Open Project setup ("Bring your project in once"): upload files or add links about the project.',
      'The platform drafts the project details; you review and correct them before saving.',
      'Tick "Also show this on my Founder ID" to publish the project on your public profile at the same time.',
      'How many projects you can run at once depends on the plan; archive one to start another when the limit is reached.',
    ],
  },
  {
    id: 'settings',
    title: 'Change account settings, password, cookies or delete your account',
    aliases: ['settings', 'account settings', 'change password', 'reset password', 'delete my account', 'notifications', 'notification preferences', 'cookie settings', 'email preferences', 'change username'],
    steps: [
      'Settings has four cards: "Profile settings", "Password & security", "Cookie settings" and "Delete account".',
      'Profile settings opens the Account page: profile fields, username, notification preferences (email, push and in-app per channel) and your quiz answers.',
      'Password & security changes the password. Delete account removes the account after confirmation.',
      'Cookie settings reopens the consent choice; it is also in the site footer.',
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
