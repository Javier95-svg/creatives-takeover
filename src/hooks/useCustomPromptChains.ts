import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MultiStepPrompt } from '@/data/multiStepPrompts';
import { toast } from 'sonner';

export interface CustomPromptChain {
  id: string;
  user_id: string;
  concept_title: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  steps: {
    step: number;
    title: string;
    dayRange: string;
    prompt: string;
  }[];
  author_name: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export function useCustomPromptChains() {
  const { user } = useAuth();
  const [publishedChains, setPublishedChains] = useState<MultiStepPrompt[]>([]);
  const [userChains, setUserChains] = useState<CustomPromptChain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all published prompt chains
  const fetchPublishedChains = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('custom_prompt_chains')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Convert to MultiStepPrompt format
      const convertedChains: MultiStepPrompt[] = (data || []).map((chain) => ({
        id: chain.id,
        conceptTitle: chain.concept_title,
        category: chain.category,
        description: chain.description,
        tags: chain.tags || [],
        difficulty: chain.difficulty,
        requiredTier: 'free' as const, // Custom chains are free to use
        steps: chain.steps as MultiStepPrompt['steps'],
        author_name: chain.author_name,
        is_custom: true,
      }));

      setPublishedChains(convertedChains);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch published prompt chains');
      console.error('Error fetching published chains:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's own prompt chains (published and drafts)
  const fetchUserChains = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('custom_prompt_chains')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setUserChains((data || []) as CustomPromptChain[]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch your prompt chains');
      console.error('Error fetching user chains:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create a new prompt chain
  const createChain = async (chainData: Omit<CustomPromptChain, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      throw new Error('You must be logged in to create a prompt chain');
    }

    setLoading(true);
    setError(null);
    try {
      // Get user's full name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const authorName = profile?.full_name || 'Anonymous';

      // Validate that steps array has exactly 7 steps
      if (!chainData.steps || chainData.steps.length !== 7) {
        throw new Error('Prompt chain must have exactly 7 steps');
      }

      const { data, error: createError } = await supabase
        .from('custom_prompt_chains')
        .insert({
          user_id: user.id,
          concept_title: chainData.concept_title,
          description: chainData.description,
          category: chainData.category,
          tags: chainData.tags || [],
          difficulty: chainData.difficulty,
          steps: chainData.steps,
          author_name: authorName,
          published: chainData.published || false,
        })
        .select()
        .single();

      if (createError) throw createError;

      toast.success('Prompt chain saved successfully!');
      return data as CustomPromptChain;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create prompt chain';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing prompt chain
  const updateChain = async (chainId: string, updates: Partial<Omit<CustomPromptChain, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user) {
      throw new Error('You must be logged in to update a prompt chain');
    }

    setLoading(true);
    setError(null);
    try {
      // Validate steps if provided
      if (updates.steps && updates.steps.length !== 7) {
        throw new Error('Prompt chain must have exactly 7 steps');
      }

      const { data, error: updateError } = await supabase
        .from('custom_prompt_chains')
        .update(updates)
        .eq('id', chainId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      toast.success('Prompt chain updated successfully!');
      return data as CustomPromptChain;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update prompt chain';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Publish a prompt chain
  const publishChain = async (chainId: string) => {
    if (!user) {
      throw new Error('You must be logged in to publish a prompt chain');
    }

    setLoading(true);
    setError(null);
    try {
      // Get user's full name from profile (in case it changed)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const authorName = profile?.full_name || 'Anonymous';

      const { data, error: publishError } = await supabase
        .from('custom_prompt_chains')
        .update({
          published: true,
          author_name: authorName,
        })
        .eq('id', chainId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (publishError) throw publishError;

      toast.success('Prompt chain published successfully! It is now visible to all users.');
      return data as CustomPromptChain;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to publish prompt chain';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a prompt chain
  const deleteChain = async (chainId: string) => {
    if (!user) {
      throw new Error('You must be logged in to delete a prompt chain');
    }

    setLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('custom_prompt_chains')
        .delete()
        .eq('id', chainId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      toast.success('Prompt chain deleted successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete prompt chain';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    publishedChains,
    userChains,
    loading,
    error,
    fetchPublishedChains,
    fetchUserChains,
    createChain,
    updateChain,
    publishChain,
    deleteChain,
  };
}

