// What a Demo Studio project should ask the founder to do next. The project page
// used to show a "next best action", a five-step roadmap, four status tiles and
// three cards with their own buttons, and it started with a written brief even
// though the brief is optional. The path is now: add screens, guide the viewer,
// preview, share. A pitch video and a launch page come after the demo is out.

export interface DemoProjectState {
  demoCount: number;
  hasPublishedDemo: boolean;
  /** A viewer has opened a published demo. */
  hasViews: boolean;
  launchPublished: boolean;
}

export type DemoNextAction = 'start_demo' | 'finish_demo' | 'share_demo' | 'add_launch_page';

export interface DemoNextStep {
  action: DemoNextAction;
  title: string;
  reason: string;
  cta: string;
}

export function getDemoProjectNextStep(state: DemoProjectState): DemoNextStep | null {
  if (state.demoCount === 0) {
    return {
      action: 'start_demo',
      title: 'Add your first screens',
      reason: 'Upload screenshots or capture your product. Each image becomes a screen your viewer clicks through.',
      cta: 'Start a demo',
    };
  }
  if (!state.hasPublishedDemo) {
    return {
      action: 'finish_demo',
      title: 'Finish and publish your demo',
      reason: 'Write one line under each screen saying what the viewer is looking at, preview it, then publish to get a link.',
      cta: 'Open the editor',
    };
  }
  if (!state.hasViews) {
    return {
      action: 'share_demo',
      title: 'Send your demo to 5 people who have the problem',
      reason: 'A demo nobody sees tells you nothing. Views, finishes and clicks show up here once people open the link.',
      cta: 'Copy the link',
    };
  }
  if (!state.launchPublished) {
    return {
      action: 'add_launch_page',
      title: 'Put your demo on a launch page',
      reason: 'People are watching. A launch page puts the demo, a short pitch video and a signup form on one link, so interested viewers can leave their email.',
      cta: 'Build the launch page',
    };
  }
  return null;
}
