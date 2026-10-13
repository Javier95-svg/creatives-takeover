/** Shared, dependency-free contract for text-only Product starts. */
export interface DemoStoryDraftV1 {
  kind: 'demo_story';
  v: 1;
  description: string;
  productName: string;
  brief: {
    audience: string;
    problem: string;
    product_promise: string;
    aha_moment: string;
  };
  pitch: string;
  steps: Array<{
    title: string;
    caption: string;
    speaker_notes: string;
    hotspot_label: string;
    suggested_action: 'next';
  }>;
}

function bounded(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

export function isDemoStoryDraft(value: unknown): value is DemoStoryDraftV1 {
  if (!value || typeof value !== 'object') return false;
  const row = value as DemoStoryDraftV1;
  return row.kind === 'demo_story' && row.v === 1
    && bounded(row.description, 5000) && bounded(row.productName, 80)
    && bounded(row.pitch, 1000)
    && !!row.brief && ['audience', 'problem', 'product_promise', 'aha_moment'].every(
      key => bounded(row.brief[key as keyof typeof row.brief], 600),
    )
    && Array.isArray(row.steps) && row.steps.length === 3
    && row.steps.every(step => step && bounded(step.title, 80)
      && bounded(step.caption, 220) && bounded(step.speaker_notes, 700)
      && bounded(step.hotspot_label, 80) && step.suggested_action === 'next');
}

export function demoStoryText(draft: DemoStoryDraftV1): string {
  return [draft.productName, draft.pitch, `Likely customer: ${draft.brief.audience}`,
    `Problem: ${draft.brief.problem}`,
    ...draft.steps.map((step, index) => `${index + 1}. ${step.title}\n${step.caption}\n${step.speaker_notes}`),
  ].join('\n\n');
}
