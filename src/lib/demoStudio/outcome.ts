import { evaluateOutcomeContract } from '@/lib/outcomeContracts';
import type { DemoStepWithHotspots, DemoStudioLaunchPage, DemoStudioProject, DemoTheme } from './types';

const isWebUrl = (value: string | null | undefined) => {
  if (!value) return false;
  try {
    const url = new URL(value, 'https://creatives-takeover.com');
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export function validateDemoInteractions(steps: DemoStepWithHotspots[]) {
  const stepIds = new Set(steps.map((step) => step.id));
  return steps.every((step, index) => step.hotspots.every((hotspot) => {
    if (hotspot.x < 0 || hotspot.y < 0 || hotspot.w <= 0 || hotspot.h <= 0) return false;
    if (!hotspot.label?.trim()) return false;
    if (hotspot.action === 'next') return index < steps.length - 1;
    if (hotspot.action === 'goto') return Boolean(hotspot.action_target && stepIds.has(hotspot.action_target));
    return hotspot.action === 'url' && isWebUrl(hotspot.action_target);
  }));
}

export function evaluateDemoArtifact(input: {
  steps: DemoStepWithHotspots[];
  theme?: DemoTheme;
  project?: DemoStudioProject | null;
  launchPage?: DemoStudioLaunchPage | null;
  published: boolean;
  leadCaptureEnabled: boolean;
  analyticsEnabled: boolean;
  containsGeneratedPlaceholders?: boolean;
  externalActivity?: boolean;
}) {
  const workingHotspots = input.steps.length >= 2
    && input.steps.slice(0, -1).every((step) => step.hotspots.length > 0)
    && validateDemoInteractions(input.steps);
  const publicUrl = Boolean(input.project?.slug?.trim()) || input.published;
  const qualityChecks = {
    interactive_steps: input.steps.length >= 2,
    working_hotspots: workingHotspots,
    captions_complete: input.steps.every((step) => Boolean(step.caption?.trim())),
    single_cta: Boolean(input.launchPage?.cta_label?.trim() || input.theme?.endCtaLabel?.trim()),
    lead_capture: input.leadCaptureEnabled,
    analytics: input.analyticsEnabled,
    mobile_ready: input.steps.every((step) => Boolean(step.asset_width && step.asset_height)) && publicUrl,
    published: input.published && publicUrl,
    no_unresolved_placeholders: !input.containsGeneratedPlaceholders && input.steps.every((step) => Boolean(step.asset_url)),
    no_broken_interactions: workingHotspots,
    external_activity: Boolean(input.externalActivity),
  };
  return {
    qualityChecks,
    evaluation: evaluateOutcomeContract({
      tool: 'demo_studio',
      qualityChecks,
      verificationMode: input.externalActivity ? 'platform_verified' : 'unverified',
    }),
  };
}
