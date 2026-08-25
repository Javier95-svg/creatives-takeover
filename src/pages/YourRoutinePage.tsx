import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Repeat2,
  Sparkles,
  TrendingUp,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { DashboardPanelHeader } from '@/components/dashboard/DashboardPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRoutine } from '@/hooks/useRoutine';
import { useLeanStartupStore } from '@/store/leanStartupStore';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  ROUTINE_GOAL_OPTIONS,
  createCustomRoutineTask,
  createRoutineConfig,
  getDateKeyInTimezone,
  getCompletionKey,
  getRoutineTasksForToday,
  getWeekEndLabelInTimezone,
  getWeekStartKeyInTimezone,
  type RoutineCadence,
  type RoutineConfig,
  type RoutineGoal,
  type RoutineReminderChannels,
  type RoutineReminderPreferences,
  type RoutinePeriodType,
  type RoutineTask,
} from '@/lib/routineTemplates';
import { getBrowserTimezone } from '@/lib/accountabilityPreferences';

const DEFAULT_DAILY_DAYS = [1, 2, 3, 4, 5];
const DEFAULT_WEEKLY_DAYS = [5];

type DailyReadingArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  banner_image_url: string | null;
};

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function selectLectureOfTheDay(articles: DailyReadingArticle[], date = new Date()) {
  if (!articles.length) return null;

  // A stable shuffled order plus the local day number gives every founder the
  // same recommendation for a day and rotates to a different article tomorrow.
  const shuffled = [...articles].sort((left, right) => stableHash(left.id) - stableHash(right.id));
  const dayNumber = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000);
  return shuffled[dayNumber % shuffled.length] ?? null;
}

