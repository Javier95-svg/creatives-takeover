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

/** A normalized 0-1 rectangle, or null when the model gave us nothing usable. */
function normalizeHotspot(value: unknown): DemoStudioStoryboardStep['hotspot'] | undefined {
  const row = value as Partial<Record<'x' | 'y' | 'w' | 'h', unknown>> | null | undefined;
  if (!row || typeof row !== 'object') return undefined;
  const nums = (['x', 'y', 'w', 'h'] as const).map((key) => {
    const raw = row[key];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  });
  if (nums.some((n) => n === null)) return undefined;
  const [x, y, w, h] = nums as number[];
  // Reject anything outside the frame rather than clamping: a hotspot the model
  // placed off-screen is a sign it did not find the element, and a clamped
  // guess pinned to an edge looks deliberate.
  if (w <= 0 || h <= 0) return undefined;
  if (x < 0 || y < 0 || x + w > 1 || y + h > 1) return undefined;
  return { x, y, w, h };
}

function normalizeStoryboardStep(step: unknown): DemoStudioStoryboardStep | null {
  const row = (step ?? {}) as Partial<DemoStudioStoryboardStep>;
  const title = cleanText(row.title, 80);
  const caption = cleanText(row.caption, 220);
  if (!title || !caption) return null;
  const screenshotIndex =
    typeof row.screenshot_index === 'number' && Number.isInteger(row.screenshot_index) && row.screenshot_index >= 0
      ? row.screenshot_index
      : undefined;
  return {
    title,
    caption,
    speaker_notes: cleanText(row.speaker_notes, 700) || 'Briefly explain what the viewer should notice on this screen.',
    hotspot_label: cleanText(row.hotspot_label, 80) || 'Continue',
    suggested_action: row.suggested_action === 'goto' || row.suggested_action === 'url' ? row.suggested_action : 'next',
    screenshot_index: screenshotIndex,
    hotspot: normalizeHotspot(row.hotspot),
    screen_summary: cleanText(row.screen_summary, 300) || undefined,
  };
}

/**
 * The screenshot ordering the model proposed, or null if it is not trustworthy.
 *
 * A partial or repeated mapping is worse than no mapping: it silently puts some
 * captions on the wrong screens while looking deliberate. Only a complete
 * permutation of the available indices is accepted; anything else falls back to
 * upload order, which is at least the founder's own doing.
 */
export function resolveScreenshotOrder(
  storyboard: DemoStudioStoryboardStep[],
  shotCount: number,
): number[] | null {
  if (storyboard.length !== shotCount) return null;
  const indices = storyboard.map((step) => step.screenshot_index);
  if (indices.some((index) => typeof index !== 'number')) return null;
  const seen = new Set(indices as number[]);
  if (seen.size !== shotCount) return null;
  if ((indices as number[]).some((index) => index < 0 || index >= shotCount)) return null;
  return indices as number[];
}

