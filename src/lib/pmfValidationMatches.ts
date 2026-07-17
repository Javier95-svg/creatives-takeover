import { supabase } from '@/integrations/supabase/client';

export interface ValidationMatch {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  positioning_line: string | null;
  startup_name: string | null;
  startup_tagline: string | null;
  startup_industry: string[] | null;
  startup_stage: string | null;
  bio: string | null;
  activity_bucket: 'this_week' | 'this_month' | 'earlier';
  match_score: number;
  match_reasons: string[];
}

export interface ValidationMatchInput {
  industry?: string;
  audience?: string;
  problem?: string;
  stage?: string | null;
  limit?: number;
}

// pmf_discovery_* objects aren't in the generated types yet.
const client = supabase as any;

const KEYWORD_STOP_WORDS = new Set([
  'about', 'after', 'also', 'been', 'from', 'have', 'into', 'looking', 'that', 'their',
  'there', 'they', 'this', 'what', 'when', 'where', 'which', 'with', 'would', 'your',
  'people', 'want', 'need', 'because', 'more', 'less', 'very', 'really', 'just',
]);

/** Extract distinct keywords (3+ chars, no stop words) from free text for profile matching. */
export function extractMatchKeywords(text: string, limit = 8): string[] {
  const terms = text.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) || [];
  return Array.from(new Set(terms.filter((term) => !KEYWORD_STOP_WORDS.has(term)))).slice(0, limit);
}

/**
 * Fetch opted-in platform members ranked for interview fit.
 * Returns null when the matching RPC is not available yet (pre-migration),
 * so callers can hide the section instead of erroring.
 */
export async function fetchValidationMatches(input: ValidationMatchInput): Promise<ValidationMatch[] | null> {
  const industries = extractMatchKeywords([input.industry || '', input.audience || ''].join(' '), 6);
  const keywords = extractMatchKeywords(input.problem || '', 8);
  const { data, error } = await client.rpc('match_validation_users', {
    p_industries: industries,
    p_stage: input.stage || null,
    p_keywords: keywords,
    p_limit: input.limit ?? 8,
  });
  if (error) {
    // PGRST202: function not found — migration not applied yet.
    if (error.code === 'PGRST202' || /match_validation_users/i.test(error.message || '')) return null;
    throw error;
  }
  return (Array.isArray(data) ? data : []) as ValidationMatch[];
}

export async function fetchValidationOptIn(userId: string): Promise<boolean | null> {
  const { data, error } = await client
    .from('profiles')
    .select('validation_interviews_opt_in')
    .eq('id', userId)
    .maybeSingle();
  if (error) return null; // column missing pre-migration → treat as unavailable
  return Boolean(data?.validation_interviews_opt_in);
}

export async function setValidationOptIn(userId: string, optIn: boolean): Promise<void> {
  const { error } = await client
    .from('profiles')
    .update({ validation_interviews_opt_in: optIn })
    .eq('id', userId);
  if (error) throw error;
}
