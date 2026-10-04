import type { DemoStepWithHotspots, DemoStudioStoryboardStep } from './types';

// Helpers for "Draft missing captions" in the Demo Studio editor. The draft
// call looks at up to three screenshots at a time and says which screenshot
// each caption describes; captions are matched by that index, not by order.

const MAX_SCREENS = 15;

/** Screens with a real screenshot and no caption, in order, capped at 15. */
export function screensNeedingCaptions(steps: DemoStepWithHotspots[]): DemoStepWithHotspots[] {
  return steps
    .filter((step) => !step.caption?.trim())
    .filter((step) => Boolean(step.asset_url) && !/placeholder/i.test(step.asset_url ?? '') && step.asset_type !== 'html')
    .slice(0, MAX_SCREENS);
}

/**
 * Captions to apply for one batch. A fallback storyboard (the AI was not
 * available) is generic text, so nothing is applied from it.
 */
export function captionsFromDraft(
  batch: Array<Pick<DemoStepWithHotspots, 'id'>>,
  result: { steps: DemoStudioStoryboardStep[]; fallbackReason: string | null },
): Array<{ stepId: string; caption: string }> {
  if (result.fallbackReason) return [];
  const used = new Set<string>();
  const captions: Array<{ stepId: string; caption: string }> = [];
  result.steps.forEach((draft, position) => {
    const index = typeof draft.screenshot_index === 'number' ? draft.screenshot_index : position;
    const target = batch[index];
    const caption = draft.caption?.trim();
    if (!target || !caption || used.has(target.id)) return;
    used.add(target.id);
    captions.push({ stepId: target.id, caption: caption.slice(0, 280) });
  });
  return captions;
}
