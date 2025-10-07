import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay } from 'date-fns';

interface EnhancedStreakVisualizationProps {
  userId: string;
  currentStreak: number;
}

export const EnhancedStreakVisualization = ({ userId, currentStreak }: EnhancedStreakVisualizationProps) => {
  const [heatmapData, setHeatmapData] = useState<{ date: string; hasCheckIn: boolean }[]>([]);

  useEffect(() => {
    loadHeatmapData();
  }, [userId]);

  const loadHeatmapData = async () => {
    const today = startOfDay(new Date());
    const daysToShow = 42; // 6 weeks
    
    const { data: checkIns } = await supabase
      .from('daily_check_ins')
      .select('check_in_date')
      .eq('user_id', userId)
      .gte('check_in_date', format(subDays(today, daysToShow), 'yyyy-MM-dd'));

    const checkInDates = new Set(checkIns?.map(c => c.check_in_date) || []);
    
    const heatmap = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = format(subDays(today, i), 'yyyy-MM-dd');
      heatmap.push({
        date,
        hasCheckIn: checkInDates.has(date)
      });
    }
    
    setHeatmapData(heatmap);
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-orange-500';
    if (streak >= 14) return 'text-yellow-500';
    if (streak >= 7) return 'text-green-500';
    return 'text-primary';
  };

  const getDayIntensity = (hasCheckIn: boolean) => {
    if (!hasCheckIn) return 'bg-muted/30';
    return 'bg-primary';
  };

  return (
    <Card className="animate-fade-in hover-scale">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className={`h-5 w-5 ${getStreakColor(currentStreak)}`} />
          Your Consistency Journey
        </CardTitle>
        <CardDescription>
          Current Streak: <span className={`text-2xl font-bold ${getStreakColor(currentStreak)}`}>{currentStreak} days</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-xs text-center text-muted-foreground font-medium">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {heatmapData.map((day, index) => (
              <div
                key={index}
                className={`aspect-square rounded-md transition-all duration-300 hover:scale-110 hover:ring-2 hover:ring-primary cursor-pointer ${getDayIntensity(day.hasCheckIn)}`}
                title={`${format(new Date(day.date), 'MMM dd, yyyy')}${day.hasCheckIn ? ' ✓' : ''}`}
              >
                <div className="w-full h-full flex items-center justify-center">
                  {day.hasCheckIn && (
                    <div className="text-xs text-white font-bold opacity-80">✓</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-muted/30" />
              <div className="w-3 h-3 rounded-sm bg-primary/40" />
              <div className="w-3 h-3 rounded-sm bg-primary/70" />
              <div className="w-3 h-3 rounded-sm bg-primary" />
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
