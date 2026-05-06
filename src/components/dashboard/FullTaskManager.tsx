import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
  Filter,
  ChevronDown,
  ChevronRight,
  Compass,
  Star,
  Trophy,
  Handshake,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUnifiedTasks, type TaskSource, type UnifiedTask } from '@/hooks/useUnifiedTasks';

// ── source config ──────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<
  TaskSource,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  bizmap:     { label: 'BizMap',      color: 'bg-primary/10 text-primary border-primary/20',             icon: Compass  },
  daily:      { label: 'Daily',       color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',     icon: Star     },
  challenge:  { label: 'Challenge',   color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',     icon: Trophy   },
  commitment: { label: 'Commitment',  color: 'bg-green-500/10 text-green-700 border-green-500/20',        icon: Handshake},
  priority:   { label: 'Priority',    color: 'bg-rose-500/10 text-rose-600 border-rose-500/20',           icon: Star     },
};

type FilterSource = 'all' | TaskSource;
type FilterPriority = 'all' | 'high' | 'medium' | 'low';
type FilterStatus = 'active' | 'completed' | 'all';

// ── task row ────────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: UnifiedTask }) {
  const [saving, setSaving] = useState(false);
  const cfg = SOURCE_CONFIG[task.source];
  const Icon = cfg.icon;

  const handleToggle = async () => {
    setSaving(true);
    await task.onComplete();
    setSaving(false);
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-border/60 bg-background/70 p-3 transition-opacity ${task.isCompleted ? 'opacity-55' : ''}`}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={saving}
        className="mt-0.5 shrink-0"
        aria-label={task.isCompleted ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-snug ${task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}
          >
            <Icon className="h-3 w-3" />
            {cfg.label}
          </span>
          {task.priority === 'high' && (
            <Badge variant="outline" className="text-xs border-red-400/30 text-red-500">High</Badge>
          )}
          {task.deadline && (
            <span className="text-xs text-muted-foreground">
              Due {new Date(task.deadline).toLocaleDateString()}
            </span>
          )}
          {task.actionRoute && (
            <Link to={task.actionRoute} className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Go to source <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── collapsible section ──────────────────────────────────────────────────────────

function CollapsibleSection({ title, tasks, defaultOpen = true }: { title: string; tasks: UnifiedTask[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (tasks.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {title}
        <Badge variant="secondary" className="ml-auto text-xs">{tasks.length}</Badge>
      </button>
      {open && (
        <div className="space-y-2 mt-1">
          {tasks.map((task) => <TaskRow key={task.id} task={task} />)}
        </div>
      )}
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────────

export function FullTaskManager() {
  const { allTasks, completedToday, totalToday, isLoading, createDailyTask } = useUnifiedTasks();

  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [newTaskText, setNewTaskText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;
    setIsAdding(true);
    await createDailyTask(newTaskText.trim());
    setNewTaskText('');
    setIsAdding(false);
    setShowInput(false);
  };

  // Apply filters
  const filtered = allTasks.filter((t) => {
    if (filterSource !== 'all' && t.source !== filterSource) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterStatus === 'active' && t.isCompleted) return false;
    if (filterStatus === 'completed' && !t.isCompleted) return false;
    return true;
  });

  const activeTasks = filtered.filter((t) => !t.isCompleted);
  const completedTasks = filtered.filter((t) => t.isCompleted);

  const sourceBadges: { id: FilterSource; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'priority', label: 'Priorities' },
    { id: 'bizmap', label: 'BizMap' },
    { id: 'daily', label: 'Daily' },
    { id: 'challenge', label: 'Community' },
    { id: 'commitment', label: 'Commitments' },
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{completedToday}/{totalToday} done today</Badge>
          {(['all', 'high', 'medium', 'low'] as FilterPriority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilterPriority(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors border ${
                filterPriority === p
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
              }`}
            >
              {p === 'all' ? 'All priorities' : p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'active' ? 'completed' : 'active')}
            className="rounded-full px-3 py-1 text-xs font-medium border bg-background text-muted-foreground border-border hover:border-foreground/40 transition-colors flex items-center gap-1"
          >
            <Filter className="h-3 w-3" />
            {filterStatus === 'active' ? 'Show completed' : 'Show active'}
          </button>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setShowInput((v) => !v)}>
          <Plus className="h-3.5 w-3.5" /> New Task
        </Button>
      </div>

      {/* Source filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {sourceBadges.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterSource(tab.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterSource === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inline add task */}
      {showInput && (
        <div className="flex gap-2">
          <Input
            className="h-9 text-sm"
            placeholder="New task description…"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            autoFocus
          />
          <Button size="sm" className="h-9" onClick={handleAddTask} disabled={isAdding}>
            {isAdding ? '…' : 'Add'}
          </Button>
        </div>
      )}

      {/* Task list */}
      <Card className="border-border/70 bg-card/90">
        <CardContent className="pt-4 space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {filterStatus === 'completed'
                ? 'No completed tasks yet. Keep going!'
                : 'No tasks matching your filters. Add one above.'}
            </div>
          ) : (
            <>
              {filterStatus !== 'completed' && (
                <CollapsibleSection
                  title={`Active (${activeTasks.length})`}
                  tasks={activeTasks}
                  defaultOpen
                />
              )}
              {filterStatus !== 'active' && completedTasks.length > 0 && (
                <CollapsibleSection
                  title={`Completed (${completedTasks.length})`}
                  tasks={completedTasks}
                  defaultOpen={filterStatus === 'completed'}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
