import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OutreachCampaign {
  id: string;
  user_id: string;
  session_id: string | null;
  name: string;
  description: string | null;
  channel: 'email' | 'linkedin' | 'whatsapp' | 'sms' | 'twitter' | 'other';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  budget: number;
  target_contacts: number;
  created_at: string;
  updated_at: string;
}

export interface OutreachActivity {
  id: string;
  campaign_id: string;
  user_id: string;
  activity_type: 'sent' | 'opened' | 'replied' | 'clicked' | 'converted' | 'bounced' | 'unsubscribed';
  contact_name: string | null;
  contact_info: string;
  contact_title: string | null;
  contact_company: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'replied' | 'converted' | 'failed';
  response_text: string | null;
  response_date: string | null;
  notes: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface OutreachMetrics {
  id: string;
  campaign_id: string;
  user_id: string;
  metric_date: string;
  sent_count: number;
  opened_count: number;
  replied_count: number;
  clicked_count: number;
  converted_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignMetrics {
  total_sent: number;
  total_opened: number;
  total_replied: number;
  total_converted: number;
  open_rate: number;
  reply_rate: number;
  conversion_rate: number;
}

export const useOutreachCampaigns = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['outreach-campaigns', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('outreach_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OutreachCampaign[];
    },
    enabled: !!user,
  });

  // Fetch activities for a campaign
  const getCampaignActivities = (campaignId: string) => {
    return useQuery({
      queryKey: ['outreach-activities', campaignId],
      queryFn: async () => {
        if (!user) return [];
        
        const { data, error } = await supabase
          .from('outreach_activities')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as OutreachActivity[];
      },
      enabled: !!user && !!campaignId,
    });
  };

  // Fetch metrics for a campaign
  const getCampaignMetrics = (campaignId: string) => {
    return useQuery({
      queryKey: ['outreach-metrics', campaignId],
      queryFn: async () => {
        if (!user) return null;
        
        const { data, error } = await supabase.rpc('get_campaign_metrics', {
          p_campaign_id: campaignId,
        });

        if (error) throw error;
        return data?.[0] as CampaignMetrics | null;
      },
      enabled: !!user && !!campaignId,
    });
  };

  // Create campaign
  const createCampaign = useMutation({
    mutationFn: async (campaignData: Omit<OutreachCampaign, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('outreach_campaigns')
        .insert({
          user_id: user.id,
          ...campaignData,
        })
        .select()
        .single();

      if (error) throw error;
      return data as OutreachCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-campaigns'] });
      toast.success('Campaign created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create campaign');
      console.error('Error creating campaign:', error);
    },
  });

  // Update campaign
  const updateCampaign = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<OutreachCampaign> }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('outreach_campaigns')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-campaigns'] });
      toast.success('Campaign updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update campaign');
      console.error('Error updating campaign:', error);
    },
  });

  // Add activity
  const addActivity = useMutation({
    mutationFn: async (activityData: Omit<OutreachActivity, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('outreach_activities')
        .insert({
          user_id: user.id,
          ...activityData,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['outreach-activities', variables.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ['outreach-metrics', variables.campaign_id] });
      toast.success('Activity recorded');
    },
    onError: (error) => {
      toast.error('Failed to record activity');
      console.error('Error recording activity:', error);
    },
  });

  // Update activity
  const updateActivity = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<OutreachActivity> }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: activity } = await supabase
        .from('outreach_activities')
        .select('campaign_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('outreach_activities')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return activity?.campaign_id;
    },
    onSuccess: (campaignId) => {
      if (campaignId) {
        queryClient.invalidateQueries({ queryKey: ['outreach-activities', campaignId] });
        queryClient.invalidateQueries({ queryKey: ['outreach-metrics', campaignId] });
      }
      toast.success('Activity updated');
    },
    onError: (error) => {
      toast.error('Failed to update activity');
      console.error('Error updating activity:', error);
    },
  });

  // Generate outreach template from BizMap
  const generateTemplate = useMutation({
    mutationFn: async (params: {
      business_idea: string;
      channel: string;
      session_id?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('bizmap-assets', {
        body: {
          type: 'outreach',
          session_id: params.session_id,
          business_idea: params.business_idea,
          channel: params.channel,
        },
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      toast.error('Failed to generate template');
      console.error('Error generating template:', error);
    },
  });

  return {
    campaigns,
    isLoading: campaignsLoading,
    getCampaignActivities,
    getCampaignMetrics,
    createCampaign: createCampaign.mutate,
    updateCampaign: updateCampaign.mutate,
    addActivity: addActivity.mutate,
    updateActivity: updateActivity.mutate,
    generateTemplate: generateTemplate.mutate,
    isGeneratingTemplate: generateTemplate.isPending,
  };
};

