import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Smile, Meh, Frown, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

interface CheckIn {
  id: string;
  check_in_date: string;
  progress_summary: string;
  mood_rating: number;
  energy_level: number;
  goal_achieved?: boolean;
  what_went_well?: string;
  created_at: string;
}

export const ProgressTimeline = () => {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecentCheckIns();
    }
  }, [user]);

  const fetchRecentCheckIns = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .order('check_in_date', { ascending: false })
        .limit(7);

      if (error) throw error;
      setCheckIns(data || []);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (rating: number) => {
    if (rating >= 4) return <Smile className="w-5 h-5 text-green-500" />;
    if (rating >= 3) return <Meh className="w-5 h-5 text-yellow-500" />;
    return <Frown className="w-5 h-5 text-orange-500" />;
  };

  const getEnergyIndicators = (level: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Zap
        key={i}
        className={`w-3 h-3 ${
          i < level ? 'text-primary fill-primary' : 'text-muted'
        }`}
      />
    ));
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today';
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday';
    } else {
      return formatDistanceToNow(date, { addSuffix: true });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📅 Your Progress This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (checkIns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📅 Your Progress This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Circle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Start your journey today!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Set your first daily goal to begin tracking your progress.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📅 Your Progress This Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checkIns.map((checkIn, index) => (
            <div
              key={checkIn.id}
              className={`p-4 rounded-lg border bg-card transition-colors hover:bg-accent/50 ${
                index === 0 ? 'border-primary/50 bg-primary/5' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {getRelativeTime(checkIn.check_in_date)}
                    </Badge>
                    {checkIn.goal_achieved !== null && (
                      <Badge
                        variant={checkIn.goal_achieved ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {checkIn.goal_achieved ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Achieved
                          </>
                        ) : (
                          'In Progress'
                        )}
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium text-sm mb-1">
                    {checkIn.progress_summary}
                  </p>
                  {checkIn.what_went_well && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ✨ {checkIn.what_went_well}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getMoodEmoji(checkIn.mood_rating)}
                  <div className="flex gap-0.5">
                    {getEnergyIndicators(checkIn.energy_level)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
