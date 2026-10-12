import { share } from './adoptionMetrics.ts';

/** Rooms engagement, as returned by admin_rooms_engagement() (20261018130000). */
export interface RoomsEngagement {
  generatedAt: string;
  days: number;
  participants: { foundersBuilders: number; others: number; foundersBuildersAll: number; othersAll: number };
  posts: { recent: number; all: number };
  replies: { recent: number; all: number };
  replyRate: { eligible: number; replied: number; medianHours: number | null };
  depth: { threads: number; deep: number };
  returnAfterReply: { eligible: number; returned: number };
  memberShare: { members: number; team: number };
  weekly: Array<{ week: string; foundersBuilders: number; others: number; posts: number; replies: number }>;
}

/** The five measures that show people talk to each other, each with its first-month target. */
export function roomsMeasures(data: RoomsEngagement) {
  return [
    {
      label: 'Founders and builders taking part',
      value: String(data.participants.foundersBuilders),
      hint: `Posted or replied. Plus ${data.participants.others} mentors and others. All time: ${data.participants.foundersBuildersAll}.`,
      target: '10+',
    },
    {
      label: 'Posts answered within 48 hours',
      value: share(data.replyRate.replied, data.replyRate.eligible),
      hint: data.replyRate.medianHours == null ? 'By someone other than the author.' : `By someone other than the author. Median wait: ${data.replyRate.medianHours} h.`,
      target: '80%+',
    },
    {
      label: 'Real conversations',
      value: share(data.depth.deep, data.depth.threads),
      hint: 'Answered threads where two or more people replied, or the author answered back.',
      target: '40%+',
    },
    {
      label: 'Came back after a reply',
      value: share(data.returnAfterReply.returned, data.returnAfterReply.eligible),
      hint: 'Authors back within 7 days of their first reply.',
      target: '50%+',
    },
    {
      label: 'Written by members',
      value: share(data.memberShare.members, data.memberShare.members + data.memberShare.team),
      hint: 'Posts and replies not written by the team.',
      target: 'Over 50%',
    },
  ];
}
