import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertCircle, XCircle, HelpCircle, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface HealthCheckResult {
  question: string;
  status: 'good' | 'needs_attention' | 'critical';
  tooltip: string;
}

export const FounderHealthCheck = () => {
  const { user } = useAuth();
  const [checks, setChecks] = useState<HealthCheckResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      assessHealth();
    }
  }, [user]);

  const assessHealth = async () => {
    if (!user) return;

    try {
      // Check progress (recent check-ins)
      const { data: recentCheckIns } = await supabase
        .from('daily_check_ins')
        .select('check_in_date')
        .eq('user_id', user.id)
        .gte('check_in_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .limit(7);

      const progressStatus = (recentCheckIns?.length || 0) >= 3 
        ? 'good' 
        : (recentCheckIns?.length || 0) >= 1 
        ? 'needs_attention' 
        : 'critical';

      // Check idea resonance (business plans/sessions)
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      const hasActiveProject = (sessions?.length || 0) > 0;
      const ideaStatus = hasActiveProject ? 'good' : 'needs_attention';

      // Check runway (revenue metrics or financial data)
      const { data: revenueGoal } = await supabase
        .from('kpi_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('goal_type', 'revenue')
        .limit(1)
        .maybeSingle();

      const runwayStatus = revenueGoal 
        ? (revenueGoal.current_value > 0 ? 'good' : 'needs_attention')
        : 'needs_attention';

      setChecks([
        {
          question: 'Are you making progress?',
          status: progressStatus,
          tooltip: 'Based on your recent check-ins. Consistent daily progress is key to building momentum and achieving your goals.'
        },
        {
          question: 'Is the idea resonating?',
          status: ideaStatus,
          tooltip: 'Having an active business plan shows you\'re committed to your idea. Keep iterating and validating with real users.'
        },
        {
          question: 'Do you have runway?',
          status: runwayStatus,
          tooltip: 'Runway is how long you can operate without new funding. Track your revenue and expenses to know when you need to raise.'
        }
      ]);
    } catch (error) {
      console.error('Error assessing health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'needs_attention':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good':
        return <Badge className="bg-success-subtle text-success border-success/20">🟢 Good</Badge>;
      case 'needs_attention':
        return <Badge className="bg-warning-subtle text-warning border-warning/20">🟡 Needs Attention</Badge>;
      case 'critical':
        return <Badge className="bg-destructive-subtle text-destructive border-destructive/20">🔴 Critical</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">Founder Health Check</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="text-base">Founder Health Check</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">How's your startup doing?</p>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-4">
            {checks.map((check, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{check.question}</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{check.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
                {getStatusBadge(check.status)}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

