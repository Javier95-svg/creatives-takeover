import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  addMonths,
  addWeeks,
  format,
  isSameMonth,
  isToday,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  ExternalLink,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useTaskCalendarEngine } from '@/hooks/useTaskCalendarEngine';
import {
  getDayTaskStatus,
  getTaskRuntimeStatus,
  getTaskSource,
  isFoundationalTask,
  normalizePriority,
  toDateKey,
  type CalendarTaskRow,
  type RecommendationFeedbackAction,
  type TaskCalendarView,
  type TaskPriority,
} from '@/lib/taskCalendar';
import { BIZMAP_STAGE_ORDER, type BizMapStage } from '@/lib/bizmapStages';
import { cn } from '@/lib/utils';

const VIEW_LABELS: Record<TaskCalendarView, string> = {
  month: 'Month',
  week: 'Week',
  day: 'Day',
};

const DAY_STATUS_STYLES = {
  empty: 'border-border/50 bg-background',
  completed: 'border-success/30 bg-success/10',
  pending: 'border-warning/30 bg-warning/10',
  overdue: 'border-destructive/40 bg-destructive/10',
};

type CreateTaskFn = (input: {
  title: string;
  description?: string;
  deadlineDate: string;
  priority?: TaskPriority;
  stageTag?: BizMapStage | '';
}) => Promise<boolean>;

function parseLocalDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}

function shiftAnchor(date: Date, view: TaskCalendarView, direction: -1 | 1): Date {
  if (view === 'day') {
    const next = new Date(date);
    next.setDate(next.getDate() + direction);
    return next;
  }
  if (view === 'week') return direction === 1 ? addWeeks(date, 1) : subWeeks(date, 1);
  return direction === 1 ? addMonths(date, 1) : subMonths(date, 1);
}

function getRangeTitle(anchorDate: Date, view: TaskCalendarView): string {
  if (view === 'day') return format(anchorDate, 'EEEE, MMMM d');
  if (view === 'week') return `Week of ${format(anchorDate, 'MMM d')}`;
  return format(anchorDate, 'MMMM yyyy');
}

function TaskSourceBadge({ task }: { task: CalendarTaskRow }) {
  const source = getTaskSource(task);
  if (source === 'platform') {
    return (
      <Badge variant="outline" className="border-info/30 bg-info/10 text-info dark:text-info">
        <Sparkles className="mr-1 h-3 w-3" />
        {isFoundationalTask(task) ? 'Setup milestone' : 'Platform recommended'}
      </Badge>
    );
  }

  return <Badge variant="outline">Manual</Badge>;
}

