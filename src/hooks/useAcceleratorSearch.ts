import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FundingOpportunity } from '@/types/funding';
import { AcceleratorFilters } from '@/types/insighta';

export const useAcceleratorSearch = (
  filters?: AcceleratorFilters,
  page = 1,
  pageSize = 15,
) => {
  const [accelerators, setAccelerators] = useState<FundingOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchAccelerators = async () => {
      try {
        setLoading(true);
        setError(null);
        const from = (page - 1) * pageSize;
        const to = from + pageSize;

        const { data, error: fetchError } = await supabase
          .from('funding_opportunities')
          .select('*')
          .eq('type', 'accelerator')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('title', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        const selectedStages = filters?.focus_stage || [];
        const selectedSectors = filters?.sectors?.length
          ? filters.sectors
          : filters?.industry_focus
            ? [filters.industry_focus]
            : [];
        const selectedGeographies = filters?.geographies?.length
          ? filters.geographies
          : filters?.location
            ? [filters.location]
            : [];
        const selectedFormats = filters?.formats || [];
        const selectedEquity = filters?.equity || [];

        const normalizeArray = (value: unknown): string[] =>
          Array.isArray(value)
            ? value.filter((item): item is string => typeof item === 'string')
            : [];

        let results = ((data || []) as FundingOpportunity[]).map((accelerator) => ({
          ...accelerator,
          keywords: normalizeArray(accelerator.keywords),
          location: normalizeArray(accelerator.location),
          focus_stage: normalizeArray(accelerator.focus_stage),
          focus_sectors: normalizeArray(accelerator.focus_sectors),
          cohort_geography: normalizeArray(accelerator.cohort_geography),
          notable_alumni: normalizeArray(accelerator.notable_alumni),
        }));

        if (selectedGeographies.length > 0) {
          results = results.filter((acc) =>
            selectedGeographies.some((region) =>
              acc.cohort_geography?.includes(region) || acc.location.includes(region)
            )
          );
        }

        if (selectedSectors.length > 0) {
          results = results.filter((acc) =>
            selectedSectors.some((sector) =>
              acc.focus_sectors?.some((item) => item.toLowerCase() === sector.toLowerCase()) ||
              acc.keywords.some((item) => item.toLowerCase().includes(sector.toLowerCase()))
            )
          );
        }

        if (selectedStages.length > 0) {
          results = results.filter((acc) =>
            selectedStages.some((stage) =>
              acc.focus_stage?.some((item) => item.toLowerCase() === stage.toLowerCase())
            )
          );
        }

        if (selectedFormats.length > 0) {
          results = results.filter((acc) =>
            selectedFormats.some((format) =>
              acc.program_format?.toLowerCase() === format.toLowerCase()
            )
          );
        }

        if (selectedEquity.length > 0) {
          results = results.filter((acc) =>
            selectedEquity.some((equity) =>
              (acc.equity_taken || '').toLowerCase().includes(equity.toLowerCase())
            )
          );
        }

        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          results = results.filter((acc) =>
            acc.title.toLowerCase().includes(searchLower) ||
            acc.description.toLowerCase().includes(searchLower) ||
            acc.keywords.some((item) => item.toLowerCase().includes(searchLower)) ||
            acc.focus_sectors?.some((item) => item.toLowerCase().includes(searchLower)) ||
            acc.notable_alumni?.some((item) => item.toLowerCase().includes(searchLower))
          );
        }

        setTotal(results.length);
        setAccelerators(results.slice(from, to));
      } catch (err: unknown) {
        console.error('Error fetching accelerators:', err);
        setError(err instanceof Error ? err.message : 'Failed to load accelerators. Please try again.');
        setAccelerators([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    void fetchAccelerators();
  }, [
    filters,
    page,
    pageSize,
  ]);

  return { accelerators, loading, error, total };
};
