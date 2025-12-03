import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, ArrowRight } from 'lucide-react';
import { DailyGoalModal } from './DailyGoalModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TaskCalendar } from './TaskCalendar';
import { useDashboardInitialization } from '@/hooks/useDashboardInitialization';
import { ActiveProjects } from './ActiveProjects';
import { RevenueHub } from './RevenueHub';
import { MonthlyRevenueTarget } from './MonthlyRevenueTarget';

export const PersonalizedDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isInitializing, isInitialized } = useDashboardInitialization();
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
  
  // Track last fetch time to prevent unnecessary refreshes
  const lastFetchTimeRef = useRef<number>(0);
  const hasInitializedRef = useRef<boolean>(false);
  const DATA_STALE_TIME = 5 * 60 * 1000; // 5 minutes

  // Check if user has checked in today and calculate streak
  useEffect(() => {
    if (!user) return;
    
    // Only fetch if we haven't initialized or data is stale
    const now = Date.now();
    const shouldFetch = !hasInitializedRef.current || (now - lastFetchTimeRef.current > DATA_STALE_TIME);
    
    if (!shouldFetch) {
      // Use cached data if available
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
  }, [user]);

  // Disable auto-refresh on visibility change - preserve state
  // Removed visibility change handler to prevent auto-refresh

  if (loading || isInitializing) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

  const { profile, stats } = data;

  // Determine greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Exit Button - Fixed in top-right corner */}
      <button
        onClick={() => navigate('/')}
        className="fixed right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background/80 backdrop-blur-sm border border-border/50 px-4 py-2 shadow-lg hover:bg-accent flex items-center gap-2 text-sm font-medium"
        aria-label="Exit dashboard and return to platform"
      >
        <span>Go to Platform</span>
        <ArrowRight className="h-4 w-4" />
      </button>

      {/* Subtle grid pattern for light theme */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 100px 100px'
        }} />
      </div>


      {/* Main Content Container with Right Sidebar */}
      <div className="relative container mx-auto px-4 sm:px-6 py-8 max-w-[1600px]">
        <div className="flex gap-6">
          {/* Main Content Area */}
          <div className="flex-1 space-y-6 min-w-0">
        {/* Daily Goal Modal */}
        <DailyGoalModal 
          open={showDailyGoal}
          onOpenChange={setShowDailyGoal}
          currentStreak={currentStreak}
          mode={modalMode}
          todaysCheckInId={todaysCheckInId || undefined}
          onCheckInComplete={() => {
            setHasCheckedInToday(true);
            if (modalMode === 'morning') {
              setCurrentStreak(prev => prev + 1);
            }
          }}
        />

        {/* Header Section */}
        <div className="space-y-4">
          {/* Welcome Header */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-2xl blur-3xl" />
            <Card className="relative border-primary/20 shadow-lg backdrop-blur-sm bg-card/95">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      {greeting}, {profile?.full_name?.split(' ')[0] || 'Creator'}! 👋
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                      Your Founder Command Center
                    </p>
                  </div>
                  {stats.currentStreak > 0 && (
                    <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500/20 to-orange-500/10 px-4 py-2 rounded-full border border-orange-500/20">
                      <Flame className="h-5 w-5 text-orange-500" />
                      <div className="flex flex-col">
                        <span className="text-xl font-bold text-orange-500">{stats.currentStreak}</span>
                        <span className="text-xs text-orange-500/80">day streak</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Active Projects */}
        <ActiveProjects />

        {/* Revenue Hub and Monthly Revenue Target */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueHub />
          <MonthlyRevenueTarget />
        </div>
          </div>

          {/* Right Sidebar - Task Calendar and Task Overview (Fixed/Sticky) */}
          <div className="hidden xl:block w-80 flex-shrink-0">
            <div className="sticky top-8 space-y-6">
              <TaskCalendar />
              <TaskOverview />
            </div>
          </div>
        </div>

        {/* Task Calendar and Task Overview for Mobile/Tablet (below main content) */}
        <div className="xl:hidden mt-6 space-y-6">
          <TaskCalendar />
          <TaskOverview />
        </div>

      </div>
    </div>
  );
};
