import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { BizMapStageTasks } from '@/components/dashboard/BizMapStageTasks';
import { BizMapJourneyProgress } from '@/components/dashboard/BizMapJourneyProgress';
import { InterviewTrackerCard } from '@/components/dashboard/InterviewTrackerCard';
import { StageMapRail } from '@/components/focus-funnel/StageMapRail';
import { FundraisingFunnel } from '@/components/focus-funnel/FundraisingFunnel';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useSubscription } from '@/hooks/useSubscription';
import { normalizePlan } from '@/config/planPermissions';
import { useLeanStartupStore } from '@/store/leanStartupStore';

const FocusFunnel = () => {
  const { markToolUsed } = useLeanStartupStore();
  const { loading, currentStage, highestUnlockedStage, stageState, error } = useBizMapProgress();
  const { subscriptionData } = useSubscription();
  const currentPlan = normalizePlan(subscriptionData?.subscription_tier);
  const isPro = currentPlan === 'pro';

  useEffect(() => { markToolUsed('focus-funnel'); }, [markToolUsed]);

  return (
    <>
      <Helmet>
        <title>Focus Funnel — Creatives Takeover</title>
      </Helmet>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border border-border/60 bg-card/70 p-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading your stage map…
          </div>
        ) : (
          <>
            <StageMapRail
              currentStage={currentStage}
              highestUnlockedStage={highestUnlockedStage}
              stageState={stageState}
            />

            {isPro ? <FundraisingFunnel /> : null}

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <BizMapStageTasks />
              <div className="space-y-6">
                {currentStage === 'VALIDATING' ? <InterviewTrackerCard /> : null}
                <BizMapJourneyProgress />
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Want to plan beyond the stages?</p>
                  <p className="text-sm text-muted-foreground">
                    The AI Goals Planner turns broader outcomes into strategies and next actions.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link to="/ai-goals">Open AI Goals Planner</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default FocusFunnel;
