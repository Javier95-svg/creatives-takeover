import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Zap, TrendingUp, Target, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MomentumMeterProps {
  userId: string;
  stats: {
    activeSprints: number;
    completedSessions: number;
    currentStreak: number;
    totalCheckIns: number;
  };
}

export const MomentumMeter = ({ userId, stats }: MomentumMeterProps) => {
  const [momentum, setMomentum] = useState(0);
  const [level, setLevel] = useState('Getting Started');

  useEffect(() => {
    void calculateMomentum();
  }, [stats]);

  const calculateMomentum = async () => {
    // Fetch recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentCheckIns } = await supabase
      .from('daily_check_ins')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString());

    const { data: recentCommitments } = await supabase
      .from('sprint_commitments')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString());

    // Calculate momentum score (0-100)
    let score = 0;
    
    // Streak bonus (max 30 points)
    score += Math.min(stats.currentStreak * 3, 30);
    
    // Active sprints (max 20 points)
    score += Math.min(stats.activeSprints * 10, 20);
    
    // Recent check-ins (max 25 points)
    score += Math.min((recentCheckIns?.length || 0) * 4, 25);
    
    // Recent commitments (max 25 points)
    score += Math.min((recentCommitments?.length || 0) * 5, 25);

    setMomentum(Math.min(score, 100));

    // Set level based on score
    if (score >= 80) setLevel('On Fire 🔥');
    else if (score >= 60) setLevel('Building Momentum');
    else if (score >= 40) setLevel('Warming Up');
    else if (score >= 20) setLevel('Getting Started');
    else setLevel('Ready to Launch');
  };

  const getMomentumColor = () => {
    if (momentum >= 80) return 'hsl(var(--success))';
    if (momentum >= 60) return 'hsl(var(--primary))';
    if (momentum >= 40) return 'hsl(var(--warning))';
    return 'hsl(var(--muted-foreground))';
  };

  const insights = [
    { icon: Target, label: 'Active Goals', value: stats.activeSprints, color: 'text-info' },
    { icon: CheckCircle2, label: 'Sessions Done', value: stats.completedSessions, color: 'text-success' },
    { icon: TrendingUp, label: 'Day Streak', value: stats.currentStreak, color: 'text-warning' },
  ];

  return (
    <Card className="animate-fade-in hover-scale bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary animate-pulse" />
          Momentum Meter
        </CardTitle>
        <CardDescription className="text-lg font-semibold" style={{ color: getMomentumColor() }}>
          {level}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Momentum</span>
            <span className="font-bold text-lg" style={{ color: getMomentumColor() }}>
              {momentum}%
            </span>
          </div>
          <Progress 
            value={momentum} 
            className="h-3 transition-all duration-1000 ease-out"
            style={{ 
              '--progress-background': getMomentumColor() 
            } as any}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {insights.map((insight, index) => (
            <div 
              key={index}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background/50 backdrop-blur-sm hover:scale-105 transition-transform"
            >
              <insight.icon className={`h-5 w-5 ${insight.color}`} />
              <div className="text-2xl font-bold">{insight.value}</div>
              <div className="text-xs text-muted-foreground text-center">{insight.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
