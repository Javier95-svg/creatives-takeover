import { FIRST_READ_INTERVIEWS } from './pmfNextStep.ts';

/**
 * "Your conversations": how the discovery list is grouped, what the one next
 * step is for each person, and how close the founder is to enough
 * conversations for a first read. Pure, so node tests load it.
 */

export type ConversationStatus = 'new' | 'saved' | 'contacted' | 'interview_scheduled' | 'interviewed' | 'dismissed';
export type ConversationTab = 'to_contact' | 'contacted' | 'booked' | 'interviewed';

export interface ConversationLead {
  id: string;
  status: ConversationStatus;
  rank_score: number;
  last_seen_at: string;
  follow_up_at?: string | null;
}

export const CONVERSATION_TABS: ReadonlyArray<{ key: ConversationTab; label: string; empty: string }> = [
  { key: 'to_contact', label: 'To contact', empty: 'No one waiting. Search above or ask in Rooms to find people to talk to.' },
  { key: 'contacted', label: 'Contacted', empty: 'People you message move here, with a reminder to follow up.' },
  { key: 'booked', label: 'Interview booked', empty: 'When someone agrees to talk, book the interview and it moves here.' },
  { key: 'interviewed', label: 'Interviewed', empty: 'Interviews you log appear here and count towards your evidence.' },
];

export const STATUS_LABEL: Record<ConversationStatus, string> = {
  new: 'To contact',
  saved: 'To contact',
  contacted: 'Contacted',
  interview_scheduled: 'Interview booked',
  interviewed: 'Interviewed',
  dismissed: 'Not a fit',
};

export function tabFor(status: ConversationStatus): ConversationTab | null {
  if (status === 'new' || status === 'saved') return 'to_contact';
  if (status === 'contacted') return 'contacted';
  if (status === 'interview_scheduled') return 'booked';
  if (status === 'interviewed') return 'interviewed';
  return null;
}

export type FollowUpState = 'overdue' | 'today' | 'upcoming';

/** Whether a contacted person's follow-up is due, compared by calendar day. */
export function followUpState(lead: Pick<ConversationLead, 'status' | 'follow_up_at'>, now = new Date()): FollowUpState | null {
  if (lead.status !== 'contacted' || !lead.follow_up_at) return null;
  const due = new Date(lead.follow_up_at);
  if (Number.isNaN(due.getTime())) return null;
  const day = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (day(due) < day(now)) return 'overdue';
  if (day(due) === day(now)) return 'today';
  return 'upcoming';
}

/** People per tab, the ones needing attention first. Not-a-fit people are kept apart. */
export function groupConversations<T extends ConversationLead>(leads: readonly T[], now = new Date()) {
  const groups: Record<ConversationTab, T[]> = { to_contact: [], contacted: [], booked: [], interviewed: [] };
  const dismissed: T[] = [];
  for (const lead of leads) {
    const tab = tabFor(lead.status);
    if (tab) groups[tab].push(lead); else dismissed.push(lead);
  }
  const dueRank = (lead: T) => ({ overdue: 0, today: 1, upcoming: 2 } as const)[followUpState(lead, now) ?? 'upcoming'];
  groups.contacted.sort((a, b) => dueRank(a) - dueRank(b)
    || (a.follow_up_at ?? '').localeCompare(b.follow_up_at ?? ''));
  groups.to_contact.sort((a, b) => b.rank_score - a.rank_score || b.last_seen_at.localeCompare(a.last_seen_at));
  return { groups, dismissed };
}

export type NextAction = 'write_message' | 'book_interview' | 'log_interview' | 'see_evidence' | 'restore';

/** The one primary action for a person, by where they are. */
export function nextAction(status: ConversationStatus): { action: NextAction; label: string } {
  switch (status) {
    case 'new':
    case 'saved':
      return { action: 'write_message', label: 'Write a message' };
    case 'contacted':
      return { action: 'book_interview', label: 'They replied: book an interview' };
    case 'interview_scheduled':
      return { action: 'log_interview', label: 'Log the interview' };
    case 'interviewed':
      return { action: 'see_evidence', label: 'See it in your evidence' };
    default:
      return { action: 'restore', label: 'Move back to To contact' };
  }
}

export const FOLLOW_UP_OPTIONS: ReadonlyArray<{ days: number; label: string }> = [
  { days: 2, label: 'in 2 days' },
  { days: 3, label: 'in 3 days' },
  { days: 7, label: 'in a week' },
];
export const DEFAULT_FOLLOW_UP_DAYS = 3;

/** The reminder time: that many days ahead, at 9:00 local time. */
export function followUpDate(days: number, now = new Date()): Date {
  const date = new Date(now);
  date.setDate(date.getDate() + Math.max(1, Math.min(30, Math.round(days))));
  date.setHours(9, 0, 0, 0);
  return date;
}

/** "today", "tomorrow", or a short weekday and date. */
export function followUpLabel(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return '';
  const due = new Date(iso);
  const state = followUpState({ status: 'contacted', follow_up_at: iso }, now);
  if (state === 'overdue') return 'Follow-up overdue';
  if (state === 'today') return 'Follow up today';
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (due.getFullYear() === tomorrow.getFullYear() && due.getMonth() === tomorrow.getMonth() && due.getDate() === tomorrow.getDate()) {
    return 'Follow up tomorrow';
  }
  return `Follow up ${due.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`;
}

/** The strip at the top: conversations against the first-read goal, and what needs doing. */
export function conversationProgress(leads: readonly ConversationLead[], interviewsLogged: number, now = new Date()) {
  const interviews = Math.max(0, Math.floor(interviewsLogged));
  return {
    interviews,
    target: FIRST_READ_INTERVIEWS,
    percent: Math.min(100, Math.round((interviews / FIRST_READ_INTERVIEWS) * 100)),
    toContact: leads.filter((lead) => tabFor(lead.status) === 'to_contact').length,
    followUpsDue: leads.filter((lead) => {
      const state = followUpState(lead, now);
      return state === 'today' || state === 'overdue';
    }).length,
  };
}
