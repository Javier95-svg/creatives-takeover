import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

export const BusinessHealthSummary = () => {
  const { user } = useAuth();
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [riskLevel, setRiskLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHealthScore();
    }
  }, [user]);

  const fetchHealthScore = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('business_success_scores')
        .select('overall_score, risk_assessment')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setHealthScore(data.overall_score);
        setRiskLevel(data.risk_assessment);
      }
    } catch (error) {
      console.error('Error fetching health score:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-warning';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-success-subtle text-success border-success/20';
      case 'medium':
        return 'bg-warning-subtle text-warning border-warning/20';
      case 'high':
        return 'bg-destructive-subtle text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-primary" />
            Business Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!healthScore) {
    return (
      <Card className="backdrop-blur-sm bg-card/95 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            Business Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Complete your business plan to see your health score
            </p>
            <Link to="/bizmap-ai">
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                Start Planning
              </Badge>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          Business Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold mb-1" style={{ color: `hsl(var(--primary))` }}>
                {Math.round(healthScore)}%
              </div>
              <p className="text-xs text-muted-foreground">Overall Score</p>
            </div>
            {riskLevel && (
              <Badge variant="outline" className={getRiskColor(riskLevel)}>
                {riskLevel.toUpperCase()} RISK
              </Badge>
            )}
          </div>
          
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000"
              style={{ width: `${healthScore}%` }}
            />
          </div>

          <Link to="/bizmap-ai">
            <div className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
              View detailed analysis →
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

