import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PitchDeckAnalysis, PitchDeckGuestResult } from '@/types/pitchDeckAnalyzer';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useJourneyUpgradePrompt } from '@/hooks/useJourneyUpgradePrompt';
import { markFirstArtifactCreated, trackRetentionEvent } from '@/lib/retentionSystem';

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
// (our structured { error, creditError, limitReached, ... }) lives on .context.
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
  const [guestResult, setGuestResult] = useState<PitchDeckGuestResult | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Anonymous: one free full analysis per IP ------------------------------
  const analyzePublicDeck = async (file: File): Promise<PitchDeckGuestResult | null> => {
    try {
      setAnalyzing(true);
      setError(null);
      setLimitReached(false);
      const pdfBase64 = await fileToBase64(file);
      const { ok, data, errorBody } = await invokePitchFn({
        mode: 'free',
        pdfBase64,
        fileName: file.name,
        fileSize: file.size,
      });
      if (!ok || !data?.success) {
        if (errorBody?.limitReached) {
          setLimitReached(true);
          return null;
        }
        throw new Error(errorBody?.error || data?.error || 'We could not analyze your deck. Try again.');
      }
      const result: PitchDeckGuestResult = {
        overallScore: data.overallScore,
        verdict: data.verdict,
        subScores: data.subScores,
        strengths: data.strengths || [],
        weaknesses: data.weaknesses || [],
        recommendations: data.recommendations || [],
        keyInsights: data.keyInsights || {},
        fileName: data.fileName ?? file.name,
      };
      setGuestResult(result);
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

  // --- Authenticated: every analysis is credit-metered -----------------------
  const analyzePitchDeck = async (file: File): Promise<PitchDeckAnalysis | null> => {
    if (!user) {
      toast.error('Please sign in to analyze your pitch deck');
      return null;
    }
    await trackRetentionEvent('activation_first_input_submitted', {
      user_id: user.id,
      tool: 'pitch_deck_analyzer',
      source: 'pitch_deck_analyzer',
      file_size: file.size,
    });
    try {
      setUploading(true);
      setError(null);
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(UPLOAD_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      setUploading(false);

      setAnalyzing(true);
      const { ok, data, errorBody } = await invokePitchFn({
        mode: 'deep',
        userId: user.id,
        storagePath: uploadData.path,
        fileName: file.name,
        fileSize: file.size,
      });

      if (!ok || !data?.success) {
        if (errorBody?.creditError) {
          toast.error(
            `You need ${errorBody.requiredCredits ?? 10} credits to analyze a deck. Top up to continue.`,
          );
          return null;
        }
        throw new Error(errorBody?.error || data?.error || 'Analysis failed. Please try again.');
      }

      const { data: saved, error: saveError } = await supabase
        .from('pitch_deck_analyses')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_size: file.size,
          storage_path: uploadData.path,
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
      await trackRetentionEvent('activation_first_output_generated', {
        user_id: user.id,
        tool: 'pitch_deck_analyzer',
        source: 'pitch_deck_analyzer',
        artifact_type: 'pitch_deck_analysis',
        artifact_id: result.id,
      });
      await markFirstArtifactCreated({
        userId: user.id,
        artifactType: 'pitch_deck_analysis',
        artifactId: result.id,
        label: result.fileName,
        resumeUrl: '/pitch-deck-analyzer',
        source: 'pitch_deck_analyzer',
      });
      void refreshBalance();
      fireJourneyUpgradePrompt('rising_pitch_deck_heavy');
      return result;
    } catch (err: any) {
      const message = err?.message || 'Failed to analyze pitch deck. Please try again.';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const saveGuestResultAsAnalysis = async (result: PitchDeckGuestResult): Promise<PitchDeckAnalysis | null> => {
    if (!user) return null;

    try {
      setUploading(false);
      setAnalyzing(true);
      setError(null);

      const { data: saved, error: saveError } = await supabase
        .from('pitch_deck_analyses')
        .insert({
          user_id: user.id,
          file_name: result.fileName || 'Pitch deck',
          file_size: null,
          storage_path: null,
          overall_score: result.overallScore,
          verdict: result.verdict,
          story_clarity_score: result.subScores.storyClarity,
          market_opportunity_score: result.subScores.marketOpportunity,
          traction_proof_score: result.subScores.tractionProof,
          business_model_score: result.subScores.businessModel,
          team_credibility_score: result.subScores.teamCredibility,
          fundraising_readiness_score: result.subScores.fundraisingReadiness,
          strengths: result.strengths || [],
          weaknesses: result.weaknesses || [],
          recommendations: result.recommendations || [],
          key_insights: result.keyInsights || {},
          analysis_version: '2.0-public-unlock',
        })
        .select()
        .single();

      if (saveError) throw new Error(`Failed to save analysis: ${saveError.message}`);

      const savedResult: PitchDeckAnalysis = {
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

      setGuestResult(null);
      setAnalysis(savedResult);
      await trackRetentionEvent('activation_first_output_generated', {
        user_id: user.id,
        tool: 'pitch_deck_analyzer',
        source: 'pitch_deck_unlock',
        artifact_type: 'pitch_deck_analysis',
        artifact_id: savedResult.id,
      });
      await markFirstArtifactCreated({
        userId: user.id,
        artifactType: 'pitch_deck_analysis',
        artifactId: savedResult.id,
        label: savedResult.fileName,
        resumeUrl: '/pitch-deck-analyzer',
        source: 'pitch_deck_unlock',
      });
      return savedResult;
    } catch (err: any) {
      const message = err?.message || 'Failed to restore your pitch deck analysis. Please try again.';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setAnalyzing(false);
    }
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
    setGuestResult(null);
    setLimitReached(false);
    setError(null);
    setUploading(false);
    setAnalyzing(false);
  };

  return {
    analyzePublicDeck,
    analyzePitchDeck,
    saveGuestResultAsAnalysis,
    submitFeedback,
    resetAnalysis,
    uploading,
    analyzing,
    analysis,
    guestResult,
    limitReached,
    error,
    isProcessing: uploading || analyzing,
  };
};
