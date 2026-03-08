import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
  Compass,
  Star,
  Trophy,
  Handshake,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useUnifiedTasks, type TaskSource, type UnifiedTask } from '@/hooks/useUnifiedTasks';

// ── source config ─────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<
  TaskSource,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  bizmap: { label: 'BizMap', color: 'bg-primary/10 text-primary border-primary/20', icon: Compass },
  daily: { label: 'Daily', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: Star },
  challenge: { label: 'Challenge', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Trophy },
  commitment: { label: 'Commitment', color: 'bg-green-500/10 text-green-700 border-green-500/20', icon: Handshake },
  priority: { label: 'Priority', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20', icon: Star },
};

type Tab = 'all' | TaskSource;

// ── subcomponents ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: TaskSource }) {
  const cfg = SOURCE_CONFIG[source];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function TaskRow({ task }: { task: UnifiedTask }) {
  const [saving, setSaving] = useState(false);

  const handleToggle = async () => {
    setSaving(true);
    await task.onComplete();
    setSaving(false);
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-border/60 bg-background/70 p-3 transition-opacity ${task.isCompleted ? 'opacity-60' : ''}`}
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
          <SourceBadge source={task.source} />
          {task.priority === 'high' && (
            <Badge variant="outline" className="text-xs border-red-400/30 text-red-500">
              High
            </Badge>
          )}
          {task.actionRoute && !task.isCompleted && (
            <Link
              to={task.actionRoute}
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              Open <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface TodaysMissionWidgetProps {
  /** Compact mode for Focus view — shows max 4 tasks, no tabs */
  compact?: boolean;
}

export function TodaysMissionWidget({ compact = false }: TodaysMissionWidgetProps) {
  const { allTasks, completedToday, totalToday, isLoading, createDailyTask } = useUnifiedTasks();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [newTaskText, setNewTaskText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const progressPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const filteredTasks =
    activeTab === 'all' ? allTasks : allTasks.filter((t) => t.source === activeTab);

  const visibleTasks = compact ? filteredTasks.slice(0, 4) : filteredTasks;

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;
    setIsAdding(true);
    await createDailyTask(newTaskText.trim());
    setNewTaskText('');
    setIsAdding(false);
    setShowInput(false);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'bizmap', label: 'BizMap' },
    { id: 'daily', label: 'Daily' },
    { id: 'challenge', label: 'Community' },
  ];

  return (
    <Card className="border-primary/20 bg-card/90" id="todays-mission">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            Today's Mission
            <Badge variant="secondary" className="text-xs">
              {completedToday}/{totalToday}
            </Badge>
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs"
            onClick={() => setShowInput((v) => !v)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        </div>

        {/* Inline add-task input */}
        {showInput && (
          <div className="flex gap-2">
            <Input
              className="h-8 text-sm"
              placeholder="New task…"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              autoFocus
            />
            <Button size="sm" className="h-8" onClick={handleAddTask} disabled={isAdding}>
              {isAdding ? '…' : 'Add'}
            </Button>
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress value={progressPct} className="h-1.5" />
          <p className="text-xs text-muted-foreground">{progressPct}% complete</p>
        </div>

        {/* Source tabs */}
        {!compact && (
          <div className="flex gap-1 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {activeTab === 'all'
              ? "No tasks for today. Add one above or continue your BizMap journey."
              : `No ${activeTab} tasks for today.`}
          </div>
        ) : (
          visibleTasks.map((task) => <TaskRow key={task.id} task={task} />)
        )}

        {/* Footer link */}
        {!compact && totalToday > 0 && (
          <div className="pt-2 text-right">
            <Link
              to="/tasks"
              className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
            >
              See all tasks <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {compact && allTasks.length > 4 && (
          <div className="pt-2 text-right">
            <Link
              to="/tasks"
              className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
            >
              +{allTasks.length - 4} more tasks <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
