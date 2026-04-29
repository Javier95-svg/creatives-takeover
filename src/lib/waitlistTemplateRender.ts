import type { WaitlistTemplateId } from './waitlist.ts';

export type WaitlistHeroVisual =
  | 'dashboard'
  | 'ai-demo'
  | 'phone'
  | 'marketplace'
  | 'member-circle'
  | 'creator-board'
  | 'product-drop'
  | 'service-proof';

export interface WaitlistTemplateRenderConfig {
  heroVisual: WaitlistHeroVisual;
  heroLayoutClass: string;
  heroCopyClass: string;
  sectionFrameClass: string;
  benefitGridClass: string;
  problemGridClass: string;
}

export const WAITLIST_TEMPLATE_RENDER_CONFIG: Record<WaitlistTemplateId, WaitlistTemplateRenderConfig> = {
  saas: {
    heroVisual: 'dashboard',
    heroLayoutClass: 'grid gap-10 md:grid-cols-[1.02fr_0.98fr] md:items-center',
    heroCopyClass: 'text-left',
    sectionFrameClass: 'rounded-none',
    benefitGridClass: 'md:grid-cols-3',
    problemGridClass: 'md:grid-cols-2',
  },
  'ai-tool': {
    heroVisual: 'ai-demo',
    heroLayoutClass: 'grid gap-8 md:grid-cols-[0.95fr_1.05fr] md:items-center',
    heroCopyClass: 'text-left',
    sectionFrameClass: 'rounded-[28px]',
    benefitGridClass: 'md:grid-cols-[1.1fr_0.95fr_0.95fr]',
    problemGridClass: 'md:grid-cols-[0.9fr_1.1fr]',
  },
  'mobile-app': {
    heroVisual: 'phone',
    heroLayoutClass: 'grid gap-10 md:grid-cols-[1fr_420px] md:items-center',
    heroCopyClass: 'text-left',
    sectionFrameClass: 'rounded-[32px]',
    benefitGridClass: 'md:grid-cols-3',
    problemGridClass: 'md:grid-cols-2',
  },
  marketplace: {
    heroVisual: 'marketplace',
    heroLayoutClass: 'grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center',
    heroCopyClass: 'text-center md:text-left',
    sectionFrameClass: 'rounded-[18px]',
    benefitGridClass: 'md:grid-cols-3',
    problemGridClass: 'md:grid-cols-[1fr_1fr]',
  },
  community: {
    heroVisual: 'member-circle',
    heroLayoutClass: 'grid gap-10 md:grid-cols-[1fr_0.9fr] md:items-center',
    heroCopyClass: 'text-center',
    sectionFrameClass: 'rounded-[30px]',
    benefitGridClass: 'md:grid-cols-[0.9fr_1.2fr_0.9fr]',
    problemGridClass: 'md:grid-cols-2',
  },
  'creator-tool': {
    heroVisual: 'creator-board',
    heroLayoutClass: 'grid gap-8 md:grid-cols-[1fr_1fr] md:items-center',
    heroCopyClass: 'text-left',
    sectionFrameClass: 'rounded-[16px]',
    benefitGridClass: 'md:grid-cols-[1.2fr_0.9fr_0.9fr]',
    problemGridClass: 'md:grid-cols-[1.1fr_0.9fr]',
  },
  ecommerce: {
    heroVisual: 'product-drop',
    heroLayoutClass: 'grid gap-10 md:grid-cols-[0.95fr_1.05fr] md:items-center',
    heroCopyClass: 'text-left',
    sectionFrameClass: 'rounded-lg',
    benefitGridClass: 'md:grid-cols-3',
    problemGridClass: 'md:grid-cols-[0.9fr_1.1fr]',
  },
  'b2b-service': {
    heroVisual: 'service-proof',
    heroLayoutClass: 'grid gap-8 md:grid-cols-[1fr_0.92fr] md:items-center',
    heroCopyClass: 'text-center md:text-left',
    sectionFrameClass: 'rounded-2xl',
    benefitGridClass: 'md:grid-cols-[1fr_1fr_1fr]',
    problemGridClass: 'md:grid-cols-[1.15fr_0.85fr]',
  },
};

export function getWaitlistTemplateRenderConfig(templateId?: WaitlistTemplateId): WaitlistTemplateRenderConfig {
  return WAITLIST_TEMPLATE_RENDER_CONFIG[templateId || 'saas'] ?? WAITLIST_TEMPLATE_RENDER_CONFIG.saas;
}
