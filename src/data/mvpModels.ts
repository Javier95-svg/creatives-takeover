export interface MVPModelOption {
  id: string;
  label: string;
  description: string;
  bestFor: string;
  supportsHtml: boolean;
}

export const MVP_DEFAULT_MODEL = 'claude-sonnet-4-6';

const MAX_MODELS_PER_REQUEST = 3;

export const MVP_MODEL_OPTIONS: MVPModelOption[] = [
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet (default)',
    description:
      'Anthropic\'s best balance of speed and quality — strong code generation, excellent UI copy, and reliable structured output.',
    bestFor:
      'All build types: landing pages, dashboards, feature additions, and design overhauls. The right choice for most founders.',
    supportsHtml: true,
  },
  {
    id: 'claude-opus-4-8',
    label: 'Claude Opus (power)',
    description:
      'Anthropic\'s most capable model. Slower and more expensive than Sonnet, but produces more nuanced copy and more architecturally coherent multi-file projects.',
    bestFor:
      'Complex multi-page apps, highly customized dashboards, and prompts that need deep reasoning about your product strategy.',
    supportsHtml: true,
  },
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku (fast)',
    description:
      'Anthropic\'s fastest and most affordable model. Good for quick iterations and targeted edits where speed matters more than depth.',
    bestFor:
      'Rapid iterations, simple targeted edits, bug fixes, and quick copy tweaks when you want instant results.',
    supportsHtml: true,
  },
  {
    id: 'google/gemini-3-flash',
    label: 'Gemini 3 Flash',
    description:
      'Google\'s latest fast model via the Lovable gateway. Quick, low-cost, and produces clean, visually convincing layouts.',
    bestFor:
      'Fast, good-looking landing pages and previews when you want a different design style and snappy turnaround.',
    supportsHtml: true,
  },
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description:
      'Google\'s proven fast model via the Lovable gateway. Reliable speed and solid UI output at very low cost.',
    bestFor:
      'Budget-friendly rapid generations and an alternative visual aesthetic to the Claude models.',
    supportsHtml: true,
  },
];

const MODEL_LOOKUP = new Map(MVP_MODEL_OPTIONS.map((m) => [m.id, m]));

export function getMVPModelLabel(modelId?: string): string | null {
  if (!modelId) return null;
  return MODEL_LOOKUP.get(modelId)?.label ?? modelId;
}

export function sanitizeMVPModelSelection(modelIds: string[] | undefined): string[] {
  if (!Array.isArray(modelIds)) return [MVP_DEFAULT_MODEL];

  const uniqueValid = Array.from(
    new Set(modelIds.filter((id) => MODEL_LOOKUP.has(id)))
  ).slice(0, MAX_MODELS_PER_REQUEST);

  return uniqueValid.length > 0 ? uniqueValid : [MVP_DEFAULT_MODEL];
}
