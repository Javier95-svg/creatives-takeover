import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { BIZMAP_STAGES, getStageByRoute, getToolByRoute, isStageUnlocked } from '@/lib/bizmapStages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StageRouteGuardProps {
  route: string;
  children: JSX.Element;
}

export default function StageRouteGuard({ route, children }: StageRouteGuardProps) {
  const { user } = useAuth();
  const location = useLocation();
  const { loading, progress, getLockReasonForRoute } = useBizMapProgress();
  const hasNotifiedRef = useRef(false);

  const stage = getStageByRoute(route);
  const tool = getToolByRoute(route);

  const unlocked = useMemo(() => {
    if (!progress || !stage) return true;
    return isStageUnlocked(stage, progress.highest_unlocked_stage);
  }, [progress, stage]);

  useEffect(() => {
    if (!user || loading || unlocked || hasNotifiedRef.current) return;
    hasNotifiedRef.current = true;
    toast.error('This tool is locked right now. Complete the required previous stage first.');
  }, [loading, unlocked, user]);

  if (!user || !stage) {
    return children;
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking your stage access...</p>
      </div>
    );
  }

  if (unlocked) {
    return children;
  }

  const reason = getLockReasonForRoute(route);
  const currentStage = progress?.current_stage;
  const currentStageRoute = currentStage
    ? BIZMAP_STAGES.find((item) => item.id === currentStage)?.tools[0]?.route
    : '/bizmap-ai';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-28">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Lock className="h-6 w-6 text-primary" />
              {tool?.name ?? 'This tool'} is locked
            </CardTitle>
            <CardDescription>{reason ?? 'Complete the prior stage to unlock this route.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You attempted to access <code>{location.pathname}</code>. Follow the guided journey to unlock this stage.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/bizmap-ai">
                  Open Stage Map
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={currentStageRoute || '/dashboard'}>Go to Next Recommended Step</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
