import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  Repeat2,
  RotateCcw,
  Sparkles,
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
import { DashboardDisclosure } from '@/components/dashboard/DashboardDisclosure';
import { useRoutine } from '@/hooks/useRoutine';
import { useLeanStartupStore } from '@/store/leanStartupStore';
import { cn } from '@/lib/utils';
import {
  ROUTINE_GOAL_OPTIONS,
  createCustomRoutineTask,
  createRoutineConfig,
  getCompletionKey,
  getLocalDateKey,
  getWeekEndLabel,
  getWeekStartKey,
  type RoutineCadence,
  type RoutineConfig,
  type RoutineGoal,
  type RoutinePeriodType,
  type RoutineTask,
} from '@/lib/routineTemplates';

const DEFAULT_DAILY_DAYS = [1, 2, 3, 4, 5];
const DEFAULT_WEEKLY_DAYS = [5];

function getGoalLabel(goal: string | null | undefined) {
  return ROUTINE_GOAL_OPTIONS.find((option) => option.value === goal)?.label ?? 'Routine';
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
  isSaving,
  onSetStatus,
  onClearStatus,
}: {
  title: string;
  description: string;
  tasks: RoutineTask[];
  periodType: RoutinePeriodType;
  completionByKey: ReadonlyMap<string, { status: string }>;
  isSaving: boolean;
  onSetStatus: (task: RoutineTask, periodType: RoutinePeriodType, status: 'completed' | 'skipped') => void;
  onClearStatus: (task: RoutineTask, periodType: RoutinePeriodType) => void;
}) {
  const periodDate = periodType === 'daily' ? getLocalDateKey() : getWeekStartKey();

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
    todayTasks,
    weeklyTasks,
    completionByKey,
    legacyCommitments,
    suggestions,
    isLoading,
    isSaving,
    error,
    stats,
    initializeRoutine,
    saveConfig,
    updateReminderPreferences,
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

  const handleResetToGoal = async (goal: RoutineGoal) => {
    await saveConfig(createRoutineConfig(goal));
    setIsEditing(false);
  };

  const handleAddSuggestion = async (task: RoutineTask) => {
    if (!config) return;
    await saveConfig({
      ...config,
      tasks: [...config.tasks, { ...task, order: config.tasks.length }],
    });
  };

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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <RoutineTaskSection
              title="Today"
              description="The daily habits scheduled for today."
              tasks={todayTasks}
              periodType="daily"
              completionByKey={completionByKey}
              isSaving={isSaving}
              onSetStatus={(task, periodType, status) => void setTaskStatus(task, periodType, status)}
              onClearStatus={(task, periodType) => void clearTaskStatus(task, periodType)}
            />
            <RoutineTaskSection
              title="This Week"
              description={`Weekly habits due by ${getWeekEndLabel()}.`}
              tasks={weeklyTasks}
              periodType="weekly"
              completionByKey={completionByKey}
              isSaving={isSaving}
              onSetStatus={(task, periodType, status) => void setTaskStatus(task, periodType, status)}
              onClearStatus={(task, periodType) => void clearTaskStatus(task, periodType)}
            />
          </div>

          <DashboardDisclosure
            title="Routine settings and history"
            summary="Reminders, suggestions, templates, and old commitments stay here when you need them."
            className="xl:col-span-2"
          >
            <aside className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle className="text-lg">Reminder preference</CardTitle>
                <CardDescription>Saved for in-app reminders. Delivery can be connected by a backend reminder worker.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="routine-reminder">Nudge me to check in</Label>
                  <Switch
                    id="routine-reminder"
                    checked={reminderPreferences.enabled}
                    onCheckedChange={(enabled) => void updateReminderPreferences({ ...reminderPreferences, enabled })}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routine-reminder-time">Preferred time</Label>
                  <Input
                    id="routine-reminder-time"
                    type="time"
                    value={reminderPreferences.time}
                    onChange={(event) => void updateReminderPreferences({ ...reminderPreferences, time: event.target.value })}
                    disabled={isSaving || !reminderPreferences.enabled}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle className="text-lg">Recommended updates</CardTitle>
                <CardDescription>Based on your profile and quiz. Add only what fits.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestions.map((task) => (
                  <div key={task.id} className="rounded-lg border border-border/70 bg-background/75 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="capitalize">{task.cadence}</Badge>
                      <Button size="sm" variant="outline" onClick={() => void handleAddSuggestion(task)} disabled={isSaving}>
                        Add
                      </Button>
                    </div>
                    <p className="text-sm font-medium leading-6">{task.title}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle className="text-lg">Reset template</CardTitle>
                <CardDescription>Replace the active routine without deleting completion history.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={config.primaryGoal} onValueChange={(goal) => void handleResetToGoal(goal as RoutineGoal)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTINE_GOAL_OPTIONS.map((goal) => (
                      <SelectItem key={goal.value} value={goal.value}>{goal.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Resetting changes future tasks only.
                </div>
              </CardContent>
            </Card>
            </aside>
          </DashboardDisclosure>
        </div>

        <DashboardDisclosure
          title="Past weekly commitments"
          summary="Read-only history preserved from the old Weekly Mission workspace."
        >
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg">Past weekly commitments</CardTitle>
            <CardDescription>Read-only history preserved from the old Weekly Mission workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {legacyCommitments.length > 0 ? (
              legacyCommitments.map((commitment) => (
                <div key={commitment.id} className="rounded-lg border border-border/70 bg-background/75 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-normal text-muted-foreground">
                      {new Date(commitment.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(commitment.week_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <Badge variant={commitment.commitment_outcome === 'missed' || commitment.status === 'abandoned' ? 'outline' : 'secondary'}>
                      {commitment.commitment_outcome === 'missed' || commitment.status === 'abandoned' ? 'Not done' : commitment.status || 'Saved'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-6">{commitment.mission_goal}</p>
                  {commitment.reflection_text?.trim() ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Reflection: {commitment.reflection_text.trim()}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 bg-background/75 p-5 text-sm text-muted-foreground">
                No past weekly commitments yet.
              </div>
            )}
          </CardContent>
        </Card>
        </DashboardDisclosure>
      </div>
    </>
  );
}
