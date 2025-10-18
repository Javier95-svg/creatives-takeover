import { useEffect, useState } from 'react';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Target, 
  Flame,
  Rocket
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DailyGoalModal } from './DailyGoalModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BusinessHealthScore } from './BusinessHealthScore';
import { MomentumMeter } from './MomentumMeter';
import { EnhancedStreakVisualization } from './EnhancedStreakVisualization';
import { QuickWinZone } from './QuickWinZone';
import { ProgressTimeline } from './ProgressTimeline';
import { QuickWinButton } from './QuickWinButton';
import { RecentWins } from './RecentWins';

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-7xl space-y-8">
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

        {/* Welcome Header - More Prominent */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-3xl blur-3xl" />
          <Card className="relative border-primary/20 shadow-lg">
            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                    {greeting}, {profile?.full_name?.split(' ')[0] || 'Creator'}! 👋
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
                    {profile?.creative_niche 
                      ? `Let's make progress on your ${profile.creative_niche} journey`
                      : "Track your progress, celebrate wins, and stay consistent"
                    }
                  </p>
                </div>
                {stats.currentStreak > 0 && (
                  <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500/20 to-orange-500/10 px-6 py-3 rounded-full border border-orange-500/20 shadow-sm">
                    <Flame className="h-6 w-6 text-orange-500" />
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-orange-500">{stats.currentStreak}</span>
                      <span className="text-xs text-orange-500/80">day streak</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid - Better Hierarchy */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Progress Timeline (Featured) */}
          <div className="lg:col-span-2 space-y-6">
            <ProgressTimeline />
            
            {/* Quick Actions - Simplified */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link to="/dream2plan" className="group">
                    <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all">
                      <Sparkles className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium">Plan</span>
                    </Button>
                  </Link>
                  <Link to="/community" className="group">
                    <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all">
                      <Target className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium">Share</span>
                    </Button>
                  </Link>
                  <Link to="/blog" className="group">
                    <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all">
                      <Sparkles className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium">Learn</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar Widgets */}
          <div className="space-y-6">
            {/* Recent Wins */}
            <RecentWins refreshTrigger={winsRefreshTrigger} />
            
            {/* Compact Stats */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Your Stats</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                    <span className="text-sm font-medium">Business Health</span>
                    <Badge variant="secondary" className="text-base font-bold">
                      {profile?.business_stage === 'idea' && '25%'}
                      {profile?.business_stage === 'planning' && '50%'}
                      {profile?.business_stage === 'building' && '75%'}
                      {profile?.business_stage === 'launched' && '100%'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                    <span className="text-sm font-medium">Check-ins</span>
                    <Badge variant="secondary" className="text-base font-bold">
                      {stats.currentStreak || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Floating Quick Win Button */}
        <QuickWinButton onWinAdded={() => setWinsRefreshTrigger(prev => prev + 1)} />
      </div>
    </div>
  );
};
