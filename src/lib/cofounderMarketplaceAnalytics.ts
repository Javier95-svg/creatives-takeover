import { captureEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';

export type CofounderMarketplaceEvent =
  | 'cofounder_marketplace_viewed'
  | 'cofounder_search_used'
  | 'cofounder_filter_applied'
  | 'cofounder_empty_results'
  | 'cofounder_public_signup_started'
  | 'cofounder_listing_started'
  | 'cofounder_listing_published'
  | 'cofounder_listing_renewed'
  | 'cofounder_listing_viewed'
  | 'cofounder_match_viewed'
  | 'cofounder_match_feedback'
  | 'cofounder_listing_saved'
  | 'cofounder_interest_sent'
  | 'cofounder_interest_accepted'
  | 'cofounder_interest_declined'
  | 'cofounder_conversation_started'
  | 'cofounder_listing_reported'
  | 'cofounder_listing_expired';

export function trackCofounderMarketplaceEvent(event: CofounderMarketplaceEvent, properties: Record<string, unknown> = {}) {
  captureEvent(event, properties);
}

export async function persistCofounderMarketplaceEvent(
  userId: string,
  event: CofounderMarketplaceEvent,
  entityType: 'cofounder_listing' | 'cofounder_interest',
  entityId: string,
  eventKey: string,
  properties: Record<string, unknown> = {},
) {
  trackCofounderMarketplaceEvent(event, properties);
  await (supabase as any).from('user_activity_log').upsert({
    user_id: userId,
    activity_type: event,
    activity_data: properties,
    event_key: eventKey,
    source_tool: 'cofounder_marketplace',
    source_entity_type: entityType,
    source_entity_id: entityId,
    page_path: '/co-founder',
  }, { onConflict: 'user_id,event_key', ignoreDuplicates: true });
}

export function trackCofounderMarketplaceEventOnce(
  userId: string | undefined,
  event: CofounderMarketplaceEvent,
  entityType: 'cofounder_listing' | 'cofounder_interest',
  entityId: string,
  properties: Record<string, unknown> = {},
) {
  const sessionKey = `cofounder-event:${event}:${entityId}`;
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionKey)) return;
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(sessionKey, '1');
  if (userId) {
    void persistCofounderMarketplaceEvent(userId, event, entityType, entityId, `${entityId}:${event}`, properties);
  } else {
    trackCofounderMarketplaceEvent(event, properties);
  }
}
