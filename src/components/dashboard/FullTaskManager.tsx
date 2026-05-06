import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  Compass,
  Flag,
  Filter,
  Handshake,
  Plus,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { normalizePlan } from '@/config/planPermissions';
import type { TaskLayer, UnifiedTask } from '@/hooks/useUnifiedTasks';
import { cn } from '@/lib/utils';

const layerConfig: Record<TaskLayer, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  stage: {
    label: 'Stage',
    icon: Compass,
    className: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100',
  },
  mission: {
    label: 'Mission',
    icon: Sparkles,
    className: 'border-pink-400/25 bg-pink-400/10 text-pink-100',
  },
  manual: {
    label: 'Custom',
    icon: Star,
    className: 'border-orange-400/25 bg-orange-400/10 text-orange-100',
  },
  community: {
    label: 'Community',
    icon: Trophy,
    className: 'border-purple-400/25 bg-purple-400/10 text-purple-100',
  },
  commitment: {
    label: 'Commitment',
    icon: Handshake,
    className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  },
};

type FilterPriority = 'all' | 'high' | 'medium' | 'low';
type FilterStatus = 'active' | 'completed' | 'all';

function TaskRow({ task, onChanged }: { task: UnifiedTask; onChanged: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const config = layerConfig[task.layer];
  const Icon = config.icon;

  const handleToggle = async () => {
    setSaving(true);
    try {
      await task.onComplete();
      await onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn('flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-4', task.isCompleted && 'opacity-55')}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={saving}
        className="mt-0.5 shrink-0 text-slate-500 transition-colors hover:text-cyan-200 disabled:opacity-50"
        aria-label={task.isCompleted ? 'Mark task incomplete' : 'Mark task complete'}
      >
        {task.isCompleted ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Circle className="h-5 w-5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className={cn('text-sm font-medium leading-6 text-white', task.isCompleted && 'line-through text-slate-500')}>
            {task.title}
          </p>
          {task.actionRoute ? (
            <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100">
              <Link to={task.actionRoute}>
                {task.actionLabel ?? 'Open'}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', config.className)}>
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
          <Badge variant="outline" className="border-white/10 text-xs capitalize text-slate-300">
            <Flag className="mr-1 h-3 w-3" />
            {task.priority}
          </Badge>
          <Badge variant="outline" className="border-white/10 text-xs text-slate-300">
            <Clock3 className="mr-1 h-3 w-3" />
            {task.estimatedMinutes ?? 15} min
          </Badge>
          <span className="text-xs text-slate-500">{task.sourceLabel}</span>
        </div>
      </div>
    </div>
  );
}

function TaskSection({
  title,
  description,
  tasks,
  empty,
  onChanged,
}: {
  title: string;
  description: string;
  tasks: UnifiedTask[];
  empty: string;
  onChanged: () => Promise<void>;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-slate-100 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <Badge className="border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.06]">{tasks.length}</Badge>
      </div>
      <div className="mt-4 space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => <TaskRow key={`${task.source}-${task.id}`} task={task} onChanged={onChanged} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-500">
            {empty}
          </div>
        )}
      </div>
    </section>
  );
}

export function FullTaskManager() {
  const { tasks, subscription, refreshDashboardData } = useDashboardData();
  const { allTasks, completedToday, totalToday, isLoading, createDailyTask } = tasks;
  const plan = normalizePlan(subscription.subscriptionData?.subscription_tier);
  const showAdvancedFilters = plan === 'rising' || plan === 'pro';

  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isAdding, setIsAdding] = useState(false);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
      if (filterStatus === 'active' && task.isCompleted) return false;
      if (filterStatus === 'completed' && !task.isCompleted) return false;
      return true;
    });
  }, [allTasks, filterPriority, filterStatus]);

  const stageTasks = filteredTasks.filter((task) => task.layer === 'stage');
  const missionTasks = filteredTasks.filter((task) => task.layer === 'mission');
  const customTasks = filteredTasks.filter((task) => task.layer === 'manual');
  const secondaryTasks = filteredTasks.filter((task) => task.layer === 'community' || task.layer === 'commitment');

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;
    setIsAdding(true);
    try {
      await createDailyTask(newTaskText.trim(), newTaskPriority);
      await refreshDashboardData();
      setNewTaskText('');
      setNewTaskPriority('medium');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-slate-100 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/10">
            {completedToday}/{totalToday} done today
          </Badge>

          {showAdvancedFilters ? (
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'high', 'medium', 'low'] as FilterPriority[]).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setFilterPriority(priority)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
                    filterPriority === priority
                      ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                      : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-cyan-300/40 hover:text-white',
                  )}
                >
                  {priority === 'all' ? 'All priorities' : priority}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFilterStatus(filterStatus === 'active' ? 'completed' : 'active')}
                className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-400 transition-colors hover:border-cyan-300/40 hover:text-white"
              >
                <Filter className="h-3 w-3" />
                {filterStatus === 'active' ? 'Show completed' : 'Show active'}
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <Input
            className="h-10 border-white/10 bg-black/30 text-sm text-white placeholder:text-slate-600"
            placeholder="Add a custom task..."
            value={newTaskText}
            onChange={(event) => setNewTaskText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleAddTask();
            }}
          />
          <div className="flex gap-2">
            {(['high', 'medium', 'low'] as const).map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => setNewTaskPriority(priority)}
                className={cn(
                  'h-10 rounded-xl border px-3 text-xs font-medium capitalize transition-colors',
                  newTaskPriority === priority
                    ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-cyan-300/40 hover:text-white',
                )}
              >
                {priority}
              </button>
            ))}
          </div>
          <Button className="h-10 bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={handleAddTask} disabled={isAdding || !newTaskText.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            {isAdding ? 'Adding' : 'Add task'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-2xl bg-white/10" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <TaskSection
            title="Stage tasks"
            description="Auto-generated from your active Startup Development Cycle stage."
            tasks={stageTasks}
            empty="No stage tasks are active right now."
            onChanged={refreshDashboardData}
          />
          <TaskSection
            title="This week's mission"
            description="Recommended actions that move the current Weekly Mission forward."
            tasks={missionTasks}
            empty="Open Weekly Mission to generate this week's recommended mission tasks."
            onChanged={refreshDashboardData}
          />
          <TaskSection
            title="Custom tasks"
            description="Tasks you add manually for today."
            tasks={customTasks}
            empty="Add a custom task above when something specific needs your attention."
            onChanged={refreshDashboardData}
          />
          {secondaryTasks.length > 0 ? (
            <TaskSection
              title="Community and commitments"
              description="Secondary accountability tasks connected to community activity."
              tasks={secondaryTasks}
              empty=""
              onChanged={refreshDashboardData}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
