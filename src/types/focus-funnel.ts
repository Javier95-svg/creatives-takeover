// Focus Funnel Types
// Goals → Projects → Tasks hierarchy with AI decision partner

// =============================================================================
// GOAL TYPES
// =============================================================================

export type GoalType =
  | 'growth'
  | 'product'
  | 'revenue'
  | 'learning'
  | 'operations'
  | 'marketing'
  | 'fundraising';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';

export interface SuccessCriterion {
  id: string;
  text: string;
  completed: boolean;
}

export interface KeyResult {
  id: string;
  text: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
}

export interface AIContext {
  last_discussion?: string;
  key_decisions?: string[];
  concerns?: string[];
  opportunities?: string[];
}

export interface FocusGoal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  goal_type?: GoalType;
  status: GoalStatus;
  priority: 1 | 2 | 3 | 4 | 5;
  progress_percentage: number;
  target_date?: string;
  started_at?: string;
  completed_at?: string;
  success_criteria: SuccessCriterion[];
  key_results: KeyResult[];
  ai_context: AIContext;
  last_ai_review?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Computed/joined
  projects?: FocusProject[];
  project_count?: number;
  task_count?: number;
}

export type CreateGoalInput = Pick<FocusGoal, 'title'> &
  Partial<Pick<FocusGoal,
    | 'description'
    | 'goal_type'
    | 'priority'
    | 'target_date'
    | 'success_criteria'
    | 'key_results'
  >>;

export type UpdateGoalInput = Partial<Omit<FocusGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

// =============================================================================
// PROJECT TYPES
// =============================================================================

export type ProjectStatus = 'planning' | 'in_progress' | 'blocked' | 'completed' | 'archived';

export interface FocusProject {
  id: string;
  user_id: string;
  goal_id?: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  priority: 1 | 2 | 3 | 4 | 5;
  progress_percentage: number;
  start_date?: string;
  target_date?: string;
  completed_at?: string;
  estimated_hours?: number;
  actual_hours: number;
  blocked_reason?: string;
  blocked_at?: string;
  ai_context: AIContext;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Computed/joined
  goal?: FocusGoal;
  tasks?: FocusTask[];
  task_count?: number;
  completed_task_count?: number;
}

export type CreateProjectInput = Pick<FocusProject, 'title'> &
  Partial<Pick<FocusProject,
    | 'goal_id'
    | 'description'
    | 'priority'
    | 'start_date'
    | 'target_date'
    | 'estimated_hours'
  >>;

export type UpdateProjectInput = Partial<Omit<FocusProject, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

// =============================================================================
// TASK TYPES
// =============================================================================

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'deferred';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface FocusTask {
  id: string;
  user_id: string;
  project_id?: string;
  goal_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  scheduled_date?: string;
  deadline?: string;
  completed_at?: string;
  deferred_to?: string;
  estimated_minutes: number;
  actual_minutes?: number;
  // AI scoring
  business_impact_score: number;
  effort_score: number;
  urgency_score: number;
  computed_priority_score: number;
  // Dependencies
  blocks_task_ids: string[];
  blocked_by_task_ids: string[];
  // Metadata
  tags: string[];
  notes?: string;
  ai_generated: boolean;
  ai_rationale?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Computed/joined
  project?: FocusProject;
  goal?: FocusGoal;
}

export type CreateTaskInput = Pick<FocusTask, 'title'> &
  Partial<Pick<FocusTask,
    | 'project_id'
    | 'goal_id'
    | 'description'
    | 'priority'
    | 'scheduled_date'
    | 'deadline'
    | 'estimated_minutes'
    | 'tags'
    | 'notes'
    | 'business_impact_score'
    | 'effort_score'
    | 'urgency_score'
  >>;

export type UpdateTaskInput = Partial<Omit<FocusTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'computed_priority_score'>>;

// =============================================================================
// AI THINKING SESSION TYPES
// =============================================================================

