export interface MVPModelOption {
  id: string;
  label: string;
  description: string;
  bestFor: string;
  supportsHtml: boolean;
}

export const MVP_DEFAULT_MODEL = 'google/gemini-3-flash';
const MAX_MODELS_PER_REQUEST = 4;

export const MVP_MODEL_OPTIONS: MVPModelOption[] = [
  {
    id: 'google/gemini-3-flash',
    label: 'Gemini 3 Flash (default)',
    description:
      'Fast and efficient Gemini model optimized for responsive, general-purpose use and interactive agent workflows.',
    bestFor:
      'Fast interactive builds, agent workflows, and general use cases where responsiveness matters.',
    supportsHtml: true,
  },
  {
    id: 'google/gemini-3-pro',
    label: 'Gemini 3 Pro',
    description:
      "Google's most capable Gemini 3 model with stronger reasoning, larger context, and more reliable tool use.",
    bestFor:
      'Advanced agents, complex research, long-horizon reasoning, and multimodal analysis needing high accuracy.',
    supportsHtml: true,
  },
  {
    id: 'google/nano-banana-pro',
    label: 'Nano Banana Pro',
    description:
      "High-quality image generation and editing model optimized for detailed visuals and multi-image composition.",
    bestFor:
      'Visual asset creation, infographics, and rapid prototyping of creative content.',
    supportsHtml: false,
  },
  {
    id: 'google/gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description:
      'High-reasoning Gemini model with large context. Slower and more expensive than Flash variants.',
    bestFor:
      'Deep reasoning, advanced coding, research, and complex multimodal tasks.',
    supportsHtml: true,
  },
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description:
      'Balanced Gemini model with good reasoning and lower latency/cost than Pro.',
    bestFor: 'Assistants, analysis, and general workflows needing speed + intelligence balance.',
    supportsHtml: true,
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    description:
      'Fastest and lowest-cost Gemini option, designed for simple high-throughput tasks.',
    bestFor:
      'Lightweight tasks like classification, summarization, translation, and extraction.',
    supportsHtml: true,
  },
  {
    id: 'google/gemini-2.5-flash-image',
    label: 'Gemini 2.5 Flash Image',
    description:
      'Image-oriented Gemini model optimized for generating images at low cost.',
    bestFor: 'Quick image generation and visual prototyping workflows.',
    supportsHtml: false,
  },
  {
    id: 'openai/gpt-5.2',
    label: 'GPT-5.2',
    description:
      'OpenAI flagship-grade model for complex professional knowledge work and long-form coherence.',
    bestFor:
      'Complex reasoning, deep coding and analytical workflows, and long-context knowledge tasks.',
    supportsHtml: true,
  },
  {
    id: 'openai/gpt-5-2025-08-07',
    label: 'GPT-5',
    description:
      'High-accuracy general-purpose model with strong reasoning. Higher latency and cost than smaller variants.',
    bestFor:
      'Accuracy-critical tasks, complex decision-making, and high-quality reasoning.',
    supportsHtml: true,
  },
  {
    id: 'openai/gpt-5-mini-2025-08-07',
    label: 'GPT-5 Mini',
    description:
      'Balanced GPT-5 variant that is faster and cheaper than GPT-5 while retaining strong general capability.',
    bestFor: 'Assistants, mid-complexity reasoning, and business workflows.',
    supportsHtml: true,
  },
  {
    id: 'openai/gpt-5-nano-2025-08-07',
    label: 'GPT-5 Nano',
    description:
      'Cheapest and fastest GPT-5 variant for simple responses and high-throughput use.',
    bestFor: 'Summaries, classification, extraction, and high-volume simple tasks.',
    supportsHtml: true,
  },
];

const MODEL_LOOKUP = new Map(MVP_MODEL_OPTIONS.map((model) => [model.id, model]));

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

