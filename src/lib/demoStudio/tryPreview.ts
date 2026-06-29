import type { DemoStepWithHotspots, DemoStudioStoryboardStep } from './types';

export const DEMO_STUDIO_TRY_MIN_SCREENSHOTS = 2;
export const DEMO_STUDIO_TRY_MAX_SCREENSHOTS = 3;
export const DEMO_STUDIO_TRY_HOTSPOT = { x: 0.35, y: 0.78, w: 0.3, h: 0.12 } as const;

export type DemoStudioTryStepCount = 2 | 3;

export interface TryPreviewShot {
  url: string;
}

export function normalizeTryStepCount(value: unknown): DemoStudioTryStepCount {
  return Number(value) >= DEMO_STUDIO_TRY_MAX_SCREENSHOTS ? 3 : 2;
}

export function deriveTryProductName(contextUrl?: string, fallbackTitle?: string): string {
  const trimmed = contextUrl?.trim() ?? '';
  if (trimmed) {
    try {
      const host = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
        .hostname.replace(/^www\./, '');
      const base = host.split('.')[0].replace(/[-_]+/g, ' ').trim();
      if (base) return base.charAt(0).toUpperCase() + base.slice(1);
    } catch {
      /* fall through */
    }
  }
  return fallbackTitle?.trim() || 'Your product';
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normalizeStoryboardStep(step: unknown): DemoStudioStoryboardStep | null {
  const row = (step ?? {}) as Partial<DemoStudioStoryboardStep>;
  const title = cleanText(row.title, 80);
  const caption = cleanText(row.caption, 220);
  if (!title || !caption) return null;
  return {
    title,
    caption,
    speaker_notes: cleanText(row.speaker_notes, 700) || 'Briefly explain what the viewer should notice on this screen.',
    hotspot_label: cleanText(row.hotspot_label, 80) || 'Continue',
    suggested_action: row.suggested_action === 'goto' || row.suggested_action === 'url' ? row.suggested_action : 'next',
  };
}

export function buildTryFallbackStoryboard(args: {
  contextUrl?: string;
  productName?: string;
  stepCount?: unknown;
} = {}): DemoStudioStoryboardStep[] {
  const stepCount = normalizeTryStepCount(args.stepCount);
  const productName = deriveTryProductName(args.contextUrl, args.productName);
  const subject = productName === 'Your product' ? 'your product' : productName;

  const twoStepFlow: DemoStudioStoryboardStep[] = [
    {
      title: `Start with ${productName}`,
      caption: `This screen introduces ${subject} and the problem the viewer is trying to solve.`,
      speaker_notes: 'Open by naming who this is for and what the viewer should notice first.',
      hotspot_label: 'Show the result',
      suggested_action: 'next',
    },
    {
      title: 'Show the useful outcome',
      caption: `This screen makes the result clear and gives the viewer a reason to keep going.`,
      speaker_notes: 'Point to the moment where the product creates value, then invite the viewer to take the next step.',
      hotspot_label: 'Finish the tour',
      suggested_action: 'next',
    },
  ];

  if (stepCount === 2) return twoStepFlow;

  return [
    twoStepFlow[0],
    {
      title: 'Walk through the key action',
      caption: `This screen shows the main action a visitor would take inside ${subject}.`,
      speaker_notes: 'Explain the action on screen and why it moves the user closer to the result.',
      hotspot_label: 'Continue the flow',
      suggested_action: 'next',
    },
    twoStepFlow[1],
  ];
}

export function getUsableTryStoryboard(
  storyboard: unknown,
  args: { contextUrl?: string; productName?: string; stepCount?: unknown } = {},
): DemoStudioStoryboardStep[] {
  const desiredCount = normalizeTryStepCount(args.stepCount);
  const fallback = buildTryFallbackStoryboard({ ...args, stepCount: desiredCount });
  const normalized = (Array.isArray(storyboard) ? storyboard : [])
    .map(normalizeStoryboardStep)
    .filter((step): step is DemoStudioStoryboardStep => Boolean(step))
    .slice(0, desiredCount);

  while (normalized.length < desiredCount) {
    normalized.push(fallback[normalized.length]);
  }

  return normalized;
}

export function buildTryPreviewSteps(args: {
  shots: TryPreviewShot[];
  storyboard: DemoStudioStoryboardStep[];
  createdAt?: string;
}): DemoStepWithHotspots[] {
  const createdAt = args.createdAt ?? new Date().toISOString();
  const count = Math.min(args.shots.length, args.storyboard.length, DEMO_STUDIO_TRY_MAX_SCREENSHOTS);

  return Array.from({ length: count }, (_, index) => {
    const step = args.storyboard[index];
    return {
      id: `try-${index}`,
      demo_id: 'try',
      position: index,
      asset_type: 'image',
      asset_url: args.shots[index].url,
      asset_width: null,
      asset_height: null,
      title: step.title,
      caption: step.caption,
      speaker_notes: step.speaker_notes,
      asset_captured_at: null,
      created_at: createdAt,
      hotspots: step.hotspot_label
        ? [
            {
              id: `try-hs-${index}`,
              step_id: `try-${index}`,
              ...DEMO_STUDIO_TRY_HOTSPOT,
              type: 'tooltip',
              label: step.hotspot_label,
              action: 'next',
              action_target: null,
              created_at: createdAt,
            },
          ]
        : [],
    };
  });
}
