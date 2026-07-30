import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, MousePointerClick, Clock, Eye, LogOut, Sparkles, Target } from "lucide-react";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { safe } from "@/integrations/supabase/safe";
import {
  useAnalyticsOverview,
  usePageViewsOverTime,
  useTopPages,
  useCTAPerformance,
  useScrollDepthStats,
  useRealTimeActivity,
  useReferrerStats,
} from "@/hooks/usePageAnalyticsData";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface RetentionExperimentSummary {
  cohortUsers: number;
  controlUsers: number;
  forcedGateUsers: number;
  controlOnboardingCompleted: number;
  forcedGateOnboardingCompleted: number;
  controlFirstArtifacts: number;
  forcedGateFirstArtifacts: number;
  controlDashboardContinue: number;
  forcedGateDashboardContinue: number;
  controlArtifactResumed: number;
  forcedGateArtifactResumed: number;
  activationIntents: Array<{ intent: string; users: number }>;
  artifactTypes: Array<{ type: string; users: number }>;
}

interface MessagePerformanceMetric {
  event_name: string;
  samples: number;
  average_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
}

interface OnboardingOutcomeSummary {
  eligibleSignups: number;
  startedUsers: number;
  completedUsers: number;
  completionRate: number | null;
  medianCompletionSeconds: number | null;
  p75CompletionSeconds: number | null;
  destinationWithin2Minutes: number;
  inputWithin10Minutes: number;
  artifactWithin30Minutes: number;
  artifactWithin24Hours: number;
  maturedD1Users: number;
  returnedD1: number;
  maturedD7Users: number;
  returnedD7: number;
  helpfulFeedbackUsers: number;
  missionCompletedUsers: number;
  taskCompletedUsers: number;
  completeContextUsers: number;
}

interface OnboardingOutcomeReport {
  summary: OnboardingOutcomeSummary;
  byVariant: Array<{
    variant: string;
    users: number;
    completed: number;
    artifact24h: number;
    maturedD7: number;
    returnedD7: number;
  }>;
  breakdowns: Record<string, Array<{ key: string; users: number }>>;
}

interface FounderStageAccuracyReport {
  from: string;
  to: string;
  summary: {
    labeledUsers: number;
    exactMatches: number;
    adjacentMatches: number;
    overstaged: number;
    understaged: number;
    exactRate: number;
    adjacentRate: number;
  };
  confidenceBands: Array<{
    confidenceBand: 'low' | 'medium' | 'high';
    labeled: number;
    exact: number;
    exactRate: number;
  }>;
  confusionMatrix: Array<{
    assignedStage: number;
    confirmedStage: number;
    users: number;
  }>;
}

interface RecommendationLearningReport {
  summary: {
    uniqueUsers: number;
    exposures: number;
    opened: number;
    completed: number;
    artifacts: number;
    helpful: number;
    negative: number;
    maturedD7: number;
    returnedD7: number;
  };
  assignments: Array<{
    assignment: string;
    exposures: number;
    artifacts: number;
    negative: number;
  }>;
  eligibleSegments: number;
  activeSuppressions: number;
  config: {
    status: 'collecting' | 'active' | 'paused';
    active_policy_version: string;
    holdout_percent: number;
    exploration_percent: number;
  } | null;
  latestEvaluation: {
    recommendation: 'collect' | 'activate' | 'continue' | 'pause';
    relative_artifact_lift: number | null;
    reason_codes: string[];
  } | null;
  familyHealth: Array<{
    recommendation_family: string;
    current_exposures: number;
    current_unique_users: number;
    current_average_reward: number;
    current_negative_rate: number;
    reward_drift: number | null;
    status: 'healthy' | 'watch' | 'critical' | 'insufficient';
  }>;
  openAlerts: Array<{
    id: string;
    recommendation_family: string | null;
    alert_type: string;
    severity: 'warning' | 'critical';
    reason_codes: string[];
  }>;
  latestReplay: {
    decisions: number;
    replay_coverage: number;
    policy_agreement: number;
    inverse_propensity_reward: number;
    guardrail_passed: boolean;
  } | null;
  maturationBacklog: number;
}

const AdminAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [dateRange, setDateRange] = useState("7");
  interface ActivityEvent {
    id: string;
    user_id?: string;
    event: string;
    properties?: Record<string, unknown>;
    created_at: string;
  }
  
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [onboardingFunnel, setOnboardingFunnel] = useState({
    signupStarted: 0,
    signupCompleted: 0,
    onboardingStarted: 0,
    onboardingCompleted: 0,
    firstActionOpened: 0,
    firstInputSubmitted: 0,
    firstOutputGenerated: 0,
    firstArtifactSaved: 0,
    activationCompleted: 0,
  });
  const [retentionExperiment, setRetentionExperiment] = useState<RetentionExperimentSummary>({
    cohortUsers: 0,
    controlUsers: 0,
    forcedGateUsers: 0,
    controlOnboardingCompleted: 0,
    forcedGateOnboardingCompleted: 0,
    controlFirstArtifacts: 0,
    forcedGateFirstArtifacts: 0,
    controlDashboardContinue: 0,
    forcedGateDashboardContinue: 0,
    controlArtifactResumed: 0,
    forcedGateArtifactResumed: 0,
    activationIntents: [],
    artifactTypes: [],
  });
  const [messagePerformance, setMessagePerformance] = useState<MessagePerformanceMetric[]>([]);
  const [onboardingOutcomes, setOnboardingOutcomes] = useState<OnboardingOutcomeReport | null>(null);
  const [stageAccuracy, setStageAccuracy] = useState<FounderStageAccuracyReport | null>(null);
  const [recommendationLearning, setRecommendationLearning] = useState<RecommendationLearningReport | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    void supabase.rpc('get_message_performance_summary_v1', { p_days: Number(dateRange) }).then(({ data, error }) => {
      if (error || !data || typeof data !== 'object') return;
      const events = (data as Record<string, unknown>).events;
      setMessagePerformance(Array.isArray(events) ? events as MessagePerformanceMetric[] : []);
    });
  }, [dateRange, isAdmin]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error || data?.role !== "admin") {
        navigate("/");
        return;
      }

      setIsAdmin(true);
    };

    void checkAdmin();
  }, [user, navigate]);

  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, parseInt(dateRange)));

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(startDate, endDate);
  const { data: pageViewsData } = usePageViewsOverTime(startDate, endDate);
  const { data: topPages } = useTopPages(startDate, endDate);
  const { data: ctaPerformance } = useCTAPerformance(startDate, endDate);
  const { data: scrollDepth } = useScrollDepthStats(startDate, endDate);
  const { data: realTimeActivity } = useRealTimeActivity();
  const { data: referrerStats } = useReferrerStats(startDate, endDate);

  useEffect(() => {
    void (async () => {
      const { data } = await safe.select(async () =>
        await supabase
          .from('activity_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)
      );
      setActivityEvents((data as ActivityEvent[]) || []);
    })();
  }, [dateRange]);

  useEffect(() => {
    void (async () => {
      const fromIso = startDate.toISOString();
      const toIso = endDate.toISOString();

      const [
        signupStartedResult,
        signupCompletedResult,
        onboardingStartedResult,
        onboardingCompletedResult,
        firstActionOpenedResult,
        firstInputSubmittedResult,
        firstOutputGeneratedResult,
        firstArtifactSavedResult,
        activationCompletedResult,
        activationV2Result,
        onboardingOutcomesResult,
        stageAccuracyResult,
        recommendationLearningResult,
      ] = await Promise.all([
        supabase
          .from('conversion_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'signup_started')
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
        supabase
          .from('conversion_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'signup_completed')
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
        supabase
          .from('activity_events')
          .select('id', { count: 'exact', head: true })
          .eq('event', 'onboarding_started')
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
        supabase
          .from('activity_events')
          .select('id', { count: 'exact', head: true })
          .eq('event', 'onboarding_completed')
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
        supabase
          .from('user_activity_log')
          .select('id', { count: 'exact', head: true })
          .eq('activity_type', 'activation_first_action_opened')
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
        supabase
          .from('user_activity_log')
          .select('id', { count: 'exact', head: true })
          .eq('activity_type', 'activation_first_input_submitted')
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
        supabase
          .from('user_activity_log')
          .select('id', { count: 'exact', head: true })
          .eq('activity_type', 'activation_first_output_generated')
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
        supabase
          .from('user_activity_log')
          .select('id', { count: 'exact', head: true })
          .eq('activity_type', 'activation_first_artifact_saved')
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
        supabase
          .from('user_activity_log')
          .select('id', { count: 'exact', head: true })
          .eq('activity_type', 'activation_completed')
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
        supabase.rpc('get_activation_funnel_v2', { p_from: fromIso, p_to: toIso }),
        supabase.rpc('get_onboarding_dashboard_outcomes_v1' as never, { p_from: fromIso, p_to: toIso } as never),
        supabase.rpc('get_founder_stage_accuracy_v1' as never, { p_from: fromIso, p_to: toIso } as never),
        supabase.rpc('get_recommendation_learning_report_v2' as never, { p_from: fromIso, p_to: toIso } as never),
      ]);

      const outcomeReport = onboardingOutcomesResult.data && typeof onboardingOutcomesResult.data === 'object'
        ? onboardingOutcomesResult.data as OnboardingOutcomeReport
        : null;
      setOnboardingOutcomes(outcomeReport);
      setStageAccuracy(
        stageAccuracyResult.data && typeof stageAccuracyResult.data === 'object'
          ? stageAccuracyResult.data as unknown as FounderStageAccuracyReport
          : null,
      );
      setRecommendationLearning(
        recommendationLearningResult.data && typeof recommendationLearningResult.data === 'object'
          ? recommendationLearningResult.data as unknown as RecommendationLearningReport
          : null,
      );

      const activationV2 = activationV2Result.data && typeof activationV2Result.data === 'object'
        ? activationV2Result.data as Record<string, unknown>
        : null;
      const count = (key: string, fallback: number) => typeof activationV2?.[key] === 'number' ? activationV2[key] as number : fallback;

      setOnboardingFunnel({
        signupStarted: signupStartedResult.count ?? 0,
        signupCompleted: signupCompletedResult.count ?? 0,
        onboardingStarted: outcomeReport?.summary.startedUsers ?? onboardingStartedResult.count ?? 0,
        onboardingCompleted: outcomeReport?.summary.completedUsers ?? count('cohortJourneys', onboardingCompletedResult.count ?? 0),
        firstActionOpened: outcomeReport?.summary.destinationWithin2Minutes ?? count('destinationViewed', firstActionOpenedResult.count ?? 0),
        firstInputSubmitted: outcomeReport?.summary.inputWithin10Minutes ?? count('firstInputWithin10Minutes', firstInputSubmittedResult.count ?? 0),
        firstOutputGenerated: count('firstOutputGenerated', firstOutputGeneratedResult.count ?? 0),
        firstArtifactSaved: outcomeReport?.summary.artifactWithin30Minutes ?? count('artifactWithin30Minutes', firstArtifactSavedResult.count ?? 0),
        activationCompleted: outcomeReport?.summary.artifactWithin24Hours ?? count('artifactWithin24Hours', activationCompletedResult.count ?? 0),
      });
    })();
  }, [endDate, startDate]);

  useEffect(() => {
    void (async () => {
      const fromIso = startDate.toISOString();
      const toIso = endDate.toISOString();

      const { data: profiles } = await safe.select(async () =>
        await supabase
          .from('profiles')
          .select('id, created_at, onboarding_completed, user_preferences')
          .gte('created_at', fromIso)
          .lte('created_at', toIso)
      );

      const cohortProfiles = ((profiles as Array<{
        id: string;
        onboarding_completed?: boolean | null;
        user_preferences?: Record<string, unknown> | null;
      }> | null) ?? []).filter((profile) => {
        const preferences = profile.user_preferences ?? {};
        return preferences.activationGateVariant === 'control' || preferences.activationGateVariant === 'forced_gate';
      });

      const cohortIds = cohortProfiles.map((profile) => profile.id);
      const variantByUserId = new Map(
        cohortProfiles.map((profile) => [
          profile.id,
          (profile.user_preferences?.activationGateVariant as 'control' | 'forced_gate') ?? 'control',
        ]),
      );

      const activationIntentCounts = new Map<string, number>();
      const artifactTypeCounts = new Map<string, number>();

      let controlUsers = 0;
      let forcedGateUsers = 0;
      let controlOnboardingCompleted = 0;
      let forcedGateOnboardingCompleted = 0;
      let controlFirstArtifacts = 0;
      let forcedGateFirstArtifacts = 0;

      cohortProfiles.forEach((profile) => {
        const preferences = profile.user_preferences ?? {};
        const variant = preferences.activationGateVariant === 'forced_gate' ? 'forced_gate' : 'control';
        const activationIntent = typeof preferences.activationIntent === 'string' ? preferences.activationIntent : null;
        const firstArtifactType = typeof preferences.firstArtifactType === 'string' ? preferences.firstArtifactType : null;

        if (variant === 'forced_gate') {
          forcedGateUsers += 1;
          if (profile.onboarding_completed === true) {
            forcedGateOnboardingCompleted += 1;
          }
          if (firstArtifactType) {
            forcedGateFirstArtifacts += 1;
          }
        } else {
          controlUsers += 1;
          if (profile.onboarding_completed === true) {
            controlOnboardingCompleted += 1;
          }
          if (firstArtifactType) {
            controlFirstArtifacts += 1;
          }
        }

        if (activationIntent) {
          activationIntentCounts.set(activationIntent, (activationIntentCounts.get(activationIntent) ?? 0) + 1);
        }

        if (firstArtifactType) {
          artifactTypeCounts.set(firstArtifactType, (artifactTypeCounts.get(firstArtifactType) ?? 0) + 1);
        }
      });

      let controlDashboardContinue = 0;
      let forcedGateDashboardContinue = 0;
      let controlArtifactResumed = 0;
      let forcedGateArtifactResumed = 0;

      if (cohortIds.length > 0) {
        const { data: retentionEvents } = await safe.select(async () =>
          await supabase
            .from('user_activity_log')
            .select('user_id, activity_type')
            .in('user_id', cohortIds)
            .in('activity_type', ['dashboard_continue_clicked', 'artifact_resumed'])
            .gte('created_at', fromIso)
            .lte('created_at', toIso)
        );

        const continueUsers = new Set<string>();
        const resumedUsers = new Set<string>();

        ((retentionEvents as Array<{ user_id: string; activity_type: string }> | null) ?? []).forEach((event) => {
          const key = `${event.activity_type}:${event.user_id}`;
          if (event.activity_type === 'dashboard_continue_clicked') {
            continueUsers.add(key);
          }
          if (event.activity_type === 'artifact_resumed') {
            resumedUsers.add(key);
          }
        });

        continueUsers.forEach((key) => {
          const userId = key.split(':')[1];
          const variant = variantByUserId.get(userId);
          if (variant === 'forced_gate') {
            forcedGateDashboardContinue += 1;
          } else if (variant === 'control') {
            controlDashboardContinue += 1;
          }
        });

        resumedUsers.forEach((key) => {
          const userId = key.split(':')[1];
          const variant = variantByUserId.get(userId);
          if (variant === 'forced_gate') {
            forcedGateArtifactResumed += 1;
          } else if (variant === 'control') {
            controlArtifactResumed += 1;
          }
        });
      }

      setRetentionExperiment({
        cohortUsers: cohortProfiles.length,
        controlUsers,
        forcedGateUsers,
        controlOnboardingCompleted,
        forcedGateOnboardingCompleted,
        controlFirstArtifacts,
        forcedGateFirstArtifacts,
        controlDashboardContinue,
        forcedGateDashboardContinue,
        controlArtifactResumed,
        forcedGateArtifactResumed,
        activationIntents: Array.from(activationIntentCounts.entries())
          .map(([intent, users]) => ({ intent, users }))
          .sort((a, b) => b.users - a.users),
        artifactTypes: Array.from(artifactTypeCounts.entries())
          .map(([type, users]) => ({ type, users }))
          .sort((a, b) => b.users - a.users),
      });
    })();
  }, [endDate, startDate]);

  const safePercent = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);
  const experimentRateCards = [
    {
      title: 'Onboarding Completion',
      control: safePercent(retentionExperiment.controlOnboardingCompleted, retentionExperiment.controlUsers),
      forced: safePercent(retentionExperiment.forcedGateOnboardingCompleted, retentionExperiment.forcedGateUsers),
    },
    {
      title: 'First Artifact Conversion',
      control: safePercent(retentionExperiment.controlFirstArtifacts, retentionExperiment.controlUsers),
      forced: safePercent(retentionExperiment.forcedGateFirstArtifacts, retentionExperiment.forcedGateUsers),
    },
    {
      title: 'Dashboard Continue Click',
      control: safePercent(retentionExperiment.controlDashboardContinue, retentionExperiment.controlUsers),
      forced: safePercent(retentionExperiment.forcedGateDashboardContinue, retentionExperiment.forcedGateUsers),
    },
    {
      title: 'Artifact Resume',
      control: safePercent(retentionExperiment.controlArtifactResumed, retentionExperiment.controlUsers),
      forced: safePercent(retentionExperiment.forcedGateArtifactResumed, retentionExperiment.forcedGateUsers),
    },
  ];
  const experimentRateChart = experimentRateCards.map((card) => ({
    metric: card.title,
    control: card.control,
    forcedGate: card.forced,
  }));

  if (!user || isAdmin === null || overviewLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
      </Helmet>
      <Navigation />
      <div className="min-h-screen bg-background pt-header-offset pb-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
              <p className="text-muted-foreground">Track user behavior and engagement metrics</p>
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalPageViews || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {overview?.uniqueVisitors || 0} unique visitors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Time on Site</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.avgTimeOnPage || 0}s</div>
                <p className="text-xs text-muted-foreground">Per session</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top CTA</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate">{overview?.topCTA || 'N/A'}</div>
                <p className="text-xs text-muted-foreground">
                  {overview?.totalClicks || 0} total clicks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.bounceRate || 0}%</div>
                <p className="text-xs text-muted-foreground">Exit intent rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different views */}
          <Tabs defaultValue="overview" className="space-y-6">
	            <TabsList>
	              <TabsTrigger value="overview">Overview</TabsTrigger>
	              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
                <TabsTrigger value="retention">Retention</TabsTrigger>
	              <TabsTrigger value="pages">Pages</TabsTrigger>
	              <TabsTrigger value="ctas">CTAs</TabsTrigger>
	              <TabsTrigger value="engagement">Engagement</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="realtime">Real-Time</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

	            {/* Overview Tab */}
	            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Page Views Over Time</CardTitle>
                    <CardDescription>Daily page view trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={pageViewsData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Traffic Sources</CardTitle>
                    <CardDescription>Where visitors come from</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={referrerStats || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => entry.name}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {(referrerStats || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Pages</CardTitle>
                  <CardDescription>Most visited pages</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topPages || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="page" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="views" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
	            </TabsContent>

	            <TabsContent value="onboarding" className="space-y-6">
                {onboardingOutcomes ? (
                  <>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                      {[
                        {
                          label: 'Eligible signup cohort',
                          value: onboardingOutcomes.summary.eligibleSignups,
                          detail: 'Unique users eligible in this date window',
                        },
                        {
                          label: 'Onboarding completion',
                          value: `${onboardingOutcomes.summary.completionRate ?? 0}%`,
                          detail: `${onboardingOutcomes.summary.completedUsers}/${onboardingOutcomes.summary.startedUsers} unique starters`,
                        },
                        {
                          label: 'First artifact in 24h',
                          value: `${safePercent(onboardingOutcomes.summary.artifactWithin24Hours, onboardingOutcomes.summary.completedUsers)}%`,
                          detail: `${onboardingOutcomes.summary.artifactWithin24Hours}/${onboardingOutcomes.summary.completedUsers} completed users`,
                        },
                        {
                          label: 'D7 Command Center return',
                          value: `${safePercent(onboardingOutcomes.summary.returnedD7, onboardingOutcomes.summary.maturedD7Users)}%`,
                          detail: `${onboardingOutcomes.summary.returnedD7}/${onboardingOutcomes.summary.maturedD7Users} matured users`,
                        },
                        {
                          label: 'Completion duration',
                          value: `${Math.round(onboardingOutcomes.summary.medianCompletionSeconds ?? 0)}s`,
                          detail: `Median · p75 ${Math.round(onboardingOutcomes.summary.p75CompletionSeconds ?? 0)}s`,
                        },
                        {
                          label: 'D1 Command Center return',
                          value: `${safePercent(onboardingOutcomes.summary.returnedD1, onboardingOutcomes.summary.maturedD1Users)}%`,
                          detail: `${onboardingOutcomes.summary.returnedD1}/${onboardingOutcomes.summary.maturedD1Users} matured users`,
                        },
                        {
                          label: 'Context completeness',
                          value: `${safePercent(onboardingOutcomes.summary.completeContextUsers, onboardingOutcomes.summary.completedUsers)}%`,
                          detail: `${onboardingOutcomes.summary.completeContextUsers}/${onboardingOutcomes.summary.completedUsers} completed users`,
                        },
                        {
                          label: 'Helpful recommendations',
                          value: `${safePercent(onboardingOutcomes.summary.helpfulFeedbackUsers, onboardingOutcomes.summary.completedUsers)}%`,
                          detail: `${onboardingOutcomes.summary.helpfulFeedbackUsers}/${onboardingOutcomes.summary.completedUsers} completed users`,
                        },
                        {
                          label: 'Mission completion ≤7d',
                          value: `${safePercent(onboardingOutcomes.summary.missionCompletedUsers, onboardingOutcomes.summary.completedUsers)}%`,
                          detail: `${onboardingOutcomes.summary.missionCompletedUsers}/${onboardingOutcomes.summary.completedUsers} completed users`,
                        },
                        {
                          label: 'Task completion ≤7d',
                          value: `${safePercent(onboardingOutcomes.summary.taskCompletedUsers, onboardingOutcomes.summary.completedUsers)}%`,
                          detail: `${onboardingOutcomes.summary.taskCompletedUsers}/${onboardingOutcomes.summary.completedUsers} completed users`,
                        },
                      ].map((metric) => (
                        <Card key={metric.label}>
                          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{metric.label}</CardTitle></CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{metric.value}</div>
                            <p className="text-xs text-muted-foreground">{metric.detail}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle>Activation timing</CardTitle>
                          <CardDescription>Unique completed users; the denominator is {onboardingOutcomes.summary.completedUsers}.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader><TableRow><TableHead>Milestone</TableHead><TableHead className="text-right">Users</TableHead><TableHead className="text-right">Rate</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {[
                                ['Destination viewed ≤2m', onboardingOutcomes.summary.destinationWithin2Minutes],
                                ['First input ≤10m', onboardingOutcomes.summary.inputWithin10Minutes],
                                ['First artifact ≤30m', onboardingOutcomes.summary.artifactWithin30Minutes],
                                ['First artifact ≤24h', onboardingOutcomes.summary.artifactWithin24Hours],
                              ].map(([label, users]) => (
                                <TableRow key={String(label)}>
                                  <TableCell>{label}</TableCell>
                                  <TableCell className="text-right">{users}</TableCell>
                                  <TableCell className="text-right">{safePercent(Number(users), onboardingOutcomes.summary.completedUsers)}%</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>Server-persisted rollout</CardTitle>
                          <CardDescription>Unique users by immutable onboarding variant.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader><TableRow><TableHead>Variant</TableHead><TableHead className="text-right">Started</TableHead><TableHead className="text-right">Completed</TableHead><TableHead className="text-right">Artifact 24h</TableHead><TableHead className="text-right">D7</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {onboardingOutcomes.byVariant.map((variant) => (
                                <TableRow key={variant.variant}>
                                  <TableCell className="font-medium">{variant.variant}</TableCell>
                                  <TableCell className="text-right">{variant.users}</TableCell>
                                  <TableCell className="text-right">{variant.completed}</TableCell>
                                  <TableCell className="text-right">{variant.artifact24h}</TableCell>
                                  <TableCell className="text-right">{variant.returnedD7}/{variant.maturedD7}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Cohort composition</CardTitle>
                        <CardDescription>Unique completed users broken down by the structured fields used for personalization. No briefs, country, names, or free text are included.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {Object.entries(onboardingOutcomes.breakdowns).map(([dimension, rows]) => (
                          <div key={dimension}>
                            <p className="mb-2 text-sm font-semibold capitalize">{dimension.replaceAll('_', ' ')}</p>
                            <div className="space-y-1.5">
                              {rows.map((row) => (
                                <div key={row.key} className="flex justify-between gap-3 text-xs">
                                  <span className="truncate text-muted-foreground">{row.key}</span>
                                  <span className="font-medium">{row.users}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </>
                ) : null}
                {stageAccuracy ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Founder stage calibration</CardTitle>
                      <CardDescription>
                        Compares the evidence model&apos;s assignment with structured founder confirmations and corrections. Fundraising is excluded from operating-stage accuracy.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          {
                            label: 'Labeled founders',
                            value: stageAccuracy.summary.labeledUsers,
                            detail: 'Confirmed, corrected, or boundary-resolved',
                          },
                          {
                            label: 'Exact accuracy',
                            value: `${stageAccuracy.summary.exactRate}%`,
                            detail: `${stageAccuracy.summary.exactMatches}/${stageAccuracy.summary.labeledUsers} labeled founders`,
                          },
                          {
                            label: 'Within one stage',
                            value: `${stageAccuracy.summary.adjacentRate}%`,
                            detail: `${stageAccuracy.summary.adjacentMatches}/${stageAccuracy.summary.labeledUsers} labeled founders`,
                          },
                          {
                            label: 'Direction of error',
                            value: `${stageAccuracy.summary.overstaged} / ${stageAccuracy.summary.understaged}`,
                            detail: 'Overstaged / understaged',
                          },
                        ].map((metric) => (
                          <div key={metric.label} className="rounded-xl border border-border p-4">
                            <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                            <p className="mt-1 text-2xl font-bold">{metric.value}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                          </div>
                        ))}
                      </div>

                      {stageAccuracy.summary.labeledUsers > 0 ? (
                        <div className="grid gap-6 lg:grid-cols-2">
                          <div>
                            <p className="mb-3 text-sm font-semibold">Accuracy by confidence band</p>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Band</TableHead>
                                  <TableHead className="text-right">Labeled</TableHead>
                                  <TableHead className="text-right">Exact</TableHead>
                                  <TableHead className="text-right">Rate</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {stageAccuracy.confidenceBands.map((band) => (
                                  <TableRow key={band.confidenceBand}>
                                    <TableCell className="capitalize">{band.confidenceBand}</TableCell>
                                    <TableCell className="text-right">{band.labeled}</TableCell>
                                    <TableCell className="text-right">{band.exact}</TableCell>
                                    <TableCell className="text-right">{band.exactRate}%</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div>
                            <p className="mb-3 text-sm font-semibold">Observed assignment corrections</p>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Assigned</TableHead>
                                  <TableHead>Confirmed</TableHead>
                                  <TableHead className="text-right">Founders</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {stageAccuracy.confusionMatrix.map((cell) => (
                                  <TableRow key={`${cell.assignedStage}-${cell.confirmedStage}`}>
                                    <TableCell>Stage {cell.assignedStage}</TableCell>
                                    <TableCell>Stage {cell.confirmedStage}</TableCell>
                                    <TableCell className="text-right">{cell.users}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Calibration will appear after founders confirm or correct their dashboard stage.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
                {recommendationLearning ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Collective recommendation learning</CardTitle>
                      <CardDescription>
                        Privacy-safe recommendation outcomes, policy guardrails, and learned segment coverage. Free-form onboarding answers are never included.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          {
                            label: 'Users exposed',
                            value: recommendationLearning.summary.uniqueUsers,
                            detail: `${recommendationLearning.summary.exposures} idempotent decisions`,
                          },
                          {
                            label: 'Artifact outcomes',
                            value: recommendationLearning.summary.artifacts,
                            detail: `${recommendationLearning.summary.completed} recommendations completed`,
                          },
                          {
                            label: 'D7 returns',
                            value: `${recommendationLearning.summary.returnedD7}/${recommendationLearning.summary.maturedD7}`,
                            detail: 'Only fully matured 144–192h windows',
                          },
                          {
                            label: 'Learning state',
                            value: recommendationLearning.config?.status ?? 'unavailable',
                            detail: `${recommendationLearning.eligibleSegments} eligible segments · ${recommendationLearning.activeSuppressions} active suppressions`,
                          },
                        ].map((metric) => (
                          <div key={metric.label} className="rounded-xl border border-border p-4">
                            <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                            <p className="mt-1 text-2xl font-bold capitalize">{metric.value}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-6 lg:grid-cols-2">
                        <div>
                          <p className="mb-3 text-sm font-semibold">Policy assignments</p>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Assignment</TableHead>
                                <TableHead className="text-right">Exposures</TableHead>
                                <TableHead className="text-right">Artifacts</TableHead>
                                <TableHead className="text-right">Negative</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {recommendationLearning.assignments.map((assignment) => (
                                <TableRow key={assignment.assignment}>
                                  <TableCell className="capitalize">{assignment.assignment}</TableCell>
                                  <TableCell className="text-right">{assignment.exposures}</TableCell>
                                  <TableCell className="text-right">{assignment.artifacts}</TableCell>
                                  <TableCell className="text-right">{assignment.negative}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="rounded-xl border border-border p-4">
                          <p className="text-sm font-semibold">Latest policy evaluation</p>
                          <p className="mt-2 text-2xl font-bold capitalize">
                            {recommendationLearning.latestEvaluation?.recommendation ?? 'Collecting'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Policy {recommendationLearning.config?.active_policy_version ?? 'collective_bayesian_v2'} ·{' '}
                            {recommendationLearning.config?.holdout_percent ?? 10}% permanent control ·{' '}
                            {recommendationLearning.config?.exploration_percent ?? 5}% capped exploration
                          </p>
                          {recommendationLearning.latestEvaluation?.reason_codes?.length ? (
                            <p className="mt-3 text-xs text-muted-foreground">
                              {recommendationLearning.latestEvaluation.reason_codes.join(', ').replaceAll('_', ' ')}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-xl border border-border p-4">
                          <p className="text-sm font-semibold">Offline replay and delayed outcomes</p>
                          <p className="mt-2 text-2xl font-bold">
                            {recommendationLearning.latestReplay
                              ? `${Math.round(recommendationLearning.latestReplay.replay_coverage * 100)}% coverage`
                              : 'Collecting'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {recommendationLearning.latestReplay
                              ? `${recommendationLearning.latestReplay.decisions} matured decisions · ${Math.round(recommendationLearning.latestReplay.policy_agreement * 100)}% policy agreement · guardrail ${recommendationLearning.latestReplay.guardrail_passed ? 'passed' : 'held'}`
                              : 'Replay begins after the first matured recommendation cohort.'}
                          </p>
                          <p className="mt-3 text-xs text-muted-foreground">
                            {recommendationLearning.maturationBacklog ?? 0} delayed outcome windows awaiting processing
                          </p>
                        </div>
                        <div className="rounded-xl border border-border p-4">
                          <p className="text-sm font-semibold">Quality and drift</p>
                          <p className="mt-2 text-2xl font-bold">
                            {recommendationLearning.openAlerts?.length ?? 0} open alerts
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {(recommendationLearning.familyHealth ?? []).filter((family) => family.status === 'healthy').length} healthy families ·{' '}
                            {(recommendationLearning.familyHealth ?? []).filter((family) => family.status === 'watch').length} watched ·{' '}
                            {(recommendationLearning.familyHealth ?? []).filter((family) => family.status === 'critical').length} critical
                          </p>
                          {recommendationLearning.openAlerts?.length ? (
                            <div className="mt-3 space-y-1">
                              {recommendationLearning.openAlerts.slice(0, 3).map((alert) => (
                                <p key={alert.id} className="text-xs text-muted-foreground">
                                  <span className="font-medium capitalize text-foreground">{alert.severity}</span>
                                  {' · '}
                                  {(alert.recommendation_family ?? 'learning pipeline').replaceAll('_', ' ')}
                                  {' · '}
                                  {alert.reason_codes.join(', ').replaceAll('_', ' ')}
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
	              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
	                <Card>
	                  <CardHeader>
	                    <CardTitle className="text-sm font-medium">Signup Started</CardTitle>
	                  </CardHeader>
	                  <CardContent>
	                    <div className="text-2xl font-bold">{onboardingFunnel.signupStarted}</div>
	                  </CardContent>
	                </Card>
	                <Card>
	                  <CardHeader>
	                    <CardTitle className="text-sm font-medium">Signup Completed</CardTitle>
	                  </CardHeader>
	                  <CardContent>
	                    <div className="text-2xl font-bold">{onboardingFunnel.signupCompleted}</div>
	                  </CardContent>
	                </Card>
	                <Card>
	                  <CardHeader>
	                    <CardTitle className="text-sm font-medium">Onboarding Started</CardTitle>
	                  </CardHeader>
	                  <CardContent>
	                    <div className="text-2xl font-bold">{onboardingFunnel.onboardingStarted}</div>
	                  </CardContent>
	                </Card>
	                <Card>
	                  <CardHeader>
	                    <CardTitle className="text-sm font-medium">Onboarding Completed</CardTitle>
	                  </CardHeader>
	                  <CardContent>
	                    <div className="text-2xl font-bold">{onboardingFunnel.onboardingCompleted}</div>
	                  </CardContent>
	                </Card>
	                <Card>
	                  <CardHeader>
	                    <CardTitle className="text-sm font-medium">First Action Opened</CardTitle>
	                  </CardHeader>
	                  <CardContent>
	                    <div className="text-2xl font-bold">{onboardingFunnel.firstActionOpened}</div>
	                  </CardContent>
	                </Card>
	                <Card>
	                  <CardHeader>
	                    <CardTitle className="text-sm font-medium">Input Submitted</CardTitle>
	                  </CardHeader>
	                  <CardContent>
	                    <div className="text-2xl font-bold">{onboardingFunnel.firstInputSubmitted}</div>
	                  </CardContent>
	                </Card>
	                <Card>
	                  <CardHeader>
	                    <CardTitle className="text-sm font-medium">Output Generated</CardTitle>
	                  </CardHeader>
	                  <CardContent>
	                    <div className="text-2xl font-bold">{onboardingFunnel.firstOutputGenerated}</div>
	                  </CardContent>
	                </Card>
	                <Card>
	                  <CardHeader>
	                    <CardTitle className="text-sm font-medium">Artifact Saved</CardTitle>
	                  </CardHeader>
	                  <CardContent>
	                    <div className="text-2xl font-bold">{onboardingFunnel.firstArtifactSaved}</div>
	                  </CardContent>
	                </Card>
	                <Card>
	                  <CardHeader>
	                    <CardTitle className="text-sm font-medium">Activation Completed</CardTitle>
	                  </CardHeader>
	                  <CardContent>
	                    <div className="text-2xl font-bold">{onboardingFunnel.activationCompleted}</div>
	                  </CardContent>
	                </Card>
	              </div>
	              <Card>
	                <CardHeader>
	                  <CardTitle>Compatibility milestones</CardTitle>
	                  <CardDescription>
	                    Legacy event counters retained while the session-based cohorts mature.
	                  </CardDescription>
	                </CardHeader>
	                <CardContent className="space-y-2 text-sm text-muted-foreground">
	                  <p>Use the cohort cards above for rollout decisions; they use unique users, explicit denominators, and matured D1/D7 windows.</p>
	                  <p>These counters remain available only to validate historical event continuity.</p>
	                </CardContent>
	              </Card>
	            </TabsContent>

            <TabsContent value="retention" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Experiment Cohort</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{retentionExperiment.cohortUsers}</div>
                    <p className="text-xs text-muted-foreground">Users created in the selected date range with an assigned activation variant</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Control Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{retentionExperiment.controlUsers}</div>
                    <p className="text-xs text-muted-foreground">{safePercent(retentionExperiment.controlUsers, retentionExperiment.cohortUsers)}% of cohort</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Forced Gate Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{retentionExperiment.forcedGateUsers}</div>
                    <p className="text-xs text-muted-foreground">{safePercent(retentionExperiment.forcedGateUsers, retentionExperiment.cohortUsers)}% of cohort</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Winning Signal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {experimentRateCards.reduce((best, card) => (
                        card.forced > best.delta
                          ? { label: card.title, delta: card.forced - card.control }
                          : best
                      ), { label: 'No lift yet', delta: 0 }).label}
                    </div>
                    <p className="text-xs text-muted-foreground">Biggest forced-gate lift over control in the current window</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Activation Experiment Rates
                    </CardTitle>
                    <CardDescription>
                      Compare onboarding completion, first artifact creation, and resume behavior between control and forced gate.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={experimentRateChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="metric" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Legend />
                        <Bar dataKey="control" fill="hsl(var(--chart-3))" name="Control" />
                        <Bar dataKey="forcedGate" fill="hsl(var(--primary))" name="Forced Gate" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Experiment Metrics
                    </CardTitle>
                    <CardDescription>
                      Raw counts behind the activation experiment so you can inspect lift before changing traffic allocation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead className="text-right">Control</TableHead>
                          <TableHead className="text-right">Forced Gate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {experimentRateCards.map((card) => (
                          <TableRow key={card.title}>
                            <TableCell className="font-medium">{card.title}</TableCell>
                            <TableCell className="text-right">{card.control}%</TableCell>
                            <TableCell className="text-right">{card.forced}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Activation Intent Mix</CardTitle>
                    <CardDescription>Which activation paths new users are choosing in the selected cohort window.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={retentionExperiment.activationIntents}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="intent" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="users" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>First Artifact Types</CardTitle>
                    <CardDescription>What users actually create first after onboarding instead of just browsing.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={retentionExperiment.artifactTypes}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => entry.type}
                          outerRadius={90}
                          dataKey="users"
                        >
                          {retentionExperiment.artifactTypes.map((entry, index) => (
                            <Cell key={entry.type} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Retention Experiment Notes</CardTitle>
                  <CardDescription>
                    This view uses profile state plus durable `user_activity_log` events, so it can validate activation outcomes without relying only on PostHog.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>If first artifact conversion is higher in forced gate, the activation chooser is doing its job.</p>
                  <p>If dashboard continue clicks rise but artifact resumes stay flat, the resume card is visible but the linked asset is not compelling enough yet.</p>
                  <p>If onboarding completion is healthy but first artifact lift is weak, the issue is still in the activation paths themselves rather than in onboarding.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pages Tab */}
            <TabsContent value="pages">
              <Card>
                <CardHeader>
                  <CardTitle>Page Performance</CardTitle>
                  <CardDescription>Detailed metrics for each page</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right">Unique Visitors</TableHead>
                        <TableHead className="text-right">Avg Time (s)</TableHead>
                        <TableHead className="text-right">Exit Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPages?.map((page) => (
                        <TableRow key={page.page}>
                          <TableCell className="font-medium">{page.page}</TableCell>
                          <TableCell className="text-right">{page.views}</TableCell>
                          <TableCell className="text-right">{page.uniqueVisitors}</TableCell>
                          <TableCell className="text-right">{page.avgTime}</TableCell>
                          <TableCell className="text-right">{page.exitRate}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CTAs Tab */}
            <TabsContent value="ctas">
              <Card>
                <CardHeader>
                  <CardTitle>CTA Performance</CardTitle>
                  <CardDescription>Click-through rates for all CTAs</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CTA Name</TableHead>
                        <TableHead>Locations</TableHead>
                        <TableHead className="text-right">Total Clicks</TableHead>
                        <TableHead className="text-right">Unique Clickers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ctaPerformance?.map((cta) => (
                        <TableRow key={cta.ctaName}>
                          <TableCell className="font-medium">{cta.ctaName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{cta.locations}</TableCell>
                          <TableCell className="text-right">{cta.clicks}</TableCell>
                          <TableCell className="text-right">{cta.uniqueClickers}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Engagement Tab */}
            <TabsContent value="engagement" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scroll Depth Distribution</CardTitle>
                  <CardDescription>How far users scroll on pages</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={scrollDepth || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="depth" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {messagePerformance.map((metric) => (
                  <Card key={metric.event_name}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{metric.event_name.replaceAll('_', ' ')}</CardTitle>
                      <CardDescription>{metric.samples} production samples</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className={metric.p95_ms > 750 ? 'text-2xl font-bold text-destructive' : 'text-2xl font-bold'}>{metric.p95_ms}ms p95</div>
                      <p className="mt-1 text-xs text-muted-foreground">p50 {metric.p50_ms}ms · p99 {metric.p99_ms}ms</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {messagePerformance.length === 0 && (
                <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Messaging performance data will appear after the upgraded inbox receives production traffic.</CardContent></Card>
              )}
              <Card>
                <CardHeader><CardTitle>Release thresholds</CardTitle><CardDescription>Investigate any messaging event above 750ms p95. Conversation-open rendering should trend below 500ms on warm sessions.</CardDescription></CardHeader>
              </Card>
            </TabsContent>

            {/* Real-Time Tab */}
            <TabsContent value="realtime">
              <Card>
                <CardHeader>
                  <CardTitle>Live Activity Feed</CardTitle>
                  <CardDescription>Last 50 events (updates every 10 seconds)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {realTimeActivity?.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {event.event_type === 'page_view' && <Eye className="h-4 w-4 text-info" />}
                          {event.event_type === 'click' && <MousePointerClick className="h-4 w-4 text-success" />}
                          {event.event_type === 'scroll' && <Activity className="h-4 w-4 text-purple-500" />}
                          {event.event_type === 'exit_intent' && <LogOut className="h-4 w-4 text-destructive" />}
                          <div>
                            <p className="font-medium">{event.event_type.replace('_', ' ')}</p>
                            <p className="text-sm text-muted-foreground">{event.page_path}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity Events</CardTitle>
                  <CardDescription>Latest 200 tracked activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activityEvents.map((e) => (
                      <div key={e.id} className="rounded border p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{e.event}</div>
                          <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                        </div>
                        {e.user_id && (
                          <div className="text-xs text-muted-foreground mt-1">user: {e.user_id}</div>
                        )}
                        {e.properties && (
                          <pre className="text-xs mt-2 overflow-x-auto">{JSON.stringify(e.properties, null, 2)}</pre>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AdminAnalytics;
