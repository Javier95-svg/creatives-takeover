import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, FlaskConical, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PMF_REQUIRED_SIGNALS } from '@/lib/bizmapStages';
import {
  getPmfResultsTableName,
  handlePmfResultsTableError,
  isPmfResultsTableAvailable,
} from '@/lib/pmfResultsTable';
import type { PMFInterviewLog } from '@/hooks/usePMFLab';

interface InterviewSummary {
  name: string;
  segment: string;
  buyingIntent: string;
  interestLevel: number;
}

const PMF_RESULTS_TABLE = getPmfResultsTableName();

const BUYING_INTENT_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Some interest',
  high: 'High intent',
  ready_to_pay: 'Ready to pay',
};

export function InterviewTrackerCard() {
  const { user } = useAuth();
  const [interviewCount, setInterviewCount] = useState(0);
  const [recentInterviews, setRecentInterviews] = useState<InterviewSummary[]>([]);
  const [topSegments, setTopSegments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);

      try {
        // Load interview count from pmf_validation_evidence
        const { data: evidence } = await supabase
          .from('pmf_validation_evidence' as any)
          .select('interview_notes_count')
          .eq('user_id', user.id)
          .maybeSingle();

        const evidenceCount = Number((evidence as any)?.interview_notes_count ?? 0);

        // Load detailed interviews from pmf_analysis_results
        let interviews: PMFInterviewLog[] = [];
        if (isPmfResultsTableAvailable()) {
          const { data: analysisRow, error } = await supabase
            .from(PMF_RESULTS_TABLE)
            .select('analysis_data')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error && !handlePmfResultsTableError(error)) {
            console.warn('Failed to load PMF analysis for tracker:', error);
          }

          const content = (analysisRow as any)?.analysis_data;
          if (content?.evidenceAnswers?.interviews) {
            interviews = content.evidenceAnswers.interviews as PMFInterviewLog[];
          }
        }

        if (cancelled) return;

        const finalCount = Math.max(evidenceCount, interviews.length);
        setInterviewCount(finalCount);

        // Recent interviews (last 5)
        const recent = interviews.slice(-5).reverse().map((i) => ({
          name: i.intervieweeName,
          segment: i.segment,
          buyingIntent: i.buyingIntent,
          interestLevel: i.interestLevel,
        }));
        setRecentInterviews(recent);

        // Top segments
        const segCounts = interviews.reduce<Record<string, number>>((acc, i) => {
          const key = i.segment.trim();
          if (!key) return acc;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        const sorted = Object.entries(segCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([seg, count]) => `${seg} (${count})`);
        setTopSegments(sorted);
      } catch (err) {
        console.warn('Interview tracker load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();
    return () => { cancelled = true; };
  }, [user]);

  const progress = Math.min(100, Math.round((interviewCount / PMF_REQUIRED_SIGNALS) * 100));
  const remaining = Math.max(0, PMF_REQUIRED_SIGNALS - interviewCount);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-card/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="h-5 w-5 text-primary" />
            Interview Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            <div className="h-2 w-full rounded-full bg-muted" />
            <div className="h-16 rounded-xl bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-card/90">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="h-5 w-5 text-primary" />
            Interview Tracker
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Stage III
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Log {PMF_REQUIRED_SIGNALS} customer interviews before running PMF Lab for a reliable score.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Progress ring */}
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center shrink-0">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-muted/30"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={`${(progress / 100) * 175.93} 175.93`}
                strokeLinecap="round"
                className="text-primary transition-all duration-700"
              />
            </svg>
            <span className="absolute text-sm font-bold">{interviewCount}</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {interviewCount}/{PMF_REQUIRED_SIGNALS} interviews
            </p>
            <p className="text-xs text-muted-foreground">
              {remaining === 0
                ? 'Target reached — ready to run PMF Lab'
                : `${remaining} more to reach the recommended target`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Top segments */}
        {topSegments.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-1">Top segments</p>
            <p className="text-sm text-foreground">{topSegments.join(', ')}</p>
          </div>
        )}

        {/* Recent interviews */}
        {recentInterviews.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Recent interviews
            </p>
            {recentInterviews.map((interview, index) => (
              <div
                key={`${interview.name}-${index}`}
                className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-3 py-2"
              >
                <UserRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{interview.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{interview.segment}</p>
                </div>
                <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {BUYING_INTENT_LABELS[interview.buyingIntent] || interview.buyingIntent}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <Button asChild className="w-full gap-2">
          <Link to="/pmf-lab">
            {interviewCount === 0 ? 'Start Logging Interviews' : 'Add Interview'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
