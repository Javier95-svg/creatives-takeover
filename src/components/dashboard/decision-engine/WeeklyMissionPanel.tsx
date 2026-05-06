import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Calendar, CheckCircle2, Clock3, Gift, Sparkles, Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  trackWeeklyMissionCompleted,
  trackWeeklyMissionCreated,
  trackWeeklyMissionMissed,
  trackWeeklyMissionViewed,
} from '@/lib/analytics';
import type { BizMapStage } from '@/lib/bizmapStages';
import type { Plan } from '@/config/planPermissions';
import type { WeeklyMission } from '@/hooks/decision-engine/useWeeklyMission';

interface WeeklyMissionPanelProps {
  variant?: 'default' | 'compact';
}

interface MissionTaskTemplate {
  title: string;
  priority: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  route: string;
}

interface MissionTemplate {
  title: string;
  description: string;
  targetMetric: string;
  targetValue: number;
  criteriaLabel: string;
  rewardLabel: string;
  tasks: MissionTaskTemplate[];
}

const missionTemplates: Record<BizMapStage, Record<Plan, MissionTemplate>> = {
  IDENTITY: {
    rookie: {
      title: 'Finish the customer clarity pass',
      description: 'At Identity stage, retention starts with proving the founder knows exactly who the next action serves.',
      targetMetric: 'identity_tasks_completed',
      targetValue: 2,
      criteriaLabel: 'Complete 2 Identity tasks and save one customer pain statement.',
      rewardLabel: 'Home updates your cycle progress and unlocks a cleaner Prototype preview.',
      tasks: [
        { title: 'Save your ICP profile', priority: 'high', estimatedMinutes: 30, route: '/icp-builder' },
        { title: 'Write the top customer pain in one sentence', priority: 'high', estimatedMinutes: 15, route: '/icp-builder' },
      ],
    },
    starter: {
      title: 'Turn ICP into a waitlist promise',
      description: 'Starter founders need the Identity work to become a clear promise they can test in market.',
      targetMetric: 'identity_to_prototype_actions',
      targetValue: 3,
      criteriaLabel: 'Complete 3 actions: ICP, pain statement, and waitlist promise.',
      rewardLabel: 'Prototype work becomes the obvious next tab action.',
      tasks: [
        { title: 'Review ICP buyer trigger', priority: 'high', estimatedMinutes: 20, route: '/icp-builder' },
        { title: 'Draft one waitlist promise', priority: 'high', estimatedMinutes: 25, route: '/waitlist' },
        { title: 'Choose one validation question', priority: 'medium', estimatedMinutes: 15, route: '/icp-builder' },
      ],
    },
    rising: {
      title: 'Pressure-test the first traction hypothesis',
      description: 'Rising founders need the customer segment, urgency, and traction assumption to line up before scaling work.',
      targetMetric: 'traction_hypotheses_checked',
      targetValue: 3,
      criteriaLabel: 'Validate ICP, buying trigger, and first traction hypothesis.',
      rewardLabel: 'Your task layer prioritizes execution work with less hand-holding.',
      tasks: [
        { title: 'Audit ICP urgency signals', priority: 'high', estimatedMinutes: 30, route: '/icp-builder' },
        { title: 'Write first traction hypothesis', priority: 'high', estimatedMinutes: 20, route: '/dashboard/tasks' },
        { title: 'Pick a validation channel', priority: 'medium', estimatedMinutes: 20, route: '/go-to-market' },
      ],
    },
    pro: {
      title: 'Sharpen the investor-grade customer narrative',
      description: 'Pro founders need Identity work to support both execution and a credible market narrative.',
      targetMetric: 'narrative_checks_completed',
      targetValue: 3,
      criteriaLabel: 'Complete segment, pain, and market narrative checks.',
      rewardLabel: 'Home shows the sharper strategic track and Pro roadmap context.',
      tasks: [
        { title: 'Define highest-value segment', priority: 'high', estimatedMinutes: 25, route: '/icp-builder' },
        { title: 'Connect pain to market timing', priority: 'high', estimatedMinutes: 25, route: '/dashboard/tasks' },
        { title: 'Draft one investor narrative proof point', priority: 'medium', estimatedMinutes: 20, route: '/dashboard/tasks' },
      ],
    },
  },
  PROTOTYPE: {
    rookie: {
      title: 'Explain the product promise clearly',
      description: 'Prototype stage should turn the customer pain into a promise a real person can react to.',
      targetMetric: 'prototype_clarity_actions',
      targetValue: 2,
      criteriaLabel: 'Write the value proposition and one landing-page hero draft.',
      rewardLabel: 'Your Focus Funnel moves from idea clarity toward demand capture.',
      tasks: [
        { title: 'Write a one-line value proposition', priority: 'high', estimatedMinutes: 20, route: '/waitlist' },
        { title: 'Draft landing hero copy', priority: 'medium', estimatedMinutes: 25, route: '/waitlist' },
      ],
    },
    starter: {
      title: 'Publish a qualified waitlist test',
      description: 'Starter founders need the prototype visible enough to collect a real signal.',
      targetMetric: 'waitlist_launch_actions',
      targetValue: 3,
      criteriaLabel: 'Publish or improve the waitlist and share it with 10 qualified prospects.',
      rewardLabel: 'Validation tasks become the next weekly recommendation.',
      tasks: [
        { title: 'Update waitlist promise', priority: 'high', estimatedMinutes: 20, route: '/waitlist' },
        { title: 'Publish or mark the page ready', priority: 'high', estimatedMinutes: 15, route: '/waitlist' },
        { title: 'Send the page to 10 target customers', priority: 'medium', estimatedMinutes: 30, route: '/dashboard/tasks' },
      ],
    },
    rising: {
      title: 'Measure signup quality, not just volume',
      description: 'Rising founders need prototype work to reveal whether the right people are responding.',
      targetMetric: 'qualified_signup_checks',
      targetValue: 3,
      criteriaLabel: 'Review copy, publish the page, and classify signup quality.',
      rewardLabel: 'Home progress reflects higher quality demand evidence.',
      tasks: [
        { title: 'Refine benefits around buying trigger', priority: 'high', estimatedMinutes: 25, route: '/waitlist' },
        { title: 'Review first signup quality', priority: 'high', estimatedMinutes: 20, route: '/waitlist' },
        { title: 'Log the strongest demand signal', priority: 'medium', estimatedMinutes: 15, route: '/dashboard/tasks' },
      ],
    },
    pro: {
      title: 'Connect prototype demand to traction proof',
      description: 'Pro founders need prototype activity to support positioning, traction, and fundraising readiness.',
      targetMetric: 'traction_proof_actions',
      targetValue: 3,
      criteriaLabel: 'Tie waitlist messaging, signup quality, and traction proof into one update.',
      rewardLabel: 'Pro roadmap context surfaces fundraising relevance when Launch unlocks.',
      tasks: [
        { title: 'Map waitlist promise to traction proof', priority: 'high', estimatedMinutes: 25, route: '/waitlist' },
        { title: 'Segment qualified signups', priority: 'high', estimatedMinutes: 25, route: '/waitlist' },
        { title: 'Write a traction update note', priority: 'medium', estimatedMinutes: 20, route: '/dashboard/tasks' },
      ],
    },
  },
  VALIDATING: {
    rookie: {
      title: 'Capture one honest customer signal',
      description: 'Validation only matters when the founder records what the market actually said.',
      targetMetric: 'validation_signals_logged',
      targetValue: 1,
      criteriaLabel: 'Log 1 honest interview, survey, or rejection signal.',
      rewardLabel: 'Home turns that signal into the next recommended action.',
      tasks: [{ title: 'Record one customer signal', priority: 'high', estimatedMinutes: 25, route: '/pmf-lab' }],
    },
    starter: {
      title: 'Run a focused validation loop',
      description: 'Starter founders need a small loop with enough evidence to decide what changes next.',
      targetMetric: 'validation_loop_actions',
      targetValue: 3,
      criteriaLabel: 'Complete checklist, log evidence, and name the strongest signal.',
      rewardLabel: 'Building previews become clearer after validation closes.',
      tasks: [
        { title: 'Save PMF validation checklist', priority: 'high', estimatedMinutes: 20, route: '/pmf-lab' },
        { title: 'Log 3 evidence notes', priority: 'high', estimatedMinutes: 30, route: '/pmf-lab' },
        { title: 'Name the strongest buying or rejection signal', priority: 'medium', estimatedMinutes: 15, route: '/dashboard/tasks' },
      ],
    },
    rising: {
      title: 'Decide what changes before building',
      description: 'Rising founders need validation to remove uncertainty, not add more vague feedback.',
      targetMetric: 'build_decision_inputs',
      targetValue: 3,
      criteriaLabel: 'Complete evidence review, risk decision, and next build implication.',
      rewardLabel: 'Your task list starts prioritizing build-readiness work.',
      tasks: [
        { title: 'Review validation evidence', priority: 'high', estimatedMinutes: 25, route: '/pmf-lab' },
        { title: 'Identify the biggest build risk', priority: 'high', estimatedMinutes: 20, route: '/pmf-lab' },
        { title: 'Write the build implication', priority: 'medium', estimatedMinutes: 15, route: '/dashboard/tasks' },
      ],
    },
    pro: {
      title: 'Separate real pull from polite feedback',
      description: 'Pro founders need validation evidence that can survive strategic and investor scrutiny.',
      targetMetric: 'pull_signals_classified',
      targetValue: 3,
      criteriaLabel: 'Classify pull signals, weak signals, and the resulting growth thesis update.',
      rewardLabel: 'Home reflects stronger evidence quality and Pro autonomy.',
      tasks: [
        { title: 'Classify real pull signals', priority: 'high', estimatedMinutes: 30, route: '/pmf-lab' },
        { title: 'Document weak feedback patterns', priority: 'medium', estimatedMinutes: 20, route: '/pmf-lab' },
        { title: 'Update growth thesis', priority: 'high', estimatedMinutes: 25, route: '/dashboard/tasks' },
      ],
    },
  },
  BUILDING: {
    rookie: {
      title: 'Define the smallest useful product',
      description: 'Building stage must reduce scope before it increases work.',
      targetMetric: 'mvp_scope_actions',
      targetValue: 2,
      criteriaLabel: 'Save MVP scope and one must-have user outcome.',
      rewardLabel: 'Home makes the build path less noisy tomorrow.',
      tasks: [
        { title: 'Save MVP scope', priority: 'high', estimatedMinutes: 30, route: '/mvp-builder' },
        { title: 'Define one must-have user outcome', priority: 'high', estimatedMinutes: 15, route: '/mvp-builder' },
      ],
    },
    starter: {
      title: 'Convert validation into a build list',
      description: 'Starter founders need build tasks that trace back to customer evidence.',
      targetMetric: 'build_ready_tasks',
      targetValue: 3,
      criteriaLabel: 'Create scope, stack, and first build-ready task list.',
      rewardLabel: 'Launch previews become more concrete after build scope is saved.',
      tasks: [
        { title: 'Save MVP spec', priority: 'high', estimatedMinutes: 30, route: '/mvp-builder' },
        { title: 'Save Tech Stack recommendation', priority: 'high', estimatedMinutes: 25, route: '/tech-stack' },
        { title: 'List 3 build-ready tasks', priority: 'medium', estimatedMinutes: 20, route: '/dashboard/tasks' },
      ],
    },
    rising: {
      title: 'Ship one validated MVP improvement',
      description: 'Rising founders need build momentum tied directly to validated demand.',
      targetMetric: 'validated_build_improvements',
      targetValue: 1,
      criteriaLabel: 'Ship or mark one validated MVP improvement ready for review.',
      rewardLabel: 'Home progress shifts from planning to traction preparation.',
      tasks: [
        { title: 'Choose one validated improvement', priority: 'high', estimatedMinutes: 20, route: '/mvp-builder' },
        { title: 'Update scope or implementation plan', priority: 'high', estimatedMinutes: 30, route: '/mvp-builder' },
      ],
    },
    pro: {
      title: 'Build toward a traction milestone',
      description: 'Pro founders need build work to strengthen a measurable traction or fundraising milestone.',
      targetMetric: 'traction_milestone_actions',
      targetValue: 3,
      criteriaLabel: 'Connect scope, stack, and milestone evidence into one build update.',
      rewardLabel: 'Pro launch and fundraising context become more actionable.',
      tasks: [
        { title: 'Define traction milestone', priority: 'high', estimatedMinutes: 20, route: '/mvp-builder' },
        { title: 'Confirm stack supports the milestone', priority: 'medium', estimatedMinutes: 20, route: '/tech-stack' },
        { title: 'Write milestone build update', priority: 'high', estimatedMinutes: 25, route: '/dashboard/tasks' },
      ],
    },
  },
  LAUNCH: {
    rookie: {
      title: 'Choose one launch channel',
      description: 'Launch starts by avoiding channel sprawl and testing one focused message.',
      targetMetric: 'launch_focus_actions',
      targetValue: 2,
      criteriaLabel: 'Pick one channel and one launch message.',
      rewardLabel: 'Home keeps tomorrow focused on the same launch test.',
      tasks: [
        { title: 'Choose first launch channel', priority: 'high', estimatedMinutes: 20, route: '/go-to-market' },
        { title: 'Write one launch message', priority: 'high', estimatedMinutes: 20, route: '/go-to-market' },
      ],
    },
    starter: {
      title: 'Prepare and send one launch asset',
      description: 'Starter founders need launch work to reach a qualified audience, not stay in planning.',
      targetMetric: 'launch_asset_actions',
      targetValue: 3,
      criteriaLabel: 'Prepare one launch asset and send it to a small qualified audience.',
      rewardLabel: 'Home tracks the launch action as a real market signal.',
      tasks: [
        { title: 'Save launch checklist', priority: 'high', estimatedMinutes: 20, route: '/go-to-market' },
        { title: 'Prepare one launch asset', priority: 'high', estimatedMinutes: 30, route: '/go-to-market' },
        { title: 'Send to 10 qualified people', priority: 'medium', estimatedMinutes: 30, route: '/dashboard/tasks' },
      ],
    },
    rising: {
      title: 'Run one measurable GTM experiment',
      description: 'Rising founders need launch activity that creates an observable result.',
      targetMetric: 'gtm_experiment_actions',
      targetValue: 3,
      criteriaLabel: 'Define, run, and record the result of one GTM experiment.',
      rewardLabel: 'Home updates around traction learning instead of generic launch activity.',
      tasks: [
        { title: 'Define GTM experiment', priority: 'high', estimatedMinutes: 25, route: '/go-to-market' },
        { title: 'Pick success metric', priority: 'high', estimatedMinutes: 15, route: '/go-to-market' },
        { title: 'Record experiment result', priority: 'medium', estimatedMinutes: 20, route: '/dashboard/tasks' },
      ],
    },
    pro: {
      title: 'Turn launch into a traction update',
      description: 'Pro founders need launch progress to become a credible update for partners or investors.',
      targetMetric: 'traction_update_actions',
      targetValue: 3,
      criteriaLabel: 'Complete launch metric, traction note, and next GTM decision.',
      rewardLabel: 'Pro fundraising readiness appears inside Focus Funnel.',
      tasks: [
        { title: 'Save GTM plan', priority: 'high', estimatedMinutes: 25, route: '/go-to-market' },
        { title: 'Write traction update', priority: 'high', estimatedMinutes: 25, route: '/dashboard/tasks' },
        { title: 'Choose next GTM decision', priority: 'medium', estimatedMinutes: 20, route: '/go-to-market' },
      ],
    },
  },
};

