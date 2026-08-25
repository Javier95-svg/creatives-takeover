import { useEffect, useMemo, useState } from 'react';
import SEO, { createBreadcrumbSchema, createFAQSchema } from '@/components/SEO';
import RelatedToolsSection from '@/components/seo/RelatedToolsSection';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditActions } from '@/hooks/useCreditActions';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import TractionEngineWallpaper from '@/components/wallpapers/TractionEngineWallpaper';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  PRODUCT_CATEGORY_LABELS,
  calculateConsecutiveLoggedWeeks,
  calculateTractionScore,
  getCurrentWeekStart,
  getSprintWeekNumber,
  isSprintAtBoundary,
  type TractionDecision,
  type TractionExperimentInput,
  type TractionProductCategory,
  type TractionRetentionInput,
} from '@/lib/tractionEngine';
import { exportTractionReportPdf } from '@/lib/tractionReport';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  LineChart,
  Lock,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { showDashboardReturnToast } from '@/components/dashboard/dashboardReturnToast';
import { markFirstArtifactCreated } from '@/lib/retentionSystem';
import {
  trackToolOpened,
  trackToolOutputCreated,
  trackTractionBoundaryDecision,
  trackTractionExperimentLogged,
  trackTractionOpened,
  trackTractionSprintCreated,
  trackTractionWeeklyLogCompleted,
  captureEvent,
} from '@/lib/analytics';
import { evaluateGTMKillRule, type GTMKillRule, type GTMKillRuleStatus, type GTMPlay } from '@/lib/gtmV2';
import {
  evaluateDecisionReadiness,
  mapVerificationClaim,
  normalizeAcquisitionMetric,
  type ChangedExperimentVariable,
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
import { useOutcomeJourney } from '@/hooks/useOutcomeJourney';

const SPRINTS_TABLE = 'traction_engine_sprints' as const;
const LOGS_TABLE = 'traction_engine_weekly_logs' as const;
const EXPERIMENTS_TABLE = 'traction_engine_experiments' as const;

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

type ExperimentDraft = TractionExperimentInput & {
  localId: string;
  decisionRationale: string;
  assumptionFingerprint?: string;
  assumptionStatus?: 'confirmed' | 'rejected';
  sampleSize: number;
  minimumSampleSize: number;
  marketExperimentId?: string;
  changedVariable?: ChangedExperimentVariable;
  nextVariableValue: string;
};

const decisionLabels: Record<TractionDecision, string> = {
  double_down: 'Double Down',
  iterate: 'Iterate',
  narrow: 'Narrow ICP',
  pivot: 'Pivot',
  kill: 'Kill',
};

const metricOptions = [
  'Prospects', 'Sent', 'Delivered', 'Replies', 'Positive replies', 'Meetings',
  'Attended', 'Offers', 'Commitments', 'Payments', 'Qualified views',
  'Demo completions', 'CTA clicks', 'Signups', 'Activations', 'D7 retained', 'D30 retained',
];

const createExperimentDraft = (): ExperimentDraft => ({
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

const defaultRetention: TractionRetentionInput = {
  newUsers: 0,
  sevenDayActiveUsers: 0,
  thirtyDayActiveUsers: 0,
  primaryAcquisitionChannel: '',
  productCategory: 'saas',
  revenue: undefined,
};

const numberFromInput = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const scoreColor = (value: number) =>
  value >= 75 ? 'text-success' : value >= 50 ? 'text-warning' : 'text-destructive';

const scoreProgressColor = (value: number) =>
  value >= 75 ? '[&>div]:bg-success' : value >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive';

type TractionTab = 'sprint' | 'retention' | 'recent' | 'signal';

const TRACTION_TABS: Array<{ id: TractionTab; step: number; label: string; subtitle: string; description: string }> = [
  { id: 'sprint',    step: 1, label: 'Distribution Sprint Log', subtitle: 'Set your sprint goals',
    description: 'Log one channel, one hypothesis, and one measurable outcome. Record your target metric and result at week\'s end.' },
  { id: 'retention', step: 2, label: 'Retention Snapshot',      subtitle: 'Track who\'s staying',
    description: 'Enter new users, 7-day actives, and 30-day actives. Distribution only counts when users come back.' },
  { id: 'recent',    step: 3, label: 'Recent Weeks',            subtitle: 'Log what happened',
    description: 'Review your last five saved scorecards. Spot trends and check your streak before committing to this week.' },
  { id: 'signal',    step: 4, label: 'Weekly Signal',           subtitle: 'Review your results',
    description: 'Review sample size, threshold, evidence trust, and the next decision. The score remains supporting context.' },
];

function StepNav({ active, onSelect }: { active: TractionTab; onSelect: (t: TractionTab) => void }) {
  return (
    <div className="relative flex items-start justify-between">
      <div className="absolute top-4 h-[2px] bg-border" style={{ left: '12.5%', right: '12.5%' }} />
      {TRACTION_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={cn(
            'relative z-10 flex flex-1 flex-col items-center gap-1.5 px-2 pb-2 text-center transition-colors focus-visible:outline-none',
            active === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70',
          )}
        >
          <span className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors',
            active === tab.id
              ? 'border-success bg-success text-white'
              : 'border-border bg-card text-muted-foreground',
          )}>
            {tab.step}
          </span>
          <span className="text-label font-semibold leading-tight sm:text-xs">{tab.label}</span>
          <span className="hidden text-caption leading-tight text-muted-foreground sm:block">{tab.subtitle}</span>
        </button>
      ))}
    </div>
  );
}

