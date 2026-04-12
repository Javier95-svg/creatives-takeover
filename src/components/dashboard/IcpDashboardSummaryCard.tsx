import { Link } from 'react-router-dom';
import { ArrowRight, Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PrimaryIcpDashboardData } from '@/hooks/usePersonalizedDashboard';

interface IcpDashboardSummaryCardProps {
  primaryIcp: PrimaryIcpDashboardData;
}

export function IcpDashboardSummaryCard({ primaryIcp }: IcpDashboardSummaryCardProps) {
  const { summary } = primaryIcp;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/12 via-card to-card shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">ICP Activated</Badge>
          <Badge variant="secondary">{summary.suggestedStage}</Badge>
        </div>
        <CardTitle className="text-2xl sm:text-3xl">
          Your dashboard is now tuned for {summary.personaName}.
        </CardTitle>
        <CardDescription className="max-w-3xl text-sm sm:text-base">
          Industry: {summary.industry}. Core pain: {summary.corePainPoint}. Offer angle: {summary.valueProposition}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Primary customer</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{summary.roleLine}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Use this ICP Draft as the operating context for what you test, ship, and message next.
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <div className="flex items-center gap-2 text-primary">
            <Target className="h-4.5 w-4.5" />
            <p className="text-xs uppercase tracking-[0.18em]">Confidence</p>
          </div>
          <p className="mt-2 text-lg font-semibold capitalize text-foreground">{summary.confidenceLevel}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/dashboard#my-files">
                Open My Files
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/icp/draft/${primaryIcp.analysisId}`}>Open Draft Page</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
