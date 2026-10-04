// What Traction Engine should ask the founder to do next. The weekly log form is
// the main action, so a next-step card only appears when there is something
// more specific to say: starting out, a kill rule that fired, or a week that is
// already logged.

export interface TractionProgressState {
  isFirstTime: boolean;
  savedThisWeek: boolean;
  /** Channel whose GTM kill rule fired, if any. */
  triggeredChannel: string | null;
}

export type TractionNextAction = 'start' | 'review' | 'history';

export interface TractionNextStep {
  action: TractionNextAction;
  title: string;
  reason: string;
  cta: string;
}

export function getTractionNextStep(state: TractionProgressState): TractionNextStep | null {
  if (state.triggeredChannel) {
    return {
      action: 'review',
      title: `${state.triggeredChannel} hit its stop rule`,
      reason: 'The numbers say to stop this channel. Confirm Kill this week, or write down why you are keeping it.',
      cta: 'Review the experiment',
    };
  }
  if (state.isFirstTime) {
    return {
      action: 'start',
      title: 'Start with one channel',
      reason: 'Name the one channel you are testing this week and the number you expect it to move. Logging a week is free.',
      cta: "Start this week's log",
    };
  }
  if (state.savedThisWeek) {
    return {
      action: 'history',
      title: 'This week is logged',
      reason: 'Come back next Monday with the new numbers. You can still edit this week below.',
      cta: 'See your weeks',
    };
  }
  return null;
}
