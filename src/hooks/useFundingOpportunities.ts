import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FundingOpportunity, FundingFilters } from '@/types/funding';

export const useFundingOpportunities = (filters?: FundingFilters) => {
  const [opportunities, setOpportunities] = useState<FundingOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('funding_opportunities')
          .select('*')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });

        // Simple type filter
        if (filters?.type) {
          query = query.eq('type', filters.type);
        }

        // Featured filter
        if (filters?.featured) {
          query = query.eq('is_featured', true);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        let results = data || [];

        // Client-side location filter (simpler and more reliable)
        if (filters?.location) {
          results = results.filter((opp) =>
            opp.location.includes(filters.location!)
          );
        }

        // Client-side search (simple and works well for small datasets)
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          results = results.filter(
            (opp) =>
              opp.title.toLowerCase().includes(searchLower) ||
              opp.description.toLowerCase().includes(searchLower) ||
              opp.keywords.some((k) => k.toLowerCase().includes(searchLower))
          );
        }

        setOpportunities(results);
      } catch (err) {
        console.error('Error fetching funding opportunities:', err);
        setError(err instanceof Error ? err.message : 'Failed to load opportunities');
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunities();
  }, [filters]);

  return { opportunities, loading, error };
};

