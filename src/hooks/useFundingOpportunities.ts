import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FundingOpportunity, FundingFilters } from '@/types/funding';
import { fundingPrograms, FundingProgram } from '@/data/fundingPrograms';

type RawOpportunity = Record<string, any>;

const normalizeSteps = (steps: any[] | undefined, prefix: string) => {
  if (!Array.isArray(steps) || steps.length === 0) {
    return [];
  }

  return steps.map((step, index) => ({
    id: step?.id ?? `${prefix}-step-${index + 1}`,
    title: step?.title ?? `Step ${index + 1}`,
    description: step?.description ?? 'Provide additional details for this step.',
    example: step?.example ?? undefined,
    resourceLabel: step?.resourceLabel ?? step?.resource_label ?? undefined,
    resourceUrl: step?.resourceUrl ?? step?.resource_url ?? undefined
  }));
};

const normalizeKeyDates = (dates: any): FundingOpportunity['key_dates'] => ({
  application_open:
    dates?.application_open ?? dates?.applicationOpen ?? dates?.open ?? undefined,
  application_close:
    dates?.application_close ?? dates?.applicationClose ?? dates?.close ?? undefined,
  decision_date:
    dates?.decision_date ?? dates?.decisionDate ?? dates?.decision ?? undefined
});

const normalizeOpportunity = (raw: RawOpportunity): FundingOpportunity => ({
  id: raw.id,
  title: raw.title,
  description: raw.description,
  url: raw.url,
  type: raw.type,
  funding_amount: raw.funding_amount ?? raw.fundingRange ?? null,
  location: Array.isArray(raw.location) ? raw.location : [],
  keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
  is_featured: Boolean(raw.is_featured ?? raw.opportunityScore >= 88),
  is_active: raw.is_active ?? true,
  created_at: raw.created_at ?? new Date().toISOString(),
  updated_at: raw.updated_at ?? new Date().toISOString(),
  eligibility: Array.isArray(raw.eligibility) ? raw.eligibility : [],
  funding_types: Array.isArray(raw.funding_types)
    ? raw.funding_types
    : Array.isArray(raw.fundingTypes)
      ? raw.fundingTypes
      : [],
  key_dates: normalizeKeyDates(raw.key_dates ?? raw.keyDates ?? {}),
  application_steps: normalizeSteps(raw.application_steps ?? raw.applicationSteps, raw.id),
  tips: {
    mistakes: raw.tips?.mistakes ?? [],
    winning: raw.tips?.winning ?? []
  },
  community_questions: raw.community_questions ?? raw.communityQuestions ?? []
});

// Convert hardcoded funding programs to FundingOpportunity format
const convertFundingProgramToOpportunity = (program: FundingProgram): FundingOpportunity =>
  normalizeOpportunity({
    ...program,
    funding_amount: program.fundingRange || null,
    funding_types: program.fundingTypes,
    key_dates: {
      application_open: program.keyDates.applicationOpen,
      application_close: program.keyDates.applicationClose,
      decision_date: program.keyDates.decisionDate
    },
    application_steps: program.applicationSteps,
    tips: program.tips,
    community_questions: program.communityQuestions ?? []
  });

export const useFundingOpportunities = (filters?: FundingFilters) => {
  const [opportunities, setOpportunities] = useState<FundingOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useDatabase, setUseDatabase] = useState(true);

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to fetch from database first
        if (useDatabase) {
          try {
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

            // If table doesn't exist or error, fall back to hardcoded data
            if (fetchError) {
              // Check if it's a table doesn't exist error (code 42P01) or relation doesn't exist
              if (
                fetchError.code === '42P01' ||
                fetchError.message.includes('does not exist') ||
                fetchError.message.includes('relation')
              ) {
                console.info(
                  'Funding opportunities table not found, using hardcoded data. Run migrations to use database.'
                );
              } else {
                console.warn('Database error, using hardcoded data:', fetchError.message);
              }
              setUseDatabase(false);
              throw fetchError; // Will be caught below to use fallback
            }

            // If we got data (even if empty array), use it
            if (data !== null) {
              const normalizedResults = (data as RawOpportunity[]).map((item) =>
                normalizeOpportunity(item)
              );

              let results = normalizedResults;

              // Client-side location filter
              if (filters?.location) {
                results = results.filter((opp) =>
                  opp.location.includes(filters.location!)
                );
              }

              // Client-side search
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
              setLoading(false);
              return; // Success - database has data (or empty array)
            }
          } catch (dbError) {
            // Database not available, fall through to hardcoded data
            console.warn('Using hardcoded funding data as fallback');
            setUseDatabase(false);
          }
        }

        // Fallback to hardcoded data
        let results = fundingPrograms.map(convertFundingProgramToOpportunity);

        // Apply filters to hardcoded data
        if (filters?.type) {
          results = results.filter((opp) => opp.type === filters.type);
        }

        if (filters?.location) {
          results = results.filter((opp) =>
            opp.location.includes(filters.location!)
          );
        }

        if (filters?.featured) {
          results = results.filter((opp) => opp.is_featured);
        }

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
        // Even on error, try to use hardcoded data
        const fallbackData = fundingPrograms.map(convertFundingProgramToOpportunity);
        setOpportunities(fallbackData);
        setError(null); // Don't show error if we have fallback data
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunities();
  }, [filters, useDatabase]);

  return { opportunities, loading, error };
};

