// Founder memory for Pulse: what is worth suggesting, and the prompts that use
// memory. Validation is shared with the app (src/lib/pulseMemory.ts).
export { parseMemorySuggestions, type MemorySuggestion } from '../../../src/lib/pulseMemory.ts';
export { parseTaskSuggestions, type TaskSuggestion } from '../../../src/lib/pulseActions.ts';

/**
 * Cheap gate before the extraction call: the founder said something that sounds
 * like a decision, belief, plan or commitment ("we decided", "I'll ship by
 * Friday"). Pure questions, including strategy questions, never pay for an
 * extra model call: there is nothing of theirs to remember yet.
 */
export function worthRemembering(message: string): boolean {
  if (message.trim().length < 12) return false;
  // First-person statements and deadlines, not questions about a topic.
  return /\b(i|we)(?:'ll|'ve| will| have| decided| chose| are going to| plan to| think| believe| assume| expect| want to| launched| signed| raised| hired| found| learned)\b|\b(by|before|until|next) (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|quarter|\d)/i.test(message);
}

export const MEMORY_EXTRACTION_PROMPT =
  'From the conversation, extract at most 2 things worth remembering long-term about the founder\'s business. ' +
  'Only include what the USER stated, decided, believes or committed to (or explicitly agreed to after Pulse suggested it). Never include Pulse\'s own advice the user did not accept, generic facts, or anything already in saved memory. ' +
  'kind: "decision" (a choice made), "hypothesis" (a belief not yet proven), "commitment" (something they will do), "fact" (a stable fact about the business). ' +
  'text: one short sentence from the founder\'s point of view, max 200 characters, no quotes, e.g. "Target independent dental clinics first". ' +
  'dueOn: only for commitments with a stated deadline, as YYYY-MM-DD resolved against asOf; otherwise null. ' +
  'Separately, list at most 2 tasks: concrete next actions that Pulse proposed in its latest answer, or that the user said they will do, as short imperative sentences (max 120 characters) a founder could put on a task list, e.g. "Interview five dental clinic owners". ' +
  'A task needs a clear, doable action; never vague advice ("think about pricing"), questions, or anything already done. dueOn as YYYY-MM-DD when a deadline was stated, else null. ' +
  'Return JSON only: {"memories":[{"kind":"decision","text":"...","dueOn":null}],"tasks":[{"title":"...","dueOn":null}]}. Return empty arrays when nothing qualifies, which is the usual case for memories.';

export const MEMORY_RULE =
  'Saved memory (memory.items) is the founder\'s own confirmed decisions, hypotheses, commitments and facts. Use it: refer to it naturally ("You decided to…"), keep advice consistent with it, ' +
  'and if new evidence or their latest message contradicts a memory, say so plainly and suggest updating it. Hypotheses are unproven until evidence supports them. ' +
  'memory.assumptions are tool-recorded assumptions, account-wide. Never claim to remember anything that is not in memory or this conversation.';

/** The follow-up question for a commitment that came due. */
export function commitmentFollowUpRule(commitment: { text: string; dueOn: string | null }): string {
  return `A commitment the founder saved is due${commitment.dueOn ? ` (${commitment.dueOn})` : ''}: "${commitment.text}". ` +
    'Open your answer with one short sentence asking whether it happened and what they learned, then answer their message. Do not repeat the question later in the answer.';
}