function isGenericStoryboardStep(step: DemoStudioStoryboardStep): boolean {
  const genericTitle = /^(?:welcome|your product|key feature|main feature|core feature|feature)$/i;
  const genericCaption =
    /^(?:see|explore|discover|learn about|this is|this shows)\s+(?:the\s+)?(?:product|key feature|main feature|core workflow)[.!]?$/i;
  return genericTitle.test(step.title) || genericCaption.test(step.caption);
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

/**
 * Fallback copy is stage directions, not narration.
 *
 * buildTryFallbackStoryboard writes instructions TO a demo author ("This screen
 * makes the result clear and gives the viewer a reason to keep going"). Swapped
 * in silently, that reached founders as a description of their own product and
 * was indistinguishable from a real caption. Marking it lets the UI show it as
 * the gap it is, the same way the ICP folio treats an unanswered field.
 */
function asFallbackStep(step: DemoStudioStoryboardStep): DemoStudioStoryboardStep {
  return { ...step, isFallback: true };
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
    .slice(0, desiredCount)
    .map((step, index) => (isGenericStoryboardStep(step) ? asFallbackStep(fallback[index]) : step));

  while (normalized.length < desiredCount) {
    normalized.push(asFallbackStep(fallback[normalized.length]));
  }

  return normalized;
}

/** Wrap a string into lines of roughly `maxChars`, capped at `maxLines`. */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\.*$/, '')}…`;
  }
  return lines;
}

/**
 * Zero-asset mode: render one styled 1280x720 frame per storyboard step so
 * visitors without screenshots still get a real interactive demo. Frames are
 * returned as real JPEG Files, so the whole existing pipeline (Shot state,
 * sessionStorage draft, post-signup upload) works unchanged.
 */
export async function buildPlaceholderShotFiles(args: {
  productName: string;
  storyboard: DemoStudioStoryboardStep[];
}): Promise<File[]> {
  const width = 1280;
  const height = 720;
  const files: File[] = [];

  for (let index = 0; index < args.storyboard.length; index += 1) {
    const step = args.storyboard[index];
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    // Background: match the try page's slate-950 -> slate-900 gradient with an
    // indigo glow so placeholder frames feel native to the player.
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#020617');
    bg.addColorStop(1, '#0f172a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width * 0.8, height * 0.15, 40, width * 0.8, height * 0.15, 520);
    glow.addColorStop(0, 'rgba(99, 102, 241, 0.28)');
    glow.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Faux browser chrome so the frame reads as a product screen.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(0, 0, width, 56);
    for (let dot = 0; dot < 3; dot += 1) {
      ctx.beginPath();
      ctx.arc(36 + dot * 26, 28, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fill();
    }

    // Product name (top-left) + step chip (top-right).
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '600 26px "Segoe UI", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(args.productName.slice(0, 40), 120, 28);
    const chip = `Step ${index + 1} of ${args.storyboard.length}`;
    ctx.font = '500 22px "Segoe UI", system-ui, sans-serif';
    const chipWidth = ctx.measureText(chip).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText(chip, width - chipWidth - 36, 28);

    // Step title, centered.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 58px "Segoe UI", system-ui, sans-serif';
    const titleLines = wrapText(step.title, 30, 3);
    const lineHeight = 74;
    const startY = height / 2 - ((titleLines.length - 1) * lineHeight) / 2 - 20;
    titleLines.forEach((line, lineIndex) => {
      ctx.fillText(line, width / 2, startY + lineIndex * lineHeight);
    });

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '400 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Placeholder frame — swap in a real screenshot later', width / 2, height - 72);
    ctx.textAlign = 'left';

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('Could not render placeholder frame'))),
        'image/jpeg',
        0.9,
      );
    });
    files.push(new File([blob], `placeholder-${index + 1}.jpg`, { type: 'image/jpeg' }));
  }

  return files;
}

export function buildTryPreviewSteps(args: {
  shots: TryPreviewShot[];
  storyboard: DemoStudioStoryboardStep[];
  createdAt?: string;
}): DemoStepWithHotspots[] {
  const createdAt = args.createdAt ?? new Date().toISOString();
  const count = Math.min(args.shots.length, args.storyboard.length, DEMO_STUDIO_TRY_MAX_SCREENSHOTS);

  /*
   * The storyboard decides which screenshot each step describes, when it can be
   * trusted to. Matching by array position was why a caption reading "Advanced
   * Analytics" ended up on a marketing homepage: it was third in both lists and
   * nothing checked. resolveScreenshotOrder returns null unless the mapping is a
   * complete permutation, so a partial answer degrades to upload order rather
   * than shuffling captions onto the wrong screens.
   */
  const order = resolveScreenshotOrder(args.storyboard.slice(0, count), count);

  return Array.from({ length: count }, (_, index) => {
    const step = args.storyboard[index];
    const shotIndex = order ? order[index] : index;
    return {
      id: `try-${index}`,
      demo_id: 'try',
      position: index,
      asset_type: 'image',
      asset_url: args.shots[shotIndex].url,
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
              // The model's coordinates when it found the element; the shared
              // constant only as a fallback. The same rectangle on every step of
              // every demo is not a hotspot, it is a sticker.
              //
              // Re-validated here rather than trusting the caller: this builder
              // is also reachable with storyboards that never passed through
              // normalizeStoryboardStep, and an off-frame rectangle would be
              // spread straight onto the step.
              ...(normalizeHotspot(step.hotspot) ?? DEMO_STUDIO_TRY_HOTSPOT),
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
