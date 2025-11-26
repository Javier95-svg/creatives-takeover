import { useEffect, useState } from 'react';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { DailyGoalModal } from './DailyGoalModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { QuickWinButton } from './QuickWinButton';
import { AlertsSection } from './AlertsSection';
import { HeroKPI } from './HeroKPI';
import { RevenueHub } from './RevenueHub';
import { ProgressTimeline } from './ProgressTimeline';
import { TaskCalendar } from './TaskCalendar';
import { MarketValidationHub } from './MarketValidationHub';
import { useDashboardInitialization } from '@/hooks/useDashboardInitialization';

export const PersonalizedDashboard = () => {
  const { user } = useAuth();
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

  // Check if user has checked in today and calculate streak
  useEffect(() => {
    const checkDailyCheckIn = async () => {
      if (!user) return;

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
    };

    checkDailyCheckIn();
    trackActivity('dashboard_view');
  }, [user]);

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


      {/* Main Content Container */}
      <div className="relative container mx-auto px-4 sm:px-6 py-8 max-w-7xl space-y-6">
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

        {/* Welcome Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-3xl blur-3xl" />
          <Card className="relative border-primary/20 shadow-lg backdrop-blur-sm bg-card/95">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {greeting}, {profile?.full_name?.split(' ')[0] || 'Creator'}! 👋
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
                    Your command center for tracking KPIs, revenue metrics, quick actions, and progress—all the tools you need to grow your venture and track your journey
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

        {/* Alerts Section */}
        <AlertsSection />

        {/* Hero KPI Section */}
        <HeroKPI />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Primary Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Market Validation Hub */}
            <MarketValidationHub />
            
            {/* Revenue Hub */}
            <RevenueHub />

            {/* Progress Timeline */}
            <ProgressTimeline />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Task Calendar */}
            <TaskCalendar />
          </div>
        </div>

        {/* Floating Quick Win Button */}
        <QuickWinButton onWinAdded={() => {}} />
      </div>
    </div>
  );
};
