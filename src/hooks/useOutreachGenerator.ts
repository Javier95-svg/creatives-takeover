import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OutreachGenerationRequest, OutreachGenerationResponse, OutreachMaterial } from '@/types/outreach';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';
import { useCreditActions } from '@/hooks/useCreditActions';
import { useCredits } from '@/hooks/useCredits';
import { CreditFeature } from '@/config/constants';

export const useOutreachGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedMaterial, setGeneratedMaterial] = useState<OutreachGenerationResponse | null>(null);
  const { ensureCredits, handleCreditError } = useCreditActions();
  const { refreshBalance } = useCredits();

  const materialToFeature: Record<string, CreditFeature> = {
    pitch_deck: 'PITCH_DECK_GENERATION',
    cold_email: 'COLD_EMAIL_GENERATION',
    one_pager: 'ONEPAGER_GENERATION',
  };
  const materialLabels: Record<string, string> = {
    pitch_deck: 'Pitch Deck Generation',
    cold_email: 'Cold Email Generation',
    one_pager: 'One-Pager Generation',
  };

  const generateMaterial = useCallback(async (
    request: OutreachGenerationRequest
  ): Promise<OutreachGenerationResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const featureKey = materialToFeature[request.material_type] || 'COLD_EMAIL_GENERATION';
      const requiredCredits = ensureCredits(featureKey, { featureName: materialLabels[request.material_type] });
      if (requiredCredits === null) {
        throw new Error('Insufficient credits');
      }

      const { data, error: invokeError } = await supabase.functions.invoke('outreach-generator', {
        body: request
      });

      if (invokeError) {
        // Handle credit errors specifically
        if (handleCreditError(invokeError, data, featureKey, { featureName: materialLabels[request.material_type] })) {
          const errorMsg = 'Insufficient credits. Please upgrade your plan to get more credits.';
          setError(errorMsg);
          throw new Error(errorMsg);
        }
        throw invokeError;
      }

      if (data?.error) {
        if (handleCreditError(null, data, featureKey, { featureName: materialLabels[request.material_type] })) {
          const errorMsg = 'Insufficient credits';
          setError(errorMsg);
          throw new Error(errorMsg);
        }
        throw new Error(data.error);
      }

      const response: OutreachGenerationResponse = data as OutreachGenerationResponse;
      setGeneratedMaterial(response);
      toast.success(`Generated ${request.material_type.replace('_', ' ')} successfully!`);
      void refreshBalance();
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate material. Please try again.';
      setError(errorMessage);
      logError('Error generating material', err);
      if (!errorMessage.includes('credits')) {
        toast.error(errorMessage);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveMaterial = useCallback(async (material: Partial<OutreachMaterial>): Promise<boolean> => {
    try {
      // Materials are already saved by the edge function
      // This could be used for updating existing materials
      return true;
    } catch (err) {
      console.error('Error saving material:', err);
      return false;
    }
  }, []);

  const getMaterials = useCallback(async (investorId?: string) => {
    try {
      const baseQuery = supabase
        .from('outreach_materials' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      const { data, error: fetchError } = investorId 
        ? await baseQuery.eq('investor_id', investorId)
        : await baseQuery;

      if (fetchError) throw fetchError;
      return ((data as any) || []) as OutreachMaterial[];
    } catch (err) {
      console.error('Error fetching materials:', err);
      return [];
    }
  }, []);

  const generatePitchDeck = useCallback(async (request: Omit<OutreachGenerationRequest, 'material_type'>) => {
    return generateMaterial({ ...request, material_type: 'pitch_deck' });
  }, [generateMaterial]);

  const generateColdEmail = useCallback(async (request: Omit<OutreachGenerationRequest, 'material_type'>) => {
    return generateMaterial({ ...request, material_type: 'cold_email' });
  }, [generateMaterial]);

  const generateOnePager = useCallback(async (request: Omit<OutreachGenerationRequest, 'material_type'>) => {
    return generateMaterial({ ...request, material_type: 'one_pager' });
  }, [generateMaterial]);

  return {
    loading,
    error,
    generatedMaterial,
    generateMaterial,
    generatePitchDeck,
    generateColdEmail,
    generateOnePager,
    saveMaterial,
    getMaterials,
    clearGenerated: () => {
      setGeneratedMaterial(null);
      setError(null);
    }
  };
};
