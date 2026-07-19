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
  isGTMPlanV2,
  type GTMIntakeV2,
  type GTMPlanV2,
  type GTMPlay,
  type GTMWeeklyReview,
  type GTMWeeklyReviewInput,
} from '@/lib/gtmV2';
import { evaluateGTMOutcome } from '@/lib/gtmOutcome';
import {
  createJourneyEvidenceManifest,
  trackJourneyEvent,
  upsertJourneyOutcome,
} from '@/lib/journeyOutcomes';

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

export interface GTMMVPProjectOption {
  id: string;
  title: string;
  deploymentUrl: string | null;
  deploymentStatus: string;
  updatedAt: string;
  prefill: Partial<GTMIntakeV2>;
}

const GTM_TABLE = 'gtm_plans' as any;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const textValue = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const createMvpProjectPrefill = (row: Record<string, unknown>): Partial<GTMIntakeV2> => {
  const metadata = asRecord(row.metadata);
  const setupInput = asRecord(metadata.setupInput);
  const deploymentUrl = textValue(row.deployment_url);
  return {
    productName: textValue(row.title) || textValue(setupInput.productName),
    productUrl: deploymentUrl,
    lifecycle: deploymentUrl || row.deployment_status === 'deployed' ? 'live' : 'launch_ready',
    targetSegment: textValue(setupInput.validatedTargetSegment),
    problem: textValue(setupInput.validatedProblemStatement) || textValue(setupInput.keyPainLanguage),
    solution: textValue(setupInput.oneLineDescription),
  };
};

