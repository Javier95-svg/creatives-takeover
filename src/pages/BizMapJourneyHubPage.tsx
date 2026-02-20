import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, Circle, Lock, ArrowRight } from 'lucide-react';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import {
  BIZMAP_STAGES,
  getRequiredUnlockMessage,
  getStageIndex,
  getStageByRoute,
  isStageUnlocked,
  type BizMapToolDefinition,
} from '@/lib/bizmapStages';

interface LockedToolState {
  tool: BizMapToolDefinition;
  message: string;
}

export default function BizMapJourneyHubPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    currentStage,
    highestUnlockedStage,
    stageState,
    loading,
    setCurrentStage,
  } = useBizMapProgress();

  const [lockedTool, setLockedTool] = useState<LockedToolState | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId) {
      navigate(`/bizmap-ai/chat?session=${sessionId}`, { replace: true });
    }
  }, [navigate, searchParams]);

  const currentStageDef = useMemo(
    () => BIZMAP_STAGES.find((stage) => stage.id === currentStage),
    [currentStage],
  );

  const progressValue = useMemo(() => {
    const completedStages = BIZMAP_STAGES.filter((stage) => stageState[stage.id]?.completed).length;
    return Math.round((completedStages / BIZMAP_STAGES.length) * 100);
  }, [stageState]);

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'BizMap AI - Stage Journey',
      description:
        'A 5-stage guided startup journey that progressively unlocks tools from ICP to GTM launch.',
      url: 'https://creatives-takeover.com/bizmap-ai',
    },
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'BizMap AI', url: '/bizmap-ai' },
    ]),
  ];

  const openLockedDialog = (tool: BizMapToolDefinition) => {
    const stage = getStageByRoute(tool.route);
    const message = stage ? getRequiredUnlockMessage(stage) : 'Complete prior stage work to unlock this tool.';
    setLockedTool({ tool, message });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="BizMap AI - Startup Development Cycle"
        description="Progress through Identity, Prototype, Validation, Building, and Launch with smart unlocks and stage-aware actions."
        keywords="startup stages, product validation, waitlist, pmf, mvp, go-to-market"
        url="/bizmap-ai"
        structuredData={structuredData}
      />
      <Navigation />

      <main className="py-20 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          <section className="space-y-4 text-center">
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1">BizMap AI Guided Journey</Badge>
            <h1 className="text-3xl md:text-5xl font-bold creatives-font takeover-gradient">5-Stage Founder System</h1>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Unlock one stage at a time. Complete required work to open the next stage and keep your dashboard aligned with what matters now.
            </p>

            <div className="mx-auto max-w-3xl rounded-xl border border-primary/20 bg-card/80 p-4 text-left">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Current stage</p>
                  <p className="text-xl font-semibold">
                    Stage {currentStageDef?.numeral}: {currentStageDef?.title}
                  </p>
                </div>
                <Badge variant="secondary">{progressValue}% stages completed</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {BIZMAP_STAGES.map((stage) => {
                  const state = stageState[stage.id];
                  const isActive = stage.id === currentStage;
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => setCurrentStage(stage.id)}
                      disabled={!state?.unlocked}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        isActive
                          ? 'border-primary bg-primary/10 text-primary'
                          : state?.unlocked
                            ? 'border-border text-foreground hover:bg-muted'
                            : 'border-border/60 text-muted-foreground/60'
                      }`}
                    >
                      {state?.completed ? <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> : <Circle className="mr-1 inline h-3.5 w-3.5" />}
                      Stage {stage.numeral}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {BIZMAP_STAGES.map((stage) => {
              const isUnlocked = loading ? stage.order <= 2 : isStageUnlocked(stage.id, highestUnlockedStage);
              const isCompleted = !!stageState[stage.id]?.completed;

              return (
                <Card key={stage.id} className={`border ${isUnlocked ? 'border-primary/20' : 'border-border/60 opacity-85'}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-xl">
                        Stage {stage.numeral}: {stage.title}
                      </CardTitle>
                      {isCompleted ? (
                        <Badge className="bg-green-500/10 text-green-700 border-green-500/30">Completed</Badge>
                      ) : isUnlocked ? (
                        <Badge variant="secondary">Unlocked</Badge>
                      ) : (
                        <Badge variant="outline">
                          <Lock className="mr-1 h-3.5 w-3.5" />
                          Locked
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{stage.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stage.tools.map((tool) => {
                      const ToolIcon = tool.icon;
                      const toolUnlocked = isUnlocked;

                      return (
                        <div
                          key={tool.id}
                          className="rounded-lg border border-border/60 bg-background/70 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <ToolIcon className="mt-0.5 h-4 w-4 text-primary" />
                              <div>
                                <p className="text-sm font-semibold">
                                  {tool.name}
                                  {tool.beta ? <Badge className="ml-2 bg-amber-500/10 text-amber-700 border-amber-500/30">Beta mode</Badge> : null}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
                              </div>
                            </div>
                            {toolUnlocked ? (
                              <Button size="sm" variant="outline" asChild>
                                <Link to={tool.route}>Open</Link>
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => openLockedDialog(tool)}>
                                Why locked?
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="rounded-xl border border-primary/20 bg-card/80 p-6">
            <h2 className="text-xl font-semibold">Unlock logic</h2>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              <p>New users start with Stage I and Stage II unlocked.</p>
              <p>Complete Stage I + II to unlock Stage III.</p>
              <p>Complete Stage III to unlock Stage IV.</p>
              <p>Complete Stage IV to unlock Stage V.</p>
            </div>
          </section>
        </div>
      </main>

      <Footer />

      <Dialog open={!!lockedTool} onOpenChange={(open) => !open && setLockedTool(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lockedTool?.tool.name} is locked</DialogTitle>
            <DialogDescription>{lockedTool?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLockedTool(null)}>Close</Button>
            <Button asChild>
              <Link to="/dashboard">
                Go to dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
