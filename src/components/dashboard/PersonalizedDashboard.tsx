import { useEffect, useState } from 'react';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { DailyGoalModal } from './DailyGoalModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { QuickWinButton } from './QuickWinButton';
import { RecentWins } from './RecentWins';
import { AlertsSection } from './AlertsSection';
import { HeroKPI } from './HeroKPI';
import { RevenueHub } from './RevenueHub';
import { QuickActionsPanel } from './QuickActionsPanel';
import { ProgressTimeline } from './ProgressTimeline';
import { TaskCalendar } from './TaskCalendar';

export const PersonalizedDashboard = () => {
  const { user } = useAuth();
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
  const [winsRefreshTrigger, setWinsRefreshTrigger] = useState(0);

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

  if (loading) {
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
      </div>
    );
  }

  const { profile, stats } = data;

  // Determine greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Tech Background Base */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/30 via-blue-950/20 to-slate-900/40" />
      
      {/* Circuit Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.08]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--primary) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--secondary) / 0.2) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--secondary) / 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 100px 100px, 25px 25px, 25px 25px'
        }} />
      </div>

      {/* Animated Hexagons - Top Right */}
      <div className="absolute top-20 right-20 opacity-20">
        {[...Array(2)].map((_, i) => (
          <div key={`hex-top-${i}`} className="absolute w-32 h-32" style={{ 
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            border: '1px solid',
            borderColor: `hsl(var(--primary) / ${0.4 - i * 0.15})`,
            transform: `scale(${1 + i * 0.3})`,
            animation: `spin ${30 - i * 5}s linear infinite ${i % 2 === 0 ? 'normal' : 'reverse'}`
          }} />
        ))}
      </div>

      {/* Animated Hexagons - Bottom Left */}
      <div className="absolute bottom-20 left-20 opacity-15">
        {[...Array(2)].map((_, i) => (
          <div key={`hex-bottom-${i}`} className="absolute w-24 h-24" style={{ 
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            border: '1px solid',
            borderColor: `hsl(var(--secondary) / ${0.3 - i * 0.1})`,
            transform: `scale(${1 + i * 0.25})`,
            animation: `spin ${25 - i * 4}s linear infinite reverse`
          }} />
        ))}
      </div>

      {/* Scanning Lines Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" 
             style={{ animation: 'slideDown 10s ease-in-out infinite' }} />
        <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-secondary/20 to-transparent" 
             style={{ animation: 'slideRight 12s ease-in-out infinite', animationDelay: '2s' }} />
      </div>

      {/* Floating Particles */}
      <div className="absolute top-1/2 left-10 pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div key={`particle-left-${i}`} 
               className="absolute w-1 h-1 bg-primary/40 rounded-full"
               style={{
                 animation: `float ${8 + i * 2}s ease-in-out infinite`,
                 animationDelay: `${i * 1.5}s`,
                 left: `${i * 20}px`,
                 top: `${i * -30}px`
               }} />
        ))}
      </div>

      <div className="absolute bottom-1/3 right-10 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div key={`particle-right-${i}`} 
               className="absolute w-1 h-1 bg-secondary/30 rounded-full"
               style={{
                 animation: `float ${7 + i * 1.5}s ease-in-out infinite`,
                 animationDelay: `${i * 1.2}s`,
                 right: `${i * 25}px`,
                 bottom: `${i * -25}px`
               }} />
        ))}
      </div>

      {/* Pulsing Glow Orbs */}
      <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse opacity-30" 
           style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-pulse opacity-20" 
           style={{ animationDuration: '5s', animationDelay: '2s' }} />

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
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {profile?.creative_niche 
                      ? `Let's make progress on your ${profile.creative_niche} journey`
                      : "Track your progress, celebrate wins, and stay consistent"
                    }
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
            {/* Revenue Hub */}
            <RevenueHub />
            
            {/* Quick Actions Panel */}
            <QuickActionsPanel />

            {/* Progress Timeline */}
            <ProgressTimeline />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Task Calendar */}
            <TaskCalendar />
            
            {/* Recent Wins */}
            <RecentWins refreshTrigger={winsRefreshTrigger} />
          </div>
        </div>

        {/* Floating Quick Win Button */}
        <QuickWinButton onWinAdded={() => setWinsRefreshTrigger(prev => prev + 1)} />
      </div>
    </div>
  );
};
