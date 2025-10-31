import { useEffect, useState } from 'react';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Target, 
  Flame,
  TrendingUp,
  CheckCircle,
  Calendar,
  MessageSquare,
  BarChart3,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DailyGoalModal } from './DailyGoalModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
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

        {/* Welcome Header */}
        <Card className="border-primary/20 shadow-lg">
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sprints</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSprints}</div>
              <p className="text-xs text-muted-foreground">
                Current projects in progress
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Sessions</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedSessions}</div>
              <p className="text-xs text-muted-foreground">
                Total sessions completed
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Check-ins</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCheckIns}</div>
              <p className="text-xs text-muted-foreground">
                Total days checked in
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.currentStreak}</div>
              <p className="text-xs text-muted-foreground">
                {stats.currentStreak === 0 ? 'Check in today!' : 'Keep it going!'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Dream2Plan Chat
              </CardTitle>
              <CardDescription>
                Brainstorm and plan your next project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dream2plan">
                <Button className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Planning
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Sprint Planning
              </CardTitle>
              <CardDescription>
                Create and manage your project sprints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/accountability">
                <Button className="w-full" variant="secondary">
                  <Zap className="h-4 w-4 mr-2" />
                  View Sprints
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Community
              </CardTitle>
              <CardDescription>
                Connect with other creators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/community">
                <Button className="w-full" variant="outline">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Explore Community
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Recommended for You
              </CardTitle>
              <CardDescription>
                Personalized suggestions based on your activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.recommendations.map((rec) => (
                <div key={rec.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{rec.title}</h4>
                      <Badge variant="secondary">{rec.recommendation_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                    <p className="text-xs text-muted-foreground italic">{rec.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link to={rec.action_url}>
                      <Button size="sm">Take Action</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Check-in Prompt */}
        {!hasCheckedInToday && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Daily Check-in</h3>
                  <p className="text-sm text-muted-foreground">Set your goal for today and maintain your streak</p>
                </div>
                <Button onClick={() => setShowDailyGoal(true)}>
                  Check In Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
