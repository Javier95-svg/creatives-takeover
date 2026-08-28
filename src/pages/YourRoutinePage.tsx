import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat2,
  Settings2,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useRoutine } from '@/hooks/useRoutine';
import { useLeanStartupStore } from '@/store/leanStartupStore';
import { cn } from '@/lib/utils';
import {
  createCustomRoutineTask,
  getCompletionKey,
  getDateKeyInTimezone,
  getMonthStartKeyInTimezone,
  type RoutineCadence,
  type RoutineConfig,
  type RoutineReminderPreferences,
  type RoutineTask,
} from '@/lib/routineTemplates';

const REMINDER_TIMES = Array.from({ length: 96 }, (_, index) => {
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

function cadenceLabel(cadence: RoutineCadence) {
  return cadence === 'daily' ? 'Daily' : 'Monthly';
}

function periodLabel(cadence: RoutineCadence, timezone: string) {
  if (cadence === 'daily') {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: timezone,
    }).format(new Date());
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date());
}

function CadencePicker({
  value,
  onChange,
  compact = false,
}: {
  value: RoutineCadence;
  onChange: (cadence: RoutineCadence) => void;
  compact?: boolean;
}) {
  return (
    <div className="inline-flex rounded-xl bg-muted/70 p-1" role="group" aria-label="Routine frequency">
      {(['daily', 'monthly'] as const).map((cadence) => (
        <button
          key={cadence}
          type="button"
          onClick={() => onChange(cadence)}
          className={cn(
            'rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
            value === cadence
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-pressed={value === cadence}
        >
          {cadenceLabel(cadence)}
        </button>
      ))}
    </div>
  );
}

function RoutineComposer({
  cadence,
  onCadenceChange,
  onAdd,
  isSaving,
  inputRef,
}: {
  cadence: RoutineCadence;
  onCadenceChange: (cadence: RoutineCadence) => void;
  onAdd: (title: string, cadence: RoutineCadence) => void;
  isSaving: boolean;
  inputRef: RefObject<HTMLInputElement>;
}) {
  const [title, setTitle] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) return;
    onAdd(nextTitle, cadence);
    setTitle('');
  };

  return (
    <Card className="border-primary/20 bg-card/90 shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-border/70 bg-background px-3">
            <Plus className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <Input
              ref={inputRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What do you want to keep doing?"
              aria-label="New routine title"
              className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <CadencePicker value={cadence} onChange={onCadenceChange} compact />
            <Button type="submit" disabled={!title.trim() || isSaving} className="shrink-0">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add routine
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function RoutineEditDialog({
  task,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  task: RoutineTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: RoutineTask, title: string, cadence: RoutineCadence) => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState('');
  const [cadence, setCadence] = useState<RoutineCadence>('daily');

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setCadence(task.cadence);
  }, [task]);

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit routine</DialogTitle>
          <DialogDescription>Change the name or how often this routine resets.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-routine-title">Routine</Label>
            <Input
              id="edit-routine-title"
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && title.trim()) onSave(task, title.trim(), cadence);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <div><CadencePicker value={cadence} onChange={setCadence} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={() => onSave(task, title.trim(), cadence)} disabled={!title.trim() || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReminderDialog({
  open,
  onOpenChange,
  preferences,
  timezone,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: RoutineReminderPreferences;
  timezone: string;
  onSave: (preferences: RoutineReminderPreferences) => void;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState(preferences);

  useEffect(() => {
    if (open) setDraft(preferences);
  }, [open, preferences]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Routine reminder</DialogTitle>
          <DialogDescription>Choose one gentle daily check-in. You can turn it off at any time.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 p-4">
            <div>
              <Label htmlFor="routine-reminder-enabled">Remind me</Label>
              <p className="mt-1 text-xs text-muted-foreground">Uses your existing notification channels.</p>
            </div>
            <Switch
              id="routine-reminder-enabled"
              checked={draft.enabled}
              onCheckedChange={(enabled) => setDraft((current) => ({ ...current, enabled }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="routine-reminder-time">Time</Label>
            <Select
              value={draft.time}
              onValueChange={(time) => setDraft((current) => ({ ...current, time }))}
              disabled={!draft.enabled}
            >
              <SelectTrigger id="routine-reminder-time"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REMINDER_TIMES.map((time) => <SelectItem key={time} value={time}>{time}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Timezone: {timezone}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={() => onSave(draft)} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoutineRow({
  task,
  completed,
  disabled,
  canMoveUp,
  canMoveDown,
  onToggle,
  onEdit,
  onMove,
  onPause,
  onDelete,
}: {
  task: RoutineTask;
  completed: boolean;
  disabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  onPause: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={cn('group flex items-center gap-3 px-4 py-3.5 sm:px-5', completed && 'bg-muted/25')}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          completed
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/40 bg-background hover:border-primary hover:bg-primary/5',
        )}
        aria-label={completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
      >
        {completed ? <Check className="h-3.5 w-3.5" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium text-foreground', completed && 'text-muted-foreground line-through')}>
          {task.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {task.cadence === 'daily' ? 'Repeats every day' : 'Priority for this month'}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground" aria-label={`Manage ${task.title}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMove(-1)} disabled={!canMoveUp}><ArrowUp className="mr-2 h-4 w-4" />Move up</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMove(1)} disabled={!canMoveDown}><ArrowDown className="mr-2 h-4 w-4" />Move down</DropdownMenuItem>
          <DropdownMenuItem onClick={onPause}><Pause className="mr-2 h-4 w-4" />Pause</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function YourRoutinePage() {
  const markToolUsed = useLeanStartupStore((state) => state.markToolUsed);
  const {
    config,
    selectedGoal,
    reminderPreferences,
    timezone,
    completionByKey,
    isLoading,
    isSaving,
    error,
    saveConfig,
    updateReminderPreferences,
    setTaskStatus,
    clearTaskStatus,
  } = useRoutine();

  const [selectedCadence, setSelectedCadence] = useState<RoutineCadence>('daily');
  const [composerCadence, setComposerCadence] = useState<RoutineCadence>('daily');
  const [editingTask, setEditingTask] = useState<RoutineTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<RoutineTask | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [pausedOpen, setPausedOpen] = useState(false);
  const composerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    markToolUsed('routine');
  }, [markToolUsed]);

  const allTasks = useMemo(
    () => [...(config?.tasks ?? [])].sort((left, right) => left.order - right.order),
    [config],
  );
  const visibleTasks = useMemo(
    () => allTasks.filter((task) => task.cadence === selectedCadence && task.active),
    [allTasks, selectedCadence],
  );
  const pausedTasks = useMemo(
    () => allTasks.filter((task) => task.cadence === selectedCadence && !task.active),
    [allTasks, selectedCadence],
  );
  const periodDate = selectedCadence === 'daily'
    ? getDateKeyInTimezone(new Date(), timezone)
    : getMonthStartKeyInTimezone(new Date(), timezone);
  const isCompleted = (task: RoutineTask) => completionByKey.get(
    getCompletionKey(task.id, selectedCadence, periodDate),
  )?.status === 'completed';
  const pendingTasks = visibleTasks.filter((task) => !isCompleted(task));
  const completedTasks = visibleTasks.filter(isCompleted);
  const completedPercentage = visibleTasks.length
    ? Math.round((completedTasks.length / visibleTasks.length) * 100)
    : 0;
  const dailyCount = allTasks.filter((task) => task.active && task.cadence === 'daily').length;
  const monthlyCount = allTasks.filter((task) => task.active && task.cadence === 'monthly').length;

  const persistTasks = async (tasks: RoutineTask[]) => {
    const nextConfig: RoutineConfig = config
      ? { ...config, tasks }
      : {
          version: 1,
          primaryGoal: selectedGoal ?? 'validate_idea',
          tasks,
          updatedAt: new Date().toISOString(),
        };
    await saveConfig(nextConfig);
  };

  const handleAdd = async (title: string, cadence: RoutineCadence) => {
    const task = createCustomRoutineTask(title, cadence, allTasks.length);
    await persistTasks([...allTasks, task]);
    setSelectedCadence(cadence);
  };

  const handleEdit = async (task: RoutineTask, title: string, cadence: RoutineCadence) => {
    await persistTasks(allTasks.map((item) => item.id === task.id
      ? {
          ...item,
          title,
          cadence,
          days: cadence === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : [],
        }
      : item));
    setEditingTask(null);
    setSelectedCadence(cadence);
  };

  const handleMove = async (task: RoutineTask, direction: -1 | 1) => {
    const ordered = [...allTasks];
    const cadenceTasks = ordered.filter((item) => item.cadence === task.cadence && item.active);
    const cadenceIndex = cadenceTasks.findIndex((item) => item.id === task.id);
    const target = cadenceTasks[cadenceIndex + direction];
    if (!target) return;
    const sourceIndex = ordered.findIndex((item) => item.id === task.id);
    const targetIndex = ordered.findIndex((item) => item.id === target.id);
    [ordered[sourceIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[sourceIndex]];
    await persistTasks(ordered);
  };

  const handlePause = async (task: RoutineTask, active: boolean) => {
    await persistTasks(allTasks.map((item) => item.id === task.id ? { ...item, active } : item));
  };

  const handleDelete = async () => {
    if (!deletingTask) return;
    await persistTasks(allTasks.filter((task) => task.id !== deletingTask.id));
    setDeletingTask(null);
  };

  const handleReminderSave = async (preferences: RoutineReminderPreferences) => {
    await updateReminderPreferences(preferences);
    setReminderOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />Loading your routines...
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/25 bg-card/90">
        <CardContent className="p-6">
          <h1 className="font-semibold text-destructive">Your routines could not load</h1>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Helmet><title>Routines - Creatives Takeover</title></Helmet>

      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <Repeat2 className="h-4 w-4" />Routines
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Keep your priorities simple.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Add the actions you want to repeat, then check them off as you go.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setReminderOpen(true)} aria-label="Routine reminder settings" className="relative">
              <Settings2 className="h-4 w-4" />
              {reminderPreferences.enabled ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
            </Button>
            <Button onClick={() => composerRef.current?.focus()}>
              <Plus className="mr-2 h-4 w-4" />Add routine
            </Button>
          </div>
        </header>

        <RoutineComposer
          cadence={composerCadence}
          onCadenceChange={setComposerCadence}
          onAdd={(title, cadence) => void handleAdd(title, cadence)}
          isSaving={isSaving}
          inputRef={composerRef}
        />

        <section aria-labelledby="routine-list-title">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 id="routine-list-title" className="text-lg font-semibold text-foreground">
                  {selectedCadence === 'daily' ? 'Today' : 'This month'}
                </h2>
                {visibleTasks.length ? <Badge variant="secondary">{pendingTasks.length} left</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{periodLabel(selectedCadence, timezone)}</p>
            </div>
            <div className="inline-flex w-fit rounded-xl border border-border/70 bg-card p-1">
              <button
                type="button"
                onClick={() => setSelectedCadence('daily')}
                className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors', selectedCadence === 'daily' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                Daily <span className="ml-1 opacity-70">{dailyCount}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCadence('monthly')}
                className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors', selectedCadence === 'monthly' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                Monthly <span className="ml-1 opacity-70">{monthlyCount}</span>
              </button>
            </div>
          </div>

          <Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm">
            {visibleTasks.length ? (
              <>
                <div className="border-b border-border/60 px-4 py-3 sm:px-5">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{completedTasks.length} of {visibleTasks.length} complete</span>
                    <span className="font-medium text-foreground">{completedPercentage}%</span>
                  </div>
                  <Progress value={completedPercentage} className="h-1.5" />
                </div>

                <div className="divide-y divide-border/60">
                  {pendingTasks.map((task, index) => (
                    <RoutineRow
                      key={task.id}
                      task={task}
                      completed={false}
                      disabled={isSaving}
                      canMoveUp={index > 0}
                      canMoveDown={index < pendingTasks.length - 1}
                      onToggle={() => void setTaskStatus(task, selectedCadence, 'completed')}
                      onEdit={() => setEditingTask(task)}
                      onMove={(direction) => void handleMove(task, direction)}
                      onPause={() => void handlePause(task, false)}
                      onDelete={() => setDeletingTask(task)}
                    />
                  ))}
                  {completedTasks.length ? (
                    <div className="bg-muted/20 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:px-5">
                      Completed
                    </div>
                  ) : null}
                  {completedTasks.map((task) => (
                    <RoutineRow
                      key={task.id}
                      task={task}
                      completed
                      disabled={isSaving}
                      canMoveUp={false}
                      canMoveDown={false}
                      onToggle={() => void clearTaskStatus(task, selectedCadence)}
                      onEdit={() => setEditingTask(task)}
                      onMove={() => undefined}
                      onPause={() => void handlePause(task, false)}
                      onDelete={() => setDeletingTask(task)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <CardContent className="flex flex-col items-center px-6 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {selectedCadence === 'daily' ? <CheckCircle2 className="h-6 w-6" /> : <CalendarDays className="h-6 w-6" />}
                </div>
                <h3 className="mt-4 font-semibold text-foreground">
                  No {selectedCadence} routines yet
                </h3>
                <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                  {selectedCadence === 'daily'
                    ? 'Start with one small action you want to complete every day.'
                    : 'Add the few outcomes you want to protect this month.'}
                </p>
                <Button
                  variant="outline"
                  className="mt-5"
                  onClick={() => {
                    setComposerCadence(selectedCadence);
                    composerRef.current?.focus();
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />Add your first routine
                </Button>
              </CardContent>
            )}
          </Card>

          {pausedTasks.length ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setPausedOpen((current) => !current)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
                aria-expanded={pausedOpen}
              >
                {pausedOpen ? 'Hide' : 'Show'} paused routines ({pausedTasks.length})
              </button>
              {pausedOpen ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-border/60 bg-card/60 divide-y divide-border/60">
                  {pausedTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                      <Pause className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{task.title}</span>
                      <Button variant="ghost" size="sm" onClick={() => void handlePause(task, true)} disabled={isSaving}>
                        <Play className="mr-2 h-3.5 w-3.5" />Resume
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setDeletingTask(task)} aria-label={`Delete ${task.title}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <RoutineEditDialog
        task={editingTask}
        open={Boolean(editingTask)}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
        onSave={(task, title, cadence) => void handleEdit(task, title, cadence)}
        isSaving={isSaving}
      />

      <ReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        preferences={reminderPreferences}
        timezone={timezone}
        onSave={(preferences) => void handleReminderSave(preferences)}
        isSaving={isSaving}
      />

      <Dialog open={Boolean(deletingTask)} onOpenChange={(open) => { if (!open) setDeletingTask(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete routine?</DialogTitle>
            <DialogDescription>
              “{deletingTask?.title}” will be removed from your routine. Past completion history will remain.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTask(null)} disabled={isSaving}>Cancel</Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete routine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