function ScoreStat({
  label,
  value,
  detail,
  badge,
}: {
  label: string;
  value: number;
  detail?: string;
  badge?: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {badge && <Badge variant="outline" className="text-caption">{badge}</Badge>}
          <span className={cn('text-lg font-semibold', scoreColor(value))}>{value}</span>
        </div>
      </div>
      <Progress value={value} className={cn('h-2', scoreProgressColor(value))} />
      {detail && <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function TractionEngineWorkflow({ userId }: { userId?: string }) {
  const outcomeJourney = useOutcomeJourney();
  const navigate = useNavigate();
  const { deductCredits } = useCreditActions();
  const currentWeekStart = useMemo(() => getCurrentWeekStart(), []);
  const [experiments, setExperiments] = useState<ExperimentDraft[]>(() => {
    try {
      const draft = localStorage.getItem('ct_traction_draft');
      if (draft) return JSON.parse(draft).experiments;
    } catch { /* ignore */ }
    return [createExperimentDraft()];
  });

  const [retention, setRetention] = useState<TractionRetentionInput>(() => {
    try {
      const draft = localStorage.getItem('ct_traction_draft');
      if (draft) return JSON.parse(draft).retention;
    } catch { /* ignore */ }
    return defaultRetention;
  });
  const [activeSprints, setActiveSprints] = useState<SprintRow[]>([]);
  const [recentLogs, setRecentLogs] = useState<WeeklyLogRow[]>([]);
  const [decisionWeekCount, setDecisionWeekCount] = useState(0);
  const [consecutiveWeekCount, setConsecutiveWeekCount] = useState(0);
  const [verificationClaims, setVerificationClaims] = useState<VerificationClaim[]>([]);
  const [journeyAssumptions, setJourneyAssumptions] = useState<JourneyAssumption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [platformSnapshot, setPlatformSnapshot] = useState<{
    newUsers: number;
    sevenDay: number;
    thirtyDay: number;
    totalVisitors: number;
    trackedSince: string | null;
  } | null>(null);
  const [benchmarks, setBenchmarks] = useState<{ cohortUsers: number; p25: number; p50: number; p75: number } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const gtmPlanId = searchParams.get('planId');
  const gtmPlayId = searchParams.get('playId');
  const [gtmSource, setGtmSource] = useState<{ planId: string; playId: string; channel: string; killRule?: GTMKillRule; marketExperimentId?: string } | null>(null);
  const activeTab = (searchParams.get('step') as TractionTab) ?? 'sprint';
  const setActiveTab = (tab: TractionTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('step', tab);
    setSearchParams(next, { replace: true });
  };

  const previousLogs = useMemo(
    () => recentLogs.filter((log) => log.week_start_date !== currentWeekStart),
    [currentWeekStart, recentLogs],
  );

  const score = useMemo(
    () => calculateTractionScore({
      experiments,
      retention,
      currentWeekStart,
      previousLogDates: previousLogs.map((log) => log.week_start_date),
      previousScores: previousLogs.map((log) => Number(log.combined_score)),
    }),
    [currentWeekStart, experiments, previousLogs, retention],
  );

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

    if (sprintsRes.error) {
      toast.error('Could not load active traction sprints.');
    } else {
      setActiveSprints((sprintsRes.data ?? []) as SprintRow[]);
    }

    if (logsRes.error) {
      toast.error('Could not load traction history.');
    } else {
      const rows = (logsRes.data ?? []) as WeeklyLogRow[];
      setRecentLogs(rows);
      setConsecutiveWeekCount(calculateConsecutiveLoggedWeeks(rows.map((row) => row.week_start_date)));
      // Retention source never verifies a separate acquisition claim.
    }
    if (!decisionsRes.error) setDecisionWeekCount(new Set((decisionsRes.data ?? []).map((row) => row.weekly_log_id)).size);
    if (!claimsRes.error) {
      const claims = (claimsRes.data ?? []).map((row: Record<string, unknown>) => mapVerificationClaim(row));
      setVerificationClaims(claims);
    }
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
      .then((items) => { if (active) setJourneyAssumptions(items); })
      .catch(() => { if (active) setJourneyAssumptions([]); });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    localStorage.setItem(
      'ct_traction_draft',
      JSON.stringify({ experiments, retention })
    );
  }, [experiments, retention]);

  const updateExperiment = (localId: string, patch: Partial<ExperimentDraft>) => {
    setExperiments((items) => items.map((item) => (item.localId === localId ? { ...item, ...patch } : item)));
  };

  const addExperiment = () => {
    setExperiments((items) => [...items, createExperimentDraft()]);
  };

  const removeExperiment = (localId: string) => {
    setExperiments((items) => (items.length === 1 ? items : items.filter((item) => item.localId !== localId)));
  };

  const getNewTractionChannels = () => {
    const activeByChannel = new Map(activeSprints.map((sprint) => [sprint.channel.trim().toLowerCase(), sprint]));
    const channels = Array.from(new Set(experiments.map((exp) => exp.channel.trim()).filter(Boolean)));
    const newChannels = channels.filter((channel) => !activeByChannel.has(channel.toLowerCase()));

    return { activeByChannel, newChannels };
  };

  useEffect(() => {
    trackTractionOpened();
    trackToolOpened('traction_engine');
  }, []);

  // Autofill the retention snapshot from platform-verified visits to the
  // founder's published MVP Builder sites. Only fills pristine (all-zero)
  // fields — a founder's manual numbers are never overwritten — and the
  // snapshot stays fully editable.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const loadPlatformSnapshot = async () => {
      const { data, error } = await supabase.rpc('get_mvp_retention_snapshot' as never);
      if (!active || error || !data) return;
      const row = (Array.isArray(data) ? data[0] : data) as {
        new_users_week: number | null;
        seven_day_active: number | null;
        thirty_day_active: number | null;
        total_visitors: number | null;
        tracked_since: string | null;
      } | null;
      if (!row || !row.total_visitors) return;
      const snapshot = {
        newUsers: row.new_users_week ?? 0,
        sevenDay: row.seven_day_active ?? 0,
        thirtyDay: row.thirty_day_active ?? 0,
        totalVisitors: row.total_visitors,
        trackedSince: row.tracked_since,
      };
      setPlatformSnapshot(snapshot);
      setRetention((current) => {
        const pristine =
          current.newUsers === 0 && current.sevenDayActiveUsers === 0 && current.thirtyDayActiveUsers === 0;
        if (!pristine) return current;
        return {
          ...current,
          newUsers: snapshot.newUsers,
          sevenDayActiveUsers: snapshot.sevenDay,
          thirtyDayActiveUsers: snapshot.thirtyDay,
        };
      });
    };
    void loadPlatformSnapshot();
    return () => {
      active = false;
    };
  }, [userId]);

  // Cross-founder benchmark for the selected product category. The RPC returns
  // nothing until the anonymized cohort has 10+ founders, so this quietly stays
  // hidden until the data justifies showing it.
  useEffect(() => {
    if (!userId || !retention.productCategory) return;
    let active = true;
    void supabase
      .rpc('get_traction_category_benchmarks' as never, { p_category: retention.productCategory } as never)
      .then(({ data }) => {
        if (!active) return;
        const row = (Array.isArray(data) ? data[0] : data) as
          | { cohort_users: number; p25: number; p50: number; p75: number }
          | null;
        setBenchmarks(
          row && row.cohort_users >= 10
            ? { cohortUsers: row.cohort_users, p25: Number(row.p25), p50: Number(row.p50), p75: Number(row.p75) }
            : null,
        );
      });
    return () => {
      active = false;
    };
  }, [userId, retention.productCategory]);

  // Authenticated V2 handoffs reconnect the saved experiment to the originating
  // plan/play exactly. The localStorage branch remains only for V1 briefs.
  useEffect(() => {
    let active = true;
    const importExperiment = (input: { channel: string; hypothesis: string; targetMetric: string; targetValue?: number; minimumSampleSize?: number; marketExperimentId?: string }) => {
      setExperiments((items) => {
        const imported: ExperimentDraft = { ...createExperimentDraft(), ...input, targetValue: input.targetValue ?? 10 };
        const pristine = items.length === 1 && !items[0].channel.trim() && !items[0].hypothesis.trim() && !items[0].actionTaken.trim();
        if (pristine) return [imported];
        if (items.some((item) => item.channel.trim().toLowerCase() === input.channel.trim().toLowerCase())) return items;
        return items.length >= 2 ? items : [...items, imported];
      });
    };
    const loadHandoff = async () => {
      if (userId && gtmPlanId && gtmPlayId) {
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
        toast.success(`${play.channelName} play imported.`, { description: `${play.metric} target: ${play.target}. Results will sync to the weekly GTM review.` });
        return;
      }
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
      const imported: ExperimentDraft = {
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
    setRetention((current) => ({
      ...current,
      primaryAcquisitionChannel: current.primaryAcquisitionChannel || handedOff.channel,
    }));
  }, [activeSprints]);

  const closeSprint = async (sprint: SprintRow) => {
    if (!userId) return;
    const { error } = await supabase
      .from(SPRINTS_TABLE)
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        summary_recommendation: `Closed ${sprint.channel} sprint from Traction Engine.`,
      })
      .eq('id', sprint.id)
      .eq('user_id', userId);

    if (error) {
      toast.error('Could not close this sprint.');
      return;
    }

    trackTractionBoundaryDecision({ decision: 'sprint_closed', channel: sprint.channel });
    toast.success(`${sprint.channel} sprint closed.`);
    await loadTractionData();
  };

  const ensureSprints = async () => {
    if (!userId) throw new Error('Sign in to save Traction Engine logs.');
    const { activeByChannel, newChannels } = getNewTractionChannels();

    if (activeSprints.length + newChannels.length > 2) {
      throw new Error('Traction Engine supports two active channels at a time. Close one sprint before adding another channel.');
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
    if (!experiments.length) return 'Add at least one distribution experiment.';
    for (const experiment of experiments) {
      if (!experiment.channel.trim()) return 'Every experiment needs a channel.';
      if (!experiment.hypothesis.trim()) return 'Every experiment needs a hypothesis.';
      if (!experiment.actionTaken.trim()) return 'Every experiment needs an action taken.';
      if (!experiment.targetMetric.trim()) return 'Every experiment needs a target metric.';
      if (experiment.sampleSize < 0) return 'The observed sample cannot be negative.';
      if (['iterate', 'narrow', 'pivot'].includes(experiment.decision) && !experiment.changedVariable) {
        return 'Choose the one variable that will change in the next experiment.';
      }
      if (['iterate', 'narrow', 'pivot'].includes(experiment.decision) && !experiment.nextVariableValue.trim()) {
        return 'Enter the new value for the next experiment version.';
      }
      if (experiment.assumptionFingerprint && !experiment.assumptionStatus) {
        return 'Mark the linked ICP assumption as confirmed or rejected.';
      }
      const recommendation = evaluateDecisionReadiness({
        targetValue: experiment.targetValue,
        observedValue: experiment.resultValue,
        minimumSampleSize: experiment.minimumSampleSize,
        sampleSize: experiment.sampleSize,
        verificationModes: ['founder_reported'],
      }).recommendedDecision;
      if (recommendation && experiment.decision !== recommendation && experiment.decisionRationale.trim().length < 12) {
        return 'Explain why you are overriding the recommended traction decision.';
      }
      const triggeredSprint = activeSprints.find((sprint) => (
        sprint.channel.trim().toLowerCase() === experiment.channel.trim().toLowerCase()
        && sprint.kill_rule_status === 'triggered'
      ));
      if (triggeredSprint && experiment.decision !== 'kill' && experiment.decisionRationale.trim().length < 12) {
        return 'This GTM kill rule is triggered. Confirm Kill or explain why you are overriding it.';
      }
    }
    if (!retention.primaryAcquisitionChannel.trim()) return 'Add the primary acquisition channel for this week.';
    return null;
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
        throw new Error('Traction Engine supports two active channels at a time. Close one sprint before adding another channel.');
      }

      const charged = await deductCredits('TRACTION_ENGINE_SCORECARD', {
        featureName: 'Traction Engine Scorecard',
        operationId: `traction-engine-${userId}-${currentWeekStart}`,
        metadata: {
          weekStartDate: currentWeekStart,
          experimentCount: experiments.length,
          combinedScore: score.combinedScore,
          phaseSevenReady: score.phaseSevenReady,
        },
      });
      if (!charged) return;

      const sprintByChannel = await ensureSprints();
      const logPayload = {
        user_id: userId,
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
          // 'platform' only when the saved numbers still match the verified
          // autofill exactly — an edited snapshot downgrades to self-reported.
          retentionSource:
            platformSnapshot &&
            retention.newUsers === platformSnapshot.newUsers &&
            retention.sevenDayActiveUsers === platformSnapshot.sevenDay &&
            retention.thirtyDayActiveUsers === platformSnapshot.thirtyDay
              ? 'platform'
              : 'manual',
          recommendedDecisions: score.recommendedDecisions,
        },
        verification_mode:
          platformSnapshot &&
          retention.newUsers === platformSnapshot.newUsers &&
          retention.sevenDayActiveUsers === platformSnapshot.sevenDay &&
          retention.thirtyDayActiveUsers === platformSnapshot.thirtyDay
            ? 'platform_verified'
            : 'founder_reported',
      };

      const { data: log, error: logError } = await supabase
        .from(LOGS_TABLE)
        .upsert(logPayload, { onConflict: 'user_id,week_start_date' })
        .select('id')
        .single();

      if (logError) throw logError;

      await supabase.from(EXPERIMENTS_TABLE).delete().eq('weekly_log_id', (log as { id: string }).id);

      const experimentRows = experiments.map((experiment, index) => {
        const sprint = sprintByChannel.get(experiment.channel.trim().toLowerCase());
        const experimentScore = score.experimentScores[index];
        return {
          user_id: userId,
          weekly_log_id: (log as { id: string }).id,
          sprint_id: sprint?.id ?? null,
          channel: experiment.channel.trim(),
          hypothesis: experiment.hypothesis.trim(),
          action_taken: experiment.actionTaken.trim(),
          target_metric: experiment.targetMetric.trim(),
          target_value: experiment.targetValue,
          result_value: experiment.resultValue,
          time_invested_hours: experiment.timeInvestedHours,
          decision: experiment.decision,
          recommended_decision: score.recommendedDecisions[index],
          override_rationale: experiment.decision !== score.recommendedDecisions[index] ? experiment.decisionRationale.trim() : null,
          assumption_fingerprint: experiment.assumptionFingerprint ?? null,
          assumption_status: experiment.assumptionStatus ?? null,
          pass: experimentScore.pass,
          efficiency_score: experimentScore.efficiencyScore,
          quality_score: experimentScore.qualityScore,
        };
      });

      const { error: experimentError } = await supabase.from(EXPERIMENTS_TABLE).insert(experimentRows);
      if (experimentError) throw experimentError;

      const claimEvaluations = await Promise.all(experiments.map(async (experiment) => {
        const sprint = sprintByChannel.get(experiment.channel.trim().toLowerCase());
        const marketExperimentId = experiment.marketExperimentId
          ?? sprint?.activation_payload?.marketExperimentId
          ?? (gtmSource?.channel.trim().toLowerCase() === experiment.channel.trim().toLowerCase()
            ? gtmSource.marketExperimentId
            : undefined);
        if (!marketExperimentId) return null;
        const readiness = evaluateDecisionReadiness({
          targetValue: experiment.targetValue,
          observedValue: experiment.resultValue,
          minimumSampleSize: experiment.minimumSampleSize,
          sampleSize: experiment.sampleSize,
          verificationModes: ['founder_reported'],
        });
        await recordFounderObservation({
          userId,
          experimentId: marketExperimentId,
          metric: normalizeAcquisitionMetric(experiment.targetMetric),
          value: experiment.resultValue,
          denominator: experiment.sampleSize,
          sourceType: 'traction_weekly_log',
          sourceId: (log as { id: string }).id,
          verificationMode: 'founder_reported',
          provenance: { weekStartDate: currentWeekStart, channel: experiment.channel.trim() },
          capturedAt: `${currentWeekStart}T00:00:00.000Z`,
          idempotencyKey: `traction:${(log as { id: string }).id}:${marketExperimentId}:${normalizeAcquisitionMetric(experiment.targetMetric)}`,
        });
        await recordExperimentDecision({
          userId,
          experimentId: marketExperimentId,
          decision: experiment.decision,
          result: readiness.result,
          changedVariable: ['iterate', 'narrow', 'pivot'].includes(experiment.decision)
            ? experiment.changedVariable ?? 'message'
            : null,
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
        toast.success('CT Verified execution earned.', {
          description: `${newlyVerifiedClaim.result} result verified. Your mentor checkpoint is unlocked.`,
        });
      }

      const attributedAssumptionSignals = experiments.filter((experiment) => (
        Boolean(experiment.assumptionFingerprint && experiment.assumptionStatus)
      ));
      if (attributedAssumptionSignals.length > 0) {
        try {
          await Promise.all(attributedAssumptionSignals.map((experiment) => recordJourneyAssumptionSignal({
            assumptionFingerprint: experiment.assumptionFingerprint!,
            sourceTool: 'traction_engine',
            sourceArtifactId: (log as { id: string }).id,
            participantFingerprint: `traction:${(log as { id: string }).id}:${experiment.channel.trim().toLowerCase()}`,
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

      experiments.forEach((experiment) => {
        trackTractionExperimentLogged({ channel: experiment.channel.trim(), decision: experiment.decision });
      });
      trackTractionWeeklyLogCompleted({
        combined_score: score.combinedScore,
        phase_seven_ready: score.phaseSevenReady,
        experiment_count: experiments.length,
      });
      trackToolOutputCreated('traction_engine', 'traction_weekly_log');

      await markFirstArtifactCreated({
        userId,
        artifactType: 'traction_weekly_log',
        artifactId: (log as { id: string }).id,
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
          .select('id,weekly_log_id,sprint_id,channel,target_metric,result_value,decision,recommended_decision,override_rationale,efficiency_score,pass')
          .eq('user_id', userId)
          .in('weekly_log_id', ledgerLogIds)
        : { data: [], error: null };
      if (decisionError) throw decisionError;

      const distinctDecisionWeeks = new Set((ledgerDecisions ?? []).map((item) => item.weekly_log_id)).size;
      const ctVerifiedAcquisitionClaims = claimEvaluations.filter((evaluation) => evaluation?.claim?.status === 'verified').length;
      const logsById = new Map((ledgerLogs ?? []).map((item) => [item.id, item]));
      const activeSprintRows = Array.from(sprintByChannel.values());
      for (const sprint of activeSprintRows) {
        const rule = sprint.activation_payload?.killRule
          ?? (gtmSource?.channel.trim().toLowerCase() === sprint.channel.trim().toLowerCase() ? gtmSource.killRule : undefined);
        if (!rule) continue;
        const observations = (ledgerDecisions ?? [])
          .filter((item) => item.sprint_id === sprint.id && item.target_metric.trim().toLowerCase() === rule.metric.trim().toLowerCase())
          .map((item) => ({
            week: logsById.get(item.weekly_log_id)?.week_start_date ?? '',
            value: Number(item.result_value),
            sampleSize: Number(logsById.get(item.weekly_log_id)?.new_users ?? 0),
          }))
          .sort((left, right) => left.week.localeCompare(right.week));
        const killRuleStatus = evaluateGTMKillRule(rule, observations);
        const { error: killRuleError } = await supabase.from(SPRINTS_TABLE).update({
          kill_rule_status: killRuleStatus,
          kill_rule_evaluated_at: new Date().toISOString(),
        }).eq('id', sprint.id).eq('user_id', userId);
        if (killRuleError) throw killRuleError;
        if (killRuleStatus === 'triggered') {
          toast.warning(`${sprint.channel} reached its GTM kill rule.`, {
            description: 'Confirm Kill next week or record a clear rationale for overriding the evidence.',
          });
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
      // The service reloads immutable market experiments and decides whether
      // the same acquisition motion actually produced signal twice.
      const outcomeStatus = 'draft';
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
      const savedOutcome = await upsertJourneyOutcome({
        userId,
        tool: 'traction_engine',
        artifactType: 'traction_decision_ledger',
        artifactId: `traction-ledger-${userId}`,
        status: outcomeStatus,
        qualityChecks,
        evidenceManifest: outcomeManifest,
        completionScore: Math.round((completedChecks / Object.keys(qualityChecks).length) * 100),
        verificationMode: 'founder_reported',
      });
      const authoritativeOutcomeStatus = savedOutcome.evaluation.status;
      trackJourneyEvent('journey_stage_outcome_completed', {
        tool: 'traction_engine',
        artifact_type: 'traction_decision_ledger',
        artifact_id: `traction-ledger-${userId}`,
        outcome_status: authoritativeOutcomeStatus,
        week_count: ledgerLogs?.length ?? 0,
        decision_count: distinctDecisionWeeks,
      });

      localStorage.removeItem('ct_traction_draft');
      showDashboardReturnToast({
        message: 'Traction evidence and decision saved.',
        description: newlyVerifiedClaim ? 'A CT Verified claim and mentor unlock were added to your proof history.' : 'Continue the same experiment until its sample and evidence requirements are met.',
        tool: 'traction-engine',
        navigate,
      });
      await loadTractionData();
      await outcomeJourney.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save Traction Engine log.');
    } finally {
      setSaving(false);
    }
  };

  const isFirstTime = !loading && recentLogs.length === 0 && activeSprints.length === 0;
  const hasInput = experiments.some((e) => e.channel.trim() || e.resultValue > 0) || retention.newUsers > 0;
  const showScore = hasInput || recentLogs.length > 0;
  const repeatRun = outcomeJourney.snapshot?.stageRuns
    .filter((run) => run.stage === 'repeat')
    .sort((left, right) => right.attempt_number - left.attempt_number)[0];
  const readyLedger = repeatRun?.outcome_state === 'achieved' || repeatRun?.outcome_state === 'verified';
  const verifiedLedger = repeatRun?.outcome_state === 'verified';
  const comparableSignalCycles = Number(repeatRun?.evidence_summary?.comparableSignalCycles ?? 0);
  const firstCustomerHandoff = activeSprints.find((sprint) => sprint.activation_payload?.firstBuyerSignal);

  return (
    <div className="space-y-8">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.75fr)] lg:items-start">
        <div className="space-y-5 py-2 lg:py-4">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            <span className="takeover-gradient creatives-font">Traction Engine</span>
          </h1>
          <div className="max-w-2xl space-y-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            <p className="font-medium text-foreground/85">Traction is an observed acquisition decision, not a completion score.</p>
            <p>Run the pre-registered GTM experiment, record the full denominator and result, then double down, narrow, iterate, pivot, or kill.</p>
            <p>Retention stays in the GROW view and never upgrades separately founder-reported acquisition evidence.</p>
          </div>
        </div>
        <div className="w-full max-w-lg justify-self-end rounded-lg border border-border/70 bg-card/60 p-4">
          {showScore ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Supporting weekly score</p>
                  <p className={cn('mt-1 text-4xl font-bold', scoreColor(score.combinedScore))}>{score.combinedScore}</p>
                </div>
                <Badge className={cn(score.phaseSevenReady ? 'bg-success' : score.combinedScore >= 75 ? 'bg-success' : score.combinedScore >= 50 ? 'bg-warning' : 'bg-destructive')}>
                  {verifiedLedger ? 'CT proof recorded' : `${score.consistencyStreakWeeks} week streak`}
                </Badge>
              </div>
              {score.scoreDelta !== null && (
                <p className={cn('mt-3 text-xs font-medium', score.scoreDelta > 0 ? 'text-success' : score.scoreDelta < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                  {score.scoreDelta > 0 ? '+' : ''}{score.scoreDelta} points versus your last saved week
                </p>
              )}
              <div className="mt-4 rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Recommended next move</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{score.prioritizedRecommendation}</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <LineChart className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">Your Traction Score will appear here</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Fill in the Distribution Sprint Log and Retention Snapshot below. Save the week to lock in your score and start building your streak.</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {(['Consistency', 'Channel Efficiency', 'Experiment Quality', 'Retention Health'] as const).map((label) => (
                  <div key={label} className="rounded-md border border-border/50 bg-muted/30 px-3 py-2">
                    <p className="text-label font-medium text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground/60">25% weight</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {firstCustomerHandoff ? (
        <section className="rounded-xl border border-primary/25 bg-primary/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge variant="outline">First Customer Proof handoff</Badge>
              <h2 className="mt-2 text-lg font-semibold">Your first buyer signal is already attached.</h2>
              <p className="mt-1 text-sm text-muted-foreground">Repeat the same ICP, offer, and {firstCustomerHandoff.channel} channel once more. Change only one variable if the evidence says to iterate.</p>
            </div>
            <Badge>{comparableSignalCycles}/2 signal cycles</Badge>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-success/20 bg-success/5 p-5">
          <p className="mb-4 text-center text-sm font-semibold text-success dark:text-success">
            How Traction Engine works — follow the steps in order
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRACTION_TABS.map((tab) => (
              <div key={tab.id} className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-success/15 text-xs font-bold text-success dark:text-success">
                  {tab.step}
                </span>
                <div>
                  <p className="text-sm font-medium">{tab.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tab.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-success/20 pt-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {TRACTION_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-3 text-center transition-colors focus-visible:outline-none',
                    activeTab === tab.id
                      ? 'border-success bg-success/10 text-foreground'
                      : 'border-success/20 bg-background/40 text-muted-foreground hover:border-success/40 hover:text-foreground/80',
                  )}
                >
                  <span className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    activeTab === tab.id
                      ? 'bg-success text-white'
                      : 'bg-success/15 text-success dark:text-success',
                  )}>
                    {tab.step}
                  </span>
                  <span className="text-xs font-semibold leading-tight">{tab.label}</span>
                  <span className="text-caption leading-tight text-muted-foreground">{tab.subtitle}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TractionTab)}>

        {/* Step 1: Distribution Sprint Log */}
        <TabsContent value="sprint" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Target className="h-5 w-5 text-primary" />
                  Distribution Sprint Log
                </CardTitle>
                <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">Step 1 of 4</Badge>
              </div>
              <CardDescription>Run a maximum of two active channels. Each channel sprint lasts six weeks.</CardDescription>
              {activeSprints.length >= 2 && (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>Two active channels open. Close one sprint before adding a new channel.</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              {activeSprints.length > 0 && (
                <div className="space-y-3">
                  {activeSprints.map((sprint) => {
                    const weekNum = getSprintWeekNumber(sprint.cycle_start_date, currentWeekStart);
                    const atBoundary = isSprintAtBoundary(sprint.cycle_start_date, currentWeekStart);
                    return (
                      <div
                        key={sprint.id}
                        className={cn(
                          'rounded-lg border p-3',
                          atBoundary
                            ? 'border-warning/60 bg-warning/5'
                            : 'border-border/70 bg-background/70',
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{sprint.channel}</p>
                            {sprint.kill_rule_status && sprint.kill_rule_status !== 'collecting' && (
                              <p className={cn(
                                'mb-1 text-xs font-medium',
                                sprint.kill_rule_status === 'triggered'
                                  ? 'text-destructive'
                                  : sprint.kill_rule_status === 'at_risk'
                                    ? 'text-warning'
                                    : 'text-success',
                              )}>
                                Kill rule: {sprint.kill_rule_status.replace('_', ' ')}
                              </p>
                            )}
                            <p className={cn('text-xs', atBoundary ? 'font-medium text-warning' : 'text-muted-foreground')}>
                              Week {weekNum} of 6{atBoundary ? ' — sprint complete' : ''}
                            </p>
                          </div>
                          <Button type="button" size="sm" variant="outline" onClick={() => void closeSprint(sprint)}>
                            Close
                          </Button>
                        </div>
                        {atBoundary && (
                          <div className="mt-2 flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                            <span>This sprint has reached 6 weeks. Close it to log the summary and open a new channel if needed.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {experiments.map((experiment, index) => {
                const claim = verificationClaims.find((item) => item.experimentId === experiment.marketExperimentId);
                const readiness = evaluateDecisionReadiness({
                  targetValue: experiment.targetValue,
                  observedValue: experiment.resultValue,
                  minimumSampleSize: experiment.minimumSampleSize,
                  sampleSize: experiment.sampleSize,
                  verificationModes: claim?.evidenceLevel === 'ct_verified'
                    ? ['platform_verified']
                    : claim?.evidenceLevel === 'corroborated' ? ['corroborated'] : ['founder_reported'],
                });
                return (
                <div key={experiment.localId} className="space-y-4 rounded-lg border border-border/70 bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Experiment {index + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        {readiness.result} · {readiness.evidenceLevel.replaceAll('_', ' ')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Remove experiment"
                      disabled={experiments.length === 1}
                      onClick={() => removeExperiment(experiment.localId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {isFirstTime && index === 0 && (
                    <p className="text-xs font-medium text-success dark:text-success">
                      Start here — name the one channel you ran this week.
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Channel">
                      <Input
                        value={experiment.channel}
                        disabled={Boolean(experiment.marketExperimentId)}
                        onChange={(event) => updateExperiment(experiment.localId, { channel: event.target.value })}
                        placeholder="LinkedIn founder content"
                      />
                    </Field>
                    <Field label="Target Metric">
                      <Select
                        value={experiment.targetMetric}
                        disabled={Boolean(experiment.marketExperimentId)}
                        onValueChange={(value) => updateExperiment(experiment.localId, { targetMetric: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {metricOptions.map((metric) => (
                            <SelectItem key={metric} value={metric}>{metric}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field label="Hypothesis">
                    <Textarea
                      value={experiment.hypothesis}
                      disabled={Boolean(experiment.marketExperimentId)}
                      onChange={(event) => updateExperiment(experiment.localId, { hypothesis: event.target.value })}
                      placeholder="Posting a specific problem-solution thread will generate 10 qualified signups this week."
                    />
                    <p className="text-xs text-muted-foreground">One channel · one expected outcome · one measurable number. Be specific enough to repeat or kill next week.</p>
                  </Field>
                  <Field label="Action Taken">
                    <Textarea
                      value={experiment.actionTaken}
                      onChange={(event) => updateExperiment(experiment.localId, { actionTaken: event.target.value })}
                      placeholder="Describe exactly what you shipped, posted, sent, or tested."
                    />
                    <p className="text-xs text-muted-foreground">Describe exactly what you did — specific enough that someone else could replicate or a future you could improve on it.</p>
                  </Field>

                  {journeyAssumptions.length > 0 && (
                    <div className="grid gap-4 rounded-lg border border-primary/20 bg-primary/5 p-3 md:grid-cols-2">
                      <Field label="ICP assumption tested">
                        <Select
                          value={experiment.assumptionFingerprint ?? 'none'}
                          onValueChange={(value) => updateExperiment(experiment.localId, {
                            assumptionFingerprint: value === 'none' ? undefined : value,
                            assumptionStatus: value === 'none' ? undefined : experiment.assumptionStatus,
                          })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No ICP assumption linked</SelectItem>
                            {journeyAssumptions.map((assumption) => (
                              <SelectItem key={assumption.id} value={assumption.fingerprint}>{assumption.statement}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Measured result">
                        <Select
                          value={experiment.assumptionStatus ?? ''}
                          disabled={!experiment.assumptionFingerprint}
                          onValueChange={(value) => updateExperiment(experiment.localId, { assumptionStatus: value as 'confirmed' | 'rejected' })}
                        >
                          <SelectTrigger><SelectValue placeholder="Confirmed or rejected" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="confirmed">Confirmed by this week</SelectItem>
                            <SelectItem value="rejected">Rejected by this week</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <p className="text-xs text-muted-foreground md:col-span-2">
                        The weekly result is added to the ICP confidence history. It never rewrites the original customer decision.
                      </p>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-5">
                    <Field label="Target">
                      <Input
                        type="number"
                        min="0"
                        value={experiment.targetValue}
                        disabled={Boolean(experiment.marketExperimentId)}
                        onChange={(event) => updateExperiment(experiment.localId, { targetValue: numberFromInput(event.target.value) })}
                      />
                    </Field>
                    <Field label="Result">
                      <Input
                        type="number"
                        min="0"
                        value={experiment.resultValue}
                        onChange={(event) => updateExperiment(experiment.localId, { resultValue: numberFromInput(event.target.value) })}
                      />
                    </Field>
                    <Field label="New sample in this log">
                      <Input
                        type="number"
                        min="0"
                        value={experiment.sampleSize}
                        onChange={(event) => updateExperiment(experiment.localId, { sampleSize: numberFromInput(event.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Pre-registered minimum: {experiment.minimumSampleSize}</p>
                    </Field>
                    <Field label="Hours">
                      <Input
                        type="number"
                        min="0"
                        step="0.25"
                        value={experiment.timeInvestedHours}
                        onChange={(event) => updateExperiment(experiment.localId, { timeInvestedHours: numberFromInput(event.target.value) })}
                      />
                    </Field>
                    <Field label="Decision">
                      <p className="mb-2 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2 text-xs text-primary">
                        Evidence recommendation: {decisionLabels[readiness.recommendedDecision]}
                      </p>
                      <Select
                        value={experiment.decision}
                        onValueChange={(value) => updateExperiment(experiment.localId, { decision: value as TractionDecision })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(decisionLabels) as TractionDecision[]).map((decision) => (
                            <SelectItem key={decision} value={decision}>{decisionLabels[decision]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {experiment.decision !== readiness.recommendedDecision && (
                        <Textarea
                          className="mt-2"
                          rows={2}
                          value={experiment.decisionRationale}
                          onChange={(event) => updateExperiment(experiment.localId, { decisionRationale: event.target.value })}
                          placeholder="Explain why you are overriding the recommendation."
                        />
                      )}
                      <p className="text-xs text-muted-foreground">Reach the sample first, then compare the result with the pre-registered threshold.</p>
                    </Field>
                  </div>
                  {['iterate', 'narrow', 'pivot'].includes(experiment.decision) ? (
                    <div className="grid gap-4 rounded-lg border border-warning/25 bg-warning/5 p-3 md:grid-cols-3">
                      <Field label="One variable to change next">
                        <Select value={experiment.changedVariable ?? 'message'} onValueChange={(value) => updateExperiment(experiment.localId, { changedVariable: value as ChangedExperimentVariable })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(['audience', 'problem', 'offer', 'message', 'channel', 'asset', 'cta', 'target'] as ChangedExperimentVariable[]).map((variable) => (
                              <SelectItem key={variable} value={variable}>{variable.replaceAll('_', ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="New value in the next version">
                        <Input
                          value={experiment.nextVariableValue}
                          onChange={(event) => updateExperiment(experiment.localId, { nextVariableValue: event.target.value })}
                          placeholder={experiment.changedVariable === 'target' ? 'Numeric target' : `New ${experiment.changedVariable ?? 'message'}`}
                        />
                      </Field>
                      <div className="text-xs text-muted-foreground"><p className="font-medium text-foreground">Preserve causality</p><p className="mt-1">The next version keeps every other input fixed and preserves this experiment permanently.</p></div>
                    </div>
                  ) : null}
                  <div className={cn('rounded-lg border p-3 text-sm', readiness.ctVerified ? 'border-success/30 bg-success/5' : 'border-border/70 bg-muted/20')}>
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{readiness.ctVerified ? 'CT Verified result' : 'Evidence still in progress'}</p><Badge variant="outline" className="capitalize">{readiness.result}</Badge></div>
                    <p className="mt-1 text-xs text-muted-foreground">{readiness.missingEvidence.length > 0 ? readiness.missingEvidence.join(' · ') : 'The execution and result are externally verified. A successful result was not required.'}</p>
                  </div>
                </div>
                );
              })}

              <Button type="button" variant="outline" className="gap-2" onClick={addExperiment} disabled={experiments.length >= 2}>
                <Plus className="h-4 w-4" />
                Add Experiment
              </Button>
            </CardContent>
          </Card>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
            <p className="text-xs text-muted-foreground">Once you've logged your sprint, add your retention numbers.</p>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setActiveTab('retention')}>
              Retention Snapshot <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TabsContent>

        {/* Step 2: Retention Snapshot */}
        <TabsContent value="retention" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Activity className="h-5 w-5 text-primary" />
                  Retention Snapshot
                </CardTitle>
                <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">Step 2 of 4</Badge>
              </div>
              <CardDescription>Enter numbers from your product analytics or email tool. Distribution only counts when the users it brings come back.</CardDescription>
              {platformSnapshot && (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    Auto-filled from your published MVP — {platformSnapshot.totalVisitors} visitor
                    {platformSnapshot.totalVisitors === 1 ? '' : 's'} tracked
                    {platformSnapshot.trackedSince ? ` since ${platformSnapshot.trackedSince}` : ''}. Verified by the
                    platform; numbers stay editable.
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="New Users This Week">
                <Input
                  type="number"
                  min="0"
                  value={retention.newUsers}
                  onChange={(event) => setRetention((current) => ({ ...current, newUsers: numberFromInput(event.target.value) }))}
                />
              </Field>
              <Field label="7-Day Active Users">
                <Input
                  type="number"
                  min="0"
                  value={retention.sevenDayActiveUsers}
                  onChange={(event) => setRetention((current) => ({ ...current, sevenDayActiveUsers: numberFromInput(event.target.value) }))}
                />
              </Field>
              <Field label="30-Day Active Users">
                <Input
                  type="number"
                  min="0"
                  value={retention.thirtyDayActiveUsers}
                  onChange={(event) => setRetention((current) => ({ ...current, thirtyDayActiveUsers: numberFromInput(event.target.value) }))}
                />
              </Field>
              <Field label="Primary Acquisition Channel">
                <Input
                  value={retention.primaryAcquisitionChannel}
                  onChange={(event) => setRetention((current) => ({ ...current, primaryAcquisitionChannel: event.target.value }))}
                  placeholder="LinkedIn founder content"
                />
              </Field>
              <Field label="Product Category">
                <Select
                  value={retention.productCategory}
                  onValueChange={(value) => setRetention((current) => ({ ...current, productCategory: value as TractionProductCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRODUCT_CATEGORY_LABELS) as TractionProductCategory[]).map((category) => (
                      <SelectItem key={category} value={category}>{PRODUCT_CATEGORY_LABELS[category]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Revenue Optional">
                <Input
                  type="number"
                  min="0"
                  value={retention.revenue ?? ''}
                  onChange={(event) => setRetention((current) => ({
                    ...current,
                    revenue: event.target.value ? numberFromInput(event.target.value) : undefined,
                  }))}
                  placeholder="1200"
                />
              </Field>
            </CardContent>
          </Card>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
            <p className="text-xs text-muted-foreground">Snapshot saved in memory. Check your history before reviewing signals.</p>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setActiveTab('recent')}>
              Recent Weeks <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TabsContent>

        {/* Step 3: Recent Weeks */}
        <TabsContent value="recent" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Weeks
                </CardTitle>
                <div className="flex items-center gap-2">
                  {recentLogs.length > 0 && userId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        captureEvent('traction_report_exported', { verified: verifiedLedger, week_count: consecutiveWeekCount, decision_count: decisionWeekCount });
                        void exportTractionReportPdf(userId).catch((error) =>
                          toast.error(error instanceof Error ? error.message : 'Export failed.'),
                        );
                      }}
                    >
                      <LineChart className="h-3.5 w-3.5" />
                      Export evidence report
                    </Button>
                  )}
                  <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">Step 3 of 4</Badge>
                </div>
              </div>
              <CardDescription>{loading ? 'Loading history...' : 'Your latest decision history. CT claims are verified per acquisition metric; retention provenance remains separate.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={cn('rounded-lg border p-3', verifiedLedger ? 'border-success/30 bg-success/5' : 'border-border/70 bg-muted/20')}>
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">CT proof history</p><Badge variant="outline">{verifiedLedger ? 'CT Verified claim available' : 'Evidence in progress'}</Badge></div>
                <p className="mt-2 text-xs text-muted-foreground">{comparableSignalCycles}/2 comparable buyer-signal cycles · {verifiedLedger ? 'at least one signal verified' : 'verification still required'} · {recentLogs.length} decision log{recentLogs.length === 1 ? '' : 's'} retained</p>
              </div>
              {recentLogs.length === 0 ? (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">No saved weeks yet.</p>
                  <p className="text-xs text-muted-foreground/70">Fill in an experiment and a retention snapshot, then hit "Save This Week" on the Weekly Signal tab to lock in your first score.</p>
                </div>
              ) : (
                recentLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{log.week_start_date}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{log.prioritized_recommendation}</p>
                      </div>
                      <Badge className={cn('text-white', log.combined_score >= 75 ? 'bg-success' : log.combined_score >= 50 ? 'bg-warning' : 'bg-destructive')}>
                        {log.combined_score}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
            <p className="text-xs text-muted-foreground">Ready to review this week's signal and save your score?</p>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setActiveTab('signal')}>
              Weekly Signal <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TabsContent>

        {/* Step 4: Weekly Signal */}
        <TabsContent value="signal" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <LineChart className="h-5 w-5 text-primary" />
                  Weekly Signal
                </CardTitle>
                <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">Step 4 of 4</Badge>
              </div>
              <CardDescription>Decision readiness comes from sample, threshold, and evidence trust. The legacy score remains supporting context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {([
                ['Consistency', score.consistencyScore, 'consistency'],
                ['Channel Efficiency', score.channelEfficiencyScore, 'channel_efficiency'],
                ['Experiment Quality', score.experimentQualityScore, 'experiment_quality'],
                ['Retention Health', score.retentionHealthScore, 'retention_health'],
              ] as const).map(([label, value, key]) => {
                const detail = score.dimensionInsights.find((dimension) => dimension.key === key)?.detail;
                return (
                  <ScoreStat
                    key={key}
                    label={label}
                    value={value}
                    detail={detail}
                    badge={key === score.strongestDimension.key ? 'Strongest' : key === score.priorityDimension.key ? 'Improve first' : undefined}
                  />
                );
              })}
              {benchmarks && (
                <div className="rounded-lg border border-info/25 bg-info/5 p-4">
                  <p className="text-sm font-semibold">
                    {PRODUCT_CATEGORY_LABELS[retention.productCategory]} cohort benchmark
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Across {benchmarks.cohortUsers} founders in your category (last 6 months): median weekly score{' '}
                    <span className="font-semibold text-foreground">{benchmarks.p50}</span> · top quartile{' '}
                    <span className="font-semibold text-foreground">{benchmarks.p75}+</span>. Your current week:{' '}
                    <span className={cn('font-semibold', scoreColor(score.combinedScore))}>{score.combinedScore}</span>
                    {score.combinedScore >= benchmarks.p75
                      ? ' — top quartile.'
                      : score.combinedScore >= benchmarks.p50
                        ? ' — above the median.'
                        : ' — below the median; consistency moves this fastest.'}
                  </p>
                </div>
              )}
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-semibold">Channel quality signal</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{score.channelQualitySignal}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-semibold">Growth evidence readiness</p>
                <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                  {readyLedger ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{readyLedger ? 'First repeatable demand has been demonstrated across two comparable cycles.' : repeatRun?.branch_reason ?? 'Repeat the same ICP, offer, and channel in a second acquisition cycle.'}</span>
                </div>
              </div>
              <Button
                type="button"
                className="w-full gap-2"
                disabled={!userId || saving}
                onClick={() => void saveWeeklyLog()}
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Save This Week
              </Button>
              {!userId && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  Sign in to save weekly traction history.
                </p>
              )}
            </CardContent>
          </Card>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
            <p className="text-xs text-muted-foreground">Saved? Next week, return to Distribution Sprint Log and start the cycle again.</p>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setActiveTab('sprint')}>
              <ChevronLeft className="h-3.5 w-3.5" /> Sprint Log
            </Button>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

export default function TractionEnginePage() {
  const { user } = useAuth();
  const publicTab = {
    featureName: 'Traction Engine',
    description: 'Evaluate pre-registered acquisition experiments, metric-level evidence, decisions, and retention signals.',
  };
  const tractionFaqs = [
    {
      question: "How does Traction Engine score traction?",
      answer: "It blends four equally weighted dimensions: consistency streak, channel efficiency, experiment quality, and retention health, benchmarked by product category.",
    },
    {
      question: "What makes an acquisition result CT Verified?",
      answer: "The experiment must reach its pre-registered sample and the result must be supported by platform-recorded or reviewer-verified customer evidence. Passing the target is not required.",
    },
    {
      question: "Why should founders track distribution experiments weekly?",
      answer: "Weekly tracking creates a compound record of what channels convert, what messaging resonates, and where retention breaks — the pattern is more valuable than any single data point.",
    },
  ];

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Traction Engine',
      description: 'Weekly distribution experiment tracker and retention scorecard for founders building repeatable traction.',
      url: 'https://creatives-takeover.com/traction-engine',
    },
    createFAQSchema(tractionFaqs),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Traction Engine', url: '/traction-engine' },
    ]),
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SEO
        title="Traction Engine - Creatives Takeover"
        description="Run pre-registered acquisition experiments, evaluate trustworthy customer evidence, and make clear double-down, iterate, narrow, pivot, or kill decisions."
        keywords="traction engine, distribution experiments, retention scorecard, startup traction tracker"
        url="/traction-engine"
        structuredData={structuredData}
      />
      <TractionEngineWallpaper />
      <div className="relative z-10">
        <Navigation />
        <main className="px-4 pt-28 pb-16 md:pt-32 md:pb-20 lg:pt-36">
          <div className="container mx-auto max-w-7xl">
            {user ? (
              <TractionEngineWorkflow userId={user.id} />
            ) : (
              <PreviewModeWrapper
                featureName={publicTab.featureName}
                description={publicTab.description}
              >
                <TractionEngineWorkflow />
              </PreviewModeWrapper>
            )}
          </div>
        </main>
        <div className="px-4 pb-16 container mx-auto max-w-7xl">
          <RelatedToolsSection
            tools={[
              { name: "Go-to-Market Strategist", description: "Build the launch plan your traction data should inform.", url: "/go-to-market" },
              { name: "Insighta", description: "Turn traction evidence into investor-ready fundraising prep.", url: "/insighta" },
              { name: "PMF Lab", description: "Score product-market fit signals alongside your traction data.", url: "/pmf-lab" },
            ]}
          />
        </div>
        <Footer />
      </div>
    </div>
  );
}
