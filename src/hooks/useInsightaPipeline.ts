import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { recordMeaningfulAction } from '@/lib/engagementSession';
import { scheduleReturnCue } from '@/lib/returnCues';

export const INSIGHTA_PIPELINE_STATUSES = [
  'saved',
  'researching',
  'ready_to_contact',
  'contacted',
  'replied',
  'meeting',
  'closed',
] as const;

export type InsightaPipelineStatus = typeof INSIGHTA_PIPELINE_STATUSES[number];
export type InsightaEntityType = 'vc' | 'accelerator';

export interface InsightaPipelineItem {
  id: string;
  user_id: string;
  entity_type: InsightaEntityType;
  entity_id: string;
  entity_label: string;
  entity_route: string;
  status: InsightaPipelineStatus;
  notes: string | null;
  next_action_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SavePipelineInput {
  entityType: InsightaEntityType;
  entityId: string;
  entityLabel: string;
  entityRoute: string;
}

interface UpdatePipelineInput {
  id: string;
  entityId: string;
  entityType: InsightaEntityType;
  entityRoute: string;
  status?: InsightaPipelineStatus;
  notes?: string | null;
  nextActionAt?: string | null;
}

const profilePlan = (metadata: Record<string, unknown> | undefined) =>
  typeof metadata?.subscription_tier === 'string' ? metadata.subscription_tier : 'unknown';

const daysSinceSignup = (createdAt?: string) => {
  const created = createdAt ? new Date(createdAt).getTime() : Number.NaN;
  return Number.isNaN(created) ? 0 : Math.max(0, Math.floor((Date.now() - created) / 86_400_000));
};

export function useInsightaPipeline() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['insighta-pipeline', user?.id];
  const plan = profilePlan(user?.user_metadata);
  const signupDays = daysSinceSignup(user?.created_at);

  const query = useQuery({
    queryKey,
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('insighta_pipeline_items')
        .select('*')
        .eq('user_id', user!.id)
        .order('next_action_at', { ascending: true, nullsFirst: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as InsightaPipelineItem[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (input: SavePipelineInput) => {
      if (!user) throw new Error('Sign in to save research.');
      const { data, error } = await (supabase as any)
        .from('insighta_pipeline_items')
        .upsert({
          user_id: user.id,
          entity_type: input.entityType,
          entity_id: input.entityId,
          entity_label: input.entityLabel,
          entity_route: input.entityRoute,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,entity_type,entity_id' })
        .select('*')
        .single();
      if (error) throw error;
      return data as InsightaPipelineItem;
    },
    onSuccess: (item) => {
      void queryClient.invalidateQueries({ queryKey });
      recordMeaningfulAction({
        actionType: 'research_saved',
        section: 'insighta',
        plan,
        daysSinceSignup: signupDays,
        entityType: item.entity_type,
        entityId: item.entity_id,
      });
      toast.success(`${item.entity_label} added to your research pipeline.`);
    },
    onError: (error: Error) => toast.error(error.message || 'Could not save this research item.'),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdatePipelineInput) => {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.status !== undefined) patch.status = input.status;
      if (input.notes !== undefined) patch.notes = input.notes;
      if (input.nextActionAt !== undefined) patch.next_action_at = input.nextActionAt;
      const { data, error } = await (supabase as any)
        .from('insighta_pipeline_items')
        .update(patch)
        .eq('id', input.id)
        .eq('user_id', user!.id)
        .select('*')
        .single();
      if (error) throw error;

      if (input.nextActionAt) {
        await scheduleReturnCue({
          sourceSection: 'insighta',
          entityType: input.entityType,
          entityId: input.entityId,
          reasonKey: 'investor_follow_up_due',
          scheduledFor: input.nextActionAt,
          ctaUrl: input.entityRoute,
          dedupeKey: `insighta:${input.entityType}:${input.entityId}:follow_up`,
          plan,
          daysSinceSignup: signupDays,
        });
      }
      return data as InsightaPipelineItem;
    },
    onSuccess: (item) => {
      void queryClient.invalidateQueries({ queryKey });
      recordMeaningfulAction({
        actionType: 'pipeline_updated',
        section: 'insighta',
        plan,
        daysSinceSignup: signupDays,
        entityType: item.entity_type,
        entityId: item.entity_id,
      });
      toast.success('Research pipeline updated.');
    },
    onError: (error: Error) => toast.error(error.message || 'Could not update this item.'),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('insighta_pipeline_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Removed from your pipeline.');
    },
    onError: () => toast.error('Could not remove this item.'),
  });

  const isSaved = (entityType: InsightaEntityType, entityId: string) =>
    Boolean(query.data?.some((item) => item.entity_type === entityType && item.entity_id === entityId));

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    isAuthenticated,
    isSaved,
    saveItem: saveMutation.mutateAsync,
    updateItem: updateMutation.mutateAsync,
    removeItem: removeMutation.mutateAsync,
    pending: saveMutation.isPending || updateMutation.isPending || removeMutation.isPending,
  };
}
