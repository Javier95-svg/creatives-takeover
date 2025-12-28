import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FundingOpportunity } from '@/types/funding';
import { AcceleratorFilters } from '@/types/insighta';

export const useAcceleratorSearch = (filters?: AcceleratorFilters) => {
  const [accelerators, setAccelerators] = useState<FundingOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccelerators = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query for accelerators only
        let query = supabase
          .from('funding_opportunities')
          .select('*')
          .eq('type', 'accelerator')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        let results = (data || []) as FundingOpportunity[];

        // Client-side location filter
        if (filters?.location) {
          results = results.filter((acc) =>
            acc.location.includes(filters.location!)
          );
        }

        // Client-side industry/keywords filter
        if (filters?.industry_focus) {
          results = results.filter((acc) =>
            acc.keywords.some(k => k.toLowerCase().includes(filters.industry_focus!.toLowerCase()))
          );
        }

        // Client-side search filter
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          results = results.filter((acc) =>
            acc.title.toLowerCase().includes(searchLower) ||
            acc.description.toLowerCase().includes(searchLower) ||
            acc.keywords.some(k => k.toLowerCase().includes(searchLower))
          );
        }

        setAccelerators(results);
      } catch (err: any) {
        console.error('Error fetching accelerators:', err);
        setError(err.message || 'Failed to load accelerators. Please try again.');
        setAccelerators([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAccelerators();
  }, [filters?.location, filters?.industry_focus, filters?.search]);

  return { accelerators, loading, error };
};
