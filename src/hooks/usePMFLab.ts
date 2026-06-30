import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useActivationJourney } from '@/hooks/useActivationJourney';
import { useCreditActions } from '@/hooks/useCreditActions';
import { useJourneyUpgradePrompt } from '@/hooks/useJourneyUpgradePrompt';
import { toast } from 'sonner';
import { PMF_REQUIRED_SIGNALS } from '@/lib/bizmapStages';
import {
  getPmfResultsTableName,
  handlePmfResultsTableError,
  isPmfResultsTableAvailable,
} from '@/lib/pmfResultsTable';
import { ensureMentorDemandNotification } from '@/lib/mentorDemandNotifications';
import { trackActivity } from '@/lib/activity';
import { captureEvent } from '@/lib/analytics';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PMFEvidenceAnswers {
  testTypes: string[];
  peopleReached: number;
  conversationCount: number;
  interviews: PMFInterviewLog[];
  strongInterestCount: number;
  willingnessToPaySignal: 'yes' | 'no' | 'not_tested';
  willingnessToPayDetail?: string;
  mostPainfulQuote: string;
  urgencyProxy: string;
  consistencyNote: string;
  askedAboutPricing: number;
  joinedWaitlist: number;
  sharedWithSomeone: number;
  offeredToPay: number;
  founderUncertainties: string;
  whatWouldChangeMind: string;
  confidenceLevel: number;
}

export interface PMFInterviewLog {
  id: string;
  intervieweeName: string;
  basicProfile: string;
  segment: string;
  mainFeedback: string;
  objections: string;
  missingFeatures: string;
  interestLevel: number;
  buyingIntent: 'low' | 'medium' | 'high' | 'ready_to_pay';
  landingPageShown: boolean;
  solutionPitched: boolean;
  askedAboutPricing: boolean;
  joinedWaitlist: boolean;
  referredSomeone: boolean;
  offeredToPay: boolean;
}

export interface PMFEvidenceSource {
  title: string;
  url?: string;
  sourceType?: 'web' | 'knowledge';
  snippet?: string;
  relevance?: number;
  publishedDate?: string;
}

export interface PMFBusinessContext {
  productName?: string;
  targetAudience?: string;
  industry?: string;
}

export interface PMFDimension {
  score: number;
  explanation: string;
}

export interface PMFRecommendation {
  priority: 'critical' | 'important' | 'nice';
  title: string;
  action: string;
  timeframe: string;
}

export interface PMFReadinessAnalysis {
  overallScore: number;
  verdict: 'ready' | 'partial' | 'weak';
  verdictLabel: string;
  summaryInsight: string;
  scoreMeaning: string;
  diagnosis: string;
  recommendedAction: 'move_to_building' | 'iterate_before_building';
  recommendedActionTitle: string;
  dimensions: {
    painClarity: PMFDimension;
    urgency: PMFDimension;
    consistency: PMFDimension;
    demandProof: PMFDimension;
    founderSelfAwareness: PMFDimension;
  };
  contradictions: string[];
  strengths: string[];
  gaps: string[];
  missingFeatures: string[];
  commonObjections: string[];
  buyingSignals: string[];
  improvementsBeforeRetest: string[];
  recommendations: PMFRecommendation[];
  readyToScope: boolean;
  nextExperiment: string;
  evidenceAnswers: PMFEvidenceAnswers;
  generatedAt: string;
  // Evidence-backed scoring (Section A): live external demand evidence
  dataSources?: PMFEvidenceSource[];
  marketEvidenceSummary?: string;
}

export interface PMFValidationEvidence {
  validation_checklist: string[];
  interview_notes_count: number;
  survey_results_count: number;
  required_signals: number;
  sean_ellis_very_disappointed: number;
  sean_ellis_somewhat_disappointed: number;
  sean_ellis_not_disappointed: number;
}

export interface PMFScoreTrendPoint {
  id: string;
  score: number;
  createdAt: string;
}

type Phase = 'intake' | 'analyzing' | 'results';

