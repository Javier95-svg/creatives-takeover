import { resolveDemoTarget } from './navigation.ts';
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
  blockers: string[];
  suggestions: string[];
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
  const blockers: string[] = [], suggestions: string[] = [];
  const validUrl = (value?: string | null) => {
    if (!value?.trim() || value.includes('\\') || value.startsWith('//')) return false;
    try {
      const url = new URL(value, value.startsWith('/') ? 'https://creatives-takeover.com' : undefined);
      return ['https:', 'http:'].includes(url.protocol);
    } catch { return false; }
  };
  if (!steps.length) blockers.push('Add at least one screen.');
  if (!theme?.endCtaLabel?.trim()) blockers.push('Give your final call to action a label.');
  if (!validUrl(theme?.endCtaHref)) blockers.push('Add a valid http, https or internal destination for the final call to action.');
  const details = steps.map((step, index) => {
    const missing: string[] = [];
    if (!step.asset_url?.trim() || /placeholder/i.test(step.asset_url)) missing.push('Add a captured or uploaded screen.');
    if (!step.caption?.trim()) missing.push('Add a caption explaining this screen.');
    if (!step.speaker_notes?.trim()) suggestions.push('Screen ' + (index + 1) + ': add speaker notes if you want narrated export.');
    for (const hotspot of step.hotspots) {
      const bounds = [hotspot.x,hotspot.y,hotspot.w,hotspot.h].every(Number.isFinite) && hotspot.x >= 0 && hotspot.y >= 0 && hotspot.w > 0 && hotspot.h > 0 && hotspot.x + hotspot.w <= 1 && hotspot.y + hotspot.h <= 1;
      const target = hotspot.action === 'next' ? index < steps.length - 1 : hotspot.action === 'goto' ? resolveDemoTarget(hotspot.action_target,steps) >= 0 && resolveDemoTarget(hotspot.action_target,steps) !== index : hotspot.action === 'url' && validUrl(hotspot.action_target);
      if (!bounds || !target || !hotspot.label?.trim()) missing.push('Fix the label, position or destination of a hotspot.');
    }
    // The player provides Next/Back controls even when no hotspots are present.
    if (steps.length > 1 && !step.hotspots.length) suggestions.push('Screen ' + (index + 1) + ': optionally highlight where to click; viewers can use Next.');
    [...new Set(missing)].forEach(item => blockers.push('Screen ' + (index + 1) + ': ' + item));
    return {stepId:step.id,label:step.title || 'Screen ' + (index + 1),missing:[...new Set(missing)],ready:!missing.length};
  });
  const totalChecks = 3 + steps.length * 3;
  return {ready:!blockers.length,blockers,missing:blockers,suggestions,steps:details,score:Math.max(0,Math.round(100 * (1 - blockers.length / totalChecks)))};
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
  if (!args.launchPage?.theme?.conceptTest) {
    if (!args.hasPublishedDemo) missing.push('Publish at least one interactive demo.');
    if (!args.hasVsl) missing.push('Save at least one VSL variation.');
  }
  if (!args.launchPage?.headline?.trim()) missing.push('Add a launch page headline.');
  if (!args.launchPage?.subheadline?.trim()) missing.push('Add a launch page subheadline.');
  if (!args.launchPage?.cta_label?.trim()) missing.push('Set the launch page CTA.');
  if (!args.project?.slug?.trim()) missing.push('Set a public slug.');
  return { ready: missing.length === 0, missing };
}
