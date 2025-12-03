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
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle>📅 Your Progress This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Circle className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-lg">Ready to start your journey?</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Set your first daily goal to begin tracking your progress. Each day you check in builds your momentum!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">📅 Your Progress This Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {checkIns.slice(0, 5).map((checkIn, index) => (
            <div
              key={checkIn.id}
              className={`p-3 rounded-lg border bg-card transition-colors hover:bg-accent/50 ${
                index === 0 ? 'border-primary/50 bg-primary/5' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
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
                  <p className="font-medium text-xs mb-1 line-clamp-2">
                    {checkIn.progress_summary}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
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
