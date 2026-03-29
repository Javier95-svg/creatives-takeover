import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  AnalysisVerdict,
  PitchDeckAnalysis,
  PitchDeckKeyInsights,
} from '@/types/pitchDeckAnalyzer';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditActions } from '@/hooks/useCreditActions';
import { useCredits } from '@/hooks/useCredits';

type ProcessingStage = 'idle' | 'uploading' | 'parsing' | 'analyzing' | 'saving';

interface ParsedDocumentResponse {
  success?: boolean;
  error?: string;
  document?: {
    text?: string;
    metadata?: {
      page_count?: number;
      word_count?: number;
      file_type?: string;
      extracted_at?: string;
    };
  };
}

interface AnalyzerResponse {
  overallScore?: number;
  verdict?: string;
  subScores?: PitchDeckAnalysis['subScores'];
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  keyInsights?: PitchDeckKeyInsights;
}

const normalizeScore = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.min(100, Math.round(numeric)));
};

const normalizeVerdict = (value: unknown, score: number): AnalysisVerdict => {
  if (value === 'Excellent' || value === 'Strong' || value === 'Good' || value === 'Needs Work') {
    return value;
  }

  if (value === 'Promising') return 'Good';
  if (value === 'Weak') return 'Needs Work';

  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Good';
  return 'Needs Work';
};

