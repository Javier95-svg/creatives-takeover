// What GTM Strategist should ask the founder to do next. The plan used to open
// on a health score with five tabs, and the week's tasks sat in the third one.
// Now one next step leads, in a fixed order: a pending review proposal, then
// starting the experiment, the week's tasks, the first result, the review.

export interface GTMProgressState {
  /** Channel of the play to run first. */
  channel: string | null;
  /** A play is live in Traction Engine. */
  hasActivePlay: boolean;
  openTaskCount: number;
  /** Traction Engine has a logged result for a play in this plan. */
  hasResult: boolean;
  reviewedThisWeek: boolean;
  /** A weekly review was previewed and is waiting for apply or dismiss. */
  hasProposal: boolean;
}

export type GTMNextAction = 'compare_review' | 'start_play' | 'do_tasks' | 'log_result' | 'review_week';

export interface GTMNextStep {
  action: GTMNextAction;
  title: string;
  reason: string;
  cta: string;
}

export function getGTMNextStep(state: GTMProgressState): GTMNextStep | null {
  const channel = state.channel ?? 'your first channel';
  if (state.hasProposal) {
    return {
      action: 'compare_review',
      title: "Next week's changes are ready",
      reason: 'Nothing has changed in your plan yet. Compare the proposal with your current week, then apply it or dismiss it.',
      cta: 'Compare the changes',
    };
  }
  if (!state.channel) return null;
  if (!state.hasActivePlay) {
    return {
      action: 'start_play',
      title: `Start your ${channel} experiment`,
      reason: 'Starting it opens a weekly log in Traction Engine with the target from this plan, so the result is measured the same way each week.',
      cta: 'Start the experiment',
    };
  }
  if (state.openTaskCount > 0) {
    return {
      action: 'do_tasks',
      title: state.openTaskCount === 1 ? "Finish this week's last task" : `Finish this week's ${state.openTaskCount} tasks`,
      reason: 'Tick each one off as you go. The weekly review counts what got done.',
      cta: 'See the tasks',
    };
  }
  if (!state.hasResult) {
    return {
      action: 'log_result',
      title: `Log your first ${channel} result`,
      reason: 'Add the number you reached in Traction Engine. The review uses it to decide whether to keep going, change one thing or stop.',
      cta: 'Open Traction Engine',
    };
  }
  if (!state.reviewedThisWeek) {
    return {
      action: 'review_week',
      title: 'Review the week',
      reason: 'Write two lines on what worked and what missed. You will see the proposed changes before anything in your plan moves.',
      cta: 'Start the review',
    };
  }
  return null;
}
