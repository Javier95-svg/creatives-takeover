import type { DemoReadiness } from './readiness.ts';
import type { PulseToolState } from '../pulseToolState.ts';

/**
 * The demo editor's state as Pulse sees it: how many screens, which are not
 * ready and why, whether the demo is published. Built from the same readiness
 * check the "Before you publish" panel shows, so Pulse and the panel agree.
 */
export function demoStudioPulseState(input: { status: string | null | undefined; readiness: DemoReadiness; saveStatus: string }): PulseToolState {
  const notReady = input.readiness.steps.filter((step) => !step.ready);
  return {
    tool: 'demo_studio',
    asOf: new Date().toISOString(),
    summary: {
      published: input.status === 'published',
      screens: input.readiness.steps.length,
      screensNotReady: notReady.length,
      readyToPublish: input.readiness.ready,
      blockers: input.readiness.blockers.slice(0, 5),
      screensNeedingWork: notReady.slice(0, 5).map((step) => `${step.label}: ${step.missing.join(', ')}`),
      saveStatus: input.saveStatus,
    },
  };
}
