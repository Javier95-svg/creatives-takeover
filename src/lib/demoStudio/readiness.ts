import type {
  DemoStepWithHotspots,
  DemoStudioHotspot,
  DemoStudioLaunchPage,
  DemoStudioProject,
  DemoStudioVsl,
  DemoTheme,
} from './types';

// One set of publishing rules for an interactive demo, used by the editor and
// by publishDemo. The editor used to ask for three screens, speaker notes and a
// click target on every screen, while the publish call asked for two screens
// and one click target, so founders could not tell which rule they had missed.
//
// Blockers are only things that would break for a viewer; suggestions make the
// demo better. The viewer already has Next and Back buttons, so click targets
// are optional, but any that exist must work. The end button is optional too,
// but if it is set it must lead somewhere real.

export interface StepReadiness {
  stepId: string;
  label: string;
  /** Blockers for this screen. */
  missing: string[];
  ready: boolean;
}

export interface DemoReadiness {
  /** Kept for older callers; the blockers are what matters. */
  score: number;
  ready: boolean;
  blockers: string[];
  suggestions: string[];
  /** Same as blockers, for older callers. */
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

type HotspotLike = Pick<DemoStudioHotspot, 'id' | 'label' | 'x' | 'y' | 'w' | 'h' | 'action' | 'action_target'>;

const isPlaceholder = (url: string | null | undefined) => !url?.trim() || /placeholder/i.test(url);

/** A web address, or a page on this site such as /p/your-launch-page. */
export function isValidDemoDestination(value: string | null | undefined): boolean {
  const target = value?.trim();
  if (!target) return false;
  if (target.startsWith('/') && !target.startsWith('//')) return true;
  try {
    const url = new URL(target);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * The screen a "jump to" click target points at. New targets store the screen
 * id, which survives reordering; older ones stored a zero-based screen number.
 */
export function resolveGotoTarget(target: string | null | undefined, stepIds: string[]): number | null {
  if (!target) return null;
  const byId = stepIds.indexOf(target);
  if (byId >= 0) return byId;
  if (/^\d+$/.test(target)) {
    const index = Number(target);
    return index < stepIds.length ? index : null;
  }
  return null;
}

/** Why a click target would not work in the viewer, or null when it is fine. */
export function getHotspotProblem(hotspot: HotspotLike, index: number, stepIds: string[]): string | null {
  const { x, y, w, h } = hotspot;
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0 || x < 0 || y < 0 || x + w > 1.0001 || y + h > 1.0001) {
    return 'its area is off the screen';
  }
  if (!hotspot.label?.trim()) return 'it has no label';
  // On the last screen, "next" ends the demo, which is fine.
  if (hotspot.action === 'next') return null;
  if (hotspot.action === 'goto') {
    const target = resolveGotoTarget(hotspot.action_target, stepIds);
    if (target === null) return 'the screen it jumps to is gone';
    if (target === index) return 'it jumps to the screen it is on';
    return null;
  }
  if (hotspot.action === 'url') return isValidDemoDestination(hotspot.action_target) ? null : 'its link is not a valid web address';
  return 'it has no action';
}

export function getDemoReadiness(steps: DemoStepWithHotspots[], theme?: DemoTheme): DemoReadiness {
  const blockers: string[] = [];
  const suggestions: string[] = [];
  const stepIds = steps.map((step) => step.id);

  if (steps.length === 0) blockers.push('Add at least one screen.');

  const stepReadiness = steps.map((step, index) => {
    const name = `Screen ${index + 1}`;
    const stepBlockers: string[] = [];
    if (isPlaceholder(step.asset_url)) stepBlockers.push(`${name}: add a screenshot.`);
    if (!step.caption?.trim()) stepBlockers.push(`${name}: write a caption.`);
    for (const hotspot of step.hotspots) {
      const problem = getHotspotProblem(hotspot, index, stepIds);
      if (problem) stepBlockers.push(`${name}: fix the click target "${hotspot.label?.trim() || 'unnamed'}", ${problem}.`);
    }
    blockers.push(...stepBlockers);
    return { stepId: step.id, label: step.title || name, missing: stepBlockers, ready: stepBlockers.length === 0 };
  });

  // The end button is optional (the viewer shows none without a destination),
  // but a half-set or broken one would send viewers nowhere.
  const ctaLabel = theme?.endCtaLabel?.trim();
  const ctaHref = theme?.endCtaHref?.trim();
  if (ctaHref && !isValidDemoDestination(ctaHref)) {
    blockers.push('Fix where the end button goes: use a web address, or a page here such as /p/your-page.');
  } else if (ctaLabel && !ctaHref) {
    blockers.push('Add where the end button goes, or clear its label.');
  } else if (!ctaHref && !theme?.collectEmail) {
    suggestions.push('Add an end button, such as "Join the waitlist", so interested viewers can act.');
  }

  if (steps.length === 1) suggestions.push('Most demos land better with 3 to 5 screens.');
  if (steps.length > 0 && steps.some((step) => !step.speaker_notes?.trim())) {
    suggestions.push('Add speaker notes if you plan to record a voice-over.');
  }
  if (steps.length > 1 && steps.every((step) => step.hotspots.length === 0)) {
    suggestions.push('Viewers can use Next and Back. Add a click target where you want them to press a real button.');
  }

  const totalChecks = 3 + Math.max(1, steps.length) * 2;
  const score = Math.max(0, Math.min(100, Math.round(((totalChecks - Math.min(totalChecks, blockers.length)) / totalChecks) * 100)));

  return { score, ready: blockers.length === 0, blockers, suggestions, missing: blockers, steps: stepReadiness };
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