const syncGTMJourneyOutcome = async (userId: string, artifactId: string, plan: GTMPlanV2) => {
  try {
    const outcome = evaluateGTMOutcome(plan);
    const evidenceManifest = createJourneyEvidenceManifest([
      ...plan.researchSources.map((source, index) => ({
        sourceId: source.id || source.url || `gtm-research-${index + 1}`,
        sourceType: 'market_research',
        version: '1',
        capturedAt: source.verifiedAt || source.publishedDate || plan.generatedAt,
        confidence: plan.researchStatus === 'complete' ? 0.85 : plan.researchStatus === 'limited' ? 0.6 : 0.3,
        provenance: source.url ? 'external_cited_source' : 'research_summary',
        label: source.title,
        url: source.url || null,
      })),
      ...(plan.evidenceItems ?? []).map((source) => ({
        sourceId: source.id,
        sourceType: source.kind,
        version: '1',
        capturedAt: source.createdAt || source.sourceDate || plan.generatedAt,
        confidence: source.verified ? 0.9 : 0.5,
        provenance: source.verified ? 'founder_verified_evidence' : 'founder_supplied_evidence',
        label: source.title,
        url: source.url || null,
      })),
    ], plan.generatedAt);

    await upsertJourneyOutcome({
      userId,
      tool: 'gtm_strategist',
      artifactType: 'gtm_acquisition_play',
      artifactId,
      status: outcome.status,
      qualityChecks: outcome.checks,
      evidenceManifest,
      completionScore: outcome.completionScore,
    });
    return outcome;
  } catch (error) {
    console.warn('Could not synchronize the GTM journey outcome:', error);
    return null;
  }
};

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
  const [prefillV2, setPrefillV2] = useState<Partial<GTMIntakeV2>>({});
  const [selectedMvpProjectId, setSelectedMvpProjectId] = useState<string | null>(null);
  const [mvpProjects, setMvpProjects] = useState<GTMMVPProjectOption[]>([]);
  const [isLoadingMvpProjects, setIsLoadingMvpProjects] = useState(true);
  const [weeklyReview, setWeeklyReview] = useState<GTMWeeklyReview | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isRestoringPlan, setIsRestoringPlan] = useState(true);

  // On mount: restore explicitly saved GTM work and load available MVP import sources.
  useEffect(() => {
    if (!user) return;
    void loadExistingPlan();
    void loadMvpProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [user]);

  const loadExistingPlan = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from(GTM_TABLE)
        .select('id, plan_title, plan_content, status, schema_version')
        .eq('user_id', user.id)
        .in('status', ['saved', 'exported'])
        .eq('schema_version', 2)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return;

      const content = (data as any).plan_content;
      if (isGTMPlanV2(content)) {
        setAnalysis(content as GTMAnalysis | GTMPlanV2);
        setPlanId((data as any).id);
        setPrefillV2(content.intake);
        setPhase('results');
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
              changedVariables: latestReview.adaptation.changedVariables ?? [],
              rationale: latestReview.adaptation.rationale ?? undefined,
            } : undefined,
            reviewInput: latestReview.review_input ?? undefined,
            signals: latestReview.signals ?? [],
            changeLog: latestReview.change_log ?? [],
            healthSnapshot: latestReview.health_snapshot ?? undefined,
            createdAt: reviewData.created_at,
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load existing GTM plan:', err);
    } finally {
      setIsRestoringPlan(false);
    }
  }, [user]);

  const loadMvpProjects = useCallback(async () => {
    if (!user) {
      setMvpProjects([]);
      setIsLoadingMvpProjects(false);
      return;
    }
    setIsLoadingMvpProjects(true);
    try {
      const { data, error } = await supabase
        .from('mvp_projects' as any)
        .select('id,title,deployment_url,deployment_status,metadata,updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setMvpProjects((data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        title: textValue(row.title) || 'Untitled MVP',
        deploymentUrl: textValue(row.deployment_url) || null,
        deploymentStatus: textValue(row.deployment_status) || 'not_deployed',
        updatedAt: textValue(row.updated_at),
        prefill: createMvpProjectPrefill(row),
      })));
    } catch (error) {
      console.warn('Failed to load MVP Builder projects for GTM import:', error);
      setMvpProjects([]);
    } finally {
      setIsLoadingMvpProjects(false);
    }
  }, [user]);

  const importMvpProject = useCallback((projectId: string) => {
    const project = mvpProjects.find((item) => item.id === projectId);
    if (!project) {
      toast.error('Select an MVP Builder project to continue.');
      return;
    }
    setSelectedMvpProjectId(project.id);
    setPrefillV2(project.prefill);
  }, [mvpProjects]);

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
      if (data.planId ?? data.analysis.planId) {
        void syncGTMJourneyOutcome(user.id, data.planId ?? data.analysis.planId, data.analysis);
      }
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
    const activatedPlay = { ...play, tractionSprintId: sprintId };
    await updatePlay(activatedPlay);
    captureEvent('gtm_traction_sprint_started', { plan_id: planId, play_id: play.id, channel_id: play.channelId, sprint_id: sprintId });
    if (analysis && isGTMPlanV2(analysis)) {
      const activatedPlan = { ...analysis, plays: analysis.plays.map((item) => item.id === play.id ? activatedPlay : item) };
      const outcome = await syncGTMJourneyOutcome(user.id, planId, activatedPlan);
      trackJourneyEvent('journey_next_stage_started', {
        tool: 'traction_engine',
        source: 'gtm_strategist',
        artifact_type: 'traction_sprint',
        artifact_id: sprintId,
        gtm_plan_id: planId,
        gtm_play_id: play.id,
      });
      if (outcome?.status === 'verified') {
        trackJourneyEvent('journey_stage_outcome_completed', {
          tool: 'gtm_strategist',
          artifact_type: 'gtm_acquisition_play',
          artifact_id: planId,
          outcome_status: 'verified',
          completion_score: outcome.completionScore,
        });
      }
    }
    toast.success(`${play.channelName} sprint is active.`);
  }, [analysis, planId, updatePlay, user]);

  const updateV2Plan = useCallback(async (nextPlan: GTMPlanV2) => {
    if (!user || !planId || !analysis || !isGTMPlanV2(analysis)) return;
    const previousPlan = analysis;
    setAnalysis(nextPlan);
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
    if (nextPlan.evidenceItems?.length) writes.push((supabase as any).from('gtm_evidence_items').upsert(nextPlan.evidenceItems.map((item) => ({
      id: item.id, user_id: user.id, plan_id: planId, evidence_kind: item.kind, title: item.title,
      content: item.content, source_url: item.url ?? null, source_date: item.sourceDate ?? null,
      verified: item.verified, channel_ids: item.channelIds ?? [], created_at: item.createdAt ?? new Date().toISOString(),
    })), { onConflict: 'plan_id,id' }));
    if (nextPlan.claimAttributions?.length) writes.push((supabase as any).from('gtm_claim_attributions').upsert(nextPlan.claimAttributions.map((claim) => ({
      id: claim.id, user_id: user.id, plan_id: planId, claim: claim.claim, area: claim.area,
      source_ids: claim.sourceIds, confidence: claim.confidence, assumption: claim.assumption,
    })), { onConflict: 'plan_id,id' }));
    if (nextPlan.pipeline?.length) writes.push((supabase as any).from('gtm_pipeline_entries').upsert(nextPlan.pipeline.map((entry) => ({
      id: entry.id, user_id: user.id, plan_id: planId, play_id: entry.playId, name: entry.name,
      stage: entry.stage, value: entry.value, source_channel_id: entry.sourceChannelId,
      momentum: entry.momentum, occurred_at: entry.occurredAt, notes: entry.notes ?? null,
    }))));
    const removedEvidenceIds = (previousPlan.evidenceItems ?? []).filter((item) => !(nextPlan.evidenceItems ?? []).some((next) => next.id === item.id)).map((item) => item.id);
    if (removedEvidenceIds.length) writes.push((supabase as any).from('gtm_evidence_items').delete().eq('plan_id', planId).eq('user_id', user.id).in('id', removedEvidenceIds));
    const removedPipelineIds = (previousPlan.pipeline ?? []).filter((entry) => !(nextPlan.pipeline ?? []).some((next) => next.id === entry.id)).map((entry) => entry.id);
    if (removedPipelineIds.length) writes.push((supabase as any).from('gtm_pipeline_entries').delete().eq('plan_id', planId).eq('user_id', user.id).in('id', removedPipelineIds));
    const writeResults = await Promise.allSettled(writes);
    const normalizedWriteFailed = writeResults.some((result) =>
      result.status === 'rejected' || Boolean((result.value as { error?: unknown } | undefined)?.error));
    if (normalizedWriteFailed) {
      setAnalysis(previousPlan);
      toast.error('Could not save every GTM workspace record. No snapshot change was committed.');
      return;
    }
    const { error } = await supabase
      .from('gtm_plans')
      .update({ plan_content: nextPlan as any })
      .eq('id', planId)
      .eq('user_id', user.id);
    if (error) {
      setAnalysis(previousPlan);
      toast.error('Could not save this GTM workspace change.');
    }
  }, [analysis, planId, user]);

  const runWeeklyReview = useCallback(async (reviewInput: GTMWeeklyReviewInput) => {
    if (!planId || !user) return;
    setIsReviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke('gtm-plan-review', { body: { planId, reviewInput } });
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
          changedVariables: row.adaptation.changedVariables ?? [],
          rationale: row.adaptation.rationale ?? undefined,
        } : undefined,
        reviewInput: row.review_input ?? reviewInput,
        signals: row.signals ?? [],
        changeLog: row.change_log ?? [],
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

      if (isGTMPlanV2(analysis)) {
        await syncGTMJourneyOutcome(user.id, (data as { id?: string })?.id ?? planId ?? analysis.planId ?? 'gtm-plan', analysis);
      }

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

  const resumeWorkspace = useCallback(() => {
    if (analysis && isGTMPlanV2(analysis) && planId) setPhase('results');
  }, [analysis, planId]);

  return {
    phase,
    analysis,
    planId,
    isSaving,
    isExporting,
    isReviewing,
    isRestoringPlan,
    prefillV2,
    selectedMvpProjectId,
    mvpProjects,
    isLoadingMvpProjects,
    weeklyReview,
    runAnalysis,
    runV2Analysis,
    updatePlay,
    startPlaySprint,
    updateV2Plan,
    runWeeklyReview,
    savePlan,
    exportPlan,
    importMvpProject,
    openDiagnose,
    resumeWorkspace,
    resetToIntake,
  };
}
