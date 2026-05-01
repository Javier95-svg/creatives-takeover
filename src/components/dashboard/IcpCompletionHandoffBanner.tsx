import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { PersonalizedRecommendation, PrimaryIcpDashboardData } from '@/hooks/usePersonalizedDashboard';

interface IcpCompletionHandoffBannerProps {
  primaryIcp: PrimaryIcpDashboardData | null;
  recommendations: PersonalizedRecommendation[];
}

export function IcpCompletionHandoffBanner({
  primaryIcp,
  recommendations,
}: IcpCompletionHandoffBannerProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  if (searchParams.get('icpCompleted') !== '1' || !primaryIcp) {
    return null;
  }

  const nextAction =
    recommendations.find((recommendation) => {
      const metadata = recommendation.metadata ?? {};
      return metadata.draft_driven === true || metadata.category === 'icp_bootstrap';
    }) ?? recommendations[0] ?? null;

  const { summary, analysisId } = primaryIcp;
  const actionUrl = nextAction?.action_url || '/dashboard#my-files';
  const actionLabel = nextAction?.title || 'Open My Files';

  const dismiss = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('icpCompleted');
    navigate(
      {
        pathname: '/dashboard',
        search: nextParams.toString() ? `?${nextParams.toString()}` : '',
      },
      { replace: true },
    );
  };

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-primary/12 via-card to-card shadow-sm">
      <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            ICP Completed
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Your ICP for {summary.personaName} is live.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Your dashboard is now prioritizing actions for {summary.roleLine}.
            </p>
          </div>
          {nextAction ? (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Next recommended action: <span className="font-medium text-foreground">{nextAction.description}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          <Button asChild>
            <Link to={actionUrl}>
              {actionLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/icp/draft/${analysisId}`}>Open Draft</Link>
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={dismiss} aria-label="Dismiss ICP completion banner">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default IcpCompletionHandoffBanner;
