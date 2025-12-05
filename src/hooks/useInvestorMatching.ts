import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MatchRequest, MatchResults, Investor } from '@/types/investor';

export const useInvestorMatching = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MatchResults | null>(null);

  const findMatches = useCallback(async (matchRequest: MatchRequest): Promise<MatchResults | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('investor-matching', {
        body: matchRequest
      });

      if (invokeError) {
        // Handle credit errors specifically
        if (invokeError.status === 402 || (invokeError.message && invokeError.message.includes('credits'))) {
          const errorMsg = 'Insufficient credits. Please purchase credits to use this feature.';
          setError(errorMsg);
          throw new Error(errorMsg);
        }
        throw invokeError;
      }

      if (data?.error) {
        if (data.error.includes('credits') || data.required) {
          const errorMsg = 'Insufficient credits';
          setError(errorMsg);
          throw new Error(errorMsg);
        }
        throw new Error(data.error);
      }

      const matchResults: MatchResults = data as MatchResults;
      setResults(matchResults);
      return matchResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find investor matches. Please try again.';
      setError(errorMessage);
      console.error('Error finding matches:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveMatch = useCallback(async (matchData: MatchResults): Promise<boolean> => {
    try {
      // Matches are already saved by the edge function
      // This could be used for future enhancements like bookmarking specific matches
      return true;
    } catch (err) {
      console.error('Error saving match:', err);
      return false;
    }
  }, []);

  const getSavedMatches = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('investor_matches' as any)
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      console.error('Error fetching saved matches:', err);
      return [];
    }
  }, []);

  const getInvestorProfile = useCallback(async (investorId: string): Promise<Investor | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('investors' as any)
        .select('*')
        .eq('id', investorId)
        .eq('is_active', true)
        .single();

      if (fetchError) throw fetchError;
      return data as unknown as Investor;
    } catch (err) {
      console.error('Error fetching investor profile:', err);
      return null;
    }
  }, []);

  return {
    loading,
    error,
    results,
    findMatches,
    saveMatch,
    getSavedMatches,
    getInvestorProfile,
    clearResults: () => {
      setResults(null);
      setError(null);
    }
  };
};