function LectureOfTheDay() {
  const [article, setArticle] = useState<DailyReadingArticle | null>(null);

  useEffect(() => {
    let active = true;

    void supabase
      .from('stories_articles')
      .select('id, slug, title, excerpt, banner_image_url')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!active || error) return;
        setArticle(selectLectureOfTheDay((data ?? []) as DailyReadingArticle[]));
      });

    return () => {
      active = false;
    };
  }, []);

  if (!article) return null;

  return (
    <Card className="overflow-hidden border-primary/20 bg-card/90">
      <CardContent className="flex gap-4 p-4 sm:p-5">
        <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-primary/10 sm:h-24 sm:w-36">
          {article.banner_image_url ? (
            <img src={article.banner_image_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="flex h-full w-full items-center justify-center"><BookOpen className="h-6 w-6 text-primary/60" /></div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            <BookOpen className="h-3.5 w-3.5" /> Lecture of the Day
          </p>
          <h2 className="mt-1.5 line-clamp-2 text-base font-semibold leading-6 text-foreground">{article.title}</h2>
          {article.excerpt ? <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{article.excerpt}</p> : null}
          <Link to={`/newspaper/${article.slug}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Read article <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function getGoalLabel(goal: string | null | undefined) {
  return ROUTINE_GOAL_OPTIONS.find((option) => option.value === goal)?.label ?? 'Routine';
}

const REMINDER_TIMES = Array.from({ length: 96 }, (_, index) => {
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

function getTimezoneOptions() {
  const browserTimezone = getBrowserTimezone();
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] };
  const options = intl.supportedValuesOf?.('timeZone') ?? [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Bogota', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
  ];
  return Array.from(new Set([browserTimezone, 'UTC', ...options]));
}

const TIMEZONE_OPTIONS = getTimezoneOptions();

function formatReminderPreview(time: string, timezone: string) {
  const [scheduledHour, scheduledMinute] = time.split(':').map(Number);
  const current = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const values = Object.fromEntries(current.map((part) => [part.type, part.value]));
  const isTomorrow = Number(values.hour) > scheduledHour || (Number(values.hour) === scheduledHour && Number(values.minute) >= scheduledMinute);
  const formattedTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2020, 0, 1, scheduledHour, scheduledMinute)));
  return `${isTomorrow ? 'Tomorrow' : 'Today'} at ${formattedTime} (${timezone})`;
}

function TimezonePicker({ value, onChange, disabled }: { value: string; onChange: (timezone: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const matchingOptions = TIMEZONE_OPTIONS.filter((timezone) => timezone.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 100);

  return (
    <>
      <Button type="button" variant="outline" className="w-full justify-start font-normal" onClick={() => setOpen(true)} disabled={disabled}>
        <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />{value}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden sm:max-w-lg">
          <DialogHeader><DialogTitle>Choose your timezone</DialogTitle></DialogHeader>
          <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search e.g. Bogota, London, Tokyo" />
          <div className="max-h-80 overflow-y-auto rounded-lg border">
            {matchingOptions.map((timezone) => (
              <button
                key={timezone}
                type="button"
                className={cn('flex w-full items-center px-3 py-2.5 text-left text-sm hover:bg-muted', timezone === value && 'bg-primary/10 font-medium text-primary')}
                onClick={() => { onChange(timezone); setOpen(false); setQuery(''); }}
              >
                {timezone}
              </button>
            ))}
            {!matchingOptions.length ? <p className="p-4 text-sm text-muted-foreground">No supported timezone found.</p> : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReminderScheduleCard({
  preferences,
  channels,
  timezone,
  isSaving,
  onPreferencesChange,
  onChannelsChange,
}: {
  preferences: RoutineReminderPreferences;
  channels: RoutineReminderChannels;
  timezone: string;
  isSaving: boolean;
  onPreferencesChange: (preferences: RoutineReminderPreferences, timezone?: string) => void;
  onChannelsChange: (channels: RoutineReminderChannels) => void;
}) {
  return (
    <Card className="border-primary/20 bg-card/90">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Bell className="h-5 w-5 text-primary" />Reminder schedule</CardTitle>
        <CardDescription>Set one local check-in time. We only nudge you when scheduled habits are still waiting.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-background/70 p-3">
          <div><Label htmlFor="routine-reminder">Daily routine reminder</Label><p className="mt-1 text-xs text-muted-foreground">Pause all Routine reminder delivery.</p></div>
          <Switch id="routine-reminder" checked={preferences.enabled} onCheckedChange={(enabled) => onPreferencesChange({ ...preferences, enabled })} disabled={isSaving} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="routine-reminder-time">Time</Label><Select value={preferences.time} onValueChange={(time) => onPreferencesChange({ ...preferences, time })} disabled={isSaving || !preferences.enabled}><SelectTrigger id="routine-reminder-time"><SelectValue /></SelectTrigger><SelectContent>{REMINDER_TIMES.map((time) => <SelectItem key={time} value={time}>{time}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Timezone</Label><TimezonePicker value={timezone} disabled={isSaving || !preferences.enabled} onChange={(nextTimezone) => onPreferencesChange(preferences, nextTimezone)} /></div>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground"><Clock3 className="mr-1.5 inline h-3.5 w-3.5" />Next reminder window: <span className="font-medium text-foreground">{formatReminderPreview(preferences.time, timezone)}</span></div>
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Delivery channels</p>
          <div className="flex items-center justify-between gap-4"><div><Label>In-app reminder</Label><p className="mt-1 text-xs text-muted-foreground">Shows in your notifications at the scheduled time.</p></div><Switch checked={channels.inAppEnabled} disabled={isSaving || !preferences.enabled} onCheckedChange={(inAppEnabled) => onChannelsChange({ ...channels, inAppEnabled })} /></div>
          <div className="flex items-center justify-between gap-4"><div><Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email fallback</Label><p className="mt-1 text-xs text-muted-foreground">Recovery email after 3 inactive days; never a same-time duplicate.</p></div><Switch checked={channels.emailEnabled} disabled={isSaving || !preferences.enabled} onCheckedChange={(emailEnabled) => onChannelsChange({ ...channels, emailEnabled })} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function RoutineMomentumCard({ config, completions, timezone, stats }: { config: RoutineConfig; completions: Array<{ period_type: string; period_date: string; status: string }>; timezone: string; stats: { dailyStreak: number; completedLast7: number; completedPrev7: number; consistencyPercentage: number } }) {
  const historyByDate = useMemo(() => {
    const completed = new Map<string, number>();
    completions.filter((completion) => completion.period_type === 'daily' && completion.status === 'completed').forEach((completion) => completed.set(completion.period_date, (completed.get(completion.period_date) ?? 0) + 1));
    return completed;
  }, [completions]);
  const days = useMemo(() => Array.from({ length: 28 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (27 - index));
    const key = getDateKeyInTimezone(date, timezone);
    const total = getRoutineTasksForToday(config, date, timezone).length;
    const completed = historyByDate.get(key) ?? 0;
    return { key, total, completed, date };
  }), [config, historyByDate, timezone]);
  const trend = stats.completedLast7 - stats.completedPrev7;

  return <Card className="border-border/70 bg-card/90"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-primary" />Consistency & momentum</CardTitle><CardDescription>Your last 28 days of scheduled founder habits.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid grid-cols-3 gap-3"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Current streak</p><p className="mt-1 text-xl font-semibold">{stats.dailyStreak} days</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">28-day consistency</p><p className="mt-1 text-xl font-semibold">{stats.consistencyPercentage}%</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Week over week</p><p className={cn('mt-1 text-xl font-semibold', trend > 0 && 'text-success', trend < 0 && 'text-destructive')}>{trend > 0 ? '+' : ''}{trend} habits</p></div></div><div><div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">28-day check-in map</p><p className="text-xs text-muted-foreground">Darker = more completed</p></div><div className="grid grid-cols-7 gap-1.5">{days.map((day) => { const ratio = day.total ? Math.min(1, day.completed / day.total) : 0; return <div key={day.key} title={`${day.key}: ${day.completed}/${day.total} completed`} className={cn('aspect-square rounded-sm border border-border/50', day.total === 0 && 'bg-muted/30', ratio > 0 && ratio < 1 && 'bg-primary/35', ratio >= 1 && 'bg-primary')} />; })}</div></div></CardContent></Card>;
}

function RoutineSetupCard({ onStart, isSaving }: { onStart: (goal: RoutineGoal) => void; isSaving: boolean }) {
  const [selectedGoal, setSelectedGoal] = useState<RoutineGoal>('validate_idea');

  return (
    <Card className="border-primary/20 bg-card/90">
      <CardHeader className="space-y-3">
        <Badge variant="outline" className="w-fit">First visit</Badge>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Repeat2 className="h-5 w-5 text-primary" />
          Build your founder routine
        </CardTitle>
        <CardDescription className="max-w-2xl">
          Pick the main startup goal for this season. We will suggest a simple daily and weekly routine you can edit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          {ROUTINE_GOAL_OPTIONS.map((goal) => (
            <button
              key={goal.value}
              type="button"
              onClick={() => setSelectedGoal(goal.value)}
              className={cn(
                'rounded-lg border border-border/70 bg-background/75 p-4 text-left transition-colors hover:border-primary/30',
                selectedGoal === goal.value && 'border-primary/50 bg-primary/10',
              )}
            >
              <p className="text-sm font-semibold text-foreground">{goal.label}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{goal.description}</p>
            </button>
          ))}
        </div>
        <Button onClick={() => onStart(selectedGoal)} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate my routine
        </Button>
      </CardContent>
    </Card>
  );
}

function TaskChecklistRow({
  task,
  periodType,
  completion,
  isSaving,
  onSetStatus,
  onClearStatus,
}: {
  task: RoutineTask;
  periodType: RoutinePeriodType;
  completion?: { status: string } | null;
  isSaving: boolean;
  onSetStatus: (task: RoutineTask, periodType: RoutinePeriodType, status: 'completed' | 'skipped') => void;
  onClearStatus: (task: RoutineTask, periodType: RoutinePeriodType) => void;
}) {
  const isCompleted = completion?.status === 'completed';
  const isSkipped = completion?.status === 'skipped';

  return (
    <div
      className={cn(
        'rounded-lg border border-border/70 bg-background/75 p-4',
        isCompleted && 'border-success/20 bg-success/10',
        isSkipped && 'border-warning/20 bg-warning/10',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5">
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : isSkipped ? (
              <Clock3 className="h-5 w-5 text-warning" />
            ) : (
              <span className="block h-5 w-5 rounded-full border border-muted-foreground/50" />
            )}
          </div>
          <div className="min-w-0">
            <p className={cn('text-sm font-medium leading-6 text-foreground', isCompleted && 'line-through')}>
              {task.title}
            </p>
            <p className="text-xs capitalize text-muted-foreground">{task.cadence}</p>
            {isSkipped ? (
              <p className="mt-1 text-xs text-warning dark:text-warning">Skipped for this period. You can still mark it done.</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {completion ? (
            <Button size="sm" variant="outline" onClick={() => onClearStatus(task, periodType)} disabled={isSaving}>
              Reset
            </Button>
          ) : null}
          <Button
            size="sm"
            variant={isCompleted ? 'secondary' : 'default'}
            onClick={() => onSetStatus(task, periodType, 'completed')}
            disabled={isSaving || isCompleted}
          >
            Done
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSetStatus(task, periodType, 'skipped')}
            disabled={isSaving || isSkipped}
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}

function RoutineTaskSection({
  title,
  description,
  tasks,
  periodType,
  completionByKey,
  timezone,
  isSaving,
  onSetStatus,
  onClearStatus,
}: {
  title: string;
  description: string;
  tasks: RoutineTask[];
  periodType: RoutinePeriodType;
  completionByKey: ReadonlyMap<string, { status: string }>;
  timezone: string;
  isSaving: boolean;
  onSetStatus: (task: RoutineTask, periodType: RoutinePeriodType, status: 'completed' | 'skipped') => void;
  onClearStatus: (task: RoutineTask, periodType: RoutinePeriodType) => void;
}) {
  const periodDate = periodType === 'daily' ? getDateKeyInTimezone(new Date(), timezone) : getWeekStartKeyInTimezone(new Date(), timezone);

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskChecklistRow
              key={task.id}
              task={task}
              periodType={periodType}
              completion={completionByKey.get(getCompletionKey(task.id, periodType, periodDate))}
              isSaving={isSaving}
              onSetStatus={onSetStatus}
              onClearStatus={onClearStatus}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 bg-background/70 p-5 text-sm text-muted-foreground">
            No {periodType} tasks are active for this period.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoutineEditor({
  draft,
  onDraftChange,
  onSave,
  onCancel,
  isSaving,
}: {
  draft: RoutineConfig;
  onDraftChange: (draft: RoutineConfig) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCadence, setNewTaskCadence] = useState<RoutineCadence>('daily');

  const updateTask = (taskId: string, updates: Partial<RoutineTask>) => {
    onDraftChange({
      ...draft,
      tasks: draft.tasks.map((task) => task.id === taskId ? { ...task, ...updates } : task),
    });
  };

  const moveTask = (taskId: string, direction: -1 | 1) => {
    const tasks = [...draft.tasks].sort((a, b) => a.order - b.order);
    const index = tasks.findIndex((task) => task.id === taskId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= tasks.length) return;
    const [task] = tasks.splice(index, 1);
    tasks.splice(targetIndex, 0, task);
    onDraftChange({ ...draft, tasks: tasks.map((item, order) => ({ ...item, order })) });
  };

  const removeTask = (taskId: string) => {
    onDraftChange({
      ...draft,
      tasks: draft.tasks
        .filter((task) => task.id !== taskId)
        .map((task, order) => ({ ...task, order })),
    });
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    onDraftChange({
      ...draft,
      tasks: [
        ...draft.tasks,
        createCustomRoutineTask(newTaskTitle, newTaskCadence, draft.tasks.length),
      ],
    });
    setNewTaskTitle('');
  };

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle>Edit routine</CardTitle>
        <CardDescription>Add, remove, edit, and reorder the tasks that define your rhythm.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          {draft.tasks.map((task, index) => (
            <div key={task.id} className="grid gap-3 rounded-lg border border-border/70 bg-background/75 p-3 md:grid-cols-[minmax(0,1fr)_150px_auto] md:items-center">
              <Input value={task.title} onChange={(event) => updateTask(task.id, { title: event.target.value })} />
              <Select
                value={task.cadence}
                onValueChange={(value) => {
                  const cadence = value as RoutineCadence;
                  updateTask(task.id, {
                    cadence,
                    days: cadence === 'daily' ? DEFAULT_DAILY_DAYS : DEFAULT_WEEKLY_DAYS,
                  });
                }}
              >
                <SelectTrigger aria-label="Task cadence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => moveTask(task.id, -1)} disabled={index === 0} aria-label="Move task up">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => moveTask(task.id, 1)} disabled={index === draft.tasks.length - 1} aria-label="Move task down">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => removeTask(task.id)} aria-label="Remove task">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="routine-new-task">Add task</Label>
            <Input
              id="routine-new-task"
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder="e.g., Message one target customer"
            />
          </div>
          <Select value={newTaskCadence} onValueChange={(value) => setNewTaskCadence(value as RoutineCadence)}>
            <SelectTrigger aria-label="New task cadence">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addTask} disabled={!newTaskTitle.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button>
          <Button onClick={onSave} disabled={isSaving || draft.tasks.every((task) => !task.title.trim())}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save routine
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function YourRoutinePage() {
  const markToolUsed = useLeanStartupStore(s => s.markToolUsed);
  const {
    config,
    selectedGoal,
    reminderPreferences,
    reminderChannels,
    timezone,
    todayTasks,
    weeklyTasks,
    completionByKey,
    historyCompletions,
    isLoading,
    isSaving,
    error,
    stats,
    initializeRoutine,
    saveConfig,
    updateReminderPreferences,
    updateReminderChannels,
    setTaskStatus,
    clearTaskStatus,
  } = useRoutine();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<RoutineConfig | null>(null);

  useEffect(() => {
    markToolUsed('routine');
  }, [markToolUsed]);

  useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  const routineGoalLabel = getGoalLabel(selectedGoal);
  const activeTaskCount = useMemo(() => config?.tasks.filter((task) => task.active).length ?? 0, [config]);

  const handleSaveDraft = async () => {
    if (!draft) return;
    await saveConfig({
      ...draft,
      tasks: draft.tasks
        .filter((task) => task.title.trim())
        .map((task, order) => ({ ...task, title: task.title.trim(), order })),
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Card className="border-border/70 bg-card/80">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your routine...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-card/90">
        <CardHeader>
          <CardTitle className="text-destructive">Your routine could not load</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!config) {
    return (
      <>
        <Helmet>
          <title>Your Routine - Creatives Takeover</title>
        </Helmet>
        <RoutineSetupCard onStart={(goal) => void initializeRoutine(goal)} isSaving={isSaving} />
        <div className="mt-6"><LectureOfTheDay /></div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Your Routine - Creatives Takeover</title>
      </Helmet>
      <div className="space-y-6">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
          <CardHeader className="space-y-4">
            <DashboardPanelHeader
              kicker="Founder routine"
              title="Your Routine"
              description="Keep the repeatable actions visible, finishable, and aligned with your current startup goal."
              badges={<Badge variant="outline" className="w-fit">{routineGoalLabel}</Badge>}
              action={
                <Button variant="outline" onClick={() => setIsEditing((value) => !value)}>
                  {isEditing ? 'Close editor' : 'Customize routine'}
                </Button>
              }
            />
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {stats.completedCurrentCount}/{stats.totalCurrentCount} this period
              </Badge>
              <Badge variant="outline">{stats.progressPercentage}% progress</Badge>
              <Badge variant="outline">{stats.dailyStreak} day streak</Badge>
              <Badge variant="outline">{activeTaskCount} active tasks</Badge>
            </div>
            <Progress value={stats.progressPercentage} className="h-2" />
          </CardHeader>
        </Card>

        {isEditing && draft ? (
          <RoutineEditor
            draft={draft}
            onDraftChange={setDraft}
            onSave={() => void handleSaveDraft()}
            onCancel={() => {
              setDraft(config);
              setIsEditing(false);
            }}
            isSaving={isSaving}
          />
        ) : null}

        <div className="space-y-6">
          <div className="space-y-6">
            <LectureOfTheDay />
            <RoutineTaskSection
              title="Today"
              description="The daily habits scheduled for today."
              tasks={todayTasks}
              periodType="daily"
              completionByKey={completionByKey}
              timezone={timezone}
              isSaving={isSaving}
              onSetStatus={(task, periodType, status) => void setTaskStatus(task, periodType, status)}
              onClearStatus={(task, periodType) => void clearTaskStatus(task, periodType)}
            />
            <RoutineTaskSection
              title="This Week"
              description={`Weekly habits due by ${getWeekEndLabelInTimezone(new Date(), timezone)}.`}
              tasks={weeklyTasks}
              periodType="weekly"
              completionByKey={completionByKey}
              timezone={timezone}
              isSaving={isSaving}
              onSetStatus={(task, periodType, status) => void setTaskStatus(task, periodType, status)}
              onClearStatus={(task, periodType) => void clearTaskStatus(task, periodType)}
            />
            <ReminderScheduleCard
              preferences={reminderPreferences}
              channels={reminderChannels}
              timezone={timezone}
              isSaving={isSaving}
              onPreferencesChange={(preferences, nextTimezone) => void updateReminderPreferences(preferences, nextTimezone)}
              onChannelsChange={(channels) => void updateReminderChannels(channels)}
            />
            <RoutineMomentumCard config={config} completions={historyCompletions} timezone={timezone} stats={stats} />
          </div>

        </div>
      </div>
    </>
  );
}
