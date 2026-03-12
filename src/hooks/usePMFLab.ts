import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useCreditActions } from '@/hooks/useCreditActions';
import { toast } from 'sonner';
import { PMF_REQUIRED_SIGNALS } from '@/lib/bizmapStages';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PMFEvidenceAnswers {
  testTypes: string[];
  peopleReached: number;
  conversationCount: number;
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
  dimensions: {
    painClarity: PMFDimension;
    urgency: PMFDimension;
    consistency: PMFDimension;
    demandProof: PMFDimension;
    founderSelfAwareness: PMFDimension;
  };
  strengths: string[];
  gaps: string[];
  recommendations: PMFRecommendation[];
  readyToScope: boolean;
  nextExperiment?: string;
  evidenceAnswers: PMFEvidenceAnswers;
  generatedAt: string;
}

type Phase = 'intake' | 'analyzing' | 'results';

const PMF_RESULTS_TABLE = 'pmf_analysis_results' as any;
const PMF_EVIDENCE_TABLE = 'pmf_validation_evidence' as any;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePMFLab() {
  const { user } = useAuth();
  const { refreshProgress } = useBizMapProgress();
  const { ensureCredits, handleCreditError } = useCreditActions();

  const [phase, setPhase] = useState<Phase>('intake');
  const [analysis, setAnalysis] = useState<PMFReadinessAnalysis | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // On mount: restore existing analysis if found
  useEffect(() => {
    if (!user) return;
    loadExistingAnalysis();
  }, [user]);

  const loadExistingAnalysis = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from(PMF_RESULTS_TABLE)
        .select('id, analysis_data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return;

      const content = (data as any).analysis_data;
      // Only restore if it's the new evidence-based format
      if (content && content.dimensions && content.verdict) {
        setAnalysis(content as PMFReadinessAnalysis);
        setAnalysisId((data as any).id);
        setPhase('results');
      }
    } catch (err) {
      console.warn('Failed to load existing PMF analysis:', err);
    }
  }, [user]);

  const runAnalysis = useCallback(async (answers: PMFEvidenceAnswers) => {
    if (!user) {
      toast.error('Sign in to analyze your PMF evidence.');
      return;
    }

    const credits = ensureCredits('PMF_SCORING');
    if (credits === null) return;

    setPhase('analyzing');

    try {
      const { data, error } = await supabase.functions.invoke('pmf-evidence-scorer', {
        body: answers,
      });

      if (error || !data?.success) {
        const wasCreditError = handleCreditError(error, data, 'PMF_SCORING');
        if (!wasCreditError) {
          toast.error('PMF analysis failed. Please try again.');
        }
        setPhase('intake');
        return;
      }

      setAnalysis(data.analysis as PMFReadinessAnalysis);
      setAnalysisId(data.analysisId ?? null);
      setPhase('results');
    } catch (err) {
      console.error('PMF analysis error:', err);
      toast.error('Something went wrong. Please try again.');
      setPhase('intake');
    }
  }, [user, ensureCredits, handleCreditError]);

  const saveReport = useCallback(async () => {
    if (!user) {
      toast.error('Sign in to save your PMF report.');
      return;
    }
    if (!analysis) return;

    setIsSaving(true);
    try {
      // Update pmf_analysis_results with saved status
      if (analysisId) {
        await supabase
          .from(PMF_RESULTS_TABLE)
          .update({ saved_at: new Date().toISOString() })
          .eq('id', analysisId);
      }

      // Write to pmf_validation_evidence to trigger Stage III completion
      const conversationCount = analysis.evidenceAnswers?.conversationCount ?? 0;
      const { error: evidenceError } = await supabase
        .from(PMF_EVIDENCE_TABLE)
        .upsert({
          user_id: user.id,
          validation_checklist: [
            'Problem hypothesis defined',
            'Target segment identified',
            'Validation method selected',
            'Interview script prepared',
            'Success criteria documented',
          ],
          checklist_saved_at: new Date().toISOString(),
          interview_notes_count: conversationCount,
          survey_results_count: 0,
          required_signals: PMF_REQUIRED_SIGNALS,
        }, { onConflict: 'user_id' });

      if (evidenceError) {
        console.warn('Failed to update pmf_validation_evidence:', evidenceError);
      }

      toast.success(
        conversationCount >= PMF_REQUIRED_SIGNALS
          ? 'PMF report saved. Stage III marked complete.'
          : `PMF report saved. Add ${PMF_REQUIRED_SIGNALS - conversationCount} more conversations to complete Stage III.`
      );

      await refreshProgress();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Unable to save PMF report right now.');
    } finally {
      setIsSaving(false);
    }
  }, [user, analysis, analysisId, refreshProgress]);

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
    isSaving,
    isExporting,
    runAnalysis,
    saveReport,
    exportReport,
    resetToIntake,
  };
}
