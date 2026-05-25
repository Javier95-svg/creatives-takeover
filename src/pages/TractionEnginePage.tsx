import { useEffect, useMemo, useState } from 'react';
import SEO, { createBreadcrumbSchema, createFAQSchema } from '@/components/SEO';
import RelatedToolsSection from '@/components/seo/RelatedToolsSection';
import { useSearchParams } from 'react-router-dom';
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
  calculateTractionScore,
  getCurrentWeekStart,
  getSprintWeekNumber,
  isSprintAtBoundary,
  type TractionDecision,
  type TractionExperimentInput,
  type TractionProductCategory,
  type TractionRetentionInput,
} from '@/lib/tractionEngine';
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

const SPRINTS_TABLE = 'traction_engine_sprints' as const;
const LOGS_TABLE = 'traction_engine_weekly_logs' as const;
const EXPERIMENTS_TABLE = 'traction_engine_experiments' as const;

type SprintRow = {
  id: string;
  channel: string;
  cycle_start_date: string;
  status: 'active' | 'closed';
};

type WeeklyLogRow = {
  id: string;
  week_start_date: string;
  combined_score: number;
  phase_seven_ready: boolean;
  prioritized_recommendation: string;
};

type ExperimentDraft = TractionExperimentInput & { localId: string };

const decisionLabels: Record<TractionDecision, string> = {
  double_down: 'Double Down',
  iterate: 'Iterate',
  kill: 'Kill',
};

const metricOptions = ['Signups', 'Clicks', 'Replies', 'DMs', 'Activation events', 'Revenue', 'Organic visits'];

const createExperimentDraft = (): ExperimentDraft => ({
  localId: crypto.randomUUID(),
  channel: '',
  hypothesis: '',
  actionTaken: '',
  targetMetric: 'Signups',
  targetValue: 10,
  resultValue: 0,
  timeInvestedHours: 2,
  decision: 'iterate',
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
  value >= 75 ? 'text-emerald-500' : value >= 50 ? 'text-amber-500' : 'text-rose-500';

const scoreProgressColor = (value: number) =>
  value >= 75 ? '[&>div]:bg-emerald-500' : value >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-rose-500';

type TractionTab = 'sprint' | 'retention' | 'recent' | 'signal';

const TRACTION_TABS: Array<{ id: TractionTab; step: number; label: string; subtitle: string; description: string }> = [
  { id: 'sprint',    step: 1, label: 'Distribution Sprint Log', subtitle: 'Set your sprint goals',
    description: 'Log one channel, one hypothesis, and one measurable outcome. Record your target metric and result at week\'s end.' },
  { id: 'retention', step: 2, label: 'Retention Snapshot',      subtitle: 'Track who\'s staying',
    description: 'Enter new users, 7-day actives, and 30-day actives. Distribution only counts when users come back.' },
  { id: 'recent',    step: 3, label: 'Recent Weeks',            subtitle: 'Log what happened',
    description: 'Review your last five saved scorecards. Spot trends and check your streak before committing to this week.' },
  { id: 'signal',    step: 4, label: 'Weekly Signal',           subtitle: 'Review your results',
    description: 'Your score rolls up from the three previous steps. Save to lock in your streak and check Phase 7 readiness.' },
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
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-border bg-card text-muted-foreground',
          )}>
            {tab.step}
          </span>
          <span className="text-[11px] font-semibold leading-tight sm:text-xs">{tab.label}</span>
          <span className="hidden text-[10px] leading-tight text-muted-foreground sm:block">{tab.subtitle}</span>
        </button>
      ))}
    </div>
  );
}

function ScoreStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={cn('text-lg font-semibold', scoreColor(value))}>{value}</span>
      </div>
      <Progress value={value} className={cn('h-2', scoreProgressColor(value))} />
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('step') as TractionTab) ?? 'sprint';
  const setActiveTab = (tab: TractionTab) =>
    setSearchParams({ step: tab }, { replace: true });

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
    const [sprintsRes, logsRes] = await Promise.all([
      supabase
        .from(SPRINTS_TABLE)
        .select('id, channel, cycle_start_date, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('cycle_start_date', { ascending: false }),
      supabase
        .from(LOGS_TABLE)
        .select('id, week_start_date, combined_score, phase_seven_ready, prioritized_recommendation')
        .eq('user_id', userId)
        .order('week_start_date', { ascending: false })
        .limit(8),
    ]);

    if (sprintsRes.error) {
      toast.error('Could not load active traction sprints.');
    } else {
      setActiveSprints((sprintsRes.data ?? []) as SprintRow[]);
    }

    if (logsRes.error) {
      toast.error('Could not load traction history.');
    } else {
      setRecentLogs((logsRes.data ?? []) as WeeklyLogRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadTractionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    for (const channel of newChannels) {
      const { data, error } = await supabase
        .from(SPRINTS_TABLE)
        .insert({
          user_id: userId,
          channel,
          cycle_start_date: currentWeekStart,
          status: 'active',
        })
        .select('id, channel, cycle_start_date, status')
        .single();

      if (error) throw error;
      const sprint = data as SprintRow;
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
        },
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
          pass: experimentScore.pass,
          efficiency_score: experimentScore.efficiencyScore,
          quality_score: experimentScore.qualityScore,
        };
      });

      const { error: experimentError } = await supabase.from(EXPERIMENTS_TABLE).insert(experimentRows);
      if (experimentError) throw experimentError;

      localStorage.removeItem('ct_traction_draft');
      toast.success(score.phaseSevenReady ? 'Saved. Phase 7 readiness unlocked.' : 'Traction week saved.');
      await loadTractionData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save Traction Engine log.');
    } finally {
      setSaving(false);
    }
  };

  const isFirstTime = !loading && recentLogs.length === 0 && activeSprints.length === 0;
  const hasInput = experiments.some((e) => e.channel.trim() || e.resultValue > 0) || retention.newUsers > 0;
  const showScore = hasInput || recentLogs.length > 0;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            <span className="takeover-gradient creatives-font">Traction Engine</span>
          </h1>
          <div className="max-w-3xl space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>Traction is a pattern, not a spike.</p>
            <p>Start with the acquisition channels your GTM Strategist surfaced and run one focused experiment each week. Log what you shipped, measure who came back, and repeat.</p>
            <p>Show up consistently and the score takes care of itself. Three consecutive weeks above the threshold means you have a repeatable growth loop and the Fundraise stage is within reach.</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          {showScore ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">This week's score</p>
                  <p className={cn('mt-1 text-5xl font-bold', scoreColor(score.combinedScore))}>{score.combinedScore}</p>
                </div>
                <Badge className={cn(score.phaseSevenReady ? 'bg-emerald-600' : score.combinedScore >= 75 ? 'bg-emerald-600' : score.combinedScore >= 50 ? 'bg-amber-500' : 'bg-rose-500')}>
                  {score.phaseSevenReady ? 'Phase 7 Ready' : `${score.consistencyStreakWeeks} week streak`}
                </Badge>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{score.prioritizedRecommendation}</p>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <LineChart className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium">Your Traction Score will appear here</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Fill in the Distribution Sprint Log and Retention Snapshot below. Save the week to lock in your score and start building your streak.</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {(['Consistency', 'Channel Efficiency', 'Experiment Quality', 'Retention Health'] as const).map((label) => (
                  <div key={label} className="rounded-md border border-border/50 bg-muted/30 px-3 py-2">
                    <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground/60">25% weight</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <p className="mb-4 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            How Traction Engine works — follow the steps in order
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRACTION_TABS.map((tab) => (
              <div key={tab.id} className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {tab.step}
                </span>
                <div>
                  <p className="text-sm font-medium">{tab.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tab.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-emerald-500/20 pt-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {TRACTION_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-3 text-center transition-colors focus-visible:outline-none',
                    activeTab === tab.id
                      ? 'border-emerald-500 bg-emerald-500/10 text-foreground'
                      : 'border-emerald-500/20 bg-background/40 text-muted-foreground hover:border-emerald-500/40 hover:text-foreground/80',
                  )}
                >
                  <span className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                  )}>
                    {tab.step}
                  </span>
                  <span className="text-xs font-semibold leading-tight">{tab.label}</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">{tab.subtitle}</span>
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
                <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-600">
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
                            ? 'border-amber-400/60 bg-amber-500/5'
                            : 'border-border/70 bg-background/70',
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{sprint.channel}</p>
                            <p className={cn('text-xs', atBoundary ? 'font-medium text-amber-500' : 'text-muted-foreground')}>
                              Week {weekNum} of 6{atBoundary ? ' — sprint complete' : ''}
                            </p>
                          </div>
                          <Button type="button" size="sm" variant="outline" onClick={() => void closeSprint(sprint)}>
                            Close
                          </Button>
                        </div>
                        {atBoundary && (
                          <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                            <span>This sprint has reached 6 weeks. Close it to log the summary and open a new channel if needed.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {experiments.map((experiment, index) => (
                <div key={experiment.localId} className="space-y-4 rounded-lg border border-border/70 bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Experiment {index + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        {score.experimentScores[index]?.pass ? 'Passing target' : 'Needs more signal'}
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
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Start here — name the one channel you ran this week.
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Channel">
                      <Input
                        value={experiment.channel}
                        onChange={(event) => updateExperiment(experiment.localId, { channel: event.target.value })}
                        placeholder="LinkedIn founder content"
                      />
                    </Field>
                    <Field label="Target Metric">
                      <Select
                        value={experiment.targetMetric}
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

                  <div className="grid gap-4 md:grid-cols-4">
                    <Field label="Target">
                      <Input
                        type="number"
                        min="0"
                        value={experiment.targetValue}
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
                      <p className="text-xs text-muted-foreground">Hit target → double down. Close → iterate. Far off → kill.</p>
                    </Field>
                  </div>
                </div>
              ))}

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
                <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">Step 3 of 4</Badge>
              </div>
              <CardDescription>{loading ? 'Loading history...' : 'Your latest saved traction scorecards.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                      <Badge className={cn('text-white', log.combined_score >= 75 ? 'bg-emerald-600' : log.combined_score >= 50 ? 'bg-amber-500' : 'bg-rose-500')}>
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
              <CardDescription>Equal weighting across consistency, efficiency, experiment quality, and retention.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreStat label="Consistency" value={score.consistencyScore} />
              <ScoreStat label="Channel Efficiency" value={score.channelEfficiencyScore} />
              <ScoreStat label="Experiment Quality" value={score.experimentQualityScore} />
              <ScoreStat label="Retention Health" value={score.retentionHealthScore} />
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-semibold">Channel quality signal</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{score.channelQualitySignal}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-semibold">Phase 7 readiness</p>
                <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                  {score.phaseSevenReady ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{score.phaseSevenReady ? 'Three consecutive 75+ weeks reached.' : 'Needs three consecutive weeks at 75+.'}</span>
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
    description: 'Track weekly distribution experiments, retention signals, and Phase 7 readiness.',
  };
  const tractionFaqs = [
    {
      question: "How does Traction Engine score traction?",
      answer: "It blends four equally weighted dimensions: consistency streak, channel efficiency, experiment quality, and retention health, benchmarked by product category.",
    },
    {
      question: "What is Phase 7 readiness in traction scoring?",
      answer: "Three consecutive weeks at 75 or above flag Phase 7 readiness, which gives founders a defensible traction story before walking into investor conversations.",
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
        description="Track weekly distribution experiments, retention health, and Phase 7 fundraising readiness with a deterministic Traction Score."
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
