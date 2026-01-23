import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  FocusGoal,
  FocusProject,
  FocusTask,
  CreateGoalInput,
  UpdateGoalInput,
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  FocusFunnelStats,
  FocusFunnelHierarchy,
  TaskStatus,
} from '@/types/focus-funnel';

export interface UseFocusFunnelReturn {
  // Data
  goals: FocusGoal[];
  projects: FocusProject[];
  tasks: FocusTask[];
  hierarchy: FocusFunnelHierarchy;
  stats: FocusFunnelStats;

  // Computed
  todaysTasks: FocusTask[];
  overdueTasks: FocusTask[];
  highPriorityTasks: FocusTask[];

  // Loading states
  isLoading: boolean;
  isGoalsLoading: boolean;
  isProjectsLoading: boolean;
  isTasksLoading: boolean;

  // Error
  error: string | null;

  // Goal operations
  createGoal: (input: CreateGoalInput) => Promise<FocusGoal | null>;
  updateGoal: (id: string, updates: UpdateGoalInput) => Promise<boolean>;
  deleteGoal: (id: string) => Promise<boolean>;
  archiveGoal: (id: string) => Promise<boolean>;

  // Project operations
  createProject: (input: CreateProjectInput) => Promise<FocusProject | null>;
  updateProject: (id: string, updates: UpdateProjectInput) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  archiveProject: (id: string) => Promise<boolean>;

  // Task operations
  createTask: (input: CreateTaskInput) => Promise<FocusTask | null>;
  updateTask: (id: string, updates: UpdateTaskInput) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  updateTaskStatus: (id: string, status: TaskStatus, actualMinutes?: number) => Promise<boolean>;
  deferTask: (id: string, deferTo: string) => Promise<boolean>;

  // Bulk operations
  reorderGoals: (goalIds: string[], newOrders: number[]) => Promise<boolean>;
  reorderProjects: (projectIds: string[], newOrders: number[]) => Promise<boolean>;
  reorderTasks: (taskIds: string[], newOrders: number[]) => Promise<boolean>;
  moveTaskToProject: (taskId: string, projectId: string | null) => Promise<boolean>;
  moveProjectToGoal: (projectId: string, goalId: string | null) => Promise<boolean>;

  // Refresh
  refresh: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  refreshTasks: () => Promise<void>;
}

