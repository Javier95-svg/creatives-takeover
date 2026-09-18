import type { BizMapStage } from '../bizmapStageOrder.ts';
import type { IcpSampleProfileKey } from '../../components/icp/sampleIcpPreviewData.ts';
import type { PulseHomeMessage, PulseHomePriority } from '../pulseHome.ts';

/**
 * The single seeded founder behind the guided tour at /demo.
 *
 * Coherence here is derived rather than duplicated. The project copy is written
 * to match one of the hand-authored ICP samples, and everything a panel needs
 * beyond identity is read from the real product config at render time:
 * tasks from STAGE_TASKS, artifact state from tourArtifactStatus, tool copy
 * from FOUNDER_TOOL_CATALOG. A second hand-typed copy of any of those would
 * drift the moment somebody edited the product and not the tour.
 */
export interface PlatformTourFixture {
  account: { username: string; displayName: string; firstName: string; initials: string; plan: string; profileHref: string };
  project: { name: string; oneLiner: string; stage: BizMapStage; assignedStage: 1 | 2 | 3 | 4 | 5 | 6 | 7 };
  credits: { totalAvailable: number; planMonthlyCredits: number; topUpCredits: number; creditsSpent: number };
  icpSampleKey: IcpSampleProfileKey;
  priorities: PulseHomePriority[];
  /** A worked exchange, rendered on the PMF Lab panel where its subject sits. */
  pulseExchange: PulseHomeMessage[];
}

export const PLATFORM_TOUR_FIXTURE: PlatformTourFixture = {
  account: {
    username: 'maya.orr',
    displayName: 'Maya Orr',
    firstName: 'Maya',
    initials: 'MO',
    // Pro so every tool renders unlocked and a visitor sees the whole product
    // rather than a wall of upgrade prompts.
    plan: 'Pro',
    profileHref: '/profile/maya.orr',
  },
  project: {
    name: 'Throughline',
    oneLiner: 'One growth view for creators publishing across YouTube, TikTok and a newsletter.',
    // Stage 3 is the most informative place to observe a founder: two artifacts
    // are finished, one decision is live, and the rest of the cycle is still
    // visibly ahead. It also matches the stage badge PulseHomeView already
    // renders, so no new copy is needed to label it.
    stage: 'VALIDATING',
    assignedStage: 3,
  },
  credits: { totalAvailable: 412, planMonthlyCredits: 600, topUpCredits: 100, creditsSpent: 288 },
  // The ICP panel renders this sample, so the project name and one-liner above
  // describe the same business the draft is about.
  icpSampleKey: 'creator_analytics_growth_platform',
  priorities: [
    { id: 'tour-priority-interviews', title: 'Log 4 more creator interviews to reach the evidence threshold', route: '/pmf-lab' },
    { id: 'tour-priority-objection', title: 'Write up the pricing objection from the Loomi call', route: '/pmf-lab' },
    { id: 'tour-priority-demo', title: 'Send the demand page to the 12 creators who replied', route: '/demo-studio' },
  ],
  pulseExchange: [
    {
      id: 'tour-turn-1:user',
      role: 'user',
      content: 'I have 21 creator interviews logged. Can I call product market fit yet?',
    },
    {
      id: 'tour-turn-1:assistant',
      role: 'assistant',
      content:
        'Not yet, and the gap is smaller than it looks.\n\nPMF Lab needs 25 signals before it will score a decision, so you are 4 short. More important than the count: of your 21, only 2 are independent buyers who named the pain before you described it. The other 19 came from your own audience, which means they already trust you and are a weak test of the problem.\n\nBefore the next call, do these two things:\n\n1. **Recruit outside your audience.** Four creators who have never heard of Throughline. Your reply rate suggests the creator Discords will get you there in a week.\n2. **Write down the Loomi objection.** They said the price was fine but the setup cost was not. That is a documented objection, and PMF Lab will hold the decision until you have at least one on record.\n\nOnce those land you will have a Build, Narrow, Pivot or Stop verdict with evidence behind it rather than a feeling.',
      actions: [
        {
          kind: 'tool',
          id: 'pmf_lab',
          title: 'PMF Lab',
          reason: 'Log the remaining interviews and the pricing objection so the decision can be scored.',
          route: '/pmf-lab',
        },
      ],
    },
  ],
};
