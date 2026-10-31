import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, CheckCircle2, Lock, Send } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { COHORT_CONTEXT_QUERY_KEY } from '@/hooks/useCohortContext';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import { BIZMAP_STAGES, STAGE_TASKS } from '@/lib/bizmapStages';
import { cohortTotalWeeks, cohortWeek, linesToList, type CohortSummary } from '@/lib/cohorts';
import { checkinUpdateDraft, ownProfileComposePath, stageJourneyDraft } from '@/lib/profileUpdateDraft';
import { CohortShowcaseOptInCard } from './CohortShowcaseControls';

type CheckinRow = {
  week_number: number;
  wins: string[] | null;
  blockers: string[] | null;
  next_week_goals: string[] | null;
  help_needed: string | null;
};

const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

const titleCase = (title: string) => title.charAt(0) + title.slice(1).toLowerCase();

/**
 * A founder's dashboard in cohort mode: where they are in the program, this
 * week's plan (the tasks of their current stage) and the weekly check-in their
 * program reads.
 */
export default function FounderCohortView({ cohort }: { cohort: CohortSummary }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const { currentStage } = useBizMapProgress();

  const week = cohortWeek(cohort.startDate, cohort.endDate);
  const totalWeeks = cohortTotalWeeks(cohort.startDate, cohort.endDate);
  const stage = BIZMAP_STAGES.find((item) => item.id === currentStage) ?? BIZMAP_STAGES[0];
  const tasks = STAGE_TASKS[currentStage] ?? [];

  const taskProgress = useQuery({
    queryKey: ['cohort-task-progress', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('bizmap_task_progress')
        .select('task_id,is_completed')
        .eq('user_id', userId as string);
      if (error) throw error;
      return new Set(((data ?? []) as unknown as Array<{ task_id: string; is_completed: boolean }>).filter((row) => row.is_completed).map((row) => row.task_id));
    },
  });

  const checkins = useQuery({
    queryKey: ['cohort-own-checkins', cohort.cohortId, userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cohort_checkins')
        .select('week_number,wins,blockers,next_week_goals,help_needed')
        .eq('cohort_id', cohort.cohortId)
        .eq('user_id', userId as string);
      if (error) throw error;
      return (data ?? []) as unknown as CheckinRow[];
    },
  });

  const toggleTask = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await (supabase as any).from('bizmap_task_progress').upsert(
        {
          user_id: userId,
          stage: currentStage,
          task_id: taskId,
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
        } as never,
        { onConflict: 'user_id,task_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cohort-task-progress', userId] }),
    onError: () => toast.error('We couldn’t save that task. Try again.'),
  });

  const doneCount = tasks.filter((task) => taskProgress.data?.has(task.id)).length;

  return (
    <div>
      <Card className="mb-6 border-primary/25 bg-card/80">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Badge variant="secondary" className="mb-3 rounded-full">Cohort mode</Badge>
              <h1 className="font-space-grotesk text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {cohort.programName || cohort.cohortName}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                {cohort.programName ? <span>{cohort.cohortName}</span> : null}
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatDate(cohort.startDate)} – {formatDate(cohort.endDate)}
                </span>
              </p>
              {cohort.pilotPlan ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Until {formatDate(cohort.endDate)}, your program gives you the {cohort.pilotPlan.charAt(0).toUpperCase() + cohort.pilotPlan.slice(1)} plan. After that you keep your account, your work and the free plan.
                </p>
              ) : null}
            </div>
            <div className="w-full max-w-xs">
              <p className="mb-2 text-sm font-semibold text-foreground">
                {week === 0 ? `Starts ${formatDate(cohort.startDate)}` : `Week ${week} of ${totalWeeks}`}
              </p>
              <Progress value={week === 0 ? 0 : (week / totalWeeks) * 100} aria-label="Cohort progress" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-space-grotesk text-lg font-semibold text-foreground">This week’s plan</h2>
              <span className="text-sm text-muted-foreground">
                {doneCount} of {tasks.length} done
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Stage {stage.numeral} · {titleCase(stage.title)}: {stage.description}
            </p>
            <ul className="mt-4 space-y-2">
              {tasks.map((task) => {
                const checked = Boolean(taskProgress.data?.has(task.id));
                return (
                  <li key={task.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
                    <Checkbox
                      id={`cohort-task-${task.id}`}
                      checked={checked}
                      disabled={toggleTask.isPending || !userId}
                      onCheckedChange={(value) => toggleTask.mutate({ taskId: task.id, completed: value === true })}
                      className="mt-0.5"
                    />
                    <label htmlFor={`cohort-task-${task.id}`} className="min-w-0 flex-1 cursor-pointer text-sm text-foreground">
                      <span className={checked ? 'text-muted-foreground line-through' : undefined}>{task.title}</span>
                    </label>
                    <Link to={task.route} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline">
                      Open <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <WeeklyCheckin
          cohortId={cohort.cohortId}
          week={week}
          startDate={cohort.startDate}
          userId={userId}
          existing={checkins.data?.find((row) => row.week_number === week) ?? null}
        />
      </div>

      <CohortShowcaseOptInCard cohortId={cohort.cohortId} programName={cohort.programName || cohort.cohortName} />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Your program sees your stage, progress counts and weekly check-ins. Your files, ideas and messages stay private.
        </p>
        <LeaveCohort cohortId={cohort.cohortId} programName={cohort.programName || cohort.cohortName} />
      </div>
    </div>
  );
}

/** Leaving also stops sharing: the program no longer sees this founder's progress. */
function LeaveCohort({ cohortId, programName }: { cohortId: string; programName: string }) {
  const queryClient = useQueryClient();
  const leave = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('leave_cohort_v1' as never, { p_cohort_id: cohortId } as never);
      if (error) throw error;
    },
    onSuccess: async () => {
      captureEvent('cohort_left', { cohort_id: cohortId });
      toast.success(`You left ${programName}. Your work stays in your account.`);
      // A pilot plan ends with the membership, so the plan is read again too.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [COHORT_CONTEXT_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: ['subscription-status'] }),
      ]);
    },
    onError: () => toast.error('We couldn’t take you out of the cohort. Try again.'),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">Leave cohort</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave {programName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Your program will stop seeing your progress and check-ins, and any plan it gives you ends now. Your account and your work stay as they are.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay</AlertDialogCancel>
          <AlertDialogAction onClick={() => leave.mutate()} disabled={leave.isPending}>Leave and stop sharing</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function WeeklyCheckin({
  cohortId,
  week,
  startDate,
  userId,
  existing,
}: {
  cohortId: string;
  week: number;
  startDate: string;
  userId: string | null;
  existing: CheckinRow | null;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [openingProfile, setOpeningProfile] = useState(false);
  const [wins, setWins] = useState('');
  const [blockers, setBlockers] = useState('');
  const [goals, setGoals] = useState('');
  const [help, setHelp] = useState('');

  // Load the saved answers when editing an existing check-in.
  useEffect(() => {
    if (!existing) return;
    setWins((existing.wins ?? []).join('\n'));
    setBlockers((existing.blockers ?? []).join('\n'));
    setGoals((existing.next_week_goals ?? []).join('\n'));
    setHelp(existing.help_needed ?? '');
  }, [existing]);

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('cohort_checkins').upsert(
        {
          cohort_id: cohortId,
          user_id: userId,
          week_number: week,
          checkin_date: new Date().toISOString().slice(0, 10),
          wins: linesToList(wins),
          blockers: linesToList(blockers),
          next_week_goals: linesToList(goals),
          help_needed: help.trim() || null,
        } as never,
        { onConflict: 'cohort_id,user_id,week_number' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      captureEvent('cohort_checkin_submitted', { week, edited: Boolean(existing) });
      toast.success(`Week ${week} check-in sent to your program.`);
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['cohort-own-checkins', cohortId, userId] });
    },
    onError: () => toast.error('We couldn’t send your check-in. Try again.'),
  });

  const summary = useMemo(() => {
    if (!existing) return null;
    return [
      { label: 'Wins', items: existing.wins ?? [] },
      { label: 'Blockers', items: existing.blockers ?? [] },
      { label: 'Next week', items: existing.next_week_goals ?? [] },
      { label: 'Help needed', items: existing.help_needed ? [existing.help_needed] : [] },
    ];
  }, [existing]);

  // The check-in goes to the program only. Sharing it publicly is a separate,
  // explicit step: the founder gets a draft without the blockers and edits it.
  const shareOnProfile = async () => {
    if (!userId || !existing) return;
    setOpeningProfile(true);
    stageJourneyDraft(
      userId,
      checkinUpdateDraft(week, existing.wins ?? [], existing.next_week_goals ?? [], existing.help_needed),
      'checkin',
    );
    captureEvent('profile_update_prompt_opened', { source: 'checkin', week });
    navigate(await ownProfileComposePath(userId, 'checkin'));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!linesToList(wins).length && !linesToList(blockers).length && !linesToList(goals).length && !help.trim()) {
      toast.error('Add at least one line before sending.');
      return;
    }
    submit.mutate();
  };

  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="p-5 sm:p-6">
        <h2 className="font-space-grotesk text-lg font-semibold text-foreground">
          {week === 0 ? 'Weekly check-in' : `Week ${week} check-in`}
        </h2>

        {week === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Check-ins open when the cohort starts on {formatDate(startDate)}.</p>
        ) : existing && !editing ? (
          <div className="mt-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Sent to your program
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              {summary?.filter((group) => group.items.length).map((group) => (
                <div key={group.label}>
                  <dt className="font-semibold text-foreground">{group.label}</dt>
                  <dd className="text-muted-foreground">{group.items.join(' · ')}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit check-in
              </Button>
              <Button variant="outline" size="sm" onClick={() => void shareOnProfile()} disabled={openingProfile || !userId}>
                Share on your profile
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-3 space-y-4">
            <p className="text-sm text-muted-foreground">Two minutes. One item per line.</p>
            <div className="space-y-1.5">
              <Label htmlFor="checkin-wins">What did you get done?</Label>
              <Textarea id="checkin-wins" rows={2} value={wins} onChange={(event) => setWins(event.target.value)} className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkin-blockers">What’s blocking you?</Label>
              <Textarea id="checkin-blockers" rows={2} value={blockers} onChange={(event) => setBlockers(event.target.value)} className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkin-goals">What will you do next week?</Label>
              <Textarea id="checkin-goals" rows={2} value={goals} onChange={(event) => setGoals(event.target.value)} className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkin-help">What help do you need from the program?</Label>
              <Input id="checkin-help" value={help} onChange={(event) => setHelp(event.target.value)} />
            </div>
            <Button type="submit" disabled={submit.isPending || !userId} className="w-full gap-2">
              <Send className="h-4 w-4" aria-hidden="true" />
              {submit.isPending ? 'Sending…' : existing ? 'Update check-in' : `Send week ${week} check-in`}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
