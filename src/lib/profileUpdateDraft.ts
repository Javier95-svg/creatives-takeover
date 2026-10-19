import { supabase } from '@/integrations/supabase/client';
import { POST_MAX_LENGTH } from '@/lib/profilePosts';

// A journey update can start from something the founder already did: a stage
// they completed or the check-in they sent their program. The draft travels in
// this tab's sessionStorage, the same place the composer keeps unfinished text,
// so the founder's words never sit in a URL that analytics records.
export type ProfileUpdateSource = 'stage' | 'checkin';

export const journeyDraftKey = (userId: string) => `ct:journey-draft:v1:${userId}`;
const draftSourceKey = (userId: string) => `ct:journey-draft-source:v1:${userId}`;

export function readJourneyDraft(userId: string): string {
  try { return sessionStorage.getItem(journeyDraftKey(userId))?.slice(0, POST_MAX_LENGTH) ?? ''; }
  catch { return ''; }
}

/** Adds a prepared update below anything the founder had already started. */
export function stageJourneyDraft(userId: string, text: string, source: ProfileUpdateSource) {
  try {
    const existing = readJourneyDraft(userId).trim();
    const next = existing ? `${existing}\n\n${text}` : text;
    sessionStorage.setItem(journeyDraftKey(userId), next.slice(0, POST_MAX_LENGTH));
    sessionStorage.setItem(draftSourceKey(userId), source);
  } catch {
    // Storage can be blocked; the founder still lands on an empty composer.
  }
}

export function readDraftSource(userId: string): ProfileUpdateSource | null {
  try {
    const value = sessionStorage.getItem(draftSourceKey(userId));
    return value === 'stage' || value === 'checkin' ? value : null;
  } catch { return null; }
}

export function clearDraftSource(userId: string) {
  try { sessionStorage.removeItem(draftSourceKey(userId)); } catch { /* storage blocked */ }
}

/** The signed-in founder's own profile, opened on the post composer. */
export async function ownProfileComposePath(userId: string, source: ProfileUpdateSource): Promise<string> {
  const { data } = await supabase.from('profiles').select('username').eq('id', userId).maybeSingle();
  const username = (data as { username?: string | null } | null)?.username;
  return username ? `/profile/${encodeURIComponent(username)}?compose=${source}` : '/account';
}

export function stageUpdateDraft(stageLabel: string): string {
  return [
    `I just completed the ${stageLabel} stage of my startup.`,
    '',
    'What I did: ',
    'What I learned: ',
    "What's next: ",
  ].join('\n');
}

export function checkinUpdateDraft(week: number, wins: string[], nextGoals: string[], help: string | null): string {
  const lines = [`Week ${week} update.`];
  if (wins.length) lines.push('', 'Done this week:', ...wins.map((item) => `- ${item}`));
  if (nextGoals.length) lines.push('', 'Next week:', ...nextGoals.map((item) => `- ${item}`));
  if (help?.trim()) lines.push('', `I could use help with: ${help.trim()}`);
  return lines.join('\n');
}
