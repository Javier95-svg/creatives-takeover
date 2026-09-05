import { FOUNDER_TOOL_CATALOG } from '../../../src/config/founderToolCatalog.ts';
import { BIZMAP_STAGE_ORDER } from '../../../src/lib/bizmapStageOrder.ts';
import { deriveFounderProgress, type FounderProgressEvidence } from '../../../src/lib/founderProgress.ts';

export const CONTEXT_VERSION = 1;
export const DAY = 86_400_000;
export const SEGMENTS = ['quiz_only', 'unfinished_tool', 'completed_stage', 'dormant'] as const;
export type Segment = typeof SEGMENTS[number];
export interface ToolActivity {
  tool: string;
  projectId?: string | null;
  status: 'opened' | 'progress' | 'completed';
  step?: string | null;
  occurredAt: string;
  path?: string | null;
  // Set only by the server after checking the artifact still belongs to this user.
  savedDestinationVerified?: boolean;
}
export interface RetentionContext {
  userId: string;
  quizCompleted: boolean;
  quizGoal?: string | null;
  industry?: string | null;
  ideaStage?: string | null;
  lastLoginAt?: string | null;
  lastActivityAt: string | null;
  historyComplete: boolean;
  tools: ToolActivity[];
  evidence: FounderProgressEvidence;
  marketplaceVisitedAt?: string | null;
  expertSupportVisitedAt?: string | null;
  unavailableTools?: string[];
}
export interface RetentionDecision {
  segment: Segment;
  tool: string;
  toolLabel: string;
  path: string;
  signal: string;
  action: string;
  ctaLabel: string;
  topic: string;
  daysInactive: number;
  daysSinceLogin: number | null;
}

export function copyText(value: string): string {
  return value.replace(/[\p{Dash_Punctuation}\u2212\u00ad_]+/gu, ' ').replace(/\s+/g, ' ').trim();
}
export function canonicalTool(value: string) {
  const key = value.toLowerCase().replace(/[\s-]+/g, '_');
  const alias: Record<string, string> = {
    score_viability: 'icp_builder', icp_draft: 'icp_builder', icp_analysis: 'icp_builder',
    demo_studio_try: 'demo_studio', gtm_plan: 'gtm_strategist', go_to_market: 'gtm_strategist',
  };
  return FOUNDER_TOOL_CATALOG.find(tool => tool.key === (alias[key] ?? key)) ?? null;
}
export function toolForPath(path: string) {
  if (/^\/icp\/draft\/[^/]+$/.test(path)) return canonicalTool('icp_builder');
  return [...FOUNDER_TOOL_CATALOG].sort((a, b) => b.route.length - a.route.length)
    .find(tool => !tool.route.includes('?') && (path === tool.route || path.startsWith(`${tool.route}/`))) ?? null;
}
function verifiedPath(activity: ToolActivity, fallback: string) {
  if (!activity.savedDestinationVerified || !activity.path?.startsWith('/') || activity.path.startsWith('//')) return fallback;
  try {
    const url = new URL(activity.path, 'https://creatives-takeover.com');
    if (url.origin !== 'https://creatives-takeover.com' || toolForPath(url.pathname)?.key !== canonicalTool(activity.tool)?.key) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return fallback; }
}
function quizSignal(context: RetentionContext) {
  if (context.quizGoal) return `Your quiz goal is ${copyText(context.quizGoal).slice(0, 90)}.`;
  if (context.industry) return `You chose ${copyText(context.industry).slice(0, 70)} as your industry in the quiz.`;
  if (context.ideaStage) return `You described your idea stage as ${copyText(context.ideaStage).slice(0, 70)} in the quiz.`;
  return null;
}
const stageLabel = (index: number) => `Stage ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][index]}`;

