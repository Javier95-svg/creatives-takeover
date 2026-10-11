import { share } from './adoptionMetrics.ts';

/** Customer Discovery funnel, as returned by admin_discovery_funnel() (20261017130000). */
export type DiscoveryFunnelStepKey = 'found' | 'contacted' | 'replied' | 'booked' | 'interviewed';

export interface DiscoveryFunnelStep {
  step: DiscoveryFunnelStepKey;
  founders: number;
  people: number;
  foundersAll: number;
  peopleAll: number;
}

interface RecentAndAll { recent: number; all: number }

export interface DiscoveryFunnel {
  generatedAt: string;
  days: number;
  founders: RecentAndAll;
  steps: DiscoveryFunnelStep[];
  searches: RecentAndAll;
  roomsQuestions: RecentAndAll;
  roomsReplies: RecentAndAll;
  addedFromRooms: RecentAndAll;
  followUpsSet: RecentAndAll;
  followUpsDelivered: RecentAndAll;
  followUpsEmailed: RecentAndAll;
}

export const FUNNEL_STEP_LABEL: Record<DiscoveryFunnelStepKey, { label: string; hint: string }> = {
  found: { label: 'Found', hint: 'Added to a list, from a search, a Rooms reply or X/LinkedIn' },
  contacted: { label: 'Contacted', hint: 'The founder marked "I sent it"' },
  replied: { label: 'Replied', hint: 'They said yes (booked) or said no' },
  booked: { label: 'Interview booked', hint: 'They said yes' },
  interviewed: { label: 'Interviewed', hint: 'The interview is logged in PMF Lab' },
};

/** Each step with the share of people who got there from the step before. */
export function funnelRows(steps: DiscoveryFunnelStep[]) {
  return steps.map((step, index) => ({
    ...step,
    ...FUNNEL_STEP_LABEL[step.step],
    fromPrevious: index === 0 ? null : share(step.people, steps[index - 1].people),
    fromPreviousAll: index === 0 ? null : share(step.peopleAll, steps[index - 1].peopleAll),
  }));
}
