import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from './useCredits';
import { supabase } from '@/integrations/supabase/client';
import { MatchRequest, InvestorMatch, MatchResults } from '@/types/investor';
import { CREDIT_COSTS } from '@/config/constants';
import { toast } from 'sonner';

export const useInvestorMatching = () => {
  const { user } = useAuth();
  const { hasCredits, refreshBalance } = useCredits();
  const [matches, setMatches] = useState<InvestorMatch[]>([]);
  const [topMatches, setTopMatches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findMatches = useCallback(async (
    matchRequest: MatchRequest
  ): Promise<MatchResults | null> => {
    if (!user) {
      setError('Authentication required');
      toast.error('Please sign in to find investor matches');
      return null;
    }

    // Check credits before proceeding
    const requiredCredits = CREDIT_COSTS.INVESTOR_MATCHING;
    if (!hasCredits(requiredCredits)) {
      setError(`Insufficient credits. Investor matching requires ${requiredCredits} credits.`);
      toast.error(`Insufficient credits. Investor matching requires ${requiredCredits} credits.`);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('investor-matching', {
        body: matchRequest
      });

      if (functionError) {
        // Handle credit errors specifically
        if (functionError.status === 402 || (functionError.message && functionError.message.includes('credits'))) {
          const errorMsg = `Insufficient credits. Investor matching requires ${requiredCredits} credits.`;
          setError(errorMsg);
          toast.error(errorMsg);
          return null;
        }
        throw functionError;
      }

      if (data?.error) {
        if (data.error.includes('credits') || data.required) {
          const errorMsg = `Insufficient credits. Investor matching requires ${data.required || requiredCredits} credits.`;
          setError(errorMsg);
          toast.error(errorMsg);
          return null;
        }
        throw new Error(data.error);
      }

      // Update state with results
      const results: MatchResults = {
        matches: data.matches || [],
        top_matches: data.top_matches || [],
        match_request: data.match_request || matchRequest,
        generated_at: data.generated_at || new Date().toISOString(),
        credits_used: data.credits_used || requiredCredits
      };

      setMatches(results.matches);
      setTopMatches(results.top_matches);

      // Refresh credit balance
      if (data.new_balance !== undefined) {
        await refreshBalance();
      }

      toast.success(`Found ${results.matches.length} investor matches!`);
      return results;

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to find investor matches';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error finding investor matches:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, hasCredits, refreshBalance]);

  const getSavedMatches = useCallback(async (): Promise<MatchResults[]> => {
    if (!user) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('investor_matches')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform saved matches to MatchResults format
      return (data || []).map(match => ({
        matches: (match.matched_investors || []).map((mi: any) => ({
          investor: mi.investor || {},
          match_score: mi.match_score || 0,
          match_reasons: mi.match_reasons || [],
          match_breakdown: mi.match_breakdown || {
            stage_alignment: 0,
            industry_focus: 0,
            geographic_preference: 0,
            check_size_compatibility: 0,
            portfolio_similarity: 0
          }
        })),
        top_matches: match.top_matches || [],
        match_request: {
          industry: match.industry || '',
          funding_amount: match.funding_amount || 0,
          locations: match.locations || [],
          business_model: match.business_model,
          business_stage: match.business_stage as any,
          business_summary: match.business_summary
        },
        generated_at: match.created_at,
        credits_used: 0
      }));

    } catch (err: any) {
      console.error('Error fetching saved matches:', err);
      return [];
    }
  }, [user]);

  const clearMatches = useCallback(() => {
    setMatches([]);
    setTopMatches([]);
    setError(null);
  }, []);

  return {
    matches,
    topMatches,
    loading,
    error,
    findMatches,
    getSavedMatches,
    clearMatches
  };
};
