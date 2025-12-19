import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

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
  
  // Cache to prevent unnecessary refetches
  const dataCacheRef = useRef<{ data: DashboardData | null; timestamp: number }>({ data: null, timestamp: 0 });
  const isLoadingRef = useRef(false);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    if (user) {
      // Only load if cache is stale or doesn't exist
      const now = Date.now();
      const cacheAge = now - dataCacheRef.current.timestamp;
      
      if (dataCacheRef.current.data && cacheAge < CACHE_DURATION && !isLoadingRef.current) {
        // Use cached data
        setData(dataCacheRef.current.data);
        setLoading(false);
        return;
      }
      
      // Prevent multiple simultaneous loads
      if (!isLoadingRef.current) {
        loadDashboardData();
      }
    } else {
      setLoading(false);
    }
  }, [user]);
  
  // Handle visibility change - only refresh if data is stale
  useEffect(() => {
    if (!user) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const cacheAge = now - dataCacheRef.current.timestamp;
        
        // Only refresh if cache is older than 5 minutes
        if (cacheAge > CACHE_DURATION && !isLoadingRef.current) {
          loadDashboardData();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const loadDashboardData = async () => {
    if (!user || isLoadingRef.current) return;

    try {
      isLoadingRef.current = true;
      setLoading(true);

      // Execute all independent queries in parallel for better performance
      const [
        { data: profile },
        { data: recommendations },
        { data: widgets },
        { count: activeSprints },
        { count: completedSessions },
        { count: totalCheckIns },
        { data: checkIns }
      ] = await Promise.all([
        // Load profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        // Load recommendations
        supabase
          .from('personalized_recommendations')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_dismissed', false)
          .gte('expires_at', new Date().toISOString())
          .order('priority', { ascending: false })
          .limit(5),
        // Load widgets
        supabase
          .from('dashboard_widgets')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_visible', true)
          .order('position'),
        // Load real stats - active sprints count
        supabase
          .from('sprints')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'active'),
        // Load real stats - completed sessions count
        supabase
          .from('chat_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_completed', true),
        // Load real stats - total check-ins count
        supabase
          .from('daily_check_ins')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        // Calculate current streak - get check-ins for streak calculation
        supabase
          .from('daily_check_ins')
          .select('check_in_date')
          .eq('user_id', user.id)
          .order('check_in_date', { ascending: false })
          .limit(100)
      ]);

      let currentStreak = 0;
      if (checkIns && checkIns.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < checkIns.length; i++) {
          const checkInDate = new Date(checkIns[i].check_in_date);
          checkInDate.setHours(0, 0, 0, 0);
          
          const expectedDate = new Date(today);
          expectedDate.setDate(today.getDate() - i);
          expectedDate.setHours(0, 0, 0, 0);
          
          if (checkInDate.getTime() === expectedDate.getTime()) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      const newData = {
        profile: profile as UserProfile,
        recommendations: (recommendations || []) as PersonalizedRecommendation[],
        widgets: (widgets || []) as DashboardWidget[],
        stats: {
          activeSprints: activeSprints ?? 0,
          completedSessions: completedSessions ?? 0,
          currentStreak,
          totalCheckIns: totalCheckIns ?? 0
        }
      };
      
      setData(newData);
      
      // Update cache
      dataCacheRef.current = {
        data: newData,
        timestamp: Date.now()
      };

      // Generate recommendations if none exist
      if (!recommendations || recommendations.length === 0) {
        await generateRecommendations();
      }
    } catch (error) {
      logError('Error loading dashboard data', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
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
