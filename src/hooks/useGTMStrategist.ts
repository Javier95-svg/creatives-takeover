import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useCreditActions } from '@/hooks/useCreditActions';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { showDashboardReturnToast } from '@/components/dashboard/dashboardReturnToast';
import { ensureMentorDemandNotification } from '@/lib/mentorDemandNotifications';
import { trackActivity } from '@/lib/activity';
import { markFirstArtifactCreated, trackCurrentActivationJourneyEvent } from '@/lib/retentionSystem';
import {
  trackGTMIntakeCompleted,
  trackGTMPlanGenerated,
  trackGTMPlanSaved,
  trackToolOutputCreated,
  captureEvent,
} from '@/lib/analytics';
import { createIdempotencyKey } from '@/lib/idempotency';
import {
  createLegacyUpgradeIntake,
  isGTMPlanV2,
  type GTMIntakeV2,
  type GTMPlanV2,
  type GTMPlay,
  type GTMWeeklyReview,
} from '@/lib/gtmV2';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshProgress } = useBizMapProgress();
  const { ensureCredits, handleCreditError, showCreditReceipt } = useCreditActions();

  const [phase, setPhase] = useState<Phase>('intake');
  const [analysis, setAnalysis] = useState<GTMAnalysis | GTMPlanV2 | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [prefillData, setPrefillData] = useState<Partial<GTMIntakeAnswers>>({});
  const [prefillV2, setPrefillV2] = useState<Partial<GTMIntakeV2>>({});
  const [prefillSource, setPrefillSource] = useState<'waitlist_launch_kit' | 'icp_builder' | null>(null);
  const [weeklyReview, setWeeklyReview] = useState<GTMWeeklyReview | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  // On mount: load existing plan or prefill data
  useEffect(() => {
    if (!user) return;
    void loadExistingPlan();
    void loadPrefillData();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
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
      // Saved plans are context only on a fresh visit. The founder must review
      // and submit the intake before any diagnostic is shown.
      if (content && content.channels && content.positioning) {
        setAnalysis(content as GTMAnalysis | GTMPlanV2);
        setPlanId((data as any).id);
        if (isGTMPlanV2(content)) {
          setPrefillV2(content.intake);
          const { data: reviewData } = await supabase
            .from('gtm_weekly_reviews')
            .select('*')
            .eq('plan_id', (data as any).id)
            .eq('user_id', user.id)
            .order('week_start', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (reviewData) {
            const latestReview = reviewData as any;
            setWeeklyReview({
              id: reviewData.id,
              planId: reviewData.plan_id,
              weekStart: reviewData.week_start,
              decision: reviewData.decision as GTMWeeklyReview['decision'],
              nextBestAction: reviewData.next_best_action,
              evidenceSummary: reviewData.evidence_summary,
              activePlayId: reviewData.play_id ?? undefined,
              tractionExperimentId: reviewData.traction_experiment_id ?? undefined,
              adaptation: latestReview.adaptation ? {
                week: Number(latestReview.adaptation.week),
                previousObjective: latestReview.adaptation.previousObjective ?? undefined,
                nextObjective: latestReview.adaptation.nextObjective,
                nextActions: latestReview.adaptation.nextActions ?? [],
              } : undefined,
              healthSnapshot: latestReview.health_snapshot ?? undefined,
              createdAt: reviewData.created_at,
            });
          }
        } else {
          setPrefillV2(createLegacyUpgradeIntake(content as Record<string, any>));
        }
      }
    } catch (err) {
      console.warn('Failed to load existing GTM plan:', err);
    }
  }, [user]);

  const loadPrefillData = useCallback(async () => {
    if (!user) return;
    try {
      const [pmfResult, mvpResult, tractionResult] = await Promise.all([
        supabase
          .from('pmf_analysis_results' as any)
          .select('analysis_data,target_market,pmf_score')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('mvp_projects' as any)
          .select('title,deployment_url,deployment_status,metadata')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('traction_engine_weekly_logs' as any)
          .select('new_users,primary_acquisition_channel,revenue,combined_score')
          .eq('user_id', user.id)
          .order('week_start_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      const pmf = pmfResult.data as any;
      const mvp = mvpResult.data as any;
      const traction = tractionResult.data as any;
      setPrefillV2((current) => ({
        ...current,
        productName: mvp?.title || current.productName,
        productUrl: mvp?.deployment_url || current.productUrl,
        lifecycle: mvp?.deployment_url || mvp?.deployment_status === 'deployed' ? 'live' : current.lifecycle ?? 'launch_ready',
        targetSegment: pmf?.target_market || current.targetSegment,
        currentTraction: traction
          ? `${traction.new_users ?? 0} new users last week via ${traction.primary_acquisition_channel || 'unattributed'}${traction.revenue ? `; $${traction.revenue} revenue` : ''}; traction score ${traction.combined_score ?? 0}/100`
          : current.currentTraction,
      }));

      const { data: waitlistData } = await (supabase as any)
        .from('waitlist_pages')
        .select('product_name, metadata, ai_content')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const waitlistMetadata = (waitlistData as any)?.metadata;
      const waitlistPositioning = waitlistMetadata?.projectContext?.positioningStatement;
      if (typeof waitlistPositioning === 'string' && waitlistPositioning.trim()) {
        const waitlistContent = (waitlistData as any)?.ai_content;
        setPrefillV2((current) => ({
          ...current,
          productName: (waitlistData as any)?.product_name || current.productName,
          targetSegment: typeof waitlistContent?.subheadline === 'string' ? waitlistContent.subheadline : current.targetSegment,
          problem: waitlistPositioning.trim(),
          solution: waitlistPositioning.trim(),
        }));
        setPrefillData({
          targetAudience: typeof waitlistContent?.subheadline === 'string' ? waitlistContent.subheadline : undefined,
          problemAndSolution: waitlistPositioning.trim(),
        });
        setPrefillSource('waitlist_launch_kit');
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
        setPrefillV2((current) => ({
          ...current,
          targetSegment: prefill.targetAudience || current.targetSegment,
          problem: prefill.problemAndSolution || current.problem,
          solution: prefill.problemAndSolution || current.solution,
          buyingTrigger: analysisData?.behavioralTriggers?.[0] || analysisData?.nicheProfile?.buyingTrigger || current.buyingTrigger,
        }));
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
    trackGTMIntakeCompleted();

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
      trackGTMPlanGenerated({ channel_count: (data.analysis as GTMAnalysis)?.channels?.length ?? 0 });
      trackToolOutputCreated('gtm_strategist', 'gtm_plan');
      void trackCurrentActivationJourneyEvent(user.id, 'activation_first_output_generated', { intent: 'plan_gtm', tool: 'gtm_strategist' });
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

  const runV2Analysis = useCallback(async (intake: GTMIntakeV2, regenerate = false) => {
    if (!user) {
      toast.error('Sign in to build your GTM system.');
      return;
    }
    const credits = ensureCredits('GTM_ANALYSIS');
    if (credits === null) return;
    setPhase('analyzing');
    trackGTMIntakeCompleted({ schema_version: 2, business_model: intake.businessModel });
    try {
      const idempotencyKey = createIdempotencyKey('gtm-v2', `${user.id}-${regenerate ? planId ?? 'new' : 'new'}`);
      const { data, error } = await supabase.functions.invoke('gtm-analyzer', {
        headers: { 'Idempotency-Key': idempotencyKey },
        body: { schemaVersion: 2, planId: regenerate ? planId : undefined, intake },
      });
      if (error || !data?.success || !isGTMPlanV2(data.analysis)) {
        const wasCreditError = handleCreditError(error, data, 'GTM_ANALYSIS');
        if (!wasCreditError) toast.error(data?.error || 'GTM system generation failed. Please try again.');
        setPhase(regenerate && analysis ? 'results' : 'intake');
        return;
      }
      setAnalysis(data.analysis);
      setPrefillV2(data.analysis.intake);
      setPlanId(data.planId ?? data.analysis.planId ?? null);
      setWeeklyReview(null);
      setPhase('results');
      trackGTMPlanGenerated({ channel_count: data.analysis.channels.length, schema_version: 2, research_status: data.analysis.researchStatus });
      captureEvent('gtm_research_completed', { status: data.analysis.researchStatus, source_count: data.analysis.researchSources.length });
      trackToolOutputCreated('gtm_strategist', 'gtm_plan', { schema_version: 2 });
      void trackCurrentActivationJourneyEvent(user.id, 'activation_first_output_generated', { intent: 'plan_gtm', tool: 'gtm_strategist' });
      showCreditReceipt('GTM_ANALYSIS', typeof data.creditsUsed === 'number' ? data.creditsUsed : credits, typeof data.newBalance === 'number' ? data.newBalance : undefined, { featureName: 'GTM Strategist' });
    } catch (error) {
      console.error('GTM V2 generation error:', error);
      toast.error('Something went wrong while building your GTM system.');
      setPhase(regenerate && analysis ? 'results' : 'intake');
    }
  }, [analysis, ensureCredits, handleCreditError, planId, showCreditReceipt, user]);

  const updatePlay = useCallback(async (nextPlay: GTMPlay) => {
    if (!user || !planId || !analysis || !isGTMPlanV2(analysis)) return;
    const nextAnalysis: GTMPlanV2 = { ...analysis, plays: analysis.plays.map((play) => play.id === nextPlay.id ? nextPlay : play) };
    setAnalysis(nextAnalysis);
    const directoryRows = Object.entries(nextPlay.directoryProgress ?? {}).map(([directoryId, status]) => ({
      user_id: user.id, plan_id: planId, play_id: nextPlay.id, directory_id: directoryId, status,
      updated_at: new Date().toISOString(),
    }));
    const [{ error: playError }, { error: planError }, directoryResult] = await Promise.all([
      supabase.from('gtm_plays').update({ status: nextPlay.status, play_content: nextPlay as any }).eq('id', nextPlay.id).eq('user_id', user.id),
      supabase.from('gtm_plans').update({ plan_content: nextAnalysis as any }).eq('id', planId).eq('user_id', user.id),
      directoryRows.length > 0
        ? (supabase as any).from('gtm_directory_actions').upsert(directoryRows, { onConflict: 'play_id,directory_id' })
        : Promise.resolve({ error: null }),
    ]);
    if (playError || planError || directoryResult.error) {
      setAnalysis(analysis);
      toast.error('Could not save this play.');
      return;
    }
    captureEvent('gtm_play_updated', { plan_id: planId, play_id: nextPlay.id, channel_id: nextPlay.channelId, status: nextPlay.status });
    toast.success('Play updated.');
  }, [analysis, planId, user]);

  const startPlaySprint = useCallback(async (play: GTMPlay) => {
    if (!user || !planId) return;
    const { data: activeRows, error: activeError } = await supabase
      .from('traction_engine_sprints')
      .select('id,channel,status')
      .eq('user_id', user.id)
      .eq('status', 'active');
    if (activeError) {
      toast.error('Could not check active Traction sprints.');
      return;
    }
    const existing = activeRows?.find((row) => row.channel.trim().toLowerCase() === play.channelName.trim().toLowerCase());
    let sprintId = existing?.id;
    if (existing) {
      const { error } = await supabase.from('traction_engine_sprints').update({
        source_gtm_plan_id: planId, source_gtm_play_id: play.id,
      }).eq('id', existing.id).eq('user_id', user.id);
      if (error) {
        toast.error('Could not link the existing sprint.');
        return;
      }
    } else {
      if ((activeRows?.length ?? 0) >= 2) {
        toast.error('Traction Engine supports two active channels. Close one before starting this sprint.');
        return;
      }
      const { data, error } = await supabase.from('traction_engine_sprints').insert({
        user_id: user.id, channel: play.channelName, cycle_start_date: new Date().toISOString().slice(0, 10),
        status: 'active', source_gtm_plan_id: planId, source_gtm_play_id: play.id,
      }).select('id').single();
      if (error || !data) {
        toast.error('Could not start this Traction sprint.');
        return;
      }
      sprintId = data.id;
    }
    await updatePlay({ ...play, tractionSprintId: sprintId });
    captureEvent('gtm_traction_sprint_started', { plan_id: planId, play_id: play.id, channel_id: play.channelId, sprint_id: sprintId });
    toast.success(`${play.channelName} sprint is active.`);
  }, [planId, updatePlay, user]);

  const updateV2Plan = useCallback(async (nextPlan: GTMPlanV2) => {
    if (!user || !planId || !analysis || !isGTMPlanV2(analysis)) return;
    const previousPlan = analysis;
    setAnalysis(nextPlan);
    const { error } = await supabase
      .from('gtm_plans')
      .update({ plan_content: nextPlan as any })
      .eq('id', planId)
      .eq('user_id', user.id);
    if (error) {
      setAnalysis(previousPlan);
      toast.error('Could not save this GTM workspace change.');
      return;
    }

    const writes: Array<PromiseLike<unknown>> = [];
    if (nextPlan.tasks?.length) writes.push((supabase as any).from('gtm_tasks').upsert(nextPlan.tasks.map((task) => ({
      id: task.id, user_id: user.id, plan_id: planId, play_id: task.playId || null, week_number: task.week,
      title: task.title, detail: task.detail, owner_label: task.owner, time_estimate_minutes: task.timeEstimateMinutes,
      expected_output: task.output, metric: task.metric, status: task.status, completed_at: task.completedAt ?? null,
    }))));
    if (nextPlan.assets?.length) writes.push((supabase as any).from('gtm_play_assets').upsert(nextPlan.assets.map((asset) => ({
      id: asset.id, user_id: user.id, plan_id: planId, play_id: asset.playId, asset_type: asset.type,
      title: asset.title, content: asset.content, status: asset.status,
    }))));
    if (nextPlan.competitorBriefs?.length) writes.push((supabase as any).from('gtm_competitor_briefs').upsert(nextPlan.competitorBriefs.map((competitor) => ({
      id: competitor.id, user_id: user.id, plan_id: planId, brief: competitor,
    }))));
    await Promise.allSettled(writes);
  }, [analysis, planId, user]);

  const runWeeklyReview = useCallback(async () => {
    if (!planId || !user) return;
    setIsReviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke('gtm-plan-review', { body: { planId } });
      if (error || !data?.success || !data.review) throw error || new Error(data?.error || 'Review failed');
      const row = data.review as any;
      const review: GTMWeeklyReview = {
        id: row.id,
        planId: row.plan_id,
        weekStart: row.week_start,
        decision: row.decision,
        nextBestAction: row.next_best_action,
        evidenceSummary: row.evidence_summary,
        activePlayId: row.play_id ?? undefined,
        tractionExperimentId: row.traction_experiment_id ?? undefined,
        adaptation: row.adaptation ? {
          week: Number(row.adaptation.week),
          previousObjective: row.adaptation.previousObjective ?? undefined,
          nextObjective: row.adaptation.nextObjective,
          nextActions: row.adaptation.nextActions ?? [],
        } : undefined,
        healthSnapshot: row.health_snapshot ?? undefined,
        createdAt: row.created_at,
      };
      setWeeklyReview(review);
      if (isGTMPlanV2(data.analysis)) setAnalysis(data.analysis);
      captureEvent('gtm_weekly_review_completed', { plan_id: planId, decision: review.decision });
      toast.success('Weekly GTM review saved.');
    } catch (error) {
      console.error('Weekly GTM review failed:', error);
      toast.error('Could not complete the weekly review.');
    } finally {
      setIsReviewing(false);
    }
  }, [planId, user]);

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

      trackGTMPlanSaved({ status });

      if (status === 'draft') {
        toast.success('GTM draft saved.');
      } else if (status === 'saved') {
        await markFirstArtifactCreated({
          userId: user.id,
          artifactType: 'gtm_plan',
          artifactId: (data as { id?: string })?.id ?? planId,
          resumeUrl: '/go-to-market',
          label: analysis.planTitle,
          source: 'gtm_strategist',
        });
        showDashboardReturnToast({
          message: 'GTM plan saved. Stage V marked complete.',
          tool: 'gtm-strategist',
          navigate,
        });
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
        showDashboardReturnToast({
          message: 'GTM plan exported. Stage V marked complete.',
          tool: 'gtm-strategist',
          navigate,
        });
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
  }, [user, analysis, planId, refreshProgress, navigate]);

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

      if (isGTMPlanV2(analysis)) {
        addSection('GTM THESIS');
        addLine(`Motion: ${analysis.thesis.motion.replaceAll('_', ' ')}`, 10, true);
        addLine(`Target: ${analysis.thesis.target}`, 10);
        addLine(`Buying trigger: ${analysis.thesis.buyingTrigger}`, 10);
        addLine(`Competitive alternative: ${analysis.thesis.competitiveAlternative}`, 10);
        addLine(analysis.thesis.rationale, 10);

        addSection('CHANNEL BETS');
        analysis.channels.forEach((channel, index) => {
          addLine(`${index + 1}. ${channel.name} — ${channel.score}/100 (${channel.role})`, 11, true);
          addLine(channel.rationale, 9);
          addLine(`Confidence: ${channel.confidence} · prerequisites: ${channel.prerequisites.join(' | ')}`, 9, false, '#374151');
        });

        addSection('POSITIONING & MESSAGE');
        addLine(analysis.positioning.positioningStatement, 10);
        addLine(`Headline: ${analysis.messaging.headline}`, 11, true);
        addLine(`Hook: ${analysis.messaging.hookLine}`, 10);
        addLine(`CTA: ${analysis.messaging.ctaCopy}`, 10);

        addSection('SIX-WEEK EXECUTION');
        analysis.sixWeekPlan.forEach((week) => {
          addLine(`Week ${week.week}: ${week.objective}`, 10, true);
          week.actions.forEach((action) => addLine(`  • ${action}`, 9));
        });

        addSection('MEASUREMENT');
        addLine(`Primary outcome: ${analysis.metrics.primaryOutcome}`, 10, true);
        analysis.metrics.leading.forEach((metric) => addLine(`${metric.name}: ${metric.target} — ${metric.howToMeasure}`, 9));

        addSection('RESEARCH SOURCES');
        addLine(`Research status: ${analysis.researchStatus}`, 10, true);
        analysis.researchSources.forEach((source, index) => addLine(`${index + 1}. ${source.title} — ${source.url}`, 8));

        doc.save(`${analysis.planTitle.replace(/\s+/g, '-').toLowerCase()}-gtm-system.pdf`);
        toast.success('PDF exported.');
        await savePlan('exported');
        return;
      }

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

  const openDiagnose = useCallback(() => {
    setPhase('intake');
  }, []);

  return {
    phase,
    analysis,
    planId,
    isSaving,
    isExporting,
    isReviewing,
    prefillData,
    prefillV2,
    prefillSource,
    weeklyReview,
    runAnalysis,
    runV2Analysis,
    updatePlay,
    startPlaySprint,
    updateV2Plan,
    runWeeklyReview,
    savePlan,
    exportPlan,
    openDiagnose,
    resetToIntake,
  };
}
