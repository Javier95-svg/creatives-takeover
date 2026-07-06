export type MVPModelPlan = 'rookie' | 'starter' | 'rising' | 'pro';

export interface MVPModelOption {
  id: string;
  label: string;
  description: string;
  bestFor: string;
  supportsHtml: boolean;
  provider: 'anthropic' | 'google' | 'deepseek';
  minimumPlan?: MVPModelPlan;
  freeTier?: boolean;
  fallbackOnly?: boolean;
}

export const MVP_FREE_DEFAULT_MODEL = 'gemini-3.5-flash';
export const MVP_PREMIUM_DEFAULT_MODEL = 'claude-sonnet-4-6';
export const MVP_DEEPSEEK_FALLBACK_MODEL = 'deepseek-v4-flash';
export const MVP_DEFAULT_MODEL = MVP_FREE_DEFAULT_MODEL;

const MAX_MODELS_PER_REQUEST = 3;

const PLAN_RANK: Record<MVPModelPlan, number> = {
  rookie: 0,
  starter: 1,
  rising: 2,
  pro: 3,
};

export const MVP_MODEL_CATALOG: MVPModelOption[] = [
  {
    id: MVP_FREE_DEFAULT_MODEL,
    label: 'Gemini 3.5 Flash (free default)',
    description:
      'Google Gemini through the direct Gemini API. Fast, generous for free-tier usage, and strong enough for polished MVP previews.',
    bestFor:
      'Rookie and Starter builds, quick landing pages, frontend iterations, and reliable low-friction previews.',
    supportsHtml: true,
    provider: 'google',
    freeTier: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    description:
      'Google Gemini\'s lighter free-tier option. Optimized for speed and low cost when the request is simple.',
    bestFor:
      'Very quick edits, lightweight pages, simple copy changes, and fast experiments on limited credits.',
    supportsHtml: true,
    provider: 'google',
    freeTier: true,
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet (Rising+)',
    description:
      'Anthropic\'s best balance of speed and quality. Strong code generation, excellent UI copy, and reliable structured output.',
    bestFor:
      'All build types: landing pages, dashboards, feature additions, and design overhauls. The right choice for most founders.',
    supportsHtml: true,
    provider: 'anthropic',
    minimumPlan: 'rising',
  },
  {
    id: 'claude-opus-4-8',
    label: 'Claude Opus (Pro power)',
    description:
      'Anthropic\'s most capable model. Slower and more expensive than Sonnet, but produces more nuanced copy and more architecturally coherent multi-file projects.',
    bestFor:
      'Complex multi-page apps, highly customized dashboards, and prompts that need deep reasoning about your product strategy.',
    supportsHtml: true,
    provider: 'anthropic',
    minimumPlan: 'rising',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku (Rising+ fast)',
    description:
      'Anthropic\'s fastest and most affordable model. Good for quick iterations and targeted edits where speed matters more than depth.',
    bestFor:
      'Rapid iterations, simple targeted edits, bug fixes, and quick copy tweaks when you want instant results.',
    supportsHtml: true,
    provider: 'anthropic',
    minimumPlan: 'rising',
  },
  {
    id: MVP_DEEPSEEK_FALLBACK_MODEL,
    label: 'DeepSeek V4 Flash fallback',
    description:
      'Automatic backend fallback used when the primary model is unavailable or returns unusable output.',
    bestFor:
      'Invisible safety net for continuity. It is not shown as a primary model choice.',
    supportsHtml: true,
    provider: 'deepseek',
    freeTier: true,
    fallbackOnly: true,
  },
];

export const MVP_MODEL_OPTIONS = MVP_MODEL_CATALOG.filter((model) => !model.fallbackOnly);

const MODEL_LOOKUP = new Map(MVP_MODEL_CATALOG.map((m) => [m.id, m]));

export function getMVPModelLabel(modelId?: string): string | null {
  if (!modelId) return null;
  return MODEL_LOOKUP.get(modelId)?.label ?? modelId;
}

export function getMVPDefaultModelForPlan(plan: MVPModelPlan = 'rookie'): string {
  return PLAN_RANK[plan] >= PLAN_RANK.rising
    ? MVP_PREMIUM_DEFAULT_MODEL
    : MVP_FREE_DEFAULT_MODEL;
}

export function isMVPModelAllowedForPlan(modelId: string, plan: MVPModelPlan = 'rookie'): boolean {
  const model = MODEL_LOOKUP.get(modelId);
  if (!model || model.fallbackOnly) return false;
  if (!model.minimumPlan) return true;
  return PLAN_RANK[plan] >= PLAN_RANK[model.minimumPlan];
}

export function getSelectableMVPModelOptions(plan: MVPModelPlan): MVPModelOption[] {
  return MVP_MODEL_OPTIONS.filter((model) => isMVPModelAllowedForPlan(model.id, plan));
}

export function sanitizeMVPModelSelection(
  modelIds: string[] | undefined,
  plan: MVPModelPlan = 'rookie'
): string[] {
  const defaultModel = getMVPDefaultModelForPlan(plan);
  if (!Array.isArray(modelIds)) return [defaultModel];

  const uniqueValid = Array.from(
    new Set(modelIds.filter((id) => isMVPModelAllowedForPlan(id, plan)))
  ).slice(0, MAX_MODELS_PER_REQUEST);

  return uniqueValid.length > 0 ? uniqueValid : [defaultModel];
}
