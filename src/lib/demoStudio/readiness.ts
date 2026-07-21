import type {
  DemoStepWithHotspots,
  DemoStudioLaunchPage,
  DemoStudioProject,
  DemoStudioVsl,
  DemoTheme,
} from './types';

export interface StepReadiness {
  stepId: string;
  label: string;
  missing: string[];
  ready: boolean;
}

export interface DemoReadiness {
  score: number;
  ready: boolean;
  missing: string[];
  steps: StepReadiness[];
}

export interface VslReadiness {
  score: number;
  ready: boolean;
  missing: string[];
}

export interface LaunchReadiness {
  ready: boolean;
  missing: string[];
}

export function getDemoReadiness(steps: DemoStepWithHotspots[], theme?: DemoTheme): DemoReadiness {
  const missing = new Set<string>();
  if (steps.length < 3) missing.add('Add at least 3 storyboard steps.');
  if (!theme?.endCtaLabel?.trim()) missing.add('Set an end CTA label.');
  if (!theme?.endCtaHref?.trim()) missing.add('Set a working end CTA destination.');

  const stepReadiness = steps.map((step, index) => {
    const stepMissing: string[] = [];
    if (!step.asset_url) stepMissing.push('screenshot');
    if (!step.caption?.trim()) stepMissing.push('caption');
    if (!step.speaker_notes?.trim()) stepMissing.push('speaker notes');
    if (index < steps.length - 1 && step.hotspots.length === 0) stepMissing.push('hotspot');
    const hasBrokenHotspot = step.hotspots.some((hotspot) => {
      if (!hotspot.label?.trim() || hotspot.w <= 0 || hotspot.h <= 0) return true;
      if (hotspot.action === 'next') return index >= steps.length - 1;
      if (hotspot.action === 'goto') return !hotspot.action_target || !steps.some((candidate) => candidate.id === hotspot.action_target);
      if (hotspot.action === 'url') {
        try {
          const target = new URL(hotspot.action_target || '');
          return target.protocol !== 'https:' && target.protocol !== 'http:';
        } catch {
          return true;
        }
      }
      return false;
    });
    if (hasBrokenHotspot) stepMissing.push('working hotspot action');
    stepMissing.forEach((item) => missing.add(`Step ${index + 1}: add ${item}.`));
    return {
      stepId: step.id,
      label: step.title || `Step ${index + 1}`,
      missing: stepMissing,
      ready: stepMissing.length === 0,
    };
  });

  const totalChecks = 3 + Math.max(1, steps.length) * 5;
  const missingChecks = missing.size + stepReadiness.reduce((sum, step) => sum + step.missing.length, 0);
  const score = Math.max(0, Math.min(100, Math.round(((totalChecks - missingChecks) / totalChecks) * 100)));

  return {
    score,
    ready: missing.size === 0 && steps.length >= 3,
    missing: Array.from(missing),
    steps: stepReadiness,
  };
}

export function getVslReadiness(vsl: DemoStudioVsl | null | undefined): VslReadiness {
  const missing: string[] = [];
  if (!vsl) {
    return {
      score: 0,
      ready: false,
      missing: ['Save a Loom VSL variation.'],
    };
  }
  if (!vsl.script?.trim()) missing.push('Add or generate a script.');
  if (!vsl.hook?.trim()) missing.push('Add a hook.');
  if (!vsl.loom_embed_url && !vsl.loom_shared_url && !vsl.video_url) missing.push('Attach a Loom recording.');
  if (!vsl.is_primary) missing.push('Set this variation as primary or choose another primary.');
  const score = Math.round(((4 - missing.length) / 4) * 100);
  return { score, ready: missing.length === 0, missing };
}

export function getLaunchReadiness(args: {
  project: DemoStudioProject | null;
  launchPage: DemoStudioLaunchPage | null;
  hasPublishedDemo: boolean;
  hasVsl: boolean;
}): LaunchReadiness {
  const missing: string[] = [];
  if (!args.hasPublishedDemo) missing.push('Publish at least one interactive demo.');
  if (!args.hasVsl) missing.push('Save at least one VSL variation.');
  if (!args.launchPage?.headline?.trim()) missing.push('Add a launch page headline.');
  if (!args.launchPage?.subheadline?.trim()) missing.push('Add a launch page subheadline.');
  if (!args.launchPage?.cta_label?.trim()) missing.push('Set the launch page CTA.');
  if (!args.project?.slug?.trim()) missing.push('Set a public slug.');
  return { ready: missing.length === 0, missing };
}