export type AISessionContextType = 'goal' | 'project' | 'task' | 'prioritization' | 'general' | 'momentum';
export type AISessionMode = 'thinking' | 'drafting' | 'reflecting' | 'deciding' | 'analyzing';
export type AISessionStatus = 'active' | 'completed' | 'archived';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    quickActions?: QuickAction[];
    suggestions?: string[];
    decisions?: Decision[];
  };
}

export interface Decision {
  id: string;
  decision: string;
  rationale: string;
  timestamp: string;
  applied: boolean;
}

export interface Insight {
  id: string;
  type: 'pattern' | 'suggestion' | 'warning' | 'opportunity';
  content: string;
  relevance: number; // 0-1
  timestamp: string;
}

export interface QuickAction {
  id: string;
  text: string;
  action?: string;
}

export interface AIThinkingSession {
  id: string;
  user_id: string;
  context_type: AISessionContextType;
  context_id?: string;
  session_title?: string;
  session_mode: AISessionMode;
  messages: AIMessage[];
  decisions_made: Decision[];
  insights: Insight[];
  status: AISessionStatus;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export type CreateAISessionInput = Pick<AIThinkingSession, 'context_type'> &
  Partial<Pick<AIThinkingSession, 'context_id' | 'session_title' | 'session_mode'>>;

// =============================================================================
// MOMENTUM ANALYSIS TYPES
// =============================================================================

export type MomentumPeriodType = 'daily' | 'weekly' | 'monthly';

export type TimeLeakCategory =
  | 'context_switching'
  | 'overplanning'
  | 'scope_creep'
  | 'distractions'
  | 'unclear_priorities'
  | 'blockers'
  | 'meetings'
  | 'procrastination';

export interface TimeLeak {
  id: string;
  category: TimeLeakCategory;
  minutes_lost: number;
  pattern: string;
  suggestion: string;
}

export interface MomentumPatterns {
  peak_productivity_hours: number[];
  common_blockers: string[];
  strength_areas: string[];
  improvement_areas: string[];
  recurring_distractions?: string[];
  best_focus_days?: string[];
}

export interface MomentumAnalysis {
  id: string;
  user_id: string;
  analysis_date: string;
  period_type: MomentumPeriodType;
  momentum_score: number; // 0-100
  focus_time_minutes: number;
  distraction_time_minutes: number;
  tasks_planned: number;
  tasks_completed: number;
  tasks_deferred: number;
  tasks_overdue: number;
  time_leaks: TimeLeak[];
  patterns: MomentumPatterns;
  ai_recommendations: string[];
  reviewed: boolean;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

export type FocusFunnelViewMode = 'tree' | 'kanban' | 'list' | 'calendar';

export interface FocusFunnelFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  goalId?: string;
  projectId?: string;
  tags?: string[];
  scheduledDate?: string;
  hasDeadline?: boolean;
  isOverdue?: boolean;
}

export interface FocusFunnelSortOption {
  field: 'priority' | 'deadline' | 'created_at' | 'display_order' | 'computed_priority_score';
  direction: 'asc' | 'desc';
}

// =============================================================================
// HIERARCHY TYPES (for tree view)
// =============================================================================

export interface FocusFunnelHierarchy {
  goals: (FocusGoal & {
    projects: (FocusProject & {
      tasks: FocusTask[];
    })[];
    orphanTasks: FocusTask[]; // Tasks with goal_id but no project_id
  })[];
  orphanProjects: (FocusProject & {
    tasks: FocusTask[];
  })[]; // Projects with no goal
  orphanTasks: FocusTask[]; // Tasks with no project or goal
}

// =============================================================================
// STATS TYPES
// =============================================================================

export interface FocusFunnelStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalProjects: number;
  inProgressProjects: number;
  blockedProjects: number;
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksToday: number;
  completionRate: number; // 0-100
  averageMomentum: number; // 0-100
}
