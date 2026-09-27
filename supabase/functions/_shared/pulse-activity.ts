import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { PulseContext, PulseSource } from './pulse-context.ts';
import type { PulseHomeAction } from '../../../src/lib/pulseHome.ts';

const SOURCES = {
  mentor: { key: 'bookings', rpc: 'mentor_bookings', title: 'Open your bookings', route: '/mentor/bookings',
    basis: 'Up to 10 recent booking records. Proposed slots are not confirmed. No founder project evidence or session notes are included.' },
  marketplace: { key: 'enquiries', rpc: 'mentor_interest', title: 'Open your enquiries', route: '/marketplace/enquiries',
    basis: 'Up to 10 recent contact events, not enquiry messages. No message body, budget, requested service or purchase commitment is available.' },
  investor: { key: 'matches', rpc: 'investor_matches', title: 'Review your matches', route: '/investors/matches',
    basis: 'Up to 10 authorized matches. Score counts sector overlap, not investment quality. Funding stage is declared; geography/check-size fit is not verified.' },
} as const;

type Row = Record<string, unknown>;
const object = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const fields = (value: unknown, keys: string[]): Row => {
  const row = object(value);
  return Object.fromEntries(keys.filter(key => row[key] !== undefined).map(key => {
    const value = row[key];
    return [key, typeof value === 'string' ? value.slice(0, key === 'projectSummary' ? 800 : 200)
      : Array.isArray(value) ? value.filter(part => typeof part === 'string').slice(0, 12).map(part => part.slice(0, 80))
      : typeof value === 'number' || typeof value === 'boolean' || value === null ? value : null];
  }));
};
const definition = (context: PulseContext) => SOURCES[context.account.userType as keyof typeof SOURCES];

// MUST receive the caller-JWT client from the authenticated dispatcher, never
// the service-role storage client. Existing RPCs enforce auth.uid() ownership.
export async function loadPulseActivity(context: PulseContext, userId: string, callerDb?: SupabaseClient): Promise<void> {
  const source = definition(context);
  if (!source || !context.account.hasCategoryAccess) return;
  let result: PulseSource = { table: source.rpc, state: 'unavailable', basis: source.basis };
  try {
    if (!callerDb) throw new Error('Caller database unavailable');
    const { data, error } = await callerDb.rpc(source.rpc, { p_limit: 10 });
    if (error) throw error;
    const raw = source.key === 'enquiries' ? object(data).contacts : data;
    if (!Array.isArray(raw) || raw.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('Invalid activity response');
    const records = raw.slice(0, 10).map(row => {
      if (source.key === 'bookings') return { ...fields(row, ['id', 'status', 'scheduledFor', 'createdAt', 'founderName', 'founderUsername', 'responseDueAt']),
        proposedSlots: Array.isArray(row.slots) ? row.slots.slice(0, 5).map(slot => fields(slot, ['startsAt', 'durationMinutes', 'timezone'])) : [] };
      if (source.key === 'enquiries') return fields(row, ['name', 'username', 'occurredAt', 'interaction']);
      return fields(row, ['userId', 'name', 'username', 'sectors', 'investmentStage', 'projectTitle', 'projectSummary', 'score']);
    });
    result = { ...result, state: records.length ? 'available' : 'missing', id: userId,
      data: { retrievedAt: new Date().toISOString(), records, scope: 'authorized account activity; not private venture outcomes' } };
  } catch { context.unavailableSources.push(source.key); }
  context.outcomes[source.key] = result;
}

export function pulseActivityAction(context: PulseContext): PulseHomeAction | null {
  const source = definition(context);
  if (!source || !context.account.hasCategoryAccess) return null;
  return { kind: 'browse', id: source.key, title: source.title, route: source.route,
    reason: 'Review current activity in your account workspace.' };
}
