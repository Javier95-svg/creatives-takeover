import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import RelatedToolsSection from '@/components/seo/RelatedToolsSection';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { Button } from '@/components/ui/button';
import { DashboardDisclosure } from '@/components/dashboard/DashboardDisclosure';
import { ToolPageShell } from '@/components/tool-shell/ToolPageShell';
import { NextStepCard } from '@/components/tool-shell/NextStepCard';
import { ToolEmptyState } from '@/components/tool-shell/ToolEmptyState';
import TractionLogbookWallpaper, { TractionLogbookChart } from '@/components/wallpapers/TractionLogbookWallpaper';
import { TractionExperimentCard, type TractionExperimentDraft } from '@/components/traction/TractionExperimentCard';
import { TractionRetentionCard } from '@/components/traction/TractionRetentionCard';
import { showDashboardReturnToast } from '@/components/dashboard/dashboardReturnToast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  PRODUCT_CATEGORY_LABELS,
  TRACTION_CALCULATION_VERSION,
  calculateConsecutiveLoggedWeeks,
  calculateTractionScore,
  getCohortRate,
  getCurrentWeekStart,
  getDefaultCohortWeek,
  getRetentionWindowStatus,
  getSprintWeekNumber,
  isSprintAtBoundary,
  type TractionRetentionInput,
} from '@/lib/tractionEngine';
import { getTractionNextStep } from '@/lib/tractionNextStep';
import { exportTractionReportPdf } from '@/lib/tractionReport';
import { markFirstArtifactCreated } from '@/lib/retentionSystem';
import {
  captureEvent,
  trackToolOpened,
  trackToolOutputCreated,
  trackTractionBoundaryDecision,
  trackTractionExperimentLogged,
  trackTractionOpened,
  trackTractionSprintCreated,
  trackTractionWeeklyLogCompleted,
} from '@/lib/analytics';
import { evaluateGTMKillRule, type GTMKillRule, type GTMKillRuleStatus, type GTMPlay } from '@/lib/gtmV2';
import {
  evaluateDecisionReadiness,
  mapVerificationClaim,
  normalizeAcquisitionMetric,
  type VerificationClaim,
} from '@/lib/marketExperiment';
import {
  createNextMarketExperimentVersion,
  evaluateMarketExperiment,
  recordExperimentDecision,
  recordFounderObservation,
} from '@/lib/marketExperimentClient';
import {
  createJourneyEvidenceManifest,
  listJourneyAssumptions,
  recordJourneyAssumptionSignal,
  trackJourneyEvent,
  type JourneyAssumption,
  upsertJourneyOutcome,
} from '@/lib/journeyOutcomes';
import { getInboundHandoff } from '@/lib/journeyHandoffInbox';
import { useOutcomeJourney } from '@/hooks/useOutcomeJourney';

const SPRINTS_TABLE = 'traction_engine_sprints' as const;
const LOGS_TABLE = 'traction_engine_weekly_logs' as const;
const EXPERIMENTS_TABLE = 'traction_engine_experiments' as const;
const DRAFT_KEY = 'ct_traction_draft';
const PURPOSE = 'Log what you tried each week, see what worked, and decide what to do next.';

type SprintRow = {
  id: string;
  channel: string;
  cycle_start_date: string;
  status: 'active' | 'closed';
  source_gtm_plan_id?: string | null;
  source_gtm_play_id?: string | null;
  activation_payload?: { killRule?: GTMKillRule; marketExperimentId?: string; sourceSprintId?: string; audience?: string; offer?: string; firstBuyerSignal?: boolean; hypothesis?: string; targetMetric?: string; targetValue?: number; minimumSampleSize?: number; actionPacket?: { minimumSampleSize?: number; targetMetric?: string; targetValue?: number } } | null;
  kill_rule_status?: GTMKillRuleStatus;
};

type WeeklyLogRow = {
  id: string;
  week_start_date: string;
  combined_score: number;
  phase_seven_ready: boolean;
  prioritized_recommendation: string;
  score_breakdown?: { retentionSource?: string } | null;
};

const createExperimentDraft = (): TractionExperimentDraft => ({
  localId: crypto.randomUUID(),
  channel: '',
  hypothesis: '',
  actionTaken: '',
  targetMetric: 'Signups',
  targetValue: 10,
  resultValue: 0,
  sampleSize: 0,
  minimumSampleSize: 10,
  timeInvestedHours: 2,
  decision: 'iterate',
  decisionRationale: '',
  changedVariable: 'message',
  nextVariableValue: '',
});

const defaultRetention = (currentWeekStart: string): TractionRetentionInput => ({
  newUsers: 0,
  sevenDayActiveUsers: 0,
  thirtyDayActiveUsers: 0,
  primaryAcquisitionChannel: '',
  productCategory: 'saas',
  revenue: undefined,
  cohortWeekStart: getDefaultCohortWeek(currentWeekStart),
});

const readDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) as { experiments?: TractionExperimentDraft[]; retention?: Partial<TractionRetentionInput> } : null;
  } catch {
    return null;
  }
};

const isMissingFunction = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === 'PGRST202' || error.code === '42883' || /could not find the function/i.test(error.message ?? '')));

