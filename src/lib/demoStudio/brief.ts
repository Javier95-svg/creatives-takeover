import type {
  DemoStudioAiKit,
  DemoStudioBrief,
  DemoStudioDemo,
  DemoStudioGoal,
  DemoStudioLaunchCopy,
  DemoStudioProductStage,
  DemoStudioStoryboardStep,
  DemoStudioTone,
  DemoStudioVslScript,
} from './types';

export const DEFAULT_DEMO_STUDIO_CTA = 'Get early access';

export const DEMO_STUDIO_TONES: DemoStudioTone[] = [
  'professional',
  'friendly',
  'bold',
  'conversational',
  'inspirational',
];

export const DEMO_STUDIO_PRODUCT_STAGES: DemoStudioProductStage[] = [
  'idea',
  'prototype',
  'mvp',
  'launched',
];

export const DEMO_STUDIO_GOALS: DemoStudioGoal[] = [
  'collect_signups',
  'book_calls',
  'validate_interest',
  'sell_product',
];

export const DEMO_STUDIO_GOAL_LABELS: Record<DemoStudioGoal, string> = {
  collect_signups: 'Collect signups',
  book_calls: 'Book calls',
  validate_interest: 'Validate interest',
  sell_product: 'Sell product',
};

export function getBriefCompleteness(
  brief: Pick<DemoStudioBrief, 'audience' | 'problem' | 'product_promise' | 'aha_moment' | 'primary_cta_label'> | null,
): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!brief?.audience?.trim()) missing.push('Audience');
  if (!brief?.problem?.trim()) missing.push('Problem');
  if (!brief?.product_promise?.trim()) missing.push('Product promise');
  if (!brief?.aha_moment?.trim()) missing.push('Aha moment');
  if (!brief?.primary_cta_label?.trim()) missing.push('CTA');
  return { complete: missing.length === 0, missing };
}

export function normalizeProjectSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function getDefaultBrief(project: Pick<DemoStudioDemo, 'title'> | { name: string; tagline?: string | null }): Partial<DemoStudioBrief> {
  const name = 'name' in project ? project.name : project.title;
  const safeName = (name ?? '').trim() || 'this product';
  const tagline = 'tagline' in project ? project.tagline?.trim() ?? '' : '';
  // Seed the brief from the only two things we know up front (name + tagline) so a
  // founder can reach a generated kit in one click. These are starting points the
  // AI expands and the founder can refine later — they are intentionally concrete
  // enough to pass brief completeness, not final copy.
  return {
    audience: `Early adopters and prospective customers evaluating ${safeName}.`,
    problem: `They are not yet convinced ${safeName} solves their problem or how it works in practice.`,
    product_promise: tagline || `${safeName} gives its users a clear, fast win.`,
    aha_moment: tagline
      ? `By the end, the viewer understands how ${safeName} delivers ${tagline.toLowerCase()} and wants to try it.`
      : `By the end, the viewer understands exactly how ${safeName} works and wants to try it.`,
    primary_cta_label: DEFAULT_DEMO_STUDIO_CTA,
    primary_cta_url: null,
    tone: 'conversational',
    product_stage: 'prototype',
    demo_goal: 'collect_signups',
    ai_storyboard: [],
    ai_vsl_scripts: [],
    ai_launch_copy: {
      headlines: [
        {
          variant: 'A',
          headline: name,
          subheadline: 'tagline' in project ? project.tagline ?? '' : '',
          rationale: 'Starts with the product name until AI copy is generated.',
        },
      ],
      subheadline: 'tagline' in project ? project.tagline ?? '' : '',
      cta_label: DEFAULT_DEMO_STUDIO_CTA,
      proof_bullets: [],
      success_message: 'You are on the early access list.',
    },
  };
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function normalizeStoryboard(raw: unknown): DemoStudioStoryboardStep[] {
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const action = row.suggested_action === 'goto' || row.suggested_action === 'url' ? row.suggested_action : 'next';
      return {
        title: cleanText(row.title, 80),
        caption: cleanText(row.caption, 220),
        speaker_notes: cleanText(row.speaker_notes, 700),
        hotspot_label: cleanText(row.hotspot_label, 80),
        suggested_action: action,
      };
    })
    .filter((step) => step.title && step.caption)
    .slice(0, 7);
}

export function normalizeVslScripts(raw: unknown): DemoStudioVslScript[] {
  const rows = Array.isArray(raw) ? raw : [];
  const allowed = new Set(['A', 'B', 'C']);
  return rows
    .map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const variation = allowed.has(String(row.variation)) ? String(row.variation) as 'A' | 'B' | 'C' : (['A', 'B', 'C'][index] as 'A' | 'B' | 'C');
      const outline = Array.isArray(row.outline) ? row.outline.map((line) => cleanText(line, 140)).filter(Boolean).slice(0, 6) : [];
      return {
        variation,
        title: cleanText(row.title, 80),
        hook: cleanText(row.hook, 220),
        outline,
        script: cleanText(row.script, 2200),
        target_duration_seconds: Math.min(180, Math.max(30, Number(row.target_duration_seconds) || 75)),
      };
    })
    .filter((script) => script.title && script.hook && script.script)
    .slice(0, 3);
}

export function normalizeLaunchCopy(raw: unknown): DemoStudioLaunchCopy | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const headlines = (Array.isArray(row.headlines) ? row.headlines : [])
    .map((item, index) => {
      const headline = item as Record<string, unknown>;
      return {
        variant: (['A', 'B', 'C'][index] as 'A' | 'B' | 'C') ?? 'A',
        headline: cleanText(headline.headline, 90),
        subheadline: cleanText(headline.subheadline, 180),
        rationale: cleanText(headline.rationale, 160),
      };
    })
    .filter((headline) => headline.headline)
    .slice(0, 3);
  const proof_bullets = Array.isArray(row.proof_bullets)
    ? row.proof_bullets.map((bullet) => cleanText(bullet, 120)).filter(Boolean).slice(0, 4)
    : [];
  const cta = cleanText(row.cta_label, 36) || DEFAULT_DEMO_STUDIO_CTA;
  const subheadline = cleanText(row.subheadline, 180) || headlines[0]?.subheadline || '';
  if (!headlines.length && !subheadline) return null;
  return {
    headlines,
    subheadline,
    cta_label: cta,
    proof_bullets,
    success_message: cleanText(row.success_message, 120) || 'You are on the early access list.',
  };
}

export function normalizeAiKit(raw: unknown): DemoStudioAiKit {
  const row = (raw ?? {}) as Record<string, unknown>;
  const launchCopy = normalizeLaunchCopy(row.launch_copy);
  return {
    storyboard: normalizeStoryboard(row.storyboard),
    vsl_scripts: normalizeVslScripts(row.vsl_scripts),
    ...(launchCopy ? { launch_copy: launchCopy } : {}),
  };
}
