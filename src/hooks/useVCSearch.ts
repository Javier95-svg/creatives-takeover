import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Investor } from '@/types/investor';
import { VCFilters } from '@/types/insighta';

export const useVCSearch = (filters?: VCFilters) => {
  const [vcs, setVcs] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVCs = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query for VCs only
        let query = supabase
          .from('investors')
          .select('id, slug, name, firm_name, logo_url, investment_stages, investment_thesis, industries, typical_check_size_min, typical_check_size_max, geographic_focus')
          .eq('investor_type', 'vc')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });

        // Apply server-side filters
        if (filters?.investment_stage) {
          query = query.contains('investment_stages', [filters.investment_stage]);
        }

        if (filters?.industry) {
          query = query.contains('industries', [filters.industry]);
        }

        if (filters?.geographic_focus) {
          query = query.contains('geographic_focus', [filters.geographic_focus]);
        }

        if (filters?.check_size_min) {
          query = query.gte('typical_check_size_min', filters.check_size_min);
        }

        if (filters?.check_size_max) {
          query = query.lte('typical_check_size_max', filters.check_size_max);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        let results = (data || []) as Investor[];

        // Client-side search filter (searches name, firm, thesis)
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          results = results.filter((vc) =>
            vc.name.toLowerCase().includes(searchLower) ||
            vc.firm_name.toLowerCase().includes(searchLower) ||
            (vc.investment_thesis?.toLowerCase().includes(searchLower) || false)
          );
        }

        setVcs(results);
      } catch (err: any) {
        console.error('Error fetching VCs:', err);
        setError(err.message || 'Failed to load VCs. Please try again.');
        setVcs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVCs();
  }, [filters?.investment_stage, filters?.industry, filters?.geographic_focus, filters?.check_size_min, filters?.check_size_max, filters?.search]);

  return { vcs, loading, error };
};
