import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export { previousRoundStart, roundEnd, roundStart, timeLeft } from './launchpadRoundTime';

/**
 * Weekly launch rounds. A round is a calendar week from Monday 00:00 UTC; a
 * launch is a published Demo Studio launch page entered into one. All writes
 * go through RPCs that enforce ownership, the voting window and rewards.
 */

// The round RPCs are newer than the generated types.
const db = supabase as unknown as SupabaseClient;

export type LaunchSort = 'popular' | 'latest';

export interface RoundLaunch {
  id: string;
  week_start: string;
  rank: number;
  upvotes: number;
  created_at: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  category: string | null;
  headline: string | null;
  maker_id: string;
  maker_username: string | null;
  maker_name: string | null;
  maker_avatar: string | null;
  maker_stage: number | null;
  voted: boolean;
  is_mine: boolean;
}

export interface SupporterStatus {
  earnedThisWeek: number;
  weeklyCap: number;
  eligible: boolean;
}

/** True when the round functions are not deployed yet, so the tab can fall back. */
export function isMissingRoundsError(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : '';
  // 42501: deployed but not yet readable by visitors (20261010130000 grants it).
  return code === 'PGRST202' || code === '42883' || code === '42P01' || code === '42501';
}

export async function listRound(week: string | null, sort: LaunchSort, limit = 50): Promise<RoundLaunch[]> {
  const { data, error } = await db.rpc('launchpad_round', { p_week: week, p_sort: sort, p_limit: limit });
  if (error) throw error;
  return ((data ?? []) as RoundLaunch[]).map((row) => ({ ...row, upvotes: Number(row.upvotes), rank: Number(row.rank) }));
}

export async function toggleLaunchVote(launchId: string, on: boolean): Promise<{ upvotes: number; voted: boolean; credited: number }> {
  const { data, error } = await db.rpc('launchpad_toggle_launch_vote', { p_launch_id: launchId, p_on: on });
  if (error) throw error;
  return data as { upvotes: number; voted: boolean; credited: number };
}

export async function enterLaunch(demoProjectId: string): Promise<string> {
  const { data, error } = await db.rpc('launchpad_enter_launch', { p_demo_project_id: demoProjectId });
  if (error) throw error;
  return data as string;
}

export async function withdrawLaunch(launchId: string) {
  const { error } = await db.from('launchpad_launches').delete().eq('id', launchId);
  if (error) throw error;
}

export async function getSupporterStatus(): Promise<SupporterStatus> {
  const { data, error } = await db.rpc('launchpad_supporter_status');
  if (error) throw error;
  const row = (data ?? {}) as Partial<SupporterStatus>;
  return { earnedThisWeek: Number(row.earnedThisWeek ?? 0), weeklyCap: Number(row.weeklyCap ?? 5), eligible: row.eligible === true };
}

/** Demo Studio project ids that are already in a round, so the picker can skip them. */
export async function listEnteredProjectIds(ownerId: string): Promise<Set<string>> {
  const { data, error } = await db.from('launchpad_launches').select('demo_project_id').eq('owner_id', ownerId);
  if (error) throw error;
  return new Set((data ?? []).map((row: { demo_project_id: string }) => row.demo_project_id));
}

/** Traction is stage 6; from there a launch is worth putting in front of angels. */
export const INVESTOR_READY_STAGE = 6;
