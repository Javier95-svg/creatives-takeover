import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationMemory } from './useConversationMemory';

export interface BizMapInsight {
  id: string;
  title: string;
  content: string;
  type: 'recommendation' | 'insight' | 'challenge' | 'goal' | 'win';
  importance: number;
  createdAt: string;
  tags: string[];
  businessStage?: string;
}

export interface BizMapRecommendation extends BizMapInsight {
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  suggestedAction?: string;
}

export const useBizMapInsights = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<BizMapInsight[]>([]);
  const [recommendations, setRecommendations] = useState<BizMapRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBizMapInsights();
    }
  }, [user]);

  const loadBizMapInsights = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch recent conversation memories with high importance
      const { data: memories, error } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('user_id', user.id)
        .gte('importance_score', 3)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform memories into insights
      const transformedInsights: BizMapInsight[] = (memories || []).map((mem: any) => ({
        id: mem.id,
        title: mem.title,
        content: mem.content,
        type: mem.memory_type,
        importance: mem.importance_score,
        createdAt: mem.created_at,
        tags: mem.tags || [],
        businessStage: mem.business_stage
      }));

      setInsights(transformedInsights);

      // Extract actionable recommendations
      const actionableRecs: BizMapRecommendation[] = transformedInsights
        .filter(insight => 
          insight.type === 'insight' || 
          insight.type === 'goal' || 
          insight.type === 'challenge'
        )
        .map(insight => {
          // Determine priority based on importance and type
          let priority: 'low' | 'medium' | 'high' = 'medium';
          if (insight.importance >= 4) priority = 'high';
          else if (insight.importance <= 2) priority = 'low';

          // Extract actionable items from content
          const actionMatch = insight.content.match(/(?:should|need to|must|recommend|try to)\s+([^.!?]+)/i);
          const suggestedAction = actionMatch ? actionMatch[1].trim() : undefined;

          return {
            ...insight,
            actionable: !!suggestedAction,
            priority,
            suggestedAction
          };
        })
        .filter(rec => rec.actionable)
        .slice(0, 3);

      setRecommendations(actionableRecs);
    } catch (error) {
      console.error('Error loading BizMap insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertToPriority = async (recommendation: BizMapRecommendation) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get current count to set priority order
      const { count } = await supabase
        .from('daily_priorities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('priority_date', today);

      const priorityData = {
        user_id: user.id,
        priority_text: recommendation.suggestedAction || recommendation.title,
        priority_date: today,
        priority_order: (count || 0) + 1,
        is_completed: false
      };

      const { error } = await supabase
        .from('daily_priorities')
        .insert(priorityData);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error converting to priority:', error);
      return false;
    }
  };

  return {
    insights,
    recommendations,
    loading,
    convertToPriority,
    refresh: loadBizMapInsights
  };
};
