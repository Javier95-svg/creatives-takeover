import { useEffect, useState } from 'react';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { Card } from '@/components/ui/card';
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

export const PersonalizedDashboard = () => {
  const { user } = useAuth();
  const {
    data,
    loading,
    trackActivity
  } = usePersonalizedDashboard();

  const [showDailyGoal, setShowDailyGoal] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Check if user has checked in today and calculate streak
  useEffect(() => {
    const checkDailyCheckIn = async () => {
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      const { data: todayCheckIn } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_in_date', today)
        .maybeSingle();

      setHasCheckedInToday(!!todayCheckIn);

      // Calculate streak
      const { data: recentCheckIns } = await supabase
        .from('daily_check_ins')
        .select('check_in_date, streak_count')
        .eq('user_id', user.id)
        .order('check_in_date', { ascending: false })
        .limit(1);

      if (recentCheckIns && recentCheckIns.length > 0) {
        const lastCheckIn = recentCheckIns[0];
        const lastDate = new Date(lastCheckIn.check_in_date);
        const todayDate = new Date(today);
        const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // If checked in yesterday, continue streak, otherwise start from 0
        if (diffDays === 1 || (diffDays === 0 && lastCheckIn.check_in_date === today)) {
          setCurrentStreak(lastCheckIn.streak_count || 0);
        } else {
          setCurrentStreak(0);
        }
      }

      // Show modal if haven't checked in today
      if (!todayCheckIn) {
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
    <div className="container mx-auto p-6 space-y-8">
      {/* Daily Goal Modal */}
      <DailyGoalModal 
        open={showDailyGoal}
        onOpenChange={setShowDailyGoal}
        currentStreak={currentStreak}
        onCheckInComplete={() => {
          setHasCheckedInToday(true);
          setCurrentStreak(prev => prev + 1);
        }}
      />
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-2xl p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              {greeting}, {profile?.full_name?.split(' ')[0] || 'Creator'}! 👋
            </h1>
            <p className="text-muted-foreground text-lg">
              {profile?.creative_niche 
                ? `Let's make progress on your ${profile.creative_niche} journey`
                : "Let's build something amazing today"
              }
            </p>
          </div>
          {stats.currentStreak > 0 && (
            <div className="flex items-center gap-2 bg-orange-500/10 px-4 py-2 rounded-full">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="font-bold text-orange-500">{stats.currentStreak} day streak</span>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Feature Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BusinessHealthScore userId={user.id} />
        <MomentumMeter userId={user.id} stats={stats} />
        <EnhancedStreakVisualization userId={user.id} currentStreak={stats.currentStreak} />
      </div>

      {/* Quick Win Zone */}
      <QuickWinZone />

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/dream2plan">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
              <Sparkles className="h-6 w-6" />
              <span>Start Planning</span>
            </Button>
          </Link>
          <Link to="/sprints">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
              <Rocket className="h-6 w-6" />
              <span>Make a Commitment</span>
            </Button>
          </Link>
          <Link to="/blog">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
              <Target className="h-6 w-6" />
              <span>Stay Informed</span>
            </Button>
          </Link>
        </div>
      </Card>

      {/* Progress Overview */}
      {profile?.business_stage && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Your Journey Progress</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Business Development</span>
                <span className="text-sm text-muted-foreground">
                  {profile.business_stage === 'idea' && '25%'}
                  {profile.business_stage === 'planning' && '50%'}
                  {profile.business_stage === 'building' && '75%'}
                  {profile.business_stage === 'launched' && '100%'}
                </span>
              </div>
              <Progress 
                value={
                  profile.business_stage === 'idea' ? 25 :
                  profile.business_stage === 'planning' ? 50 :
                  profile.business_stage === 'building' ? 75 : 100
                } 
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
