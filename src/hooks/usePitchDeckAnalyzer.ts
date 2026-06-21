import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PitchDeckAnalysis, PitchDeckFreeResult } from '@/types/pitchDeckAnalyzer';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useJourneyUpgradePrompt } from '@/hooks/useJourneyUpgradePrompt';

const UPLOAD_BUCKET = 'pitch-deck-uploads';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

// supabase.functions.invoke surfaces non-2xx as a FunctionsHttpError whose body
// (our structured { error, creditError, requiredCredits, ... }) lives on .context.
async function invokePitchFn(body: Record<string, unknown>): Promise<{ ok: boolean; data: any; errorBody: any }> {
  const { data, error } = await supabase.functions.invoke('pitch-deck-analyzer', { body });
  if (!error) return { ok: true, data, errorBody: null };
  let errorBody: any = null;
  const ctx = (error as { context?: unknown } | null)?.context;
  if (ctx instanceof Response) {
    try {
      errorBody = await ctx.clone().json();
    } catch {
      /* non-JSON body */
    }
  }
  return { ok: false, data: null, errorBody: errorBody ?? { error: error.message } };
}

export const usePitchDeckAnalyzer = () => {
  const { user } = useAuth();
  const { refreshBalance } = useCredits();
  const { fireJourneyUpgradePrompt } = useJourneyUpgradePrompt();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PitchDeckAnalysis | null>(null);
  const [freeResult, setFreeResult] = useState<PitchDeckFreeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Anonymous "Quick Score": real but lighter pass, no auth, no credit ----
  const analyzePublicDeck = async (file: File): Promise<PitchDeckFreeResult | null> => {
    try {
      setAnalyzing(true);
      setError(null);
      const pdfBase64 = await fileToBase64(file);
      const { ok, data, errorBody } = await invokePitchFn({
        mode: 'free',
        pdfBase64,
        fileName: file.name,
        fileSize: file.size,
      });
      if (!ok || !data?.success) {
        throw new Error(errorBody?.error || data?.error || 'We could not analyze your deck. Try again.');
      }
      const result: PitchDeckFreeResult = {
        overallScore: data.overallScore,
        verdict: data.verdict,
        subScores: data.subScores,
        topStrength: data.topStrength ?? null,
        topFix: data.topFix ?? null,
        tempPath: data.tempPath ?? null,
        fileName: data.fileName ?? file.name,
      };
      setFreeResult(result);
      return result;
    } catch (err: any) {
      const message = err?.message || 'Failed to analyze your deck. Please try again.';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  // Shared deep run: storagePath already points at the uploaded (or carried) PDF.
  const runDeepAnalysis = async (
    storagePath: string,
    fileName: string,
    fileSize: number,
  ): Promise<PitchDeckAnalysis | null> => {
    if (!user) {
      toast.error('Please sign in to run the full analysis.');
      return null;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const { ok, data, errorBody } = await invokePitchFn({
        mode: 'deep',
        userId: user.id,
        storagePath,
        fileName,
        fileSize,
      });

      if (!ok || !data?.success) {
        if (errorBody?.creditError) {
          toast.error(
            `You need ${errorBody.requiredCredits ?? ''} credits to analyze another deck. Your first deck is free.`.trim(),
          );
          return null;
        }
        throw new Error(errorBody?.error || data?.error || 'Analysis failed. Please try again.');
      }

      // Persist (client insert; the function counted existing rows before this one
      // so the first analysis is free and the next counts as #2).
      const { data: saved, error: saveError } = await supabase
        .from('pitch_deck_analyses')
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_size: fileSize,
          storage_path: storagePath,
          overall_score: data.overallScore,
          verdict: data.verdict,
          story_clarity_score: data.subScores.storyClarity,
          market_opportunity_score: data.subScores.marketOpportunity,
          traction_proof_score: data.subScores.tractionProof,
          business_model_score: data.subScores.businessModel,
          team_credibility_score: data.subScores.teamCredibility,
          fundraising_readiness_score: data.subScores.fundraisingReadiness,
          strengths: data.strengths || [],
          weaknesses: data.weaknesses || [],
          recommendations: data.recommendations || [],
          key_insights: data.keyInsights || {},
          analysis_version: '2.0',
        })
        .select()
        .single();

      if (saveError) throw new Error(`Failed to save analysis: ${saveError.message}`);

      const result: PitchDeckAnalysis = {
        id: saved.id,
        userId: saved.user_id,
        fileName: saved.file_name,
        fileSize: saved.file_size,
        storagePath: saved.storage_path,
        overallScore: saved.overall_score,
        verdict: saved.verdict as PitchDeckAnalysis['verdict'],
        subScores: {
          storyClarity: saved.story_clarity_score,
          marketOpportunity: saved.market_opportunity_score,
          tractionProof: saved.traction_proof_score,
          businessModel: saved.business_model_score,
          teamCredibility: saved.team_credibility_score,
          fundraisingReadiness: saved.fundraising_readiness_score,
        },
        strengths: saved.strengths,
        weaknesses: saved.weaknesses,
        recommendations: saved.recommendations,
        keyInsights: saved.key_insights,
        analysisVersion: saved.analysis_version,
        createdAt: saved.created_at,
        updatedAt: saved.updated_at,
      };

      setAnalysis(result);
      if (data.creditsUsed > 0) void refreshBalance();
      fireJourneyUpgradePrompt('rising_pitch_deck_heavy');
      return result;
    } catch (err: any) {
      const message = err?.message || 'Failed to analyze pitch deck. Please try again.';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  // --- Authenticated deep analysis from a freshly chosen file ----------------
  const analyzePitchDeck = async (file: File): Promise<PitchDeckAnalysis | null> => {
    if (!user) {
      toast.error('Please sign in to analyze your pitch deck');
      return null;
    }
    try {
      setUploading(true);
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(UPLOAD_BUCKET)
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return await runDeepAnalysis(uploadData.path, file.name, file.size);
    } catch (err: any) {
      setUploading(false);
      const message = err?.message || 'Failed to analyze pitch deck. Please try again.';
      setError(message);
      toast.error(message);
      return null;
    }
  };

  // --- Deep analysis on a carried temp path (post-signup, no re-upload) -------
  const analyzeFromTempPath = async (tempPath: string, fileName: string): Promise<PitchDeckAnalysis | null> => {
    return runDeepAnalysis(tempPath, fileName, 0);
  };

  const submitFeedback = async (analysisId: string, rating: number, feedback?: string) => {
    try {
      const { error } = await supabase
        .from('pitch_deck_analyses')
        .update({
          user_rating: rating,
          user_feedback: feedback,
          feedback_submitted_at: new Date().toISOString(),
        })
        .eq('id', analysisId);
      if (error) throw error;
      toast.success('Thank you for your feedback!');
      return true;
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      toast.error('Failed to submit feedback');
      return false;
    }
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setFreeResult(null);
    setError(null);
    setUploading(false);
    setAnalyzing(false);
  };

  return {
    analyzePublicDeck,
    analyzePitchDeck,
    analyzeFromTempPath,
    submitFeedback,
    resetAnalysis,
    uploading,
    analyzing,
    analysis,
    freeResult,
    error,
    isProcessing: uploading || analyzing,
  };
};
