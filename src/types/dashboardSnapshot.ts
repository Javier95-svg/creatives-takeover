export type DashboardUrgency = 'high' | 'medium' | 'low';

export type DashboardActionKind =
  | 'complete_task'
  | 'reschedule_task'
  | 'snooze_recommendation'
  | 'dismiss_recommendation'
  | 'complete_daily_mission'
  | 'complete_routine_item'
  | 'save_mentor'
  | 'remove_saved_mentor'
  | 'mark_conversation_read'
  | 'create_follow_up_task'
  | 'update_kpi'
  | 'toggle_content_bookmark'
  | 'toggle_funding_bookmark'
  | 'create_task'
  | 'open_tool';

export interface DashboardAction {
  key: string;
  kind: 'task' | 'recommendation' | 'human_reply' | 'journey' | 'metric' | 'workspace';
  toolKey: string;
  entityId: string | null;
  title: string;
  description: string | null;
  urgency: DashboardUrgency;
  reasonCodes: string[];
  estimatedMinutes: number;
  dueAt: string | null;
  actionKind: DashboardActionKind;
}

export interface DashboardTask {
  id: string;
  title: string;
  description: string | null;
  priority: DashboardUrgency;
  dueDate: string;
  deadlineAt: string | null;
  sourceTool: string | null;
  sourceRoute: string | null;
  recommendationKey: string | null;
  completed: boolean;
}

export interface DashboardRoutineItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface DashboardRoutineSummary {
  configured: boolean;
  completed: number;
  total: number;
  items: DashboardRoutineItem[];
}

export interface DashboardMission {
  id: string;
  title: string;
  completed: boolean;
  stage: string;
}

export interface DashboardWeeklyMission {
  id: string;
  title: string;
  progress: number;
  status: string;
  weekEndDate: string;
}

export interface DashboardStage {
  key: string;
  complete: boolean;
  current: boolean;
}

export interface DashboardToolSignal {
  key: string;
  stage: string;
  status: 'done' | 'started' | 'not_started';
}

export interface DashboardMentorSummary {
  saveId: string;
  mentorId: string;
  name: string;
  picture: string | null;
  expertise: string[];
  savedAt: string;
}

export interface DashboardBookingSummary {
  id: string;
  title: string;
  scheduledAt: string;
  status: string;
  meetingUrl: string | null;
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  target?: number;
  unit: string | null;
  trend?: number | null;
  updatedAt: string | null;
}

export interface DashboardArtifact {
  id: string;
  kind: string;
  title: string;
  summary: string | null;
  sourceTool: string;
  sourceId: string;
  updatedAt: string;
}

export interface DashboardActivity {
  id: string;
  type: string;
  sourceTool: string | null;
  entityType: string | null;
  entityId: string | null;
  data: Record<string, unknown> | null;
  occurredAt: string;
}

export interface DashboardRecommendation {
  id: string;
  key: string;
  title: string;
  description: string | null;
  reason: string | null;
  priority: number;
  toolKey: string | null;
  actionUrl: string | null;
  expiresAt: string | null;
}

export interface DashboardSnapshotV1 {
  version: 1;
  generatedAt: string;
  profile: {
    id?: string;
    fullName?: string | null;
    startupName?: string | null;
    stage?: string | null;
    subscriptionTier?: string;
    activationIntent?: string | null;
    onboardingCompleted?: boolean;
  };
  entitlements: { plan: string; dashboardMode: string };
  focus: {
    primaryAction: DashboardAction | null;
    secondaryActions: DashboardAction[];
    dueToday: DashboardTask[];
    overdueCount: number;
    routine: DashboardRoutineSummary;
    dailyMission: DashboardMission | null;
    weeklyMission: DashboardWeeklyMission | null;
  };
  journey: {
    currentStage: string;
    stages: DashboardStage[];
    tools: DashboardToolSignal[];
    progressPercent: number;
  };
  people: {
    unreadMessages: number;
    savedMentors: DashboardMentorSummary[];
    upcomingBookings: DashboardBookingSummary[];
    followUps: DashboardAction[];
    activeCofounderPosts: number;
    availableServices: number;
  };
  business: {
    pmfScore: number | null;
    tractionScore: number | null;
    tractionDelta: number | null;
    demoSignups: number;
    waitlistSignups: number;
    publishedProducts: number;
    revenue: DashboardMetric | null;
    kpis: DashboardMetric[];
    investorActivity: number;
  };
  workspace: {
    recentArtifacts: DashboardArtifact[];
    savedContentCount: number;
    recentActivity: DashboardActivity[];
  };
  recommendations: DashboardRecommendation[];
}

export function isDashboardSnapshotV1(value: unknown): value is DashboardSnapshotV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const snapshot = value as Record<string, unknown>;
  return snapshot.version === 1
    && typeof snapshot.generatedAt === 'string'
    && Boolean(snapshot.focus && typeof snapshot.focus === 'object')
    && Boolean(snapshot.journey && typeof snapshot.journey === 'object')
    && Boolean(snapshot.people && typeof snapshot.people === 'object')
    && Boolean(snapshot.business && typeof snapshot.business === 'object')
    && Boolean(snapshot.workspace && typeof snapshot.workspace === 'object');
}
