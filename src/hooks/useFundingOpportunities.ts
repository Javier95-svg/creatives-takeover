import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FundingOpportunity, FundingFilters } from '@/types/funding';
import { fundingPrograms, FundingProgram } from '@/data/fundingPrograms';

// Convert hardcoded funding programs to FundingOpportunity format
const convertFundingProgramToOpportunity = (program: FundingProgram): FundingOpportunity => ({
  id: program.id,
  title: program.title,
  description: program.description,
  url: program.url,
  type: program.type === 'investor_network' ? 'accelerator' : program.type as FundingOpportunity['type'],
  funding_amount: program.fundingRange || null,
  location: program.location,
  keywords: program.keywords,
  is_featured: program.opportunityScore >= 88, // Mark high-scoring as featured
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
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
            const { data, error: fetchError } = await supabase
              .from('funding_opportunities' as any)
              .select('*')
              .eq('is_active', true)
              .order('is_featured', { ascending: false })
              .order('created_at', { ascending: false })
              .eq(filters?.type ? 'type' : 'is_active', filters?.type || true)
              .eq(filters?.featured ? 'is_featured' : 'is_active', filters?.featured || true);

            // If table doesn't exist or error, fall back to hardcoded data
            if (fetchError) {
              // Check if it's a table doesn't exist error (code 42P01) or relation doesn't exist
              if (fetchError.code === '42P01' || fetchError.message.includes('does not exist') || fetchError.message.includes('relation')) {
                console.info('Funding opportunities table not found, using hardcoded data. Run migrations to use database.');
              } else {
                console.warn('Database error, using hardcoded data:', fetchError.message);
              }
              setUseDatabase(false);
              throw fetchError; // Will be caught below to use fallback
            }

            // If we got data (even if empty array), use it
            if (data !== null) {
              let results = data as unknown as FundingOpportunity[];

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
          results = results.filter(opp => opp.type === filters.type);
        }

        if (filters?.location) {
          results = results.filter((opp) =>
            opp.location.includes(filters.location!)
          );
        }

        if (filters?.featured) {
          results = results.filter(opp => opp.is_featured);
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

