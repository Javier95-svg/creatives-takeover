import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useCreditActions } from '@/hooks/useCreditActions';
import { toast } from 'sonner';
import { ensureMentorDemandNotification } from '@/lib/mentorDemandNotifications';
import { trackActivity } from '@/lib/activity';

export interface GTMIntakeAnswers {
  businessType: string;
  targetAudience: string;
  audienceOnlineHabits: string[];
  problemAndSolution: string;
  currentTraction: string;
  weeklyTimeForMarketing: string;
  budget?: string;
  founderStrengths?: string[];
}

export interface GTMTactic {
  title: string;
  description: string;
  frequency: string;
  timeEstimate: string;
}

export interface GTMChannelRecommendation {
  channel: string;
  fitScore: number;
  fitReason: string;
  isStretch: boolean;
  tactics: GTMTactic[];
  weekOneActions: string[];
  doNotDo: string[];
}

export interface GTMAnalysis {
  planTitle: string;
  summaryInsight: string;
  channels: GTMChannelRecommendation[];
  positioning: {
    positioningStatement: string;
    uniqueValueProposition: string;
    keyDifferentiators: string[];
  };
  messaging: {
    headline: string;
    hookLine: string;
    proofPoint: string;
    ctaCopy: string;
    toneOfVoice: string[];
  };
  actionPlan: {
    week1: string[];
    week2: string[];
    weeks3to4: string[];
  };
  launchChecklist: {
    prelaunch: Array<{ item: string; priority: 'must' | 'should' | 'nice' }>;
    launchDay: Array<{ item: string; priority: 'must' | 'should' | 'nice' }>;
    postlaunch: Array<{ item: string; priority: 'must' | 'should' | 'nice' }>;
  };
  metrics: {
    primary: Array<{ name: string; target: string; why: string; howToMeasure: string }>;
    laggingIndicators: string[];
  };
  intakeAnswers: GTMIntakeAnswers;
  generatedAt: string;
}

type Phase = 'intake' | 'analyzing' | 'results';

const GTM_TABLE = 'gtm_plans' as any;