function TaskStatusBadge({ task }: { task: CalendarTaskRow }) {
  const status = getTaskRuntimeStatus(task);
  if (status === 'completed') return <Badge className="bg-success text-white">Completed</Badge>;
  if (status === 'overdue') return <Badge variant="destructive">Overdue</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

function TaskCard({
  highlighted,
  isMutating,
  onAccept,
  onComplete,
  onDismiss,
  onFeedback,
  onReschedule,
  task,
}: {
  highlighted: boolean;
  isMutating: boolean;
  onAccept: (task: CalendarTaskRow) => void;
  onComplete: (task: CalendarTaskRow, completed: boolean) => void;
  onDismiss: (task: CalendarTaskRow) => void;
  onFeedback: (task: CalendarTaskRow, action: RecommendationFeedbackAction) => void;
  onReschedule: (task: CalendarTaskRow, dateKey: string) => void;
  task: CalendarTaskRow;
}) {
  const [rescheduleDate, setRescheduleDate] = useState(task.task_date);
  const source = getTaskSource(task);
  const status = getTaskRuntimeStatus(task);
  const priority = normalizePriority(task.priority);

  return (
    <div
      id={`task-${task.id}`}
      className={cn(
        'rounded-lg border bg-background p-4 shadow-sm transition-colors',
        source === 'platform' && 'border-info/30 bg-info/[0.06]',
        status === 'overdue' && 'border-destructive/40 bg-destructive/[0.06]',
        highlighted && 'ring-2 ring-primary',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onComplete(task, !task.is_completed)}
          disabled={isMutating}
          className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={task.is_completed ? 'Mark task pending' : 'Mark task completed'}
        >
          {task.is_completed ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <h3 className={cn('text-sm font-semibold leading-snug', task.is_completed && 'text-muted-foreground line-through')}>
              {task.task_text}
            </h3>
            {task.task_description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{task.task_description}</p>
            )}
            {task.recommendation_reason && (
              <p className="text-xs leading-relaxed text-info dark:text-info">{task.recommendation_reason}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TaskSourceBadge task={task} />
            <TaskStatusBadge task={task} />
            <Badge variant="outline" className="capitalize">{priority}</Badge>
            {task.startup_stage_tag && <Badge variant="outline">{task.startup_stage_tag}</Badge>}
            {task.deadline_time && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {format(new Date(task.deadline_time), 'MMM d, h:mm a')}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {source === 'platform' && task.recommendation_status === 'suggested' && (
              <>
                <Button size="sm" className="h-8" onClick={() => onAccept(task)} disabled={isMutating}>
                  Accept
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => onFeedback(task, 'remind_later')} disabled={isMutating}>
                  Remind later
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => onFeedback(task, 'already_done')} disabled={isMutating}>
                  Already did this
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => onFeedback(task, 'not_relevant')} disabled={isMutating}>
                  Not relevant
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-destructive" onClick={() => onFeedback(task, 'stop_showing')} disabled={isMutating}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Stop showing
                </Button>
              </>
            )}

            {source === 'platform' && task.recommendation_status === 'accepted' && (
              <Button size="sm" variant="outline" className="h-8" onClick={() => onDismiss(task)} disabled={isMutating}>
                <X className="mr-1 h-3.5 w-3.5" />
                Dismiss
              </Button>
            )}

            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
                className="h-8 w-36 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => onReschedule(task, rescheduleDate)}
                disabled={isMutating || !rescheduleDate || rescheduleDate === task.task_date}
              >
                Reschedule
              </Button>
            </div>

            {task.source_route && (
              <Button size="sm" variant="ghost" className="h-8 gap-1" asChild>
                <Link to={task.source_route}>
                  Open source
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddTaskForm({
  defaultDate,
  onCreate,
}: {
  defaultDate: string;
  onCreate: CreateTaskFn;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineDate, setDeadlineDate] = useState(defaultDate);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [stageTag, setStageTag] = useState<BizMapStage | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDeadlineDate(defaultDate);
  }, [defaultDate]);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const ok = await onCreate({ title, description, deadlineDate, priority, stageTag });
    setSaving(false);
    if (ok) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setStageTag('');
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" className="h-9 gap-1" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add task
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <div className="space-y-1.5">
          <Label htmlFor="task-title">Task title</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Schedule two customer interviews"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-date">Deadline</Label>
          <Input id="task-date" type="date" value={deadlineDate} onChange={(event) => setDeadlineDate(event.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-description">Description</Label>
        <Textarea
          id="task-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional context"
          className="min-h-20"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Stage tag</Label>
          <Select value={stageTag || 'none'} onValueChange={(value) => setStageTag(value === 'none' ? '' : value as BizMapStage)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No stage tag</SelectItem>
              {BIZMAP_STAGE_ORDER.map((stage) => (
                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={saving || !title.trim() || !deadlineDate}>
          {saving ? 'Saving...' : 'Save task'}
        </Button>
      </div>
    </div>
  );
}

function SelectedDayPanel({
  highlightedTaskId,
  isLoading,
  isMutating,
  onAccept,
  onComplete,
  onCreate,
  onDismiss,
  onFeedback,
  onSeen,
  onReschedule,
  selectedDate,
  tasks,
}: {
  highlightedTaskId?: string | null;
  isLoading: boolean;
  isMutating: boolean;
  onAccept: (task: CalendarTaskRow) => void;
  onComplete: (task: CalendarTaskRow, completed: boolean) => void;
  onCreate: CreateTaskFn;
  onDismiss: (task: CalendarTaskRow) => void;
  onFeedback: (task: CalendarTaskRow, action: RecommendationFeedbackAction) => void;
  onSeen: (task: CalendarTaskRow) => void;
  onReschedule: (task: CalendarTaskRow, dateKey: string) => void;
  selectedDate: string;
  tasks: CalendarTaskRow[];
}) {
  const seenTaskIds = useRef(new Set<string>());

  useEffect(() => {
    tasks.forEach((task) => {
      if (getTaskSource(task) !== 'platform' || task.is_completed || task.recommendation_status === 'dismissed') return;
      if (seenTaskIds.current.has(task.id)) return;
      seenTaskIds.current.add(task.id);
      onSeen(task);
    });
  }, [onSeen, tasks]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected day</p>
          <h2 className="text-lg font-semibold">{format(parseLocalDate(selectedDate), 'EEEE, MMMM d')}</h2>
        </div>
        <AddTaskForm defaultDate={selectedDate} onCreate={onCreate} />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-4">
          {isLoading ? (
            <>
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </>
          ) : tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-3 text-sm font-semibold">No tasks for this day</h3>
              <p className="mt-1 text-sm text-muted-foreground">Add a manual task or let the daily recommendation engine guide today.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                highlighted={highlightedTaskId === task.id}
                isMutating={isMutating}
                onAccept={onAccept}
                onComplete={onComplete}
                onDismiss={onDismiss}
                onFeedback={onFeedback}
                onReschedule={onReschedule}
                task={task}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function TaskCalendarCommandCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const {
    acceptRecommendation,
    anchorDate,
    calendarDays,
    completeTask,
    createManualTask,
    currentStage,
    dayStatuses,
    dismissRecommendation,
    markTaskSeen,
    sendRecommendationFeedback,
    groupedTasks,
    isLoading,
    isMutating,
    rescheduleTask,
    selectedDate,
    selectedTasks,
    setAnchorDate,
    setSelectedDate,
    setView,
    view,
  } = useTaskCalendarEngine();

  const highlightedTaskId = searchParams.get('task');

  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      setSelectedDate(dateParam);
      setAnchorDate(parseLocalDate(dateParam));
    }
  }, [searchParams, setAnchorDate, setSelectedDate]);

  useEffect(() => {
    if (!highlightedTaskId) return;
    const element = document.getElementById(`task-${highlightedTaskId}`);
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlightedTaskId, selectedTasks]);

  const stats = useMemo(() => {
    const todayKey = toDateKey(new Date());
    const todayTasks = groupedTasks[todayKey] ?? [];
    const overdueCount = Object.values(groupedTasks).flat().filter((task) => getTaskRuntimeStatus(task) === 'overdue').length;
    const completedToday = todayTasks.filter((task) => task.is_completed).length;
    return { todayTasks: todayTasks.length, completedToday, overdueCount };
  }, [groupedTasks]);

  const selectDay = (dateKey: string) => {
    setSelectedDate(dateKey);
    setAnchorDate(parseLocalDate(dateKey));
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('date', dateKey);
      next.delete('task');
      return next;
    });
    setMobilePanelOpen(true);
  };

  const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const gridColumns = view === 'day' ? 'grid-cols-1' : 'grid-cols-7';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Personalised calendar</p>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{stats.completedToday}/{stats.todayTasks} done today</Badge>
          {stats.overdueCount > 0 && <Badge variant="destructive">{stats.overdueCount} overdue</Badge>}
          <Badge variant="outline">Stage {currentStage}</Badge>
        </div>
      </div>

      <div className="grid min-h-[720px] gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAnchorDate(shiftAnchor(anchorDate, view, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-44 text-center text-sm font-semibold">{getRangeTitle(anchorDate, view)}</div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAnchorDate(shiftAnchor(anchorDate, view, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1 rounded-md border bg-background p-1">
              {(Object.keys(VIEW_LABELS) as TaskCalendarView[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setView(item)}
                  className={cn(
                    'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                    view === item ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {VIEW_LABELS[item]}
                </button>
              ))}
            </div>
          </div>

          {view !== 'day' && (
            <div className="grid grid-cols-7 border-b bg-muted/30 px-2 py-2">
              {weekDayLabels.map((label) => (
                <div key={label} className="px-2 text-xs font-medium text-muted-foreground">{label}</div>
              ))}
            </div>
          )}

          <div className={cn('grid gap-px bg-border/70 p-px', gridColumns)}>
            {calendarDays.map((day) => {
              const dateKey = toDateKey(day);
              const tasks = groupedTasks[dateKey] ?? [];
              const status = dayStatuses[dateKey] ?? getDayTaskStatus([]);
              const hasPlatformTask = tasks.some((task) => getTaskSource(task) === 'platform');
              const isSelected = selectedDate === dateKey;
              const isOutsideMonth = view === 'month' && !isSameMonth(day, anchorDate);

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => selectDay(dateKey)}
                  className={cn(
                    'min-h-28 bg-background p-3 text-left transition-colors hover:bg-accent/60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
                    view === 'day' && 'min-h-[560px]',
                    DAY_STATUS_STYLES[status],
                    isSelected && 'ring-2 ring-primary ring-inset',
                    isOutsideMonth && 'opacity-45',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold', isToday(day) && 'bg-primary text-primary-foreground')}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex items-center gap-1">
                      {hasPlatformTask && <Sparkles className="h-3.5 w-3.5 text-info" />}
                      {status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                      {status === 'overdue' && <Clock className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                  </div>

                  <div className="mt-4 space-y-1">
                    {tasks.slice(0, view === 'day' ? 8 : 3).map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          'truncate rounded border bg-background/80 px-2 py-1 text-xs',
                          getTaskSource(task) === 'platform' && 'border-info/30 text-info dark:text-info',
                          getTaskRuntimeStatus(task) === 'overdue' && 'border-destructive/30 text-destructive',
                          task.is_completed && 'text-muted-foreground line-through',
                        )}
                      >
                        {task.task_text}
                      </div>
                    ))}
                    {tasks.length > (view === 'day' ? 8 : 3) && (
                      <div className="text-xs text-muted-foreground">+{tasks.length - (view === 'day' ? 8 : 3)} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 border-t px-4 py-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />Completed</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" />Pending</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" />Overdue</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-info" />Platform task</span>
          </div>
        </section>

        <aside className="hidden overflow-hidden rounded-lg border bg-card lg:block">
          <SelectedDayPanel
            highlightedTaskId={highlightedTaskId}
            isLoading={isLoading}
            isMutating={isMutating}
            onAccept={acceptRecommendation}
            onComplete={completeTask}
            onCreate={createManualTask}
            onDismiss={dismissRecommendation}
            onFeedback={sendRecommendationFeedback}
            onSeen={markTaskSeen}
            onReschedule={rescheduleTask}
            selectedDate={selectedDate}
            tasks={selectedTasks}
          />
        </aside>
      </div>

      <div className="lg:hidden">
        <Button variant="outline" className="w-full justify-between" onClick={() => setMobilePanelOpen(true)}>
          View {format(parseLocalDate(selectedDate), 'MMM d')} tasks
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
        <SheetContent side="right" className="w-[92vw] max-w-none p-0 sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>Tasks for selected day</SheetTitle>
            <SheetDescription>View and manage calendar tasks for the selected date.</SheetDescription>
          </SheetHeader>
          <SelectedDayPanel
            highlightedTaskId={highlightedTaskId}
            isLoading={isLoading}
            isMutating={isMutating}
            onAccept={acceptRecommendation}
            onComplete={completeTask}
            onCreate={createManualTask}
            onDismiss={dismissRecommendation}
            onFeedback={sendRecommendationFeedback}
            onSeen={markTaskSeen}
            onReschedule={rescheduleTask}
            selectedDate={selectedDate}
            tasks={selectedTasks}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
