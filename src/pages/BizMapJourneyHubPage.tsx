import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO, { createBreadcrumbSchema, createFAQSchema, createSoftwareApplicationSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PageFAQSection from '@/components/seo/PageFAQSection';
import RelatedToolsSection from '@/components/seo/RelatedToolsSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { trackActivationFunnelEvent } from '@/lib/analytics';
import { getActivationPreferenceState } from '@/lib/activationState';
import { buildActivationSummary, trackRetentionEvent, type ActivationIntent } from '@/lib/retentionSystem';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { BIZMAP_STAGES } from '@/lib/bizmapStages';

interface BizMapPrimaryAction {
  title: string;
  description: string;
  actionUrl: string;
  activationIntent: ActivationIntent | null;
  source: string;
}

export default function BizMapJourneyHubPage() {
  const { user } = useAuth();
  const {
    currentStage,
    stageState,
    setCurrentStage,
  } = useBizMapProgress();
  const [primaryAction, setPrimaryAction] = useState<BizMapPrimaryAction>({
    title: 'Build your demo and pitch video',
    description: 'Start with the fastest aha moment: turn screenshots into a live demo before exploring the full roadmap.',
    actionUrl: '/demo-studio/try',
    activationIntent: 'build_demo',
    source: 'bizmap_default_demo',
  });

  const currentStageDef = useMemo(
    () => BIZMAP_STAGES.find((stage) => stage.id === currentStage),
    [currentStage],
  );

  const progressValue = useMemo(() => {
    const completedStages = BIZMAP_STAGES.filter((stage) => stageState[stage.id]?.completed).length;
    return Math.round((completedStages / BIZMAP_STAGES.length) * 100);
  }, [stageState]);

  useEffect(() => {
    let cancelled = false;

    const resolvePrimaryAction = async () => {
      if (!user) {
        trackActivationFunnelEvent('bizmap_ai_opened', {
          source: 'bizmap_hub',
          selected_path: '/demo-studio/try',
          activation_intent: 'build_demo',
        });
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('user_preferences')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      const activationState = getActivationPreferenceState(data?.user_preferences);
      if (activationState.activationIntent && activationState.needsFirstArtifact) {
        const summary = buildActivationSummary(activationState.activationIntent);
        setPrimaryAction({
          title: summary.title,
          description: summary.description,
          actionUrl: summary.actionUrl,
          activationIntent: activationState.activationIntent,
          source: 'bizmap_activation_continue',
        });
        trackActivationFunnelEvent('bizmap_ai_opened', {
          user_id: user.id,
          source: 'bizmap_hub',
          selected_path: summary.actionUrl,
          activation_intent: activationState.activationIntent,
          first_result_mode: true,
        });
        return;
      }

      setPrimaryAction({
        title: activationState.firstArtifactResumeUrl ? 'Resume your latest artifact' : 'Open your dashboard roadmap',
        description: activationState.firstArtifactResumeUrl
          ? 'Pick up from the last startup asset you saved and keep building from there.'
          : 'Use your dashboard to choose the next tool in your startup roadmap.',
        actionUrl: activationState.firstArtifactResumeUrl ?? '/dashboard',
        activationIntent: activationState.activationIntent,
        source: 'bizmap_dashboard_continue',
      });
      trackActivationFunnelEvent('bizmap_ai_opened', {
        user_id: user.id,
        source: 'bizmap_hub',
        selected_path: activationState.firstArtifactResumeUrl ?? '/dashboard',
        activation_intent: activationState.activationIntent,
        first_artifact_type: activationState.firstArtifactType,
      });
    };

    void resolvePrimaryAction();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handlePrimaryActionClick = () => {
    trackActivationFunnelEvent('first_action_opened', {
      user_id: user?.id ?? null,
      activation_intent: primaryAction.activationIntent,
      selected_path: primaryAction.actionUrl,
      source: primaryAction.source,
    });
    if (user?.id) {
      void trackRetentionEvent('activation_first_action_opened', {
        user_id: user.id,
        activation_intent: primaryAction.activationIntent,
        selected_path: primaryAction.actionUrl,
        source: primaryAction.source,
      });
    }
  };

  const faqs = [
    {
      question: 'What does BizMap AI help founders do?',
      answer:
        'BizMap AI helps founders validate a startup idea, define an ideal customer, scope an MVP, test demand, and prepare for launch inside one connected workflow.',
    },
    {
      question: 'Is BizMap AI better for new ideas or existing startups?',
      answer:
        'It is strongest for early-stage ideas and pre-launch startups, but founders with an existing product can still use it to tighten positioning, validation, and launch planning.',
    },
    {
      question: 'What happens after idea validation in BizMap AI?',
      answer:
        'After validation, the workflow moves into customer targeting, product-market fit review, MVP planning, demand testing, and go-to-market execution so you do not restart from scratch at each step.',
    },
  ];

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'BizMap AI - AI Startup Builder',
      description:
        'AI startup builder for founders working through validation, MVP planning, launch preparation, and go-to-market execution.',
      url: 'https://creatives-takeover.com/bizmap-ai',
    },
    createSoftwareApplicationSchema({
      name: 'BizMap AI',
      description:
        'AI startup builder for founders who need validation workflows, customer research, MVP planning, and launch support in one platform.',
      url: '/bizmap-ai',
      featureList: ['ICP Builder', 'PMF Lab', 'Demo Studio', 'MVP Builder', 'GTM Strategist'],
    }),
    createFAQSchema(faqs),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'BizMap AI', url: '/bizmap-ai' },
    ]),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="AI Startup Builder & Validation Tools | Creatives Takeover"
        description="Use BizMap AI to validate a startup idea, define your ideal customer, plan your MVP, and move into launch with a clearer founder workflow."
        keywords="ai startup builder, startup validation tools, founder workflow, mvp planning, go to market strategy"
        url="/bizmap-ai"
        structuredData={structuredData}
      />
      <Navigation />

      <main className="px-4 pt-28 pb-20 md:pt-32 lg:pt-36">
        <div className="container mx-auto max-w-6xl space-y-8">
          <section className="space-y-4 text-center">
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1">AI Startup Builder</Badge>
            <h1 className="text-3xl md:text-5xl font-bold creatives-font takeover-gradient">Startup Development Cycle For Founders</h1>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Move from idea validation to MVP planning and launch with a structured founder workflow covering customer research, PMF, product scope, and go-to-market.
            </p>

            <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 rounded-xl border border-primary/20 bg-card/80 p-4 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">{primaryAction.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{primaryAction.description}</p>
                </div>
              </div>
              <Button asChild className="w-full shrink-0 gap-2 sm:w-auto" onClick={handlePrimaryActionClick}>
                <Link to={primaryAction.actionUrl}>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

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
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        isActive
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-foreground hover:bg-muted'
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
              const isCompleted = !!stageState[stage.id]?.completed;

              return (
                <Card key={stage.id} className="border border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-xl">
                        Stage {stage.numeral}: {stage.title}
                      </CardTitle>
                      {isCompleted ? (
                        <Badge className="bg-success/10 text-success border-success/30">Completed</Badge>
                      ) : (
                        <Badge variant="secondary">In progress</Badge>
                      )}
                    </div>
                    <CardDescription>{stage.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stage.tools.map((tool) => {
                      const ToolIcon = tool.icon;

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
                                  {tool.beta ? <Badge className="ml-2 bg-warning/10 text-warning border-warning/30">Beta mode</Badge> : null}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" asChild>
                              <Link to={tool.route}>Open</Link>
                            </Button>
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
            <h2 className="text-xl font-semibold">Stage flow</h2>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              <p>Use Stage I to define your customer and core problem.</p>
              <p>Use Stage II to shape your prototype and early offer.</p>
              <p>Use Stage III to validate demand with real signals.</p>
              <p>Use Stage IV and V to build and execute launch plans.</p>
            </div>
          </section>

          <PageFAQSection
            title="Frequent Questions"
            faqs={faqs}
          />
          <RelatedToolsSection
            tools={[
              { name: "ICP Builder", description: "Define your ideal customer before you build.", url: "/icp-builder" },
              { name: "PMF Lab", description: "Score product-market fit signals across six dimensions.", url: "/pmf-lab" },
              { name: "Go-to-Market Strategist", description: "Build an evidence-ranked six-week GTM system and adapt it from weekly results.", url: "/go-to-market" },
            ]}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
