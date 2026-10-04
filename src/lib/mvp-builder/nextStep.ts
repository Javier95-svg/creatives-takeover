// The one thing MVP Builder asks for next, shown in the header. The builder
// used to open on "Ready to build" with five status chips and four unlabelled
// icons, and nothing said what came after the first build. The path is:
// describe the app, let it build, fix the preview if it breaks, check it and
// publish, then share the link.

export interface MvpBuilderState {
  hasFiles: boolean;
  isGenerating: boolean;
  /** The preview reported errors for the current build. */
  previewErrorCount: number;
  isPublished: boolean;
  /** Edits made since the last publish are not live yet. */
  changedSincePublish: boolean;
}

export type MvpNextAction = 'describe' | 'building' | 'fix_preview' | 'publish' | 'republish' | 'share';

export interface MvpNextStep {
  action: MvpNextAction;
  label: string;
  hint: string;
}

export function getMvpNextStep(state: MvpBuilderState): MvpNextStep {
  if (state.isGenerating) {
    return { action: 'building', label: 'Building your app', hint: 'This usually takes under a minute. The preview updates when it is done.' };
  }
  if (!state.hasFiles) {
    return { action: 'describe', label: 'Describe your app', hint: 'Who it is for, the one thing they should get done, and how you will know it worked.' };
  }
  if (state.previewErrorCount > 0) {
    return { action: 'fix_preview', label: 'Fix the preview error', hint: 'Use Fix in the preview, or describe what you expected in the chat.' };
  }
  if (!state.isPublished) {
    return { action: 'publish', label: 'Check the preview, then publish', hint: 'Click through the main task yourself. Publishing gives you a link to share.' };
  }
  if (state.changedSincePublish) {
    return { action: 'republish', label: 'Publish your latest changes', hint: 'Your live link still shows the previous version.' };
  }
  return { action: 'share', label: 'Share your app link', hint: 'Send it to people who have the problem and watch what they do.' };
}