export const usePitchDeckAnalyzer = () => {
  const { user } = useAuth();
  const { ensureCredits, handleCreditError } = useCreditActions();
  const { refreshBalance } = useCredits();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PitchDeckAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');

  const analyzePitchDeck = async (file: File) => {
    if (!user) {
      toast.error('Please sign in to analyze your pitch deck');
      return null;
    }

    try {
      setUploading(true);
      setAnalyzing(false);
      setError(null);
      setProcessingStage('uploading');

      const requiredCredits = ensureCredits('PITCH_DECK_ANALYZER', {
        featureName: 'Pitch Deck Analyzer',
      });
      if (requiredCredits === null) {
        setUploading(false);
        setProcessingStage('idle');
        return null;
      }

      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pitch-deck-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      toast.success('Pitch deck uploaded successfully');
      setUploading(false);
      setAnalyzing(true);
      setProcessingStage('parsing');

      const { data: parseData, error: parseError } =
        await supabase.functions.invoke<ParsedDocumentResponse>('document-parser', {
          body: {
            file_path: uploadData.path,
            user_id: user.id,
            bucket: 'pitch-deck-uploads',
          },
        });

      if (parseError || !parseData?.success) {
        throw new Error(
          `Document parsing failed: ${parseError?.message || parseData?.error || 'Unknown error'}`
        );
      }

      const extractedText = parseData.document?.text?.trim() || '';
      if (!extractedText) {
        throw new Error('Could not extract text from the uploaded PDF');
      }

      setProcessingStage('analyzing');

      const { data: analysisData, error: analysisError } =
        await supabase.functions.invoke<AnalyzerResponse>('pitch-deck-analyzer', {
          body: {
            userId: user.id,
            fileName: file.name,
            fileSize: file.size,
            storagePath: uploadData.path,
            content: extractedText,
            documentMeta: parseData.document?.metadata ?? null,
          },
        });

      if (analysisError) {
        if (
          handleCreditError(
            analysisError,
            analysisData,
            'PITCH_DECK_ANALYZER',
            { featureName: 'Pitch Deck Analyzer' }
          )
        ) {
          setUploading(false);
          setAnalyzing(false);
          setProcessingStage('idle');
          return null;
        }

        throw new Error(`Analysis failed: ${analysisError.message}`);
      }

      if (!analysisData?.subScores) {
        throw new Error('No analysis data returned');
      }

      setProcessingStage('saving');

      const normalizedOverallScore = normalizeScore(analysisData.overallScore);
      const normalizedSubScores = {
        storyClarity: normalizeScore(analysisData.subScores.storyClarity),
        marketOpportunity: normalizeScore(analysisData.subScores.marketOpportunity),
        tractionProof: normalizeScore(analysisData.subScores.tractionProof),
        businessModel: normalizeScore(analysisData.subScores.businessModel),
        teamCredibility: normalizeScore(analysisData.subScores.teamCredibility),
        fundraisingReadiness: normalizeScore(analysisData.subScores.fundraisingReadiness),
      };
      const normalizedVerdict = normalizeVerdict(analysisData.verdict, normalizedOverallScore);

      const { data: savedAnalysis, error: saveError } = await supabase
        .from('pitch_deck_analyses')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_size: file.size,
          storage_path: uploadData.path,
          overall_score: normalizedOverallScore,
          verdict: normalizedVerdict,
          story_clarity_score: normalizedSubScores.storyClarity,
          market_opportunity_score: normalizedSubScores.marketOpportunity,
          traction_proof_score: normalizedSubScores.tractionProof,
          business_model_score: normalizedSubScores.businessModel,
          team_credibility_score: normalizedSubScores.teamCredibility,
          fundraising_readiness_score: normalizedSubScores.fundraisingReadiness,
          strengths: analysisData.strengths || [],
          weaknesses: analysisData.weaknesses || [],
          recommendations: analysisData.recommendations || [],
          key_insights: analysisData.keyInsights || {},
          analysis_version: '2.0',
        })
        .select()
        .single();

      if (saveError) {
        throw new Error(`Failed to save analysis: ${saveError.message}`);
      }

      const analysisResult: PitchDeckAnalysis = {
        id: savedAnalysis.id,
        userId: savedAnalysis.user_id,
        fileName: savedAnalysis.file_name,
        fileSize: savedAnalysis.file_size,
        storagePath: savedAnalysis.storage_path,
        overallScore: normalizeScore(savedAnalysis.overall_score),
        verdict: normalizeVerdict(savedAnalysis.verdict, normalizeScore(savedAnalysis.overall_score)),
        subScores: {
          storyClarity: normalizeScore(savedAnalysis.story_clarity_score),
          marketOpportunity: normalizeScore(savedAnalysis.market_opportunity_score),
          tractionProof: normalizeScore(savedAnalysis.traction_proof_score),
          businessModel: normalizeScore(savedAnalysis.business_model_score),
          teamCredibility: normalizeScore(savedAnalysis.team_credibility_score),
          fundraisingReadiness: normalizeScore(savedAnalysis.fundraising_readiness_score),
        },
        strengths: savedAnalysis.strengths || [],
        weaknesses: savedAnalysis.weaknesses || [],
        recommendations: savedAnalysis.recommendations || [],
        keyInsights: (savedAnalysis.key_insights || {}) as PitchDeckKeyInsights,
        analysisVersion: savedAnalysis.analysis_version,
        createdAt: savedAnalysis.created_at,
        updatedAt: savedAnalysis.updated_at,
      };

      setAnalysis(analysisResult);
      setAnalyzing(false);
      setProcessingStage('idle');
      toast.success('Analysis complete!');
      refreshBalance();

      return analysisResult;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to analyze pitch deck. Please try again.';
      console.error('Error analyzing pitch deck:', err);
      setError(message);
      toast.error(message);
      setUploading(false);
      setAnalyzing(false);
      setProcessingStage('idle');
      return null;
    }
  };

  const submitFeedback = async (analysisId: string, rating: number, feedback?: string) => {
    try {
      const { error: updateError } = await supabase
        .from('pitch_deck_analyses')
        .update({
          user_rating: rating,
          user_feedback: feedback,
          feedback_submitted_at: new Date().toISOString(),
        })
        .eq('id', analysisId);

      if (updateError) throw updateError;

      toast.success('Thank you for your feedback!');
      return true;
    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast.error('Failed to submit feedback');
      return false;
    }
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setError(null);
    setUploading(false);
    setAnalyzing(false);
    setProcessingStage('idle');
  };

  return {
    analyzePitchDeck,
    submitFeedback,
    resetAnalysis,
    uploading,
    analyzing,
    analysis,
    error,
    processingStage,
    isProcessing: uploading || analyzing,
  };
};
