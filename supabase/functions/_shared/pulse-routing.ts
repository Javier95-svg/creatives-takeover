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