export function useGTMStrategist() {
  const { user } = useAuth();
  const { refreshProgress } = useBizMapProgress();
  const { ensureCredits, handleCreditError, showCreditReceipt } = useCreditActions();

  const [phase, setPhase] = useState<Phase>('intake');
  const [analysis, setAnalysis] = useState<GTMAnalysis | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [prefillData, setPrefillData] = useState<Partial<GTMIntakeAnswers>>({});
  const [prefillSource, setPrefillSource] = useState<'waitlist_launch_kit' | 'icp_builder' | null>(null);

  // On mount: load existing plan or prefill data
  useEffect(() => {
    if (!user) return;
    void loadExistingPlan();
    void loadPrefillData();
  }, [user]);

  const loadExistingPlan = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from(GTM_TABLE)
        .select('id, plan_title, plan_content, status')
        .eq('user_id', user.id)
        .in('status', ['saved', 'exported', 'draft'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return;

      const content = (data as any).plan_content;
      // Only restore to results if the content has the new rich structure
      if (content && content.channels && content.positioning) {
        setAnalysis(content as GTMAnalysis);
        setPlanId((data as any).id);
        setPhase('results');
      }
    } catch (err) {
      console.warn('Failed to load existing GTM plan:', err);
    }
  }, [user]);

  const loadPrefillData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: waitlistData } = await (supabase as any)
        .from('waitlist_pages')
        .select('metadata, ai_content')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const waitlistMetadata = (waitlistData as any)?.metadata;
      const waitlistPositioning = waitlistMetadata?.projectContext?.positioningStatement;
      if (typeof waitlistPositioning === 'string' && waitlistPositioning.trim()) {
        const waitlistContent = (waitlistData as any)?.ai_content;
        setPrefillData({
          targetAudience: typeof waitlistContent?.subheadline === 'string' ? waitlistContent.subheadline : undefined,
          problemAndSolution: waitlistPositioning.trim(),
        });
        setPrefillSource('waitlist_launch_kit');
        return;
      }

      const { data } = await supabase
        .from('icp_analysis_results' as any)
        .select('analysis_data, target_audience')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return;

      const analysisData = (data as any).analysis_data;
      const prefill: Partial<GTMIntakeAnswers> = {};

      if ((data as any).target_audience) {
        prefill.targetAudience = (data as any).target_audience;
      }
      if (analysisData?.positioningStrategy?.uniqueValueProposition) {
        prefill.problemAndSolution = analysisData.positioningStrategy.uniqueValueProposition;
      }

      if (Object.keys(prefill).length > 0) {
        setPrefillData(prefill);
        setPrefillSource('icp_builder');
      }
    } catch (err) {
      console.warn('Failed to load ICP prefill data:', err);
    }
  }, [user]);

  const runAnalysis = useCallback(async (answers: GTMIntakeAnswers) => {
    if (!user) {
      toast.error('Sign in to run GTM analysis.');
      return;
    }

    const credits = ensureCredits('GTM_ANALYSIS');
    if (credits === null) return;

    setPhase('analyzing');

    try {
      // Fetch ICP context for enrichment
      let icpPositioningStatement: string | undefined;
      let icpNicheProfile: string | undefined;
      try {
        const { data: icpData } = await supabase
          .from('icp_analysis_results' as any)
          .select('analysis_data')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (icpData) {
          const d = (icpData as any).analysis_data;
          icpPositioningStatement = d?.positioningStrategy?.positioningStatement;
          icpNicheProfile = d?.nicheProfile?.nicheDescription;
        }
      } catch {
        // Non-critical — continue without ICP enrichment
      }

      const { data, error } = await supabase.functions.invoke('gtm-analyzer', {
        body: {
          ...answers,
          icpPositioningStatement,
          icpNicheProfile,
        },
      });

      if (error || !data?.success) {
        const wasCreditError = handleCreditError(error, data, 'GTM_ANALYSIS');
        if (!wasCreditError) {
          toast.error('GTM analysis failed. Please try again.');
        }
        setPhase('intake');
        return;
      }

      setAnalysis(data.analysis as GTMAnalysis);
      setPlanId(data.planId ?? null);
      setPhase('results');
      showCreditReceipt(
        'GTM_ANALYSIS',
        typeof data?.creditsUsed === 'number' ? data.creditsUsed : credits,
        typeof data?.newBalance === 'number' ? data.newBalance : undefined,
        { featureName: 'GTM Strategist' }
      );
    } catch (err) {
      console.error('GTM analysis error:', err);
      toast.error('Something went wrong. Please try again.');
      setPhase('intake');
    }
  }, [user, ensureCredits, handleCreditError, showCreditReceipt]);

  const savePlan = useCallback(async (status: 'draft' | 'saved' | 'exported') => {
    if (!user) {
      toast.error('Sign in to save your GTM plan.');
      return;
    }
    if (!analysis) return;

    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        plan_title: analysis.planTitle,
        plan_content: analysis,
        status,
        saved_at: status === 'saved' || status === 'exported' ? new Date().toISOString() : null,
        exported_at: status === 'exported' ? new Date().toISOString() : null,
      };

      const query = planId
        ? supabase.from(GTM_TABLE).update(payload).eq('id', planId).select('id').single()
        : supabase.from(GTM_TABLE).insert(payload).select('id').single();

      const { data, error } = await query;

      if (error) {
        console.error('Failed to save GTM plan:', error);
        toast.error('Unable to save GTM plan right now.');
        return;
      }

      if (!planId) {
        setPlanId((data as any)?.id ?? null);
      }

      if (status === 'draft') {
        toast.success('GTM draft saved.');
      } else if (status === 'saved') {
        toast.success('GTM plan saved. Stage V marked complete.');
        await ensureMentorDemandNotification(user.id, 'gtm', {
          summaryInsight: analysis.summaryInsight,
        });
        await trackActivity(
          'mentor_liquidity_triggered',
          {
            track: 'gtm',
            source: 'gtm-save',
            status,
          },
          user.id,
        );
        await refreshProgress();
      } else {
        toast.success('GTM plan exported. Stage V marked complete.');
        await ensureMentorDemandNotification(user.id, 'gtm', {
          summaryInsight: analysis.summaryInsight,
        });
        await trackActivity(
          'mentor_liquidity_triggered',
          {
            track: 'gtm',
            source: 'gtm-save',
            status,
          },
          user.id,
        );
        await refreshProgress();
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Unable to save GTM plan right now.');
    } finally {
      setIsSaving(false);
    }
  }, [user, analysis, planId, refreshProgress]);

  const exportPlan = useCallback(async () => {
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

      addLine(analysis.planTitle, 18, true);
      addLine('GTM Strategy Brief — Creatives Takeover', 10, false, '#6b7280');
      y += 4;
      addLine(analysis.summaryInsight, 10);

      addSection('RECOMMENDED CHANNELS');
      analysis.channels.forEach((ch, i) => {
        addLine(`${i + 1}. ${ch.channel} — ${ch.fitScore}/10 fit${ch.isStretch ? ' (Stretch)' : ''}`, 11, true);
        addLine(ch.fitReason, 9, false, '#374151');
        ch.tactics.forEach(t => addLine(`  • ${t.title}: ${t.description} (${t.frequency}, ${t.timeEstimate})`, 9));
        addLine('  This week: ' + ch.weekOneActions.join(' | '), 9, false, '#374151');
        addLine('  Avoid: ' + ch.doNotDo.join(' | '), 9, false, '#ef4444');
        y += 2;
      });

      addSection('POSITIONING STATEMENT');
      addLine(analysis.positioning.positioningStatement, 10);
      addLine('UVP: ' + analysis.positioning.uniqueValueProposition, 10);
      analysis.positioning.keyDifferentiators.forEach(d => addLine(`  • ${d}`, 9));

      addSection('MESSAGING HIERARCHY');
      addLine('Headline: ' + analysis.messaging.headline, 11, true);
      addLine('Hook: ' + analysis.messaging.hookLine, 10);
      addLine('Proof: ' + analysis.messaging.proofPoint, 10);
      addLine('CTA: ' + analysis.messaging.ctaCopy, 10);

      addSection('30-DAY ACTION PLAN');
      addLine('Week 1', 10, true);
      analysis.actionPlan.week1.forEach(t => addLine(`  • ${t}`, 9));
      addLine('Week 2', 10, true);
      analysis.actionPlan.week2.forEach(t => addLine(`  • ${t}`, 9));
      addLine('Weeks 3–4', 10, true);
      analysis.actionPlan.weeks3to4.forEach(t => addLine(`  • ${t}`, 9));

      addSection('KEY METRICS');
      analysis.metrics.primary.forEach(m => {
        addLine(`${m.name}: ${m.target}`, 10, true);
        addLine(`  Why: ${m.why}`, 9);
        addLine(`  How to measure: ${m.howToMeasure}`, 9);
      });

      doc.save(`${analysis.planTitle.replace(/\s+/g, '-').toLowerCase()}-gtm-brief.pdf`);
      toast.success('PDF exported.');
      await savePlan('exported');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('PDF export failed. Your plan has been saved instead.');
      await savePlan('saved');
    } finally {
      setIsExporting(false);
    }
  }, [analysis, savePlan]);

  const resetToIntake = useCallback(() => {
    setAnalysis(null);
    setPlanId(null);
    setPhase('intake');
  }, []);

  return {
    phase,
    analysis,
    planId,
    isSaving,
    isExporting,
    prefillData,
    prefillSource,
    runAnalysis,
    savePlan,
    exportPlan,
    resetToIntake,
  };
}
