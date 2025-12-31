import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { ArrowRight } from 'lucide-react';
import { DailyGoalModal } from './DailyGoalModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardInitialization } from '@/hooks/useDashboardInitialization';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ModeToggle, DashboardMode } from './modes/ModeToggle';
import { FocusModeView } from './modes/FocusModeView';
import { DashboardModeView } from './modes/DashboardModeView';
import { ControlCenterView } from './modes/ControlCenterView';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardNavigationProvider } from '@/contexts/DashboardNavigationContext';
import { DashboardSidebar } from './DashboardSidebar';
import { useActiveSection } from '@/hooks/useActiveSection';
import { ReactNode } from 'react';

// Internal wrapper component that uses the navigation context
interface DashboardContentWrapperProps {
  dashboardMode: DashboardMode;
  children: ReactNode;
}

const DashboardContentWrapper = ({ dashboardMode, children }: DashboardContentWrapperProps) => {
  // Setup section IDs for active section tracking
  const sectionIds =
    dashboardMode === 'focus'
      ? ['dashboard-focus']
      : dashboardMode === 'dashboard'
      ? ['dashboard-focus', 'weekly-mission', 'active-projects', 'your-tasks']
      : ['dashboard-focus', 'weekly-mission', 'ai-insights', 'active-projects', 'calendar-view', 'your-tasks'];

  // Initialize active section tracking (now inside the provider)
  useActiveSection(sectionIds);

  return <>{children}</>;
};

