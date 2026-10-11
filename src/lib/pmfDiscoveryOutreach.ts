import type { PMFValidationStage } from '../hooks/useCustomerDiscovery.ts';

/**
 * Customer Discovery's plain-language pieces, shared by the search form, the
 * scan results and the conversations list. Pure, so node tests load it.
 * (The PMF survey's messages live separately in pmfOutreach.ts.)
 */

/** What the founder wants to find out, asked as a question rather than a stage name. */
export const VALIDATION_STAGES: ReadonlyArray<{ value: PMFValidationStage; question: string; hint: string }> = [
  { value: 'problem_discovery', question: 'Is the problem real?', hint: 'Find people who feel this pain so you can ask about it. No pitch.' },
  { value: 'solution_validation', question: 'Would they try my solution?', hint: 'Find people looking for a fix so you can show them what you made.' },
  { value: 'pricing', question: 'Would they pay for it?', hint: 'Find people talking about what this costs them today.' },
];

export function stageQuestion(stage: PMFValidationStage | null | undefined): string {
  return VALIDATION_STAGES.find((option) => option.value === stage)?.question ?? VALIDATION_STAGES[0].question;
}

/**
 * Names PMF Lab and onboarding give an idea before the founder names it. They
 * describe nothing, so they never pre-fill the product field.
 */
export function isPlaceholderCaseName(value: string | null | undefined): boolean {
  const name = (value ?? '').trim();
  if (!name) return true;
  return /^(unscoped evidence case|untitled idea|my project)$/i.test(name) || /^idea started\b/i.test(name);
}

/** The first real name in order of preference, or an empty string. */
export function firstRealName(...candidates: Array<string | null | undefined>): string {
  return candidates.find((candidate) => !isPlaceholderCaseName(candidate))?.trim() ?? '';
}

export const STAGE_DEFAULT_MESSAGE: Record<PMFValidationStage, string> = {
  problem_discovery:
    "Hi {{name}}, I saw your post in {{community}} about this exact problem. I'm researching it and would love to hear more about your experience. No pitch, just trying to learn. Would you be open to a couple of questions?",
  solution_validation:
    "Hi {{name}}, I saw your post in {{community}} about this exact problem. I've built an early demo that tries to solve it and I'm looking for honest, critical feedback. Would you be open to taking a quick look?{{demo}}",
  pricing:
    "Hi {{name}}, I saw your post in {{community}} about this problem. I'm researching how people handle it today. Would you be open to sharing what solving it currently costs you, in time or money? No pitch.",
};

/** A first message for one person, from the scan's template or the stage default. */
export function outreachMessage(args: {
  stage: PMFValidationStage;
  name: string;
  community?: string | null;
  template?: string | null;
  demoUrl?: string | null;
}): string {
  const community = args.community?.trim() || 'your community';
  const demoLink = args.stage === 'solution_validation' && args.demoUrl ? ` Here it is: ${args.demoUrl}` : '';
  let message = (args.template?.trim() || STAGE_DEFAULT_MESSAGE[args.stage])
    .replace(/\{\{\s*(subreddit|community)\s*\}\}/gi, community)
    .replace(/\{\{\s*name\s*\}\}/gi, args.name);
  if (/\{\{\s*demo\s*\}\}/i.test(message)) message = message.replace(/\{\{\s*demo\s*\}\}/gi, demoLink);
  else if (demoLink) message = `${message}${demoLink}`;
  return message;
}

/** A short, friendly nudge for someone who has not replied yet. */
export function followUpMessage(name: string): string {
  return `Hi ${name}, just following up on my message from a few days ago. If you have 15 minutes this week, I'd really value hearing how you deal with this today. And if now's not a good time, no worries at all.`;
}