export function resolveRetention(context: RetentionContext, now = Date.now()): RetentionDecision | null {
  const last = context.lastActivityAt ? Date.parse(context.lastActivityAt) : NaN;
  if (!Number.isFinite(last) || now - last < 2 * DAY) return null;
  const daysInactive = Math.floor((now - last) / DAY);
  const login = context.lastLoginAt ? Date.parse(context.lastLoginAt) : NaN;
  const daysSinceLogin = Number.isFinite(login) && login <= now ? Math.floor((now - login) / DAY) : null;
  const progress = deriveFounderProgress(context.evidence);
  const currentIndex = BIZMAP_STAGE_ORDER.indexOf(progress.currentStage);
  const available = (key: string) => !context.unavailableTools?.includes(key);
  const next = FOUNDER_TOOL_CATALOG.find(tool => tool.role === 'core' && tool.stage === progress.currentStage && available(tool.key));
  const sorted = [...context.tools].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  // Each project is independent; a later completed event cannot leave an older open event unfinished.
  const seen = new Set<string>();
  const latest = sorted.filter(item => {
    const tool = canonicalTool(item.tool);
    if (!tool || !Number.isFinite(Date.parse(item.occurredAt))) return false;
    const key = `${tool.key}:${item.projectId ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const unfinished = latest.find(item => {
    const tool = canonicalTool(item.tool)!;
    if (item.status === 'completed' || !available(tool.key)) return false;
    if (item.status === 'opened' && context.evidence.outcomes.some(outcome => outcome.tool === tool.key && ['ready', 'verified', 'reviewed'].includes(outcome.status))) return false;
    // A route visit must not manufacture unfinished work for an already completed tool.
    if (!item.projectId && context.evidence.outcomes.some(outcome => outcome.tool === tool.key)) return false;
    return true;
  });
  const make = (segment: Segment, tool: NonNullable<ReturnType<typeof canonicalTool>>, signal: string, path: string = tool.route, topic: string = tool.name, action: string = tool.purpose): RetentionDecision => ({
    segment, tool: tool.key, toolLabel: copyText(tool.name), path, signal: copyText(signal),
    action: copyText(action), topic: copyText(topic), daysInactive, daysSinceLogin,
    ctaLabel: `${segment === 'unfinished_tool' || (segment === 'dormant' && unfinished) ? 'Continue' : 'Open'} ${copyText(tool.name)}`,
  });
  if (unfinished) {
    const tool = canonicalTool(unfinished.tool)!;
    const signal = unfinished.status === 'opened'
      ? `You last opened ${tool.name}.`
      : unfinished.step ? `You reached ${copyText(unfinished.step).slice(0, 70)} in ${tool.name}.`
        : `You started work in ${tool.name}.`;
    return make(daysInactive >= 30 ? 'dormant' : 'unfinished_tool', tool, signal, verifiedPath(unfinished, tool.route));
  }
  if (daysInactive >= 30) {
    if (next && context.evidence.outcomes.length && !progress.completedAt[progress.currentStage]) {
      return make('dormant', next, `Your roadmap is at ${stageLabel(currentIndex)}.`, next.route, stageLabel(currentIndex));
    }
    const signal = context.quizCompleted ? quizSignal(context) : null;
    if (next && signal && !progress.completedAt[progress.currentStage]) return make('dormant', next, signal);
    return null;
  }
  if (next && currentIndex > 0 && progress.completedAt[BIZMAP_STAGE_ORDER[currentIndex - 1]] &&
      !progress.completedAt[progress.currentStage] && !latest.some(item => canonicalTool(item.tool)?.stage === progress.currentStage) &&
      !context.evidence.outcomes.some(item => canonicalTool(item.tool)?.stage === progress.currentStage)) {
    return make('completed_stage', next, `You completed ${stageLabel(currentIndex - 1)}. ${stageLabel(currentIndex)} is next on your roadmap.`, next.route, stageLabel(currentIndex));
  }
  const signal = context.quizCompleted ? quizSignal(context) : null;
  if (next && signal && context.historyComplete && !latest.length && !context.evidence.outcomes.length) return make('quiz_only', next, signal);
  return null;
}

// Tokens are replaced only from the verified decision, never from an email request.
export const COPY: Record<Segment, { subjects: readonly string[]; bodies: readonly string[] }> = {
  quiz_only: {
    subjects: ['Your quiz goal, starting with {tool}', '{tool} is your first roadmap step', 'Start your customer work in {tool}', 'One question to take into {tool}'],
    bodies: [
      '{signal} {tool} is the first tool on your roadmap. {action} Start with what you know now and use the prompts to work through the details. The link takes you straight to the tool when you sign in.',
      '{signal} Your next step is in {tool}. {action} Bring the idea you described in the quiz and work through the first prompt. You can focus on that one question before deciding what needs more thought.',
      '{signal} Open {tool} to put that context to work. {action} Use your current idea as the starting point, even if some details are still undecided. Begin with the first prompt and answer from what you already know.',
    ],
  },
  unfinished_tool: {
    subjects: ['Your next step in {tool}', 'Continue the work you opened in {tool}', 'A question to revisit in {tool}', '{tool}: pick up your next decision'],
    bodies: [
      '{signal} {action} Open the tool and work through the next question using what you know about your idea today. If something has changed since your last visit, start with that detail before moving further through the work.',
      '{signal} The next useful action is in {tool}. {action} Take one section at a time and focus on the part you can answer now. Use the link to open the tool and decide what needs your attention first.',
      '{signal} Return to {tool} with one decision you want to make. {action} Work through the relevant prompt, then check whether your answer still fits the idea you are building. That gives your next session a specific place to start.',
    ],
  },
  completed_stage: {
    subjects: ['{topic} starts with {tool}', 'After your last stage: {tool}', 'Your next roadmap tool is {tool}', 'The first question in {topic}'],
    bodies: [
      '{signal} Open {tool} for the next piece of work. {action} Bring the decisions from your completed stage into the first prompt, then focus on what you need to establish next. The link opens the tool directly after sign in.',
      '{signal} Your next tool is {tool}. {action} Start with the information you already worked through and check what this stage asks you to add. You can begin with one question and use that answer to guide the rest.',
      '{signal} The next action is in {tool}. {action} Use your earlier work as context for the first prompt. Look for the decision that needs new information, then make that the focus of your next session in the tool.',
    ],
  },
  dormant: {
    subjects: ['Your roadmap still points to {tool}', '{tool} after {days} days away', 'A specific place to restart: {tool}', 'Revisit {topic} in your roadmap'],
    bodies: [
      '{signal} It has been {days} days since your last activity. Open {tool} and check whether this is still the work you want to pursue. {action} Start with anything that has changed about your idea since you last used the platform.',
      '{signal} Your last activity was {days} days ago. The link opens {tool}, where you can revisit this part of your roadmap. {action} Take your current plans into the first question and decide what is still relevant before continuing.',
      '{signal} After {days} days away, use {tool} to review where this work stands. {action} Check the details against what you know now, then choose the next question worth answering. You can start from your current thinking about the idea.',
    ],
  },
};
export interface ExperimentConfig { phase: 'subject' | 'body'; selectedSubject: number; version: number }
export function assignVariants(userId: string, segment: Segment, config: ExperimentConfig) {
  if (!Number.isInteger(config.selectedSubject) || config.selectedSubject < 0 || config.selectedSubject > 3 || !['subject', 'body'].includes(config.phase)) throw new Error('Invalid retention experiment');
  let hash = 2166136261;
  for (const char of `${config.version}:${segment}:${config.phase}:${userId}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return { subject: config.phase === 'subject' ? hash % 4 : config.selectedSubject, body: config.phase === 'body' ? hash % 3 : 0 };
}
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
export function buildRoadmapEmail(decision: RetentionDecision, variants: { subject: number; body: number }, links: { ctaUrl: string; preferencesUrl: string; unsubscribeUrl: string }) {
  const tokens: Record<string, string> = { signal: decision.signal, tool: decision.toolLabel, topic: decision.topic, action: decision.action, days: String(decision.daysInactive) };
  const render = (text: string) => copyText(text.replace(/\{(\w+)\}/g, (_, key) => tokens[key] ?? ''));
  const subject = render(COPY[decision.segment].subjects[variants.subject]);
  const text = render(COPY[decision.segment].bodies[variants.body]);
  const preheader = decision.signal;
  const ctaLabel = copyText(decision.ctaLabel);
  return {
    subject, text, preheader, ctaLabel, ctaUrl: links.ctaUrl, templateVersion: 2,
    templateKey: `roadmap_${decision.segment}_s${variants.subject}_b${variants.body}`,
    html: `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div><div style="max-width:560px;margin:auto;font-family:Arial,sans-serif;line-height:1.6"><p>${escapeHtml(text)}</p><p><a href="${escapeHtml(links.ctaUrl)}" style="display:inline-block;padding:12px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none">${escapeHtml(ctaLabel)}</a></p><p>Javier<br>Creatives Takeover</p><p style="font-size:12px">You are receiving this because you created a Creatives Takeover account. <a href="${escapeHtml(links.preferencesUrl)}">Manage preferences</a> or <a href="${escapeHtml(links.unsubscribeUrl)}">unsubscribe</a>.</p></div>`,
  };
}
