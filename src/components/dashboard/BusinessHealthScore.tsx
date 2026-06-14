import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BusinessHealthScoreProps {
  userId: string;
}

export const BusinessHealthScore = ({ userId }: BusinessHealthScoreProps) => {
  const [scoreData, setScoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadScoreData();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [userId]);

  const loadScoreData = async () => {
    const { data } = await supabase
      .from('business_success_scores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const chartData = [
        { category: 'Market', score: data.market_clarity_score || 0 },
        { category: 'Problem', score: data.problem_validation_score || 0 },
        { category: 'Solution', score: data.solution_strength_score || 0 },
        { category: 'Strategy', score: data.market_strategy_score || 0 },
        { category: 'Financial', score: data.financial_planning_score || 0 },
        { category: 'Execution', score: data.execution_feasibility_score || 0 },
      ];
      setScoreData({ overall: data.overall_score, chart: chartData, risk: data.risk_assessment });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!scoreData) {
    return (
      <Card className="animate-fade-in border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Business Health Score
          </CardTitle>
          <CardDescription>Complete your Dream2Plan assessment to unlock insights</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartConfig = {
    score: {
      label: "Score",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <Card className="animate-fade-in hover-scale">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Business Health Score
          </span>
          <div className="text-3xl font-bold text-primary">{scoreData.overall.toFixed(0)}%</div>
        </CardTitle>
        <CardDescription>
          Risk Level: <span className={`font-semibold ${
            scoreData.risk === 'low' ? 'text-success' : 
            scoreData.risk === 'medium' ? 'text-warning' : 
            'text-destructive'
          }`}>{scoreData.risk.toUpperCase()}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64">
          <RadarChart data={scoreData.chart}>
            <PolarGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="category" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
