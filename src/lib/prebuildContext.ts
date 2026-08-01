import { supabase } from '@/integrations/supabase/client';

export interface PrebuildValidationContext {
  id: string;
  user_id: string;
  icp_analysis_id: string | null;
  label: string | null;
  is_explicitly_unscoped: boolean;
  status: 'active' | 'archived';
  created_at: string;
}

const CONTEXT_TABLE = 'prebuild_validation_contexts' as any;

export async function ensurePrebuildContext(input: {
  userId: string;
  icpAnalysisId?: string | null;
  label?: string | null;
  explicitlyUnscoped?: boolean;
}): Promise<PrebuildValidationContext> {
  const icpAnalysisId = input.explicitlyUnscoped ? null : input.icpAnalysisId ?? null;

  if (icpAnalysisId) {
    const { data: existing, error: lookupError } = await supabase
      .from(CONTEXT_TABLE)
      .select('*')
      .eq('user_id', input.userId)
      .eq('icp_analysis_id', icpAnalysisId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return existing as unknown as PrebuildValidationContext;
  }

  const { data, error } = await supabase
    .from(CONTEXT_TABLE)
    .insert({
      user_id: input.userId,
      icp_analysis_id: icpAnalysisId,
      label: input.label?.trim() || (input.explicitlyUnscoped ? 'Unscoped evidence case' : null),
      is_explicitly_unscoped: Boolean(input.explicitlyUnscoped),
    } as any)
    .select('*')
    .single();
  if (error) {
    // Concurrent opens of the same ICP can race the unique constraint.
    if (icpAnalysisId) {
      const { data: raced, error: racedError } = await supabase
        .from(CONTEXT_TABLE)
        .select('*')
        .eq('user_id', input.userId)
        .eq('icp_analysis_id', icpAnalysisId)
        .single();
      if (!racedError && raced) return raced as unknown as PrebuildValidationContext;
    }
    throw error;
  }
  return data as unknown as PrebuildValidationContext;
}

export async function listPrebuildContexts(userId: string): Promise<PrebuildValidationContext[]> {
  const { data, error } = await supabase
    .from(CONTEXT_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PrebuildValidationContext[];
}

export async function getPrebuildContext(userId: string, contextId: string) {
  const { data, error } = await supabase
    .from(CONTEXT_TABLE)
    .select('*')
    .eq('id', contextId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as PrebuildValidationContext | null;
}

