import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from './useCredits';
import { supabase } from '@/integrations/supabase/client';
import { CREDIT_COSTS } from '@/config/constants';
import { toast } from 'sonner';
import { MatchRequest } from '@/types/investor';

type MaterialType = 'cold_email' | 'one_pager' | 'pitch_deck';

interface OutreachRequest {
  material_type: MaterialType;
  investor_id?: string;
  assessment_id?: string;
  industry: string;
  funding_amount: number;
  business_stage?: string;
  business_summary: string;
  readiness_scores?: {
    mvp: number;
    feedback: number;
    team: number;
    runway: number;
  };
  strengths?: string[];
  critical_gaps?: string[];
  verdict?: string;
  investor_name?: string;
  investor_firm?: string;
  investor_focus?: string[];
  portfolio_companies?: string[];
}

interface GeneratedEmail {
  subject: string;
  subject_variations: string[];
  body: string;
}

interface GeneratedMaterial {
  type: MaterialType;
  subject?: string;
  subject_variations?: string[];
  content: string;
  content_json?: any;
}

export const useOutreachGenerator = () => {
  const { user } = useAuth();
  const { hasCredits, refreshBalance } = useCredits();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMaterial = useCallback(async (
    request: OutreachRequest
  ): Promise<GeneratedMaterial | null> => {
    if (!user) {
      setError('Authentication required');
      toast.error('Please sign in to generate outreach materials');
      return null;
    }

    // Get credit cost
    const creditCosts: Record<MaterialType, number> = {
      cold_email: CREDIT_COSTS.COLD_EMAIL_GENERATION,
      one_pager: CREDIT_COSTS.ONEPAGER_GENERATION,
      pitch_deck: CREDIT_COSTS.PITCH_DECK_GENERATION
    };

    const requiredCredits = creditCosts[request.material_type];

    // Check credits before proceeding
    if (!hasCredits(requiredCredits)) {
      const errorMsg = `Insufficient credits. ${request.material_type.replace('_', ' ')} generation requires ${requiredCredits} credits.`;
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('outreach-generator', {
        body: request
      });

      if (functionError) {
        // Handle credit errors specifically
        if (functionError.status === 402 || (functionError.message && functionError.message.includes('credits'))) {
          const errorMsg = `Insufficient credits. ${request.material_type.replace('_', ' ')} generation requires ${requiredCredits} credits.`;
          setError(errorMsg);
          toast.error(errorMsg);
          return null;
        }
        throw functionError;
      }

      if (data?.error) {
        if (data.error.includes('credits') || data.required) {
          const errorMsg = `Insufficient credits. ${request.material_type.replace('_', ' ')} generation requires ${data.required || requiredCredits} credits.`;
          setError(errorMsg);
          toast.error(errorMsg);
          return null;
        }
        throw new Error(data.error);
      }

      // Refresh credit balance
      if (data.new_balance !== undefined) {
        await refreshBalance();
      }

      const material: GeneratedMaterial = {
        type: request.material_type,
        subject: data.material?.subject,
        subject_variations: data.material?.subject_variations,
        content: data.material?.body || data.material?.content || '',
        content_json: data.material?.content_json
      };

      toast.success(`${request.material_type.replace('_', ' ')} generated successfully!`);
      return material;

    } catch (err: any) {
      const errorMessage = err?.message || `Failed to generate ${request.material_type.replace('_', ' ')}`;
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(`Error generating ${request.material_type}:`, err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, hasCredits, refreshBalance]);

  const generateEmail = useCallback(async (
    investorId: string,
    matchRequest: MatchRequest,
    investorData?: any
  ): Promise<GeneratedEmail | null> => {
    const request: OutreachRequest = {
      material_type: 'cold_email',
      investor_id: investorId,
      assessment_id: matchRequest.assessment_id,
      industry: matchRequest.industry,
      funding_amount: matchRequest.funding_amount,
      business_stage: matchRequest.business_stage,
      business_summary: matchRequest.business_summary || '',
      readiness_scores: matchRequest.readiness_scores,
      strengths: matchRequest.strengths,
      critical_gaps: matchRequest.critical_gaps,
      verdict: matchRequest.verdict,
      investor_name: investorData?.name,
      investor_firm: investorData?.firm_name,
      investor_focus: investorData?.industries,
      portfolio_companies: investorData?.portfolio_companies?.map((c: any) => c.name)
    };

    const result = await generateMaterial(request);
    if (!result) return null;

    return {
      subject: result.subject || 'Partnership Opportunity',
      subject_variations: result.subject_variations || [result.subject || 'Partnership Opportunity'],
      body: result.content
    };
  }, [generateMaterial]);

  const generateOnePager = useCallback(async (
    investorId: string,
    matchRequest: MatchRequest,
    investorData?: any
  ): Promise<any | null> => {
    const request: OutreachRequest = {
      material_type: 'one_pager',
      investor_id: investorId,
      assessment_id: matchRequest.assessment_id,
      industry: matchRequest.industry,
      funding_amount: matchRequest.funding_amount,
      business_stage: matchRequest.business_stage,
      business_summary: matchRequest.business_summary || '',
      readiness_scores: matchRequest.readiness_scores,
      strengths: matchRequest.strengths,
      critical_gaps: matchRequest.critical_gaps,
      verdict: matchRequest.verdict,
      investor_name: investorData?.name,
      investor_firm: investorData?.firm_name,
      investor_focus: investorData?.industries,
      portfolio_companies: investorData?.portfolio_companies?.map((c: any) => c.name)
    };

    return await generateMaterial(request);
  }, [generateMaterial]);

  const generatePitchDeck = useCallback(async (
    investorId: string,
    matchRequest: MatchRequest,
    investorData?: any
  ): Promise<any | null> => {
    const request: OutreachRequest = {
      material_type: 'pitch_deck',
      investor_id: investorId,
      assessment_id: matchRequest.assessment_id,
      industry: matchRequest.industry,
      funding_amount: matchRequest.funding_amount,
      business_stage: matchRequest.business_stage,
      business_summary: matchRequest.business_summary || '',
      readiness_scores: matchRequest.readiness_scores,
      strengths: matchRequest.strengths,
      critical_gaps: matchRequest.critical_gaps,
      verdict: matchRequest.verdict,
      investor_name: investorData?.name,
      investor_firm: investorData?.firm_name,
      investor_focus: investorData?.industries,
      portfolio_companies: investorData?.portfolio_companies?.map((c: any) => c.name)
    };

    return await generateMaterial(request);
  }, [generateMaterial]);

  return {
    loading,
    error,
    generateEmail,
    generateOnePager,
    generatePitchDeck,
    generateMaterial
  };
};