export function useFocusFunnel(): UseFocusFunnelReturn {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [goals, setGoals] = useState<FocusGoal[]>([]);
  const [projects, setProjects] = useState<FocusProject[]>([]);
  const [tasks, setTasks] = useState<FocusTask[]>([]);

  // Loading states
  const [isGoalsLoading, setIsGoalsLoading] = useState(false);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [isTasksLoading, setIsTasksLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // FETCH OPERATIONS
  // ==========================================================================

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    setIsGoalsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('focus_funnel_goals')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'archived')
        .order('priority', { ascending: true })
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;
      setGoals((data || []) as FocusGoal[]);
    } catch (err) {
      console.error('Error fetching goals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch goals');
    } finally {
      setIsGoalsLoading(false);
    }
  }, [user]);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setIsProjectsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('focus_funnel_projects')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'archived')
        .order('priority', { ascending: true })
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;
      setProjects((data || []) as FocusProject[]);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setIsProjectsLoading(false);
    }
  }, [user]);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setIsTasksLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('focus_funnel_tasks')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'done')
        .order('computed_priority_score', { ascending: false })
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;
      setTasks((data || []) as FocusTask[]);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setIsTasksLoading(false);
    }
  }, [user]);

  // ==========================================================================
  // GOAL OPERATIONS
  // ==========================================================================

  const createGoal = useCallback(async (input: CreateGoalInput): Promise<FocusGoal | null> => {
    if (!user) {
      toast({ title: 'Error', description: 'Please sign in to create a goal', variant: 'destructive' });
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('focus_funnel_goals')
        .insert({
          ...input,
          user_id: user.id,
          success_criteria: input.success_criteria || [],
          key_results: input.key_results || [],
          ai_context: {},
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newGoal = data as FocusGoal;
      setGoals(prev => [newGoal, ...prev]);
      toast({ title: 'Goal created', description: `"${newGoal.title}" has been created` });
      return newGoal;
    } catch (err) {
      console.error('Error creating goal:', err);
      toast({ title: 'Error', description: 'Failed to create goal', variant: 'destructive' });
      return null;
    }
  }, [user, toast]);

  const updateGoal = useCallback(async (id: string, updates: UpdateGoalInput): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('focus_funnel_goals')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
      return true;
    } catch (err) {
      console.error('Error updating goal:', err);
      toast({ title: 'Error', description: 'Failed to update goal', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const deleteGoal = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('focus_funnel_goals')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setGoals(prev => prev.filter(g => g.id !== id));
      toast({ title: 'Goal deleted' });
      return true;
    } catch (err) {
      console.error('Error deleting goal:', err);
      toast({ title: 'Error', description: 'Failed to delete goal', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const archiveGoal = useCallback(async (id: string): Promise<boolean> => {
    return updateGoal(id, { status: 'archived' });
  }, [updateGoal]);

  // ==========================================================================
  // PROJECT OPERATIONS
  // ==========================================================================

  const createProject = useCallback(async (input: CreateProjectInput): Promise<FocusProject | null> => {
    if (!user) {
      toast({ title: 'Error', description: 'Please sign in to create a project', variant: 'destructive' });
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('focus_funnel_projects')
        .insert({
          ...input,
          user_id: user.id,
          ai_context: {},
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newProject = data as FocusProject;
      setProjects(prev => [newProject, ...prev]);
      toast({ title: 'Project created', description: `"${newProject.title}" has been created` });
      return newProject;
    } catch (err) {
      console.error('Error creating project:', err);
      toast({ title: 'Error', description: 'Failed to create project', variant: 'destructive' });
      return null;
    }
  }, [user, toast]);

  const updateProject = useCallback(async (id: string, updates: UpdateProjectInput): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('focus_funnel_projects')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      return true;
    } catch (err) {
      console.error('Error updating project:', err);
      toast({ title: 'Error', description: 'Failed to update project', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('focus_funnel_projects')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setProjects(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Project deleted' });
      return true;
    } catch (err) {
      console.error('Error deleting project:', err);
      toast({ title: 'Error', description: 'Failed to delete project', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const archiveProject = useCallback(async (id: string): Promise<boolean> => {
    return updateProject(id, { status: 'archived' });
  }, [updateProject]);

  // ==========================================================================
  // TASK OPERATIONS
  // ==========================================================================

  const createTask = useCallback(async (input: CreateTaskInput): Promise<FocusTask | null> => {
    if (!user) {
      toast({ title: 'Error', description: 'Please sign in to create a task', variant: 'destructive' });
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('focus_funnel_tasks')
        .insert({
          ...input,
          user_id: user.id,
          estimated_minutes: input.estimated_minutes || 60,
          business_impact_score: input.business_impact_score || 5,
          effort_score: input.effort_score || 5,
          urgency_score: input.urgency_score || 5,
          tags: input.tags || [],
          blocks_task_ids: [],
          blocked_by_task_ids: [],
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newTask = data as FocusTask;
      setTasks(prev => [newTask, ...prev]);
      toast({ title: 'Task created', description: `"${newTask.title}" has been added` });
      return newTask;
    } catch (err) {
      console.error('Error creating task:', err);
      toast({ title: 'Error', description: 'Failed to create task', variant: 'destructive' });
      return null;
    }
  }, [user, toast]);

  const updateTask = useCallback(async (id: string, updates: UpdateTaskInput): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('focus_funnel_tasks')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      return true;
    } catch (err) {
      console.error('Error updating task:', err);
      toast({ title: 'Error', description: 'Failed to update task', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('focus_funnel_tasks')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setTasks(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Task deleted' });
      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      toast({ title: 'Error', description: 'Failed to delete task', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const updateTaskStatus = useCallback(async (
    id: string,
    status: TaskStatus,
    actualMinutes?: number
  ): Promise<boolean> => {
    const updates: UpdateTaskInput = { status };
    if (status === 'done') {
      updates.completed_at = new Date().toISOString();
      if (actualMinutes !== undefined) {
        updates.actual_minutes = actualMinutes;
      }
    }
    return updateTask(id, updates);
  }, [updateTask]);

  const deferTask = useCallback(async (id: string, deferTo: string): Promise<boolean> => {
    return updateTask(id, {
      status: 'deferred',
      deferred_to: deferTo,
    });
  }, [updateTask]);

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  const reorderGoals = useCallback(async (goalIds: string[], newOrders: number[]): Promise<boolean> => {
    try {
      const updates = goalIds.map((id, index) => ({
        id,
        display_order: newOrders[index],
      }));

      for (const update of updates) {
        await supabase
          .from('focus_funnel_goals')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      await fetchGoals();
      return true;
    } catch (err) {
      console.error('Error reordering goals:', err);
      return false;
    }
  }, [fetchGoals]);

  const reorderProjects = useCallback(async (projectIds: string[], newOrders: number[]): Promise<boolean> => {
    try {
      const updates = projectIds.map((id, index) => ({
        id,
        display_order: newOrders[index],
      }));

      for (const update of updates) {
        await supabase
          .from('focus_funnel_projects')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      await fetchProjects();
      return true;
    } catch (err) {
      console.error('Error reordering projects:', err);
      return false;
    }
  }, [fetchProjects]);

  const reorderTasks = useCallback(async (taskIds: string[], newOrders: number[]): Promise<boolean> => {
    try {
      const updates = taskIds.map((id, index) => ({
        id,
        display_order: newOrders[index],
      }));

      for (const update of updates) {
        await supabase
          .from('focus_funnel_tasks')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      await fetchTasks();
      return true;
    } catch (err) {
      console.error('Error reordering tasks:', err);
      return false;
    }
  }, [fetchTasks]);

  const moveTaskToProject = useCallback(async (taskId: string, projectId: string | null): Promise<boolean> => {
    return updateTask(taskId, { project_id: projectId || undefined });
  }, [updateTask]);

  const moveProjectToGoal = useCallback(async (projectId: string, goalId: string | null): Promise<boolean> => {
    return updateProject(projectId, { goal_id: goalId || undefined });
  }, [updateProject]);

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const todaysTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(t =>
      t.scheduled_date === today ||
      (!t.scheduled_date && t.status !== 'deferred')
    );
  }, [tasks]);

  const overdueTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(t =>
      t.deadline &&
      t.deadline < today &&
      t.status !== 'done' &&
      t.status !== 'deferred'
    );
  }, [tasks]);

  const highPriorityTasks = useMemo(() => {
    return tasks.filter(t =>
      (t.priority === 'high' || t.priority === 'urgent') &&
      t.status !== 'done'
    );
  }, [tasks]);

  const hierarchy = useMemo((): FocusFunnelHierarchy => {
    const goalsWithProjects = goals.map(goal => ({
      ...goal,
      projects: projects
        .filter(p => p.goal_id === goal.id)
        .map(project => ({
          ...project,
          tasks: tasks.filter(t => t.project_id === project.id),
        })),
      orphanTasks: tasks.filter(t => t.goal_id === goal.id && !t.project_id),
    }));

    const orphanProjects = projects
      .filter(p => !p.goal_id)
      .map(project => ({
        ...project,
        tasks: tasks.filter(t => t.project_id === project.id),
      }));

    const orphanTasks = tasks.filter(t => !t.project_id && !t.goal_id);

    return {
      goals: goalsWithProjects,
      orphanProjects,
      orphanTasks,
    };
  }, [goals, projects, tasks]);

  const stats = useMemo((): FocusFunnelStats => {
    const completedTasksCount = tasks.filter(t => t.status === 'done').length;
    const totalTaskCount = tasks.length + completedTasksCount;

    return {
      totalGoals: goals.length,
      activeGoals: goals.filter(g => g.status === 'active').length,
      completedGoals: goals.filter(g => g.status === 'completed').length,
      totalProjects: projects.length,
      inProgressProjects: projects.filter(p => p.status === 'in_progress').length,
      blockedProjects: projects.filter(p => p.status === 'blocked').length,
      totalTasks: tasks.length,
      todoTasks: tasks.filter(t => t.status === 'todo').length,
      inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
      completedTasks: completedTasksCount,
      overdueTasks: overdueTasks.length,
      tasksToday: todaysTasks.length,
      completionRate: totalTaskCount > 0 ? (completedTasksCount / totalTaskCount) * 100 : 0,
      averageMomentum: 0, // Calculated separately
    };
  }, [goals, projects, tasks, todaysTasks, overdueTasks]);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  useEffect(() => {
    if (user) {
      fetchGoals();
      fetchProjects();
      fetchTasks();
    } else {
      setGoals([]);
      setProjects([]);
      setTasks([]);
    }
  }, [user, fetchGoals, fetchProjects, fetchTasks]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refresh = useCallback(async () => {
    await Promise.all([fetchGoals(), fetchProjects(), fetchTasks()]);
  }, [fetchGoals, fetchProjects, fetchTasks]);

  const isLoading = isGoalsLoading || isProjectsLoading || isTasksLoading;

  return {
    // Data
    goals,
    projects,
    tasks,
    hierarchy,
    stats,

    // Computed
    todaysTasks,
    overdueTasks,
    highPriorityTasks,

    // Loading
    isLoading,
    isGoalsLoading,
    isProjectsLoading,
    isTasksLoading,

    // Error
    error,

    // Goal operations
    createGoal,
    updateGoal,
    deleteGoal,
    archiveGoal,

    // Project operations
    createProject,
    updateProject,
    deleteProject,
    archiveProject,

    // Task operations
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    deferTask,

    // Bulk operations
    reorderGoals,
    reorderProjects,
    reorderTasks,
    moveTaskToProject,
    moveProjectToGoal,

    // Refresh
    refresh,
    refreshGoals: fetchGoals,
    refreshProjects: fetchProjects,
    refreshTasks: fetchTasks,
  };
}