function getTemplate(stage: BizMapStage, plan: Plan) {
  return missionTemplates[stage]?.[plan] ?? missionTemplates.IDENTITY.rookie;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

export function WeeklyMissionPanel({ variant = 'default' }: WeeklyMissionPanelProps) {
  const { user } = useAuth();
  const {
    progress,
    currentPlan,
    weeklyMission,
    refreshDashboardData,
  } = useDashboardData();
  const {
    currentMission,
    recentMissions,
    linkedTasks,
    isLoading,
    error,
    createMission,
    updateMission,
    reviewMission,
    refresh,
  } = weeklyMission;

  const template = useMemo(() => getTemplate(progress.currentStage, currentPlan), [currentPlan, progress.currentStage]);
  const didAutoCreate = useRef(false);
  const didEnsureTasksFor = useRef<string | null>(null);
  const [editedMissionGoal, setEditedMissionGoal] = useState('');
  const [missedReflection, setMissedReflection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rewardVisible, setRewardVisible] = useState(false);
  const isCompact = variant === 'compact';

  useEffect(() => {
    trackWeeklyMissionViewed();
  }, []);

  useEffect(() => {
    if (didAutoCreate.current || isLoading || error || currentMission) return;

    didAutoCreate.current = true;
    void createMission(template.title, 'stage_weekly', {
      targetMetric: template.targetMetric,
      targetValue: template.targetValue,
      currentValue: 0,
    }).then((mission) => {
      if (mission) {
        trackWeeklyMissionCreated({ mission_id: mission.id });
      }
    });
  }, [createMission, currentMission, error, isLoading, template]);

  useEffect(() => {
    const ensureMissionTasks = async (mission: WeeklyMission) => {
      if (!user || linkedTasks.length > 0 || didEnsureTasksFor.current === mission.id) return;

      didEnsureTasksFor.current = mission.id;
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 0, 0);

      const { data: createdTasks, error: createError } = await supabase
        .from('daily_tasks')
        .insert(
          template.tasks.map((task) => ({
            user_id: user.id,
            task_text: task.title,
            priority: task.priority,
            task_date: today(),
            deadline_time: endOfDay.toISOString(),
            effort_estimate: task.estimatedMinutes,
            ai_generated: true,
            contributes_to_weekly_mission: true,
            is_completed: false,
          })),
        )
        .select('id');

      if (createError || !createdTasks?.length) return;

      await supabase.from('weekly_mission_tasks').insert(
        createdTasks.map((task, index) => ({
          weekly_mission_id: mission.id,
          task_id: task.id,
          contribution_weight: 1,
          is_critical: index === 0,
        })),
      );

      await refresh();
      await refreshDashboardData();
    };

    if (currentMission?.mission_type === 'stage_weekly') {
      void ensureMissionTasks(currentMission);
    }
  }, [currentMission, linkedTasks.length, refresh, refreshDashboardData, template.tasks, user]);

  const handleUpdateMission = async () => {
    if (!currentMission || !editedMissionGoal.trim()) return;

    setIsSubmitting(true);
    try {
      await updateMission(currentMission.id, { mission_goal: editedMissionGoal.trim() });
      setEditedMissionGoal('');
      await refreshDashboardData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteMission = async () => {
    if (!currentMission) return;

    setIsSubmitting(true);
    try {
      await reviewMission(currentMission.id, 'completed');
      trackWeeklyMissionCompleted({ mission_id: currentMission.id });
      setRewardVisible(true);
      await refreshDashboardData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMissedMission = async () => {
    if (!currentMission) return;

    setIsSubmitting(true);
    try {
      await reviewMission(currentMission.id, 'missed', missedReflection);
      trackWeeklyMissionMissed({
        mission_id: currentMission.id,
        has_reflection: Boolean(missedReflection.trim()),
      });
      setMissedReflection('');
      await refreshDashboardData();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-white/10 bg-white/[0.045] text-slate-100 backdrop-blur-xl">
        <CardContent className="p-5">
          <div className="h-24 animate-pulse rounded-2xl bg-white/10" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/10 text-slate-100">
        <CardContent className="p-5">
          <p className="font-medium text-destructive">Unable to load weekly mission</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const missionTitle = currentMission?.mission_goal ?? template.title;
  const weekEnd = currentMission ? new Date(currentMission.week_end_date) : null;
  const daysRemaining = weekEnd ? Math.ceil((weekEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const completionPercentage = currentMission?.completion_percentage ?? 0;
  const isReviewed = currentMission ? currentMission.status !== 'active' : false;
  const historyItems = recentMissions.filter((mission) => mission.id !== currentMission?.id).slice(0, 3);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-white/10 bg-white/[0.045] text-slate-100 backdrop-blur-xl">
        <CardContent className="p-0">
          <div className="border-b border-white/10 bg-cyan-400/[0.06] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/10">
                    {progress.currentStage}
                  </Badge>
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
                    Resets Monday
                  </span>
                </div>
                <h1 className="mt-3 font-space-grotesk text-2xl font-semibold text-white sm:text-3xl">
                  {missionTitle}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-300">{template.description}</p>
              </div>

              {!isCompact && currentMission && !isReviewed ? (
                <Button className="bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={handleCompleteMission} disabled={isSubmitting}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete mission
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5 p-5">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start gap-3">
                  <Target className="mt-0.5 h-5 w-5 text-cyan-300" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Completion criteria</p>
                    <p className="mt-2 text-sm leading-6 text-white">{template.criteriaLabel}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{currentMission?.target_metric ?? template.targetMetric}</span>
                  <span>{completionPercentage.toFixed(0)}%</span>
                </div>
                <Progress value={completionPercentage} className="h-2 bg-white/10" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Calendar className="h-4 w-4 text-orange-300" />
                    <span>Deadline</span>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {daysRemaining > 0 ? `${daysRemaining} days left` : daysRemaining === 0 ? 'Last day' : 'Resets soon'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Sparkles className="h-4 w-4 text-pink-300" />
                    <span>Linked tasks</span>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-white">{linkedTasks.length || template.tasks.length} recommended</p>
                </div>
              </div>

              {rewardVisible || isReviewed ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <div className="flex items-start gap-3">
                    <Gift className="mt-0.5 h-5 w-5 text-emerald-300" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-100">Reward unlocked</p>
                      <p className="mt-1 text-sm leading-6 text-emerald-100/75">{template.rewardLabel}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start gap-3">
                    <Gift className="mt-0.5 h-5 w-5 text-slate-500" />
                    <div>
                      <p className="text-sm font-semibold text-white">Visible reward</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{template.rewardLabel}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 bg-black/20 p-5 lg:border-l lg:border-t-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">Recommended mission tasks</p>
                <Button asChild size="sm" variant="ghost" className="text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100">
                  <Link to="/dashboard/tasks">
                    Open tasks
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {template.tasks.map((task) => (
                  <div key={task.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-sm font-medium leading-6 text-white">{task.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-white/10 text-xs capitalize text-slate-300">{task.priority}</Badge>
                      <Badge variant="outline" className="border-white/10 text-xs text-slate-300">
                        <Clock3 className="mr-1 h-3 w-3" />
                        {task.estimatedMinutes} min
                      </Badge>
                      <Link to={task.route} className="text-xs text-cyan-200 hover:text-cyan-100">
                        Open tool
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isCompact && currentMission && !isReviewed ? (
        <Card className="border-white/10 bg-white/[0.045] text-slate-100 backdrop-blur-xl">
          <CardContent className="grid gap-4 p-5 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Edit mission title</p>
              <Textarea
                value={editedMissionGoal}
                onChange={(event) => setEditedMissionGoal(event.target.value)}
                placeholder={currentMission.mission_goal}
                rows={3}
                className="resize-none border-white/10 bg-black/30 text-sm text-white placeholder:text-slate-600"
              />
              <Button variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] hover:text-white" onClick={handleUpdateMission} disabled={!editedMissionGoal.trim() || isSubmitting}>
                Save title
              </Button>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Close as not completed</p>
              <Textarea
                value={missedReflection}
                onChange={(event) => setMissedReflection(event.target.value)}
                placeholder="What got in the way?"
                rows={3}
                className="resize-none border-white/10 bg-black/30 text-sm text-white placeholder:text-slate-600"
              />
              <Button variant="outline" className="border-orange-400/20 bg-orange-400/10 text-orange-100 hover:bg-orange-400/15" onClick={handleMissedMission} disabled={isSubmitting}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Save reflection
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {historyItems.length > 0 && !isCompact ? (
        <Card className="border-white/10 bg-white/[0.045] text-slate-100 backdrop-blur-xl">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-white">Recent weekly missions</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {historyItems.map((mission) => (
                <div key={mission.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {mission.status === 'completed' ? 'Completed' : mission.status}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-white">{mission.mission_goal}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