const formatWeek = (weekStart: string) => {
  const date = new Date(`${weekStart}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? weekStart
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-space-grotesk text-2xl font-semibold text-foreground">{value}</p>
      {detail ? <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function TractionEngineWorkflow({ userId }: { userId?: string }) {
  const outcomeJourney = useOutcomeJourney();
  const navigate = useNavigate();
  const currentWeekStart = useMemo(() => getCurrentWeekStart(), []);
  const [experiments, setExperiments] = useState<TractionExperimentDraft[]>(() => {
    const draft = readDraft();
    return draft?.experiments?.length ? draft.experiments : [createExperimentDraft()];
  });
  // Older drafts predate cohort retention, so defaults fill the new fields.
  const [retention, setRetention] = useState<TractionRetentionInput>(() => ({
    ...defaultRetention(currentWeekStart),
    ...(readDraft()?.retention ?? {}),
  }));
  const [activeSprints, setActiveSprints] = useState<SprintRow[]>([]);
  const [recentLogs, setRecentLogs] = useState<WeeklyLogRow[]>([]);
  const [decisionWeekCount, setDecisionWeekCount] = useState(0);
  const [consecutiveWeekCount, setConsecutiveWeekCount] = useState(0);
  const [verificationClaims, setVerificationClaims] = useState<VerificationClaim[]>([]);
  const [journeyAssumptions, setJourneyAssumptions] = useState<JourneyAssumption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workflowRecords, setWorkflowRecords] = useState<number | null>(null);
  const [platformVisitors, setPlatformVisitors] = useState<number | null>(null);
  const [benchmarks, setBenchmarks] = useState<{ cohortUsers: number; p25: number; p50: number; p75: number } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const gtmPlanId = searchParams.get('planId');
  const gtmPlayId = searchParams.get('playId');
  const [gtmSource, setGtmSource] = useState<{ planId: string; playId: string; channel: string; killRule?: GTMKillRule; marketExperimentId?: string } | null>(null);
  const view = searchParams.get('view') === 'history' ? 'history' : 'week';
  const setView = (next: 'week' | 'history') => {
    const params = new URLSearchParams(searchParams);
    if (next === 'history') params.set('view', 'history');
    else params.delete('view');
    setSearchParams(params, { replace: true });
  };
  const formRef = useRef<HTMLDivElement | null>(null);

  const cohortWeekStart = retention.cohortWeekStart || getDefaultCohortWeek(currentWeekStart);
  const sevenDayStatus = getRetentionWindowStatus(cohortWeekStart, 7);
  const thirtyDayStatus = getRetentionWindowStatus(cohortWeekStart, 30);
  const scoredRetention = useMemo(
    () => ({ ...retention, cohortWeekStart, sevenDayStatus, thirtyDayStatus }),
    [cohortWeekStart, retention, sevenDayStatus, thirtyDayStatus],
  );

  const previousLogs = useMemo(
    () => recentLogs.filter((log) => log.week_start_date !== currentWeekStart),
    [currentWeekStart, recentLogs],
  );

  const score = useMemo(
    () => calculateTractionScore({
      experiments,
      retention: scoredRetention,
      currentWeekStart,
      previousLogDates: previousLogs.map((log) => log.week_start_date),
      previousScores: previousLogs.map((log) => Number(log.combined_score)),
    }),
    [currentWeekStart, experiments, previousLogs, scoredRetention],
  );

  // One decision source: sample, threshold and evidence trust.
  const readinessFor = (experiment: TractionExperimentDraft) => {
    const claim = verificationClaims.find((item) => item.experimentId === experiment.marketExperimentId);
    return evaluateDecisionReadiness({
      targetValue: experiment.targetValue,
      observedValue: experiment.resultValue,
      minimumSampleSize: experiment.minimumSampleSize,
      sampleSize: experiment.sampleSize,
      verificationModes: claim?.evidenceLevel === 'ct_verified'
        ? ['platform_verified']
        : claim?.evidenceLevel === 'corroborated' ? ['corroborated'] : ['founder_reported'],
    });
  };

  const loadTractionData = async () => {
    if (!userId) return;
    setLoading(true);
    const [sprintsRes, logsRes, decisionsRes, claimsRes] = await Promise.all([
      supabase
        .from(SPRINTS_TABLE)
        .select('id, channel, cycle_start_date, status, source_gtm_plan_id, source_gtm_play_id, activation_payload, kill_rule_status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('cycle_start_date', { ascending: false }),
      supabase
        .from(LOGS_TABLE)
        .select('id, week_start_date, combined_score, phase_seven_ready, prioritized_recommendation, score_breakdown')
        .eq('user_id', userId)
        .order('week_start_date', { ascending: false })
        .limit(8),
      supabase
        .from(EXPERIMENTS_TABLE)
        .select('weekly_log_id')
        .eq('user_id', userId),
      (supabase as any)
        .from('verification_claims')
        .select('id,experiment_id,source_tool,claim_type,claim,evidence_level,result,status,policy_version,missing_evidence,next_action,unlocked_benefit,evaluation,decided_at,verified_at,updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
    ]);

    if (sprintsRes.error) toast.error('Could not load your active channels.');
    else setActiveSprints((sprintsRes.data ?? []) as SprintRow[]);

    if (logsRes.error) {
      toast.error('Could not load your past weeks.');
    } else {
      const rows = (logsRes.data ?? []) as WeeklyLogRow[];
      setRecentLogs(rows);
      setConsecutiveWeekCount(calculateConsecutiveLoggedWeeks(rows.map((row) => row.week_start_date)));
    }
    if (!decisionsRes.error) setDecisionWeekCount(new Set((decisionsRes.data ?? []).map((row) => row.weekly_log_id)).size);
    if (!claimsRes.error) setVerificationClaims((claimsRes.data ?? []).map((row: Record<string, unknown>) => mapVerificationClaim(row)));
    setLoading(false);
  };

  useEffect(() => {
    void loadTractionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void listJourneyAssumptions()
      .then((items) => { if (active) setJourneyAssumptions(Array.isArray(items) ? items : []); })
      .catch(() => { if (active) setJourneyAssumptions([]); });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ experiments, retention }));
    } catch { /* storage unavailable */ }
  }, [experiments, retention]);

  useEffect(() => {
    trackTractionOpened();
    trackToolOpened('traction_engine');
  }, []);

  // The platform snapshot counts site visitors, not a cohort, so it is shown as
  // context next to the retention fields rather than filled into them.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void (supabase as any).rpc('get_mvp_workflow_activity').then(({data,error}:any)=>{if(active&&!error&&data?.[0]?.observed_at)setWorkflowRecords(Number(data[0].completed_records));});
    void supabase.rpc('get_mvp_retention_snapshot' as never).then(({ data, error }) => {
      if (!active || error || !data) return;
      const row = (Array.isArray(data) ? data[0] : data) as { total_visitors: number | null } | null;
      if (row?.total_visitors) setPlatformVisitors(row.total_visitors);
    });
    return () => { active = false; };
  }, [userId]);

  // Cross-founder benchmark for the product category; hidden until 10+ founders.
  useEffect(() => {
    if (!userId || !retention.productCategory) return;
    let active = true;
    void supabase
      .rpc('get_traction_category_benchmarks' as never, { p_category: retention.productCategory } as never)
      .then(({ data }) => {
        if (!active) return;
        const row = (Array.isArray(data) ? data[0] : data) as { cohort_users: number; p25: number; p50: number; p75: number } | null;
        setBenchmarks(row && row.cohort_users >= 10
          ? { cohortUsers: row.cohort_users, p25: Number(row.p25), p50: Number(row.p50), p75: Number(row.p75) }
          : null);
      });
    return () => { active = false; };
  }, [userId, retention.productCategory]);

  // Authenticated GTM handoffs reconnect the saved experiment to the originating plan and play.
  useEffect(() => {
    let active = true;
    const importExperiment = (input: { channel: string; hypothesis: string; targetMetric: string; targetValue?: number; minimumSampleSize?: number; marketExperimentId?: string }) => {
      setExperiments((items) => {
        const imported: TractionExperimentDraft = { ...createExperimentDraft(), ...input, targetValue: input.targetValue ?? 10 };
        const pristine = items.length === 1 && !items[0].channel.trim() && !items[0].hypothesis.trim() && !items[0].actionTaken.trim();
        if (pristine) return [imported];
        if (items.some((item) => item.channel.trim().toLowerCase() === input.channel.trim().toLowerCase())) return items;
        return items.length >= 2 ? items : [...items, imported];
      });
    };
    const loadHandoff = async () => {
      if (!userId || !gtmPlanId || !gtmPlayId) return;
      const { data, error } = await (supabase as any)
        .from('gtm_plays')
        .select('play_content')
        .eq('id', gtmPlayId)
        .eq('plan_id', gtmPlanId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        toast.error('This GTM play is unavailable or does not belong to your account.');
        return;
      }
      const play = data.play_content as GTMPlay;
      const { data: marketExperiment } = await (supabase as any)
        .from('market_experiments')
        .select('id,target_metric,target_value,minimum_sample_size,status')
        .eq('user_id', userId)
        .eq('source_gtm_plan_id', gtmPlanId)
        .eq('source_gtm_play_id', gtmPlayId)
        .in('status', ['preregistered', 'running', 'evaluated'])
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      importExperiment({
        channel: play.channelName,
        hypothesis: play.hypothesis,
        targetMetric: marketExperiment?.target_metric ?? play.metric,
        targetValue: Number(marketExperiment?.target_value ?? play.target),
        minimumSampleSize: Number(marketExperiment?.minimum_sample_size ?? play.structuredKillRule?.minSampleSize ?? 10),
        marketExperimentId: marketExperiment?.id,
      });
      setGtmSource({ planId: gtmPlanId, playId: gtmPlayId, channel: play.channelName, killRule: play.structuredKillRule, marketExperimentId: marketExperiment?.id });
      setRetention((current) => ({ ...current, primaryAcquisitionChannel: current.primaryAcquisitionChannel || play.channelName }));
      captureEvent('gtm_traction_handoff_opened', { plan_id: gtmPlanId, play_id: gtmPlayId, channel_id: play.channelId });
      toast.success(`${play.channelName} play added.`, { description: `Target: ${play.target} ${play.metric.toLowerCase()}. Results feed your weekly GTM review.` });
    };
    void loadHandoff();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- import each URL handoff once
  }, [gtmPlanId, gtmPlayId, userId]);

  useEffect(() => {
    const handedOff = activeSprints.find((sprint) => sprint.activation_payload?.firstBuyerSignal);
    if (!handedOff?.activation_payload) return;
    const payload = handedOff.activation_payload;
    setExperiments((items) => {
      if (items.some((item) => item.marketExperimentId === payload.marketExperimentId)) return items;
      const pristine = items.length === 1 && !items[0].channel.trim() && !items[0].hypothesis.trim();
      const imported: TractionExperimentDraft = {
        ...createExperimentDraft(),
        channel: handedOff.channel,
        hypothesis: payload.hypothesis || `Repeat the buyer signal from the ${handedOff.channel} acquisition cycle.`,
        actionTaken: `Repeat the same ${payload.audience || 'ICP'}, offer, and channel from First Customer Proof.`,
        targetMetric: payload.targetMetric || 'Replies',
        targetValue: Number(payload.targetValue ?? 1),
        minimumSampleSize: Number(payload.minimumSampleSize ?? 10),
        marketExperimentId: payload.marketExperimentId,
      };
      return pristine ? [imported] : [...items, imported];
    });
    setRetention((current) => ({ ...current, primaryAcquisitionChannel: current.primaryAcquisitionChannel || handedOff.channel }));
  }, [activeSprints]);

  const updateExperiment = (localId: string, patch: Partial<TractionExperimentDraft>) =>
    setExperiments((items) => items.map((item) => (item.localId === localId ? { ...item, ...patch } : item)));
  const addExperiment = () => setExperiments((items) => [...items, createExperimentDraft()]);
  const removeExperiment = (localId: string) =>
    setExperiments((items) => (items.length === 1 ? items : items.filter((item) => item.localId !== localId)));

  const getNewTractionChannels = () => {
    const activeByChannel = new Map(activeSprints.map((sprint) => [sprint.channel.trim().toLowerCase(), sprint]));
    const channels = Array.from(new Set(experiments.map((exp) => exp.channel.trim()).filter(Boolean)));
    const newChannels = channels.filter((channel) => !activeByChannel.has(channel.toLowerCase()));
    return { activeByChannel, newChannels };
  };

  const closeSprint = async (sprint: SprintRow) => {
    if (!userId) return;
    const { error } = await supabase
      .from(SPRINTS_TABLE)
      .update({ status: 'closed', closed_at: new Date().toISOString(), summary_recommendation: `Closed ${sprint.channel} sprint from Traction Engine.` })
      .eq('id', sprint.id)
      .eq('user_id', userId);
    if (error) {
      toast.error('Could not close this channel.');
      return;
    }
    trackTractionBoundaryDecision({ decision: 'sprint_closed', channel: sprint.channel });
    toast.success(`${sprint.channel} closed.`);
    await loadTractionData();
  };

  const ensureSprints = async () => {
    if (!userId) throw new Error('Sign in to save your weeks.');
    const { activeByChannel, newChannels } = getNewTractionChannels();
    if (activeSprints.length + newChannels.length > 2) {
      throw new Error('You can run two channels at a time. Close one before adding another.');
    }
    const nextByChannel = new Map(activeByChannel);
    if (gtmSource) {
      const existing = nextByChannel.get(gtmSource.channel.trim().toLowerCase());
      if (existing) {
        const { error } = await supabase
          .from(SPRINTS_TABLE)
          .update({ source_gtm_plan_id: gtmSource.planId, source_gtm_play_id: gtmSource.playId })
          .eq('id', existing.id)
          .eq('user_id', userId);
        if (error) throw error;
      }
    }
    for (const channel of newChannels) {
      const { data, error } = await supabase
        .from(SPRINTS_TABLE)
        .insert({
          user_id: userId,
          channel,
          cycle_start_date: currentWeekStart,
          status: 'active',
          source_gtm_plan_id: gtmSource && gtmSource.channel.trim().toLowerCase() === channel.trim().toLowerCase() ? gtmSource.planId : null,
          source_gtm_play_id: gtmSource && gtmSource.channel.trim().toLowerCase() === channel.trim().toLowerCase() ? gtmSource.playId : null,
        })
        .select('id, channel, cycle_start_date, status')
        .single();
      if (error) throw error;
      const sprint = data as SprintRow;
      trackTractionSprintCreated({ channel: sprint.channel });
      nextByChannel.set(sprint.channel.trim().toLowerCase(), sprint);
    }
    return nextByChannel;
  };

  const validate = () => {
    if (!experiments.length) return 'Add at least one experiment.';
    for (const experiment of experiments) {
      if (!experiment.channel.trim()) return 'Every experiment needs a channel.';
      if (!experiment.hypothesis.trim()) return 'Say what you expect to happen for every experiment.';
      if (!experiment.actionTaken.trim()) return 'Say what you did this week for every experiment.';
      if (!experiment.targetMetric.trim()) return 'Choose the number each experiment should move.';
      if (experiment.sampleSize < 0) return 'People reached cannot be negative.';
      if (['iterate', 'narrow', 'pivot'].includes(experiment.decision) && !experiment.changedVariable) {
        return 'Choose the one thing you will change next.';
      }
      if (['iterate', 'narrow', 'pivot'].includes(experiment.decision) && !experiment.nextVariableValue.trim()) {
        return 'Write what that one thing changes to.';
      }
      if (experiment.assumptionFingerprint && !experiment.assumptionStatus) {
        return 'Mark the linked ICP assumption as confirmed or proved wrong.';
      }
      const recommendation = readinessFor(experiment).recommendedDecision;
      if (experiment.decision !== recommendation && experiment.decisionRationale.trim().length < 12) {
        return 'Explain in a sentence why you chose differently from the numbers.';
      }
      const triggeredSprint = activeSprints.find((sprint) => (
        sprint.channel.trim().toLowerCase() === experiment.channel.trim().toLowerCase()
        && sprint.kill_rule_status === 'triggered'
      ));
      if (triggeredSprint && experiment.decision !== 'kill' && experiment.decisionRationale.trim().length < 12) {
        return 'This channel hit its stop rule. Choose Kill or explain why you are keeping it.';
      }
    }
    if (retention.sevenDayActiveUsers > retention.newUsers || retention.thirtyDayActiveUsers > retention.newUsers) {
      return 'More people came back than started. Count only people from that starting week.';
    }
    if (!retention.primaryAcquisitionChannel.trim()) return 'Add your main channel this week.';
    return null;
  };

  // The week and its experiments are written in one transaction by
  // save_traction_week. Until that migration is applied, the previous
  // three-step write is used, and a failed experiment insert is reported.
  const persistWeek = async (logPayload: Record<string, unknown>, experimentRows: Array<Record<string, unknown>>) => {
    const { data, error } = await supabase.rpc('save_traction_week' as never, {
      p_log: logPayload,
      p_experiments: experimentRows,
    } as never);
    if (!error && data) return data as unknown as string;
    if (!isMissingFunction(error)) throw error ?? new Error('Could not save this week.');

    const { data: log, error: logError } = await supabase
      .from(LOGS_TABLE)
      .upsert({ ...logPayload, user_id: userId } as never, { onConflict: 'user_id,week_start_date' })
      .select('id')
      .single();
    if (logError) throw logError;
    const logId = (log as { id: string }).id;
    const { error: deleteError } = await supabase.from(EXPERIMENTS_TABLE).delete().eq('weekly_log_id', logId);
    if (deleteError) throw deleteError;
    const { error: insertError } = await supabase
      .from(EXPERIMENTS_TABLE)
      .insert(experimentRows.map((row) => ({ ...row, user_id: userId, weekly_log_id: logId })) as never);
    if (insertError) throw insertError;
    return logId;
  };

  const saveWeeklyLog = async () => {
    if (!userId) return;
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      const { newChannels } = getNewTractionChannels();
      if (activeSprints.length + newChannels.length > 2) {
        throw new Error('You can run two channels at a time. Close one before adding another.');
      }

      // Logging a week is free (no credit charge since Oct 2026).
      const sprintByChannel = await ensureSprints();
      const readiness = experiments.map((experiment) => readinessFor(experiment));
      const logPayload = {
        week_start_date: currentWeekStart,
        new_users: retention.newUsers,
        seven_day_active_users: retention.sevenDayActiveUsers,
        thirty_day_active_users: retention.thirtyDayActiveUsers,
        primary_acquisition_channel: retention.primaryAcquisitionChannel,
        product_category: retention.productCategory,
        revenue: retention.revenue ?? null,
        combined_score: score.combinedScore,
        consistency_score: score.consistencyScore,
        channel_efficiency_score: score.channelEfficiencyScore,
        experiment_quality_score: score.experimentQualityScore,
        retention_health_score: score.retentionHealthScore,
        consistency_streak_weeks: score.consistencyStreakWeeks,
        channel_quality_signal: score.channelQualitySignal,
        prioritized_recommendation: score.prioritizedRecommendation,
        phase_seven_ready: score.phaseSevenReady,
        score_breakdown: {
          experimentScores: score.experimentScores,
          retentionSource: 'manual',
          retention: { method: 'cohort', cohortWeekStart, sevenDayStatus, thirtyDayStatus },
          recommendedDecisions: readiness.map((item) => item.recommendedDecision),
        },
        verification_mode: 'founder_reported',
        calculation_version: TRACTION_CALCULATION_VERSION,
      };
      const experimentRows = experiments.map((experiment, index) => {
        const sprint = sprintByChannel.get(experiment.channel.trim().toLowerCase());
        const experimentScore = score.experimentScores[index];
        const recommended = readiness[index].recommendedDecision;
        return {
          sprint_id: sprint?.id ?? null,
          channel: experiment.channel.trim(),
          hypothesis: experiment.hypothesis.trim(),
          action_taken: experiment.actionTaken.trim(),
          target_metric: experiment.targetMetric.trim(),
          target_value: experiment.targetValue,
          result_value: experiment.resultValue,
          time_invested_hours: experiment.timeInvestedHours,
          decision: experiment.decision,
          recommended_decision: recommended,
          override_rationale: experiment.decision !== recommended ? experiment.decisionRationale.trim() : null,
          assumption_fingerprint: experiment.assumptionFingerprint ?? null,
          assumption_status: experiment.assumptionStatus ?? null,
          pass: experimentScore.pass,
          efficiency_score: experimentScore.efficiencyScore,
          quality_score: experimentScore.qualityScore,
          sample_size: experiment.sampleSize,
        };
      });
      const logId = await persistWeek(logPayload, experimentRows);

      const claimEvaluations = await Promise.all(experiments.map(async (experiment, index) => {
        const sprint = sprintByChannel.get(experiment.channel.trim().toLowerCase());
        const marketExperimentId = experiment.marketExperimentId
          ?? sprint?.activation_payload?.marketExperimentId
          ?? (gtmSource?.channel.trim().toLowerCase() === experiment.channel.trim().toLowerCase() ? gtmSource.marketExperimentId : undefined);
        if (!marketExperimentId) return null;
        await recordFounderObservation({
          userId,
          experimentId: marketExperimentId,
          metric: normalizeAcquisitionMetric(experiment.targetMetric),
          value: experiment.resultValue,
          denominator: experiment.sampleSize,
          sourceType: 'traction_weekly_log',
          sourceId: logId,
          verificationMode: 'founder_reported',
          provenance: { weekStartDate: currentWeekStart, channel: experiment.channel.trim() },
          capturedAt: `${currentWeekStart}T00:00:00.000Z`,
          idempotencyKey: `traction:${logId}:${marketExperimentId}:${normalizeAcquisitionMetric(experiment.targetMetric)}`,
        });
        await recordExperimentDecision({
          userId,
          experimentId: marketExperimentId,
          decision: experiment.decision,
          result: readiness[index].result,
          changedVariable: ['iterate', 'narrow', 'pivot'].includes(experiment.decision) ? experiment.changedVariable ?? 'message' : null,
          rationale: experiment.decisionRationale.trim()
            || `${experiment.channel.trim()}: observed ${experiment.resultValue} ${experiment.targetMetric.toLowerCase()} from a sample of ${experiment.sampleSize}.`,
        });
        const claim = await evaluateMarketExperiment(marketExperimentId);
        if (['iterate', 'narrow', 'pivot'].includes(experiment.decision)) {
          const nextVersion = await createNextMarketExperimentVersion({
            experimentId: marketExperimentId,
            changedVariable: experiment.changedVariable ?? 'message',
            newValue: experiment.nextVariableValue,
          });
          return { claim, nextVersion };
        }
        return { claim, nextVersion: null };
      }));
      const newlyVerifiedClaim = claimEvaluations.find((evaluation) => evaluation?.claim?.status === 'verified')?.claim;
      if (newlyVerifiedClaim) {
        toast.success('Verified result recorded.', { description: `${newlyVerifiedClaim.result} result verified. Your mentor checkpoint is unlocked.` });
      }

      const attributedAssumptionSignals = experiments.filter((experiment) => Boolean(experiment.assumptionFingerprint && experiment.assumptionStatus));
      if (attributedAssumptionSignals.length > 0) {
        try {
          await Promise.all(attributedAssumptionSignals.map((experiment) => recordJourneyAssumptionSignal({
            assumptionFingerprint: experiment.assumptionFingerprint!,
            sourceTool: 'traction_engine',
            sourceArtifactId: logId,
            participantFingerprint: `traction:${logId}:${experiment.channel.trim().toLowerCase()}`,
            status: experiment.assumptionStatus!,
            rationale: `${experiment.channel.trim()}: ${experiment.actionTaken.trim()} Result ${experiment.resultValue} against ${experiment.targetValue}.`,
            // The acquisition result above is founder entered. A separately
            // platform-verified retention snapshot cannot upgrade this signal.
            verificationMode: 'founder_reported',
          })));
        } catch (assumptionError) {
          console.warn('Traction was saved, but its ICP assumption feedback will retry later:', assumptionError);
        }
      }

      experiments.forEach((experiment) => trackTractionExperimentLogged({ channel: experiment.channel.trim(), decision: experiment.decision }));
      trackTractionWeeklyLogCompleted({ combined_score: score.combinedScore, phase_seven_ready: score.phaseSevenReady, experiment_count: experiments.length });
      trackToolOutputCreated('traction_engine', 'traction_weekly_log');

      await markFirstArtifactCreated({
        userId,
        artifactType: 'traction_weekly_log',
        artifactId: logId,
        resumeUrl: '/traction-engine',
        label: `Traction week ${currentWeekStart}`,
        source: 'traction_engine',
      });

      const { data: ledgerLogs, error: ledgerError } = await supabase
        .from(LOGS_TABLE)
        .select('id,week_start_date,new_users,combined_score,seven_day_active_users,thirty_day_active_users,revenue,score_breakdown')
        .eq('user_id', userId)
        .order('week_start_date', { ascending: false })
        .limit(6);
      if (ledgerError) throw ledgerError;
      const ledgerLogIds = (ledgerLogs ?? []).map((item) => item.id);
      const { data: ledgerDecisions, error: decisionError } = ledgerLogIds.length
        ? await supabase
          .from(EXPERIMENTS_TABLE)
          .select('id,weekly_log_id,sprint_id,channel,target_metric,result_value,sample_size,decision,recommended_decision,override_rationale,efficiency_score,pass')
          .eq('user_id', userId)
          .in('weekly_log_id', ledgerLogIds)
        : { data: [], error: null };
      if (decisionError) throw decisionError;

      const distinctDecisionWeeks = new Set((ledgerDecisions ?? []).map((item) => item.weekly_log_id)).size;
      const ctVerifiedAcquisitionClaims = claimEvaluations.filter((evaluation) => evaluation?.claim?.status === 'verified').length;
      const logsById = new Map((ledgerLogs ?? []).map((item) => [item.id, item]));
      for (const sprint of Array.from(sprintByChannel.values())) {
        const rule = sprint.activation_payload?.killRule
          ?? (gtmSource?.channel.trim().toLowerCase() === sprint.channel.trim().toLowerCase() ? gtmSource.killRule : undefined);
        if (!rule) continue;
        const observations = (ledgerDecisions ?? [])
          .filter((item) => item.sprint_id === sprint.id && item.target_metric.trim().toLowerCase() === rule.metric.trim().toLowerCase())
          .map((item) => ({
            week: logsById.get(item.weekly_log_id)?.week_start_date ?? '',
            value: Number(item.result_value),
            // The experiment's own sample (people reached), not the week's new users.
            sampleSize: Number((item as { sample_size?: number | null }).sample_size ?? 0),
          }))
          .sort((left, right) => left.week.localeCompare(right.week));
        const killRuleStatus = evaluateGTMKillRule(rule, observations);
        const { error: killRuleError } = await supabase.from(SPRINTS_TABLE).update({
          kill_rule_status: killRuleStatus,
          kill_rule_evaluated_at: new Date().toISOString(),
        }).eq('id', sprint.id).eq('user_id', userId);
        if (killRuleError) throw killRuleError;
        if (killRuleStatus === 'triggered') {
          toast.warning(`${sprint.channel} hit its stop rule.`, { description: 'Confirm Kill next week or write down why you are keeping it.' });
        }
      }
      const hasSourceBadges = (ledgerLogs ?? []).every((item) => {
        const breakdown = item.score_breakdown as { retentionSource?: string } | null;
        return ['platform', 'manual', 'corroborated'].includes(breakdown?.retentionSource ?? '');
      });
      const qualityChecks = {
        first_cycle_decision: (ledgerDecisions ?? []).length > 0,
        two_comparable_cycles: false,
        buyer_signal_each_cycle: false,
        source_badges: hasSourceBadges,
        one_verified_buyer_signal: ctVerifiedAcquisitionClaims > 0,
      };
      const completedChecks = Object.values(qualityChecks).filter(Boolean).length;
      const outcomeManifest = createJourneyEvidenceManifest([
        ...(ledgerLogs ?? []).map((item) => {
          const breakdown = item.score_breakdown as { retentionSource?: string } | null;
          const platformVerified = breakdown?.retentionSource === 'platform';
          return {
            sourceId: item.id,
            sourceType: 'traction_weekly_log',
            version: '1',
            capturedAt: `${item.week_start_date}T00:00:00.000Z`,
            confidence: platformVerified ? 0.95 : 0.65,
            provenance: platformVerified ? 'platform_verified' : 'founder_reported',
            verificationMode: platformVerified ? 'platform_verified' as const : 'founder_reported' as const,
            label: `Traction week ${item.week_start_date}`,
          };
        }),
        ...(gtmSource ? [{
          sourceId: gtmSource.playId,
          sourceType: 'gtm_acquisition_play',
          version: '1',
          capturedAt: new Date().toISOString(),
          confidence: 0.9,
          provenance: `gtm_plan:${gtmSource.planId}`,
          label: `${gtmSource.channel} GTM play`,
        }] : []),
      ]);
      // Traction Engine is the end of the chain; naming the inbound handoff lets
      // journey-outcome-service mark the GTM -> Traction edge as completed.
      const inboundTractionHandoff = await getInboundHandoff('traction_engine');
      const savedOutcome = await upsertJourneyOutcome({
        userId,
        tool: 'traction_engine',
        artifactType: 'traction_decision_ledger',
        artifactId: `traction-ledger-${userId}`,
        status: 'draft',
        qualityChecks,
        evidenceManifest: outcomeManifest,
        completionScore: Math.round((completedChecks / Object.keys(qualityChecks).length) * 100),
        verificationMode: 'founder_reported',
        handoffId: inboundTractionHandoff?.id ?? null,
      });
      trackJourneyEvent('journey_stage_outcome_completed', {
        tool: 'traction_engine',
        artifact_type: 'traction_decision_ledger',
        artifact_id: `traction-ledger-${userId}`,
        outcome_status: savedOutcome.evaluation.status,
        week_count: ledgerLogs?.length ?? 0,
        decision_count: distinctDecisionWeeks,
      });

      try { localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ }
      showDashboardReturnToast({
        message: 'This week is saved.',
        description: newlyVerifiedClaim ? 'A verified result and a mentor checkpoint were added.' : 'Keep running the same experiment until it reaches enough people.',
        tool: 'traction-engine',
        navigate,
      });
      await loadTractionData();
      await outcomeJourney.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save this week.');
    } finally {
      setSaving(false);
    }
  };

  const savedThisWeek = recentLogs.some((log) => log.week_start_date === currentWeekStart);
  const isFirstTime = !loading && recentLogs.length === 0 && activeSprints.length === 0;
  const triggeredSprint = activeSprints.find((sprint) => sprint.kill_rule_status === 'triggered') ?? null;
  const nextStep = getTractionNextStep({ isFirstTime, savedThisWeek, triggeredChannel: triggeredSprint?.channel ?? null });
  // A snapshot without stage runs (older payloads) means no repeat run yet.
  const repeatRun = (outcomeJourney.snapshot?.stageRuns ?? [])
    .filter((run) => run.stage === 'repeat')
    .sort((left, right) => right.attempt_number - left.attempt_number)[0];
  const readyLedger = repeatRun?.outcome_state === 'achieved' || repeatRun?.outcome_state === 'verified';
  const verifiedLedger = repeatRun?.outcome_state === 'verified';
  const comparableSignalCycles = Number(repeatRun?.evidence_summary?.comparableSignalCycles ?? 0);
  const firstCustomerHandoff = activeSprints.find((sprint) => sprint.activation_payload?.firstBuyerSignal);
  const onTarget = score.experimentScores.filter((item) => item.pass).length;
  const sevenRate = getCohortRate(scoredRetention, 'sevenDay');

  const runNextStep = () => {
    if (!nextStep) return;
    if (nextStep.action === 'history') {
      setView('history');
      return;
    }
    setView('week');
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (nextStep.action === 'start') document.getElementById('traction-first-channel')?.focus();
    });
  };

  return (
    <div className="space-y-6">
      {nextStep && <NextStepCard title={nextStep.title} reason={nextStep.reason} cta={nextStep.cta} onAction={runNextStep} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Weeks logged in a row" value={String(consecutiveWeekCount)} detail={consecutiveWeekCount === 0 ? 'Log this week to start' : 'Keep the streak going'} />
        <Stat label="Experiments on target" value={`${onTarget} of ${experiments.length}`} detail="This week" />
        <Stat
          label="Came back within 7 days"
          value={sevenRate === null ? '-' : `${Math.round(sevenRate * 100)}%`}
          detail={sevenDayStatus === 'pending' ? 'Window still open' : sevenRate === null ? 'Add how many people started' : `Of people who started ${formatWeek(cohortWeekStart)}`}
        />
      </div>

      {firstCustomerHandoff ? (
        <section className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
          <h2 className="text-base font-semibold text-foreground">Your first buyer signal is already attached</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Repeat the same customer, offer and {firstCustomerHandoff.channel} channel once more ({comparableSignalCycles} of 2 cycles done). Change only one thing if the numbers say to iterate.
          </p>
        </section>
      ) : null}

      <div role="tablist" aria-label="Traction Engine views" className="inline-flex rounded-lg border border-border/60 bg-card p-1">
        {([['week', 'This week'], ['history', 'Past weeks']] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={cn('rounded-md px-4 py-1.5 text-sm font-medium transition-colors', view === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'week' ? (
        <div ref={formRef} className="scroll-mt-28 space-y-6">
          {activeSprints.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Channels you are running</h2>
              <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
                {activeSprints.map((sprint) => {
                  const weekNumber = getSprintWeekNumber(sprint.cycle_start_date, currentWeekStart);
                  const atBoundary = isSprintAtBoundary(sprint.cycle_start_date, currentWeekStart);
                  return (
                    <li key={sprint.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{sprint.channel}</p>
                        <p className="text-sm text-muted-foreground">
                          Week {weekNumber} of 6{atBoundary ? '. Six weeks are up, so close it and decide what is next.' : ''}
                          {sprint.kill_rule_status === 'triggered' ? ' Stop rule reached.' : sprint.kill_rule_status === 'at_risk' ? ' Close to its stop rule.' : ''}
                        </p>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => void closeSprint(sprint)}>Close</Button>
                    </li>
                  );
                })}
              </ul>
              {activeSprints.length >= 2 && <p className="text-sm text-muted-foreground">You are running two channels, the most at once. Close one before adding another.</p>}
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">What you tried this week</h2>
            {experiments.map((experiment, index) => (
              <TractionExperimentCard
                key={experiment.localId}
                experiment={experiment}
                index={index}
                canRemove={experiments.length > 1}
                readiness={readinessFor(experiment)}
                assumptions={journeyAssumptions}
                fromPlan={Boolean(experiment.marketExperimentId)}
                channelInputId={index === 0 ? 'traction-first-channel' : undefined}
                onChange={(patch) => updateExperiment(experiment.localId, patch)}
                onRemove={() => removeExperiment(experiment.localId)}
              />
            ))}
            {experiments.length < 2 && (
              <Button type="button" variant="outline" onClick={addExperiment}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Add a second channel
              </Button>
            )}
          </section>

          <TractionRetentionCard
            retention={retention}
            cohortWeekStart={cohortWeekStart}
            sevenDayStatus={sevenDayStatus}
            thirtyDayStatus={thirtyDayStatus}
            platformVisitors={platformVisitors}
            workflowRecords={workflowRecords}
            onChange={(patch) => setRetention((current) => ({ ...current, ...patch }))}
          />

          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {userId ? 'Saving a week is free. You can edit it until the week ends.' : 'Sign in to save your weeks.'}
            </p>
            <Button type="button" disabled={!userId || saving} onClick={() => void saveWeeklyLog()}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {savedThisWeek ? 'Update this week' : 'Save this week'}
            </Button>
          </div>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Past weeks</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading your weeks…' : `${decisionWeekCount} week${decisionWeekCount === 1 ? '' : 's'} with decisions. ${comparableSignalCycles} of 2 repeat cycles with a buyer signal.`}
              </p>
            </div>
            {recentLogs.length > 0 && userId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  captureEvent('traction_report_exported', { verified: verifiedLedger, week_count: consecutiveWeekCount, decision_count: decisionWeekCount });
                  void exportTractionReportPdf(userId).catch((error) => toast.error(error instanceof Error ? error.message : 'Export failed.'));
                }}
              >
                <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Download report
              </Button>
            )}
          </div>

          {recentLogs.length === 0 ? (
            <ToolEmptyState title="No weeks saved yet" description="Save your first week and it will show up here with the advice for the next one." />
          ) : (
            <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
              {recentLogs.slice(0, 8).map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">Week of {formatWeek(log.week_start_date)}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{log.prioritized_recommendation}</p>
                  </div>
                  <span className="shrink-0 font-space-grotesk text-lg font-semibold text-foreground">{log.combined_score}</span>
                </li>
              ))}
            </ul>
          )}

          <DashboardDisclosure title="How the weekly score works" summary="A supporting number. Your decisions come from the experiments.">
            <div className="space-y-3 text-sm text-muted-foreground">
              {score.dimensionInsights.map((dimension) => (
                <p key={dimension.key}><span className="font-medium text-foreground">{dimension.label} {dimension.score}.</span> {dimension.detail}</p>
              ))}
              <p><span className="font-medium text-foreground">Repeatable demand.</span> {readyLedger ? 'Shown across two comparable cycles.' : repeatRun?.branch_reason ?? 'Repeat the same customer, offer and channel in a second cycle.'}</p>
              {benchmarks && (
                <p>
                  Across {benchmarks.cohortUsers} {PRODUCT_CATEGORY_LABELS[retention.productCategory]} founders, the median weekly score is {benchmarks.p50} and the top quarter is {benchmarks.p75} or more.
                </p>
              )}
            </div>
          </DashboardDisclosure>
        </section>
      )}

    </div>
  );
}

export default function TractionEnginePage() {
  const { user } = useAuth();
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Traction Engine',
      description: 'Weekly experiment log and cohort retention tracker for founders building repeatable traction.',
      url: 'https://creatives-takeover.com/traction-engine',
    },
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Traction Engine', url: '/traction-engine' },
    ]),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Traction Engine | Creatives Takeover"
        description="Log what you tried each week, see what worked, and decide whether to double down, iterate, narrow, pivot or stop."
        keywords="traction engine, distribution experiments, cohort retention, startup traction tracker"
        url="/traction-engine"
        structuredData={structuredData}
      />
      <Navigation />
      <main>
        <ToolPageShell
          title="Traction Engine"
          purpose={PURPOSE}
          theme="traction"
          wallpaper={<TractionLogbookWallpaper />}
          headerArt={<TractionLogbookChart />}
        >
          {user ? (
            <TractionEngineWorkflow userId={user.id} />
          ) : (
            <PreviewModeWrapper
              featureName="Traction Engine"
              description="Log weekly channel experiments, see what reached its target, and track whether people come back."
            >
              <TractionEngineWorkflow />
            </PreviewModeWrapper>
          )}
          <RelatedToolsSection
            tools={[
              { name: 'Go-to-Market Strategist', description: 'Plan the channels your weekly experiments test.', url: '/go-to-market' },
              { name: 'PMF Lab', description: 'Check that people want the product before scaling a channel.', url: '/pmf-lab' },
              { name: 'Insighta', description: 'Turn your traction record into fundraising preparation.', url: '/insighta' },
            ]}
          />
        </ToolPageShell>
      </main>
      <Footer />
    </div>
  );
}
