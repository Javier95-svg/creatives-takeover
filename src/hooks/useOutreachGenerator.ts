import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OutreachGenerationRequest, OutreachGenerationResponse, OutreachMaterial } from '@/types/outreach';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

export const useOutreachGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedMaterial, setGeneratedMaterial] = useState<OutreachGenerationResponse | null>(null);

  const generateMaterial = useCallback(async (
    request: OutreachGenerationRequest
  ): Promise<OutreachGenerationResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('outreach-generator', {
        body: request
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

      const response: OutreachGenerationResponse = data as OutreachGenerationResponse;
      setGeneratedMaterial(response);
      toast.success(`Generated ${request.material_type.replace('_', ' ')} successfully!`);
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
