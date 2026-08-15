import { captureEvent } from '@/lib/analytics';
import { recordRecommendationOutcome } from '@/lib/recommendationLearning';
import type { DashboardAction } from '@/types/dashboardSnapshot';

const STORAGE_KEY = 'ct:social-recommendation-context';

interface StoredSocialContext {
  recommendationKey: string;
  interactionType: string;
  counterpartyType: string;
  createdAt: string;
}

function readContext(): StoredSocialContext | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') as StoredSocialContext | null;
    if (!value || Date.now() - new Date(value.createdAt).getTime() > 24 * 60 * 60_000) return null;
    return value;
  } catch {
    return null;
  }
}

export function rememberSocialRecommendation(action: DashboardAction) {
  if (!action.interaction || typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
    recommendationKey: action.key,
    interactionType: action.interaction.type,
    counterpartyType: action.interaction.counterpartyType,
    createdAt: new Date().toISOString(),
  } satisfies StoredSocialContext));
}

export function trackSocialContactCta(input: {
  interactionType: string;
  counterpartyType: string;
  source: string;
  sourceEntityType: string;
}) {
  captureEvent('social_contact_cta_clicked', {
    interaction_type: input.interactionType,
    counterparty_type: input.counterpartyType,
    source: input.source,
    source_entity_type: input.sourceEntityType,
  });
}

export function trackSocialInteractionCompleted(input: {
  interactionType: string;
  counterpartyType: string;
  source: string;
  sourceEntityType: string;
}) {
  const context = readContext();
  captureEvent('social_interaction_completed', {
    interaction_type: context?.interactionType ?? input.interactionType,
    counterparty_type: context?.counterpartyType ?? input.counterpartyType,
    source: input.source,
    source_entity_type: input.sourceEntityType,
    recommendation_key: context?.recommendationKey ?? 'none',
    recommended: Boolean(context),
  });
  if (context) {
    void recordRecommendationOutcome({
      recommendationKey: context.recommendationKey,
      surface: 'command_center',
      outcomeType: 'completed',
      source: input.source,
    }).catch(() => undefined);
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent('ct:tool-milestone', {
    detail: { tool: 'network', action: 'social_interaction_completed' },
  }));
}

export function trackSocialReplyReceived(source: string) {
  captureEvent('social_reply_received', {
    interaction_type: 'reply_received',
    counterparty_type: 'founder',
    source,
    source_entity_type: 'conversation',
  });
}
