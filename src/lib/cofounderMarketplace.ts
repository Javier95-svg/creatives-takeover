import { supabase } from '@/integrations/supabase/client';
import type {
  CofounderBrowseFilters, CofounderInterest, CofounderInterestReason,
  CofounderListing, CofounderListingInput, CofounderListingPage,
} from '@/types/cofounderMarketplace';

const rpc = async <T>(name: string, args: Record<string, unknown>): Promise<T> => {
  const { data, error } = await (supabase as any).rpc(name, args);
  if (error) throw error;
  return data as T;
};

export const cofounderKeys = {
  all: ['cofounder-marketplace'] as const,
  browse: (filters: CofounderBrowseFilters) => [...cofounderKeys.all, 'browse', filters] as const,
  matches: (filters: CofounderBrowseFilters) => [...cofounderKeys.all, 'matches', filters] as const,
  listing: (id: string) => [...cofounderKeys.all, 'listing', id] as const,
  interests: (userId?: string) => [...cofounderKeys.all, 'interests', userId] as const,
  mine: (userId?: string) => [...cofounderKeys.all, 'mine', userId] as const,
};

export const browseCofounderListings = (filters: CofounderBrowseFilters, cursor: string | null = null) =>
  rpc<CofounderListingPage>('browse_cofounder_listings_v1', { p_filters: filters, p_limit: 20, p_cursor: cursor });

export const getCofounderMatches = (filters: CofounderBrowseFilters) =>
  rpc<CofounderListingPage>('get_cofounder_matches_v1', { p_listing_id: null, p_filters: filters, p_limit: 20, p_cursor: null });

export const publishCofounderListing = (listing: CofounderListingInput, idempotencyKey: string) =>
  rpc<CofounderListing>('publish_cofounder_listing_v2', { p_listing: listing, p_idempotency_key: idempotencyKey });

export const saveCofounderListingDraft = (listing: CofounderListingInput) =>
  rpc<CofounderListing>('save_cofounder_listing_draft_v2', { p_listing: listing });

export const updateCofounderListing = (id: string, patch: Partial<CofounderListingInput>) =>
  rpc<CofounderListing>('update_cofounder_listing_v2', { p_listing_id: id, p_patch: patch });

export const renewCofounderListing = (id: string, idempotencyKey: string) =>
  rpc<CofounderListing>('renew_cofounder_listing_v2', { p_listing_id: id, p_idempotency_key: idempotencyKey });

export const setCofounderListingStatus = (id: string, status: 'paused' | 'closed' | 'archived') =>
  rpc<CofounderListing>('set_cofounder_listing_status_v2', { p_listing_id: id, p_status: status });

export async function toggleCofounderSave(listingId: string, userId: string, currentlySaved: boolean) {
  const query = (supabase as any).from('cofounder_listing_saves');
  const result = currentlySaved
    ? await query.delete().eq('user_id', userId).eq('listing_id', listingId)
    : await query.insert({ user_id: userId, listing_id: listingId });
  if (result.error) throw result.error;
}

export async function submitCofounderMatchFeedback(listingId: string, userId: string, feedback: 'not_relevant' | 'good_match') {
  const { error } = await (supabase as any).from('cofounder_match_feedback').upsert({ user_id: userId, listing_id: listingId, feedback, updated_at: new Date().toISOString() }, { onConflict: 'user_id,listing_id' });
  if (error) throw error;
}

export const sendCofounderInterest = (listingId: string, reason: CofounderInterestReason, introduction: string, availability: string) =>
  rpc<CofounderInterest>('send_cofounder_interest_v1', {
    p_listing_id: listingId, p_reason_code: reason, p_introduction: introduction, p_availability_note: availability,
  });

export const respondCofounderInterest = (interestId: string, action: 'accept' | 'decline', stopRecommending = false) =>
  rpc<CofounderInterest>('respond_cofounder_interest_v1', { p_interest_id: interestId, p_action: action, p_stop_recommending: stopRecommending });

export const withdrawCofounderInterest = (interestId: string) =>
  rpc<void>('withdraw_cofounder_interest_v1', { p_interest_id: interestId });

export const blockCofounderInterest = (interestId: string) =>
  rpc<void>('block_cofounder_interest_v1', { p_interest_id: interestId });

export const reportCofounderTarget = (listingId: string | null, interestId: string | null, category: string, explanation: string) =>
  rpc<string>('report_cofounder_target_v1', { p_listing_id: listingId, p_interest_id: interestId, p_category: category, p_explanation: explanation });

export async function getCofounderInterests(userId: string): Promise<CofounderInterest[]> {
  const { data, error } = await (supabase as any).from('cofounder_interests').select('*').or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMyCofounderListing(userId: string, listingId?: string): Promise<CofounderListing | null> {
  if (!userId) return null;
  return rpc<CofounderListing | null>('get_my_cofounder_listing_v1', { p_listing_id: listingId ?? null });
}
