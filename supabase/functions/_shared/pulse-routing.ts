import { catalogQuery, requestedCatalogKinds } from './pulse-catalog.ts';

// Skip classification only for self-contained, explicit resource requests.
// Follow-ups and mixed requests retain the conversation-aware planner.
export function pulseFastPlan(message: string) {
  const kinds = requestedCatalogKinds(message);
  if (!kinds.length || !/\b(recommend|suggest|find|browse|show)\b/i.test(message) ||
      /\b(that|those|same|previous|earlier|instead|above|also|mentor|tool|compare|versus)\b/i.test(message)) return null;
  const query = catalogQuery(message);
  // Generic recommendations need the planner to choose topical keywords from
  // the account/project evidence rather than simply returning recent content.
  if (!query || /\b(my|our|current|stage|project|business|startup)\b/i.test(message)) return null;
  return { toolKeys: [], mentorTrack: null, clarify: null, catalogKinds: kinds, catalogQuery: query };
}

export function asksAboutTasks(message: string) {
  return /\b(tasks?|to[ -]?do|priorit(?:y|ies|ize)|overdue|deadlines?|what should I do|focus (?:on\b|next\b|today\b))\b/i.test(message);
}

// Strategy-level turns (plans, trade-offs, reviews) go to the stronger model.
// A keyword backstop for when the planner is skipped or unsure.
export function asksForStrategy(message: string) {
  return /\b(strateg(?:y|ic|ies)|should (?:i|we)|pivot|pricing|price|positioning|fundrais(?:e|ing)|raise (?:money|funding|capital|a round)|go[- ]to[- ]market|business model|review (?:my|our)|what am i missing|trade-?offs?|plan (?:for|my|our))\b/i.test(message);
}

export type PulseDepth = 'quick' | 'strategy';
export const PULSE_FAST_MODEL = 'google/gemini-2.5-flash';
export const PULSE_STRATEGY_MODEL = 'google/gemini-2.5-pro';
/** Strategy turns per user per UTC day before answers fall back to the fast model. */
export const PULSE_STRATEGY_DAILY_CAP = 20;

/** Planner verdict wins when valid; the keyword check can only upgrade a turn. */
export function pulseDepth(plannerDepth: unknown, message: string): PulseDepth {
  if (plannerDepth === 'strategy' || asksForStrategy(message)) return 'strategy';
  return 'quick';
}

// Reading a stream is not covered by fetch's response-header timeout.
export async function readPulseChunk(reader: ReadableStreamDefaultReader<Uint8Array>, timeoutMs = 30000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => {
        reject(new Error('Pulse stream stalled'));
        void reader.cancel().catch(() => {});
      }, timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
}
