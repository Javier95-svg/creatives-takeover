import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Investor } from '@/types/investor';
import { VCFilters } from '@/types/insighta';

export const useVCSearch = (filters?: VCFilters, page = 1, pageSize = 15) => {
  const [vcs, setVcs] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchVCs = async () => {
      try {
        setLoading(true);
        setError(null);

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Build query for VCs only
        let query = supabase
          .from('investors')
          .select('id, slug, name, firm_name, firm_website, logo_url, investment_stages, investment_thesis, industries, typical_check_size_min, typical_check_size_max, geographic_focus', { count: 'exact' })
          .eq('investor_type', 'vc')
          .eq('is_active', true)
          .order('firm_name', { ascending: true })
          .order('name', { ascending: true });

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

        const trimmedSearch = filters?.search?.trim();
        if (trimmedSearch) {
          query = query.or(
            `name.ilike.%${trimmedSearch}%,firm_name.ilike.%${trimmedSearch}%,investment_thesis.ilike.%${trimmedSearch}%`
          );
        }

        const { data, error: fetchError, count } = await query.range(from, to);

        if (fetchError) {
          throw fetchError;
        }

        setVcs((data || []) as Investor[]);
        setTotal(count || 0);
      } catch (err: any) {
        console.error('Error fetching VCs:', err);
        setError(err.message || 'Failed to load VCs. Please try again.');
        setVcs([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchVCs();
  }, [filters?.investment_stage, filters?.industry, filters?.geographic_focus, filters?.check_size_min, filters?.check_size_max, filters?.search, page, pageSize]);

  return { vcs, loading, error, total };
};
