import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type MemoryType = 'decision' | 'win' | 'challenge' | 'insight' | 'goal' | 'pivot';
export type UserMood = 'excited' | 'frustrated' | 'overwhelmed' | 'confident' | 'neutral';
export type AITone = 'cheerleader' | 'strategic' | 'empathetic' | 'balanced';
export type BusinessStage = 'ideation' | 'validation' | 'launch' | 'growth';

export interface ConversationMemory {
  id: string;
  user_id: string;
  session_id?: string;
  memory_type: MemoryType;
  importance_score: number;
  title: string;
  content: string;
  tags: string[];
  business_stage?: BusinessStage;
  related_memories?: string[];
  created_at: string;
  last_referenced_at: string;
  reference_count: number;
  user_mood?: UserMood;
  ai_response_tone?: AITone;
}

export interface CreateMemoryInput {
  session_id?: string;
  memory_type: MemoryType;
  title: string;
  content: string;
  importance_score?: number;
  tags?: string[];
  business_stage?: BusinessStage;
  user_mood?: UserMood;
  ai_response_tone?: AITone;
}

export const useConversationMemory = () => {
  const [memories, setMemories] = useState<ConversationMemory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Create a new memory
  const createMemory = async (input: CreateMemoryInput) => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('conversation_memory')
        .insert({
          user_id: user.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;

      setMemories(prev => [data as ConversationMemory, ...prev]);
      return data as ConversationMemory;
    } catch (error: any) {
      console.error('Error creating memory:', error);
      toast({
        title: 'Failed to save memory',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Get recent memories (most recent first)
  const getRecentMemories = async (limit: number = 10) => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setMemories(data as ConversationMemory[]);
      return data as ConversationMemory[];
    } catch (error: any) {
      console.error('Error fetching memories:', error);
      toast({
        title: 'Failed to load memories',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Get important memories (importance score > 0.7)
  const getImportantMemories = async (limit: number = 5) => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('user_id', user.id)
        .gt('importance_score', 0.7)
        .order('importance_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data as ConversationMemory[];
    } catch (error: any) {
      console.error('Error fetching important memories:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Get memories by type
  const getMemoriesByType = async (type: MemoryType, limit: number = 10) => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('user_id', user.id)
        .eq('memory_type', type)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data as ConversationMemory[];
    } catch (error: any) {
      console.error('Error fetching memories by type:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Get memories for a session
  const getSessionMemories = async (sessionId: string) => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as ConversationMemory[];
    } catch (error: any) {
      console.error('Error fetching session memories:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Update memory
  const updateMemory = async (id: string, updates: Partial<CreateMemoryInput>) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('conversation_memory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setMemories(prev => 
        prev.map(m => m.id === id ? data as ConversationMemory : m)
      );

      toast({
        title: 'Memory updated',
        description: 'Your memory has been updated successfully.',
      });

      return data as ConversationMemory;
    } catch (error: any) {
      console.error('Error updating memory:', error);
      toast({
        title: 'Failed to update memory',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete memory
  const deleteMemory = async (id: string) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('conversation_memory')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMemories(prev => prev.filter(m => m.id !== id));

      toast({
        title: 'Memory deleted',
        description: 'Your memory has been deleted successfully.',
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting memory:', error);
      toast({
        title: 'Failed to delete memory',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Get memory statistics
  const getMemoryStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('conversation_memory')
        .select('memory_type, importance_score')
        .eq('user_id', user.id);

      if (error) throw error;

      const stats = {
        total: data.length,
        byType: data.reduce((acc, m) => {
          acc[m.memory_type] = (acc[m.memory_type] || 0) + 1;
          return acc;
        }, {} as Record<MemoryType, number>),
        avgImportance: data.reduce((sum, m) => sum + m.importance_score, 0) / data.length || 0,
      };

      return stats;
    } catch (error: any) {
      console.error('Error fetching memory stats:', error);
      return null;
    }
  };

  return {
    memories,
    isLoading,
    createMemory,
    getRecentMemories,
    getImportantMemories,
    getMemoriesByType,
    getSessionMemories,
    updateMemory,
    deleteMemory,
    getMemoryStats,
  };
};
