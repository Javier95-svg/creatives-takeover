import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, TrendingUp } from 'lucide-react';
import { useBizMapInsights } from '@/hooks/useBizMapInsights';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WeekProgress {
  completedPriorities: number;
  totalPriorities: number;
  bizMapSessions: number;
  insights: number;
}

export const WeekProgressWidget = () => {
  const { user } = useAuth();
  const { insights } = useBizMapInsights();
  const [weekProgress, setWeekProgress] = useState<WeekProgress>({
    completedPriorities: 0,
    totalPriorities: 0,
    bizMapSessions: 0,
    insights: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadWeekProgress();
    }
  }, [user, insights]);

  const loadWeekProgress = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get priorities from this week
      const { data: priorities } = await supabase
        .from('daily_priorities')
        .select('is_completed')
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString());

      const completed = priorities?.filter(p => p.is_completed).length || 0;
      const total = priorities?.length || 0;

      // Get BizMap sessions this week
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString());

      setWeekProgress({
        completedPriorities: completed,
        totalPriorities: total,
        bizMapSessions: sessions?.length || 0,
        insights: insights.length
      });
    } catch (error) {
      console.error('Error loading week progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = weekProgress.totalPriorities > 0 
    ? (weekProgress.completedPriorities / weekProgress.totalPriorities) * 100 
    : 0;

  const getProgressMessage = () => {
    if (progressPercentage >= 80) return "Crushing it this week! 🚀";
    if (progressPercentage >= 50) return "Great momentum! Keep going! 💪";
    if (progressPercentage >= 20) return "Building progress steadily 📈";
    if (weekProgress.totalPriorities > 0) return "Just getting started this week";
    return "Set your first priority to start tracking!";
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardContent className="p-6">
          <div className="h-32 bg-muted/50 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            BizMap Progress This Week
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {weekProgress.completedPriorities}/{weekProgress.totalPriorities} done
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{getProgressMessage()}</span>
            <span className="text-muted-foreground">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="text-center p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="text-2xl font-bold text-primary">
              {weekProgress.completedPriorities}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Completed
            </div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
            <div className="text-2xl font-bold text-blue-500">
              {weekProgress.bizMapSessions}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              AI Sessions
            </div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
            <div className="text-2xl font-bold text-purple-500">
              {weekProgress.insights}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              AI Insights
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        {weekProgress.bizMapSessions > 0 && (
          <div className="pt-2 pb-1">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-transparent border border-primary/10">
              <TrendingUp className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Your BizMap AI sessions created {weekProgress.insights} actionable insights. 
                Convert them to priorities to maintain momentum!
              </p>
            </div>
          </div>
        )}

        {weekProgress.totalPriorities === 0 && weekProgress.bizMapSessions === 0 && (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground">
              Start a BizMap AI session to get personalized insights
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