export const PersonalizedDashboardV2 = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isInitializing } = useDashboardInitialization();
  const {
    data,
    loading,
    trackActivity
  } = usePersonalizedDashboard();

  const [showDailyGoal, setShowDailyGoal] = useState(false);
  const [modalMode, setModalMode] = useState<'morning' | 'evening'>('morning');
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [todaysCheckInId, setTodaysCheckInId] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>('focus');

  // Track last fetch time to prevent unnecessary refreshes
  const lastFetchTimeRef = useRef<number>(0);
  const hasInitializedRef = useRef<boolean>(false);
  const DATA_STALE_TIME = 5 * 60 * 1000; // 5 minutes

  // Load user's preferred dashboard mode from profile
  useEffect(() => {
    if (!user) return;

    const loadDashboardPreference = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_dashboard_mode')
        .eq('id', user.id)
        .single();

      if (profile?.preferred_dashboard_mode) {
        setDashboardMode(profile.preferred_dashboard_mode as DashboardMode);
      }
    };

    loadDashboardPreference();
  }, [user]);

  // Save dashboard mode preference when it changes
  const handleModeChange = async (newMode: DashboardMode) => {
    setDashboardMode(newMode);

    if (user) {
      await supabase
        .from('profiles')
        .update({ preferred_dashboard_mode: newMode })
        .eq('id', user.id);
    }
  };

  // Check if user has checked in today and calculate streak
  useEffect(() => {
    if (!user) return;

    // Only fetch if we haven't initialized or data is stale
    const now = Date.now();
    const shouldFetch = !hasInitializedRef.current || (now - lastFetchTimeRef.current > DATA_STALE_TIME);

    if (!shouldFetch) {
      return;
    }

    const checkDailyCheckIn = async () => {
      const today = new Date().toISOString().split('T')[0];
      const currentHour = new Date().getHours();

      const { data: todayCheckIn } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_in_date', today)
        .maybeSingle();

      setHasCheckedInToday(!!todayCheckIn);

      if (todayCheckIn) {
        setTodaysCheckInId(todayCheckIn.id);

        // Calculate streak
        const { data: recentCheckIns } = await supabase
          .from('daily_check_ins')
          .select('check_in_date')
          .eq('user_id', user.id)
          .order('check_in_date', { ascending: false })
          .limit(30);

        if (recentCheckIns) {
          let streak = 0;
          const dates = recentCheckIns.map(c => c.check_in_date).sort().reverse();

          for (let i = 0; i < dates.length; i++) {
            const currentDate = new Date(dates[i]);
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - i);

            if (currentDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
              streak++;
            } else {
              break;
            }
          }

          setCurrentStreak(streak);
        }

        // Show evening reflection if after 6 PM and haven't reflected yet
        if (currentHour >= 18 && todayCheckIn.goal_achieved === null) {
          setModalMode('evening');
          setShowDailyGoal(true);
        }
      } else {
        // Show morning goal modal if haven't checked in
        setModalMode('morning');
        setShowDailyGoal(true);
      }

      lastFetchTimeRef.current = Date.now();
      hasInitializedRef.current = true;
    };

    checkDailyCheckIn();
    if (!hasInitializedRef.current) {
      trackActivity('dashboard_view');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Calculate metrics for the views
  const calculateMetrics = () => {
    // Mock data - will be replaced with actual data from hooks
    return {
      streak: currentStreak,
      tasksCompletedToday: 3,
      totalTasksToday: 5,
      weeklyProgress: 65,
      tasksCompletedThisWeek: 12,
      totalTasksThisWeek: 20,
      activeSprints: data?.stats?.activeSprints || 0,
      completedSessions: data?.stats?.completedSessions || 0,
    };
  };

  const metrics = calculateMetrics();

  if (loading || isInitializing) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="h-40 bg-muted rounded-lg" />
            <div className="h-40 bg-muted rounded-lg" />
            <div className="h-40 bg-muted rounded-lg" />
          </div>
        </div>
        {isInitializing && (
          <div className="text-center text-muted-foreground">
            Setting up your dashboard...
          </div>
        )}
      </div>
    );
  }

  const { profile } = data || { profile: null };

  // Determine greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <ErrorBoundary>
      <SidebarProvider>
        <DashboardNavigationProvider>
          <DashboardContentWrapper dashboardMode={dashboardMode}>
            <DashboardSidebar dashboardMode={dashboardMode} />
            <SidebarInset>
              <div className="min-h-screen relative overflow-hidden bg-background">
              {/* Fixed Header with Exit Button and Mode Toggle */}
              <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
                <div className="container mx-auto px-6 py-3 max-w-7xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <SidebarTrigger />
                      <ModeToggle currentMode={dashboardMode} onModeChange={handleModeChange} />
                    </div>
                    <button
                      onClick={() => navigate('/')}
                      className="rounded-sm opacity-70 ring-offset-background transition-all duration-300 hover:opacity-100 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background/80 backdrop-blur-sm border border-border/50 px-4 py-2 shadow-lg hover:shadow-xl hover:bg-accent flex items-center gap-2 text-sm font-medium"
                      aria-label="Exit dashboard and return to platform"
                      type="button"
                    >
                      <span>Platform</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

        {/* Modern Wallpaper Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background via-primary/4 to-background" />
          <div
            className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/12 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '8s' }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '12s', animationDelay: '2s' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/6 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '10s', animationDelay: '4s' }}
          />
          <div
            className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
            style={{
              backgroundImage: `
                linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px),
                linear-gradient(0deg, hsl(var(--foreground)) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px, 60px 60px'
            }}
          />
          <div
            className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-background/30"
          />
        </div>

              {/* Dashboard Content */}
              <div className="relative z-10 container mx-auto p-6 pb-24 space-y-8 max-w-7xl pt-24">
                {/* Header */}
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {greeting}, {profile?.full_name?.split(' ')[0] || 'Founder'} 👋
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    {dashboardMode === 'focus'
                      ? 'Here\'s your focus for today'
                      : dashboardMode === 'dashboard'
                      ? 'Your dashboard overview'
                      : 'Full control center'}
                  </p>
                </div>

                {/* Dynamic View Based on Mode */}
                {dashboardMode === 'focus' && <FocusModeView {...metrics} />}
                {dashboardMode === 'dashboard' && <DashboardModeView {...metrics} />}
                {dashboardMode === 'control-center' && <ControlCenterView {...metrics} />}
              </div>

              {/* Daily Goal Modal */}
              <DailyGoalModal
                open={showDailyGoal}
                onOpenChange={setShowDailyGoal}
                currentStreak={currentStreak}
                mode={modalMode}
                todaysCheckInId={todaysCheckInId}
                onCheckInComplete={async () => {
                  setHasCheckedInToday(true);
                  hasInitializedRef.current = false;
                  lastFetchTimeRef.current = 0;
                }}
              />
              </div>
            </SidebarInset>
          </DashboardContentWrapper>
        </DashboardNavigationProvider>
      </SidebarProvider>
    </ErrorBoundary>
  );
};
