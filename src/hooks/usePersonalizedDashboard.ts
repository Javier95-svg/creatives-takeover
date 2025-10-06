import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PersonalizedRecommendation {
  id: string;
  recommendation_type: string;
  title: string;
  description: string;
  priority: number;
  reason: string;
  action_url: string;
  metadata: any;
  is_dismissed: boolean;
  is_completed: boolean;
  created_at: string;
  expires_at: string;
}

export interface DashboardWidget {
  id: string;
  widget_type: string;
  position: number;
  is_visible: boolean;
  widget_settings: any;
}

export interface UserProfile {
  id: string;
  full_name: string;
  creative_niche?: string;
  business_stage?: string;
  onboarding_completed?: boolean;
  preferred_dashboard_view?: string;
  user_preferences?: any;
}

export interface DashboardData {
  profile: UserProfile | null;
  recommendations: PersonalizedRecommendation[];
  widgets: DashboardWidget[];
  stats: {
    activeSprints: number;
    completedSessions: number;
    currentStreak: number;
    totalCheckIns: number;
  };
}

export const usePersonalizedDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    profile: null,
    recommendations: [],
    widgets: [],
    stats: {
      activeSprints: 0,
      completedSessions: 0,
      currentStreak: 0,
      totalCheckIns: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Load recommendations
      const { data: recommendations } = await supabase
        .from('personalized_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .gte('expires_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .limit(5);

      // Load widgets
      const { data: widgets } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_visible', true)
        .order('position');

      // TODO: Implement proper stats loading (Supabase types causing issues)
      // For now, using placeholder stats
      const activeSprints = 0;
      const completedSessions = 0;
      const totalCheckIns = 0;

      setData({
        profile: profile as UserProfile,
        recommendations: (recommendations || []) as PersonalizedRecommendation[],
        widgets: (widgets || []) as DashboardWidget[],
        stats: {
          activeSprints: activeSprints ?? 0,
          completedSessions: completedSessions ?? 0,
          currentStreak: 0, // TODO: Calculate streak
          totalCheckIns: totalCheckIns ?? 0
        }
      });

      // Generate recommendations if none exist
      if (!recommendations || recommendations.length === 0) {
        await generateRecommendations();
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('generate-recommendations', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      // Reload recommendations
      const { data: newRecs } = await supabase
        .from('personalized_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .gte('expires_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .limit(5);

      setData(prev => ({
        ...prev,
        recommendations: (newRecs || []) as PersonalizedRecommendation[]
      }));
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
  };

  const dismissRecommendation = async (recommendationId: string) => {
    try {
      await supabase
        .from('personalized_recommendations')
        .update({ is_dismissed: true })
        .eq('id', recommendationId);

      setData(prev => ({
        ...prev,
        recommendations: prev.recommendations.filter(r => r.id !== recommendationId)
      }));

      toast.success('Recommendation dismissed');
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
      toast.error('Failed to dismiss recommendation');
    }
  };

  const completeRecommendation = async (recommendationId: string) => {
    try {
      await supabase
        .from('personalized_recommendations')
        .update({ is_completed: true })
        .eq('id', recommendationId);

      setData(prev => ({
        ...prev,
        recommendations: prev.recommendations.filter(r => r.id !== recommendationId)
      }));

      toast.success('Nice work! 🎉');
    } catch (error) {
      console.error('Error completing recommendation:', error);
      toast.error('Failed to mark as complete');
    }
  };

  const trackActivity = async (activityType: string, activityData?: any) => {
    if (!user) return;

    try {
      await supabase.functions.invoke('track-activity', {
        body: {
          user_id: user.id,
          activity_type: activityType,
          activity_data: activityData || {},
          page_path: window.location.pathname
        }
      });
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  const updateWidget = async (widgetId: string, updates: Partial<DashboardWidget>) => {
    try {
      await supabase
        .from('dashboard_widgets')
        .update(updates)
        .eq('id', widgetId);

      setData(prev => ({
        ...prev,
        widgets: prev.widgets.map(w => 
          w.id === widgetId ? { ...w, ...updates } : w
        )
      }));
    } catch (error) {
      console.error('Error updating widget:', error);
      toast.error('Failed to update widget');
    }
  };

  return {
    data,
    loading,
    dismissRecommendation,
    completeRecommendation,
    trackActivity,
    updateWidget,
    refreshDashboard: loadDashboardData
  };
};
