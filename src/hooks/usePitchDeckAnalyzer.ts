import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PitchDeckAnalysis, calculateOverallScore, getVerdictFromScore } from '@/types/pitchDeckAnalyzer';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export const usePitchDeckAnalyzer = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PitchDeckAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzePitchDeck = async (file: File) => {
    if (!user) {
      toast.error('Please sign in to analyze your pitch deck');
      return null;
    }

    try {
      setUploading(true);
      setAnalyzing(false);
      setError(null);

      // Step 1: Upload PDF to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pitch-deck-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      toast.success('Pitch deck uploaded successfully');
      setUploading(false);
      setAnalyzing(true);

      // Step 2: Get public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from('pitch-deck-uploads')
        .getPublicUrl(uploadData.path);

      // Step 3: Parse document to extract text
      console.log('Parsing document...');
      const { data: parseData, error: parseError } = await supabase.functions.invoke('document-parser', {
        body: {
          file_path: uploadData.path,
          user_id: user.id
        }
      });

      if (parseError) {
        console.error('Parse error:', parseError);
        throw new Error(`Document parsing failed: ${parseError.message}`);
      }

      const extractedText = parseData?.text || parseData?.content || '';
      if (!extractedText) {
        throw new Error('Could not extract text from PDF');
      }

      console.log('Document parsed successfully');

      // Step 4: Analyze pitch deck with AI
      console.log('Analyzing pitch deck...');
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('pitch-deck-analyzer', {
        body: {
          userId: user.id,
          fileName: file.name,
          fileSize: file.size,
          storagePath: uploadData.path,
          content: extractedText
        }
      });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        throw new Error(`Analysis failed: ${analysisError.message}`);
      }

      if (!analysisData) {
        throw new Error('No analysis data returned');
      }

      console.log('Analysis complete:', analysisData);

      // Step 5: Save analysis to database
      const { data: savedAnalysis, error: saveError } = await supabase
        .from('pitch_deck_analyses')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_size: file.size,
          storage_path: uploadData.path,
          overall_score: analysisData.overallScore,
          verdict: analysisData.verdict,
          story_clarity_score: analysisData.subScores.storyClarity,
          market_opportunity_score: analysisData.subScores.marketOpportunity,
          traction_proof_score: analysisData.subScores.tractionProof,
          business_model_score: analysisData.subScores.businessModel,
          team_credibility_score: analysisData.subScores.teamCredibility,
          fundraising_readiness_score: analysisData.subScores.fundraisingReadiness,
          strengths: analysisData.strengths || [],
          weaknesses: analysisData.weaknesses || [],
          recommendations: analysisData.recommendations || [],
          key_insights: analysisData.keyInsights || {},
          analysis_version: '1.0'
        })
        .select()
        .single();

      if (saveError) {
        console.error('Save error:', saveError);
        throw new Error(`Failed to save analysis: ${saveError.message}`);
      }

      // Convert database format to frontend format
      const analysisResult: PitchDeckAnalysis = {
        id: savedAnalysis.id,
        userId: savedAnalysis.user_id,
        fileName: savedAnalysis.file_name,
        fileSize: savedAnalysis.file_size,
        storagePath: savedAnalysis.storage_path,
        overallScore: savedAnalysis.overall_score,
        verdict: savedAnalysis.verdict as PitchDeckAnalysis['verdict'],
        subScores: {
          storyClarity: savedAnalysis.story_clarity_score,
          marketOpportunity: savedAnalysis.market_opportunity_score,
          tractionProof: savedAnalysis.traction_proof_score,
          businessModel: savedAnalysis.business_model_score,
          teamCredibility: savedAnalysis.team_credibility_score,
          fundraisingReadiness: savedAnalysis.fundraising_readiness_score
        },
        strengths: savedAnalysis.strengths,
        weaknesses: savedAnalysis.weaknesses,
        recommendations: savedAnalysis.recommendations,
        keyInsights: savedAnalysis.key_insights,
        analysisVersion: savedAnalysis.analysis_version,
        createdAt: savedAnalysis.created_at,
        updatedAt: savedAnalysis.updated_at
      };

      setAnalysis(analysisResult);
      setAnalyzing(false);
      toast.success('Analysis complete!');

      return analysisResult;
    } catch (err: any) {
      console.error('Error analyzing pitch deck:', err);
      const errorMessage = err.message || 'Failed to analyze pitch deck. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      setUploading(false);
      setAnalyzing(false);
      return null;
    }
  };

  const submitFeedback = async (analysisId: string, rating: number, feedback?: string) => {
    try {
      const { error } = await supabase
        .from('pitch_deck_analyses')
        .update({
          user_rating: rating,
          user_feedback: feedback,
          feedback_submitted_at: new Date().toISOString()
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
    setError(null);
    setUploading(false);
    setAnalyzing(false);
  };

  return {
    analyzePitchDeck,
    submitFeedback,
    resetAnalysis,
    uploading,
    analyzing,
    analysis,
    error,
    isProcessing: uploading || analyzing
  };
};