const PMF_RESULTS_TABLE = getPmfResultsTableName();
const PMF_EVIDENCE_TABLE = 'pmf_validation_evidence' as any;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePMFLab() {
  const { user } = useAuth();
  const { refreshProgress } = useBizMapProgress();
  const { refreshActivation } = useActivationJourney();
  const { ensureCredits, handleCreditError, showCreditReceipt } = useCreditActions();
  const { fireJourneyUpgradePrompt } = useJourneyUpgradePrompt();

  const [phase, setPhase] = useState<Phase>('intake');
  const [analysis, setAnalysis] = useState<PMFReadinessAnalysis | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasSavedReport, setHasSavedReport] = useState(false);
  const [evidence, setEvidence] = useState<PMFValidationEvidence | null>(null);
  const [trend, setTrend] = useState<PMFScoreTrendPoint[]>([]);
  // Remember the business context of the latest run so re-scores can reuse it
  const lastContextRef = useRef<{ productName?: string; targetAudience?: string; industry?: string } | undefined>(undefined);

  const loadExistingAnalysis = useCallback(async () => {
    if (!user) return;
    if (!isPmfResultsTableAvailable()) return;
    try {
      const { data, error } = await supabase
        .from(PMF_RESULTS_TABLE)
        .select('id, analysis_data, saved_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (handlePmfResultsTableError(error)) return;
        throw error;
      }

      if (!data) return;

      const content = (data as any).analysis_data;
      // Only restore if it's the new evidence-based format
      if (content && content.dimensions && content.verdict) {
        setAnalysis(content as PMFReadinessAnalysis);
        setAnalysisId((data as any).id);
        setHasSavedReport(Boolean((data as any).saved_at));
        setPhase('results');
      }
    } catch (err) {
      if (handlePmfResultsTableError(err)) return;
      console.warn('Failed to load existing PMF analysis:', err);
    }
  }, [user]);

  const loadEvidence = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from(PMF_EVIDENCE_TABLE)
        .select('validation_checklist, interview_notes_count, survey_results_count, required_signals, sean_ellis_very_disappointed, sean_ellis_somewhat_disappointed, sean_ellis_not_disappointed')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        console.warn('Failed to load PMF validation evidence:', error);
        return;
      }
      if (data) setEvidence(data as unknown as PMFValidationEvidence);
    } catch (err) {
      console.warn('Failed to load PMF validation evidence:', err);
    }
  }, [user]);

  const loadTrend = useCallback(async () => {
    if (!user) return;
    if (!isPmfResultsTableAvailable()) return;
    try {
      const { data, error } = await supabase
        .from(PMF_RESULTS_TABLE)
        .select('id, pmf_score, created_at')
        .eq('user_id', user.id)
        .not('pmf_score', 'is', null)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) {
        if (handlePmfResultsTableError(error)) return;
        throw error;
      }
      setTrend(
        (data ?? []).map((row: any) => ({
          id: row.id,
          score: Number(row.pmf_score),
          createdAt: row.created_at,
        })),
      );
    } catch (err) {
      if (handlePmfResultsTableError(err)) return;
      console.warn('Failed to load PMF score trend:', err);
    }
  }, [user]);

  const persistInterviewEvidenceCount = useCallback(async (conversationCount: number) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from(PMF_EVIDENCE_TABLE)
        .upsert({
          user_id: user.id,
          interview_notes_count: conversationCount,
          required_signals: PMF_REQUIRED_SIGNALS,
        }, { onConflict: 'user_id' });
      if (error) throw error;
      setEvidence((prev) => prev
        ? { ...prev, interview_notes_count: conversationCount, required_signals: PMF_REQUIRED_SIGNALS }
        : {
            validation_checklist: [],
            interview_notes_count: conversationCount,
            survey_results_count: 0,
            required_signals: PMF_REQUIRED_SIGNALS,
            sean_ellis_very_disappointed: 0,
            sean_ellis_somewhat_disappointed: 0,
            sean_ellis_not_disappointed: 0,
          });
    } catch (err) {
      console.warn('Failed to persist PMF interview evidence count:', err);
    }
  }, [user]);

  // On mount: restore existing analysis, validation evidence, and score trend
  useEffect(() => {
    if (!user) return;
    void loadExistingAnalysis();
    void loadEvidence();
    void loadTrend();
  }, [loadExistingAnalysis, loadEvidence, loadTrend, user]);

  const runAnalysis = useCallback(async (
    answers: PMFEvidenceAnswers,
    options?: {
      businessContext?: PMFBusinessContext;
      previousAnalysisId?: string;
      surveyEvidence?: { total: number; veryDisappointedPct: number; sampleVerbatims: string[] };
    },
  ) => {
    if (!user) {
      toast.error('Sign in to analyze your PMF evidence.');
      return;
    }

    lastContextRef.current = options?.businessContext ?? lastContextRef.current;

    // Re-scores are free (Section C) — only the initial analysis charges credits.
    const isReScore = Boolean(options?.previousAnalysisId);
    let credits: number | null = 0;
    if (!isReScore) {
      credits = ensureCredits('PMF_SCORING');
      if (credits === null) return;
    }

    captureEvent('pmf_analysis_started', {
      is_rescore: isReScore,
      interview_count: answers.interviews?.length ?? answers.conversationCount ?? 0,
      survey_responses: options?.surveyEvidence?.total ?? 0,
    });
    setPhase('analyzing');

    try {
      const { data, error } = await supabase.functions.invoke('pmf-evidence-scorer', {
        body: {
          ...answers,
          businessContext: options?.businessContext,
          previousAnalysisId: options?.previousAnalysisId,
          surveyEvidence: options?.surveyEvidence,
        },
      });

      if (error || !data?.success) {
        const wasCreditError = handleCreditError(error, data, 'PMF_SCORING');
        if (!wasCreditError) {
          toast.error('PMF analysis failed. Please try again.');
        }
        setPhase(analysis ? 'results' : 'intake');
        return;
      }

      const nextAnalysis = data.analysis as PMFReadinessAnalysis;
      setAnalysis(nextAnalysis);
      setAnalysisId(data.analysisId ?? null);
      setHasSavedReport(false);
      setPhase('results');
      const conversationCount = nextAnalysis.evidenceAnswers?.interviews?.length
        ?? answers.interviews?.length
        ?? answers.conversationCount
        ?? 0;
      void persistInterviewEvidenceCount(conversationCount);
      void loadTrend();
      captureEvent('pmf_analysis_completed', {
        is_rescore: isReScore,
        score: nextAnalysis.overallScore,
        verdict: nextAnalysis.verdict,
        analysis_id_present: Boolean(data.analysisId),
        external_sources: nextAnalysis.dataSources?.length ?? 0,
      });
      if (isReScore) {
        toast.success('Re-scored with your latest evidence — no credits used.');
      } else {
        showCreditReceipt(
          'PMF_SCORING',
          typeof data?.creditsUsed === 'number' ? data.creditsUsed : (credits ?? 0),
          typeof data?.newBalance === 'number' ? data.newBalance : undefined,
          { featureName: 'PMF Evidence Score' }
        );
        fireJourneyUpgradePrompt('starter_pmf_complete');
      }
    } catch (err) {
      console.error('PMF analysis error:', err);
      toast.error('Something went wrong. Please try again.');
      setPhase(analysis ? 'results' : 'intake');
    }
  }, [user, analysis, ensureCredits, handleCreditError, showCreditReceipt, fireJourneyUpgradePrompt, loadTrend, persistInterviewEvidenceCount]);

  const reScore = useCallback(async () => {
    if (!analysis || !analysisId) return;
    captureEvent('pmf_rescore_clicked', {
      score: analysis.overallScore,
      verdict: analysis.verdict,
      analysis_id_present: Boolean(analysisId),
    });
    await runAnalysis(analysis.evidenceAnswers, {
      businessContext: lastContextRef.current,
      previousAnalysisId: analysisId,
    });
  }, [analysis, analysisId, runAnalysis]);

  const saveSeanEllis = useCallback(async (
    tally: { very: number; somewhat: number; not: number },
    options?: { silent?: boolean },
  ) => {
    if (!user) {
      if (!options?.silent) toast.error('Sign in to save survey results.');
      return false;
    }
    const very = Math.max(0, Math.floor(tally.very || 0));
    const somewhat = Math.max(0, Math.floor(tally.somewhat || 0));
    const notDisappointed = Math.max(0, Math.floor(tally.not || 0));
    const total = very + somewhat + notDisappointed;
    try {
      const { error } = await supabase
        .from(PMF_EVIDENCE_TABLE)
        .upsert({
          user_id: user.id,
          sean_ellis_very_disappointed: very,
          sean_ellis_somewhat_disappointed: somewhat,
          sean_ellis_not_disappointed: notDisappointed,
          sean_ellis_updated_at: new Date().toISOString(),
          survey_results_count: total,
          required_signals: PMF_REQUIRED_SIGNALS,
        }, { onConflict: 'user_id' });
      if (error) throw error;
      setEvidence((prev) => ({
        validation_checklist: prev?.validation_checklist ?? [],
        interview_notes_count: prev?.interview_notes_count ?? 0,
        required_signals: PMF_REQUIRED_SIGNALS,
        survey_results_count: total,
        sean_ellis_very_disappointed: very,
        sean_ellis_somewhat_disappointed: somewhat,
        sean_ellis_not_disappointed: notDisappointed,
      }));
      if (!options?.silent) toast.success('Survey results saved.');
      await refreshProgress();
      return true;
    } catch (err) {
      console.error('Save Sean Ellis error:', err);
      if (!options?.silent) toast.error('Unable to save survey results.');
      return false;
    }
  }, [user, refreshProgress]);

  const saveChecklist = useCallback(async (items: string[]) => {
    if (!user) {
      toast.error('Sign in to save your checklist.');
      return false;
    }
    try {
      const { error } = await supabase
        .from(PMF_EVIDENCE_TABLE)
        .upsert({
          user_id: user.id,
          validation_checklist: items,
          checklist_saved_at: new Date().toISOString(),
          required_signals: PMF_REQUIRED_SIGNALS,
        }, { onConflict: 'user_id' });
      if (error) throw error;
      setEvidence((prev) => ({
        interview_notes_count: prev?.interview_notes_count ?? 0,
        survey_results_count: prev?.survey_results_count ?? 0,
        required_signals: PMF_REQUIRED_SIGNALS,
        sean_ellis_very_disappointed: prev?.sean_ellis_very_disappointed ?? 0,
        sean_ellis_somewhat_disappointed: prev?.sean_ellis_somewhat_disappointed ?? 0,
        sean_ellis_not_disappointed: prev?.sean_ellis_not_disappointed ?? 0,
        validation_checklist: items,
      }));
      captureEvent('pmf_checklist_saved', {
        checklist_count: items.length,
      });
      return true;
    } catch (err) {
      console.error('Save checklist error:', err);
      toast.error('Unable to save your checklist.');
      return false;
    }
  }, [user]);

  const saveReport = useCallback(async () => {
    if (!user) {
      toast.error('Sign in to save your PMF report.');
      return;
    }
    if (!analysis) return;

    setIsSaving(true);
    try {
      // Update pmf_analysis_results with saved status
      if (analysisId && isPmfResultsTableAvailable()) {
        const { error: reportError } = await supabase
          .from(PMF_RESULTS_TABLE)
          .update({ saved_at: new Date().toISOString() })
          .eq('id', analysisId);

        if (reportError && !handlePmfResultsTableError(reportError)) {
          throw reportError;
        }
      }

      // Write to pmf_validation_evidence to trigger Stage III completion.
      // Only touch interview_notes_count here — the interactive checklist and the
      // Sean Ellis survey tally are owned by saveChecklist / saveSeanEllis and must
      // not be clobbered on save.
      const conversationCount = analysis.evidenceAnswers?.interviews?.length
        ?? analysis.evidenceAnswers?.conversationCount
        ?? 0;
      await persistInterviewEvidenceCount(conversationCount);

      toast.success(
        conversationCount >= PMF_REQUIRED_SIGNALS
          ? 'PMF report saved. Stage III marked complete.'
          : `PMF report saved. Add ${PMF_REQUIRED_SIGNALS - conversationCount} more conversations to complete Stage III.`
      );

      await ensureMentorDemandNotification(user.id, 'validation', {
        pmfScore: analysis.overallScore,
        summaryInsight: analysis.summaryInsight,
      });
      await trackActivity(
        'mentor_liquidity_triggered',
        {
          track: 'validation',
          source: 'pmf-save',
          pmfScore: analysis.overallScore,
          verdict: analysis.verdict,
        },
        user.id,
      );

      await refreshProgress();
      await refreshActivation();
      setHasSavedReport(true);
      captureEvent('pmf_report_saved', {
        score: analysis.overallScore,
        verdict: analysis.verdict,
        interview_count: conversationCount,
        analysis_id_present: Boolean(analysisId),
      });
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Unable to save PMF report right now.');
    } finally {
      setIsSaving(false);
    }
  }, [user, analysis, analysisId, refreshActivation, refreshProgress, persistInterviewEvidenceCount]);

  const exportReport = useCallback(async () => {
    if (!analysis) return;
    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 20;
      const pageWidth = 210;
      const lineWidth = pageWidth - margin * 2;
      let y = margin;

      const addLine = (text: string, size = 10, bold = false, color = '#000000') => {
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(color);
        const lines = doc.splitTextToSize(text, lineWidth);
        lines.forEach((line: string) => {
          if (y > 270) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += size * 0.45;
        });
        y += 2;
      };

      const addSection = (title: string) => {
        y += 4;
        addLine(title, 13, true, '#2563eb');
        y += 1;
      };

      addLine(`PMF Readiness Report`, 18, true);
      addLine(`Score: ${analysis.overallScore}/100 — ${analysis.verdictLabel}`, 12, true,
        analysis.verdict === 'ready' ? '#16a34a' : analysis.verdict === 'partial' ? '#d97706' : '#dc2626');
      addLine('Creatives Takeover — PMF Lab', 10, false, '#6b7280');
      y += 4;
      addLine(analysis.summaryInsight, 10);

      addSection('SCORE BREAKDOWN');
      const dims = [
        ['Pain Clarity', analysis.dimensions.painClarity],
        ['Urgency', analysis.dimensions.urgency],
        ['Consistency', analysis.dimensions.consistency],
        ['Demand Proof', analysis.dimensions.demandProof],
        ['Self-Awareness', analysis.dimensions.founderSelfAwareness],
      ] as const;
      dims.forEach(([name, dim]) => {
        addLine(`${name}: ${dim.score}/20`, 10, true);
        addLine(`  ${dim.explanation}`, 9, false, '#374151');
      });

      if (analysis.strengths?.length) {
        addSection('STRENGTHS');
        analysis.strengths.forEach(s => addLine(`  • ${s}`, 9));
      }

      if (analysis.gaps?.length) {
        addSection('GAPS TO ADDRESS');
        analysis.gaps.forEach(g => addLine(`  • ${g}`, 9, false, '#b91c1c'));
      }

      addSection('RECOMMENDATIONS');
      analysis.recommendations.forEach((rec, i) => {
        addLine(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`, 10, true);
        addLine(`  ${rec.action}`, 9);
        addLine(`  Timeframe: ${rec.timeframe}`, 9, false, '#6b7280');
        y += 1;
      });

      if (analysis.nextExperiment) {
        addSection('NEXT EXPERIMENT');
        addLine(analysis.nextExperiment, 10);
      }

      if (analysis.marketEvidenceSummary || (analysis.dataSources?.length ?? 0) > 0) {
        addSection('EXTERNAL DEMAND EVIDENCE');
        if (analysis.marketEvidenceSummary) addLine(analysis.marketEvidenceSummary, 9);
        (analysis.dataSources ?? []).forEach((s, i) => {
          addLine(`[${i + 1}] ${s.title}`, 9, true);
          if (s.url) addLine(`  ${s.url}`, 8, false, '#2563eb');
        });
      }

      doc.save(`pmf-readiness-report-${analysis.overallScore}.pdf`);
      toast.success('PDF exported.');
      await saveReport();
    } catch (err) {
      console.error('Export error:', err);
      toast.error('PDF export failed. Your report has been saved instead.');
      await saveReport();
    } finally {
      setIsExporting(false);
    }
  }, [analysis, saveReport]);

  const resetToIntake = useCallback(() => {
    setAnalysis(null);
    setAnalysisId(null);
    setPhase('intake');
  }, []);

  return {
    phase,
    analysis,
    analysisId,
    hasSavedReport,
    isSaving,
    isExporting,
    evidence,
    trend,
    runAnalysis,
    reScore,
    saveReport,
    saveSeanEllis,
    saveChecklist,
    exportReport,
    resetToIntake,
  };
}
