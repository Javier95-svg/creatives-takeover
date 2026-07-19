import { useEffect, useRef, useState } from 'react';
import SEO, { createBreadcrumbSchema, createFAQSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PageFAQSection from '@/components/seo/PageFAQSection';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { BlurredToolPreview } from '@/components/ui/BlurredToolPreview';
import { useLeanStartupStore } from '@/store/leanStartupStore';
import { usePMFLab } from '@/hooks/usePMFLab';
import { usePMFSurvey } from '@/hooks/usePMFSurvey';
import PMFEvidenceForm from '@/components/pmf/PMFEvidenceForm';
import PMFEvidenceHub, { type PMFHubRecommendation } from '@/components/pmf/PMFEvidenceHub';
import PMFEvidenceChecklist from '@/components/pmf/PMFEvidenceChecklist';
import PMFSeanEllisTest from '@/components/pmf/PMFSeanEllisTest';
import PMFScoringLoader from '@/components/pmf/PMFScoringLoader';
import PMFReadinessReport from '@/components/pmf/PMFReadinessReport';
import PMFCustomerDiscovery from '@/components/pmf/PMFCustomerDiscovery';
import PMFOutcomeCapture from '@/components/pmf/PMFOutcomeCapture';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, Rocket } from 'lucide-react';
import { PMF_REQUIRED_SIGNALS } from '@/lib/bizmapStages';
import { getPublicTabConfig } from '@/config/publicTabVisibility';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useCustomerDiscovery } from '@/hooks/useCustomerDiscovery';
import { captureEvent, trackToolOpened } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import type { PMFInterviewLeadSeed } from '@/components/pmf/PMFDiscoveryPipeline';

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'PMF Lab — Evidence Analyzer',
    description: 'Submit your real validation evidence and get a PMF Readiness Score. Find out if you have enough evidence to start building your MVP.',
    url: 'https://creatives-takeover.com/pmf-lab',
  },
];

export default function PMFLabPage() {
  const { user } = useAuth();
  const publicTab = getPublicTabConfig('/pmf-lab');
  const { hasAccess, upgradeTarget } = usePlanAccess('pmf_lab');
  const markToolUsed = useLeanStartupStore(s => s.markToolUsed);

  const [icpPersonaName, setIcpPersonaName] = useState<string | null>(null);
  const [icpIndustry, setIcpIndustry] = useState<string | null>(null);
  const [icpProblem, setIcpProblem] = useState<string | null>(null);
  const [waitlistProductName, setWaitlistProductName] = useState<string | null>(null);
  const [mode, setMode] = useState<'score' | 'discover'>('score');
  const [interviewLeadSeed, setInterviewLeadSeed] = useState<PMFInterviewLeadSeed | null>(null);
  // Progressive disclosure: only one detail step is expanded at a time so the
  // page opens with a single clear focus instead of a wall of stacked sections.
  const [activeStep, setActiveStep] = useState<'gather' | 'score'>('gather');
  const stepChosenRef = useRef(false);
  const [searchParams] = useSearchParams();
  const outcomeAnalysisId = searchParams.get('outcome');
  const hubViewedRef = useRef(false);
  const surveyRef = useRef<HTMLDivElement | null>(null);
  const scoreFormRef = useRef<HTMLDivElement | null>(null);

  const scrollTo = (ref: { current: HTMLDivElement | null }) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const chooseStep = (step: 'gather' | 'score') => {
    stepChosenRef.current = true;
    setActiveStep(step);
    requestAnimationFrame(() => scrollTo(step === 'gather' ? surveyRef : scoreFormRef));
  };

  useEffect(() => {
    if (!user) return;

    let active = true;
    const loadContext = async () => {
      const [icpRes, waitlistRes] = await Promise.all([
        supabase
          .from('icp_analysis_results')
          .select('target_audience, industry, business_description')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('waitlist_pages')
          .select('product_name')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!active) return;
      const icpRow = icpRes.data as { target_audience: string | null; industry: string | null; business_description: string | null } | null;
      setIcpPersonaName(icpRow?.target_audience ?? null);
      setIcpIndustry(icpRow?.industry ?? null);
      setIcpProblem(icpRow?.business_description ?? null);
      setWaitlistProductName((waitlistRes.data as { product_name: string | null } | null)?.product_name ?? null);
    };

    void loadContext();
    return () => { active = false; };
  }, [user]);
  const faqs = [
    {
      question: 'What does a PMF Readiness Score of 75 or higher actually mean?',
      answer:
        'A score of 75 or above can support a Build recommendation only when the report has also reached decision grade evidence. It does not guarantee success. It means the weighted customer and behavioral evidence is strong enough to justify the smallest next build.\n\nThe score combines five dimensions, while confidence comes from a separate evidence ladder. Five weighted signals are directional, ten reveal emerging patterns, and twenty five support a decision grade Build, Narrow, Pivot, or Stop recommendation. Interviews carry the most weight, hosted survey responses and verified demo behavior add direct evidence, and cited research can corroborate but cannot replace customer proof.\n\nLower confidence reports stay explicit about uncertainty and show the next evidence needed. Treat the score as a diagnostic, not a grade.',
    },
    {
      question: 'Why does PMF Lab use five, ten, and twenty five evidence signals?',
      answer:
        'At five weighted signals, PMF Lab can suggest the next validation direction without pretending a pattern is proven. At ten, repeated pains, objections, and behaviors begin to form an emerging pattern. At twenty five, the system can make a decision grade recommendation while still showing contradictions and missing evidence.\n\nThe sources are weighted because they are not equally strong. A structured customer interview carries full weight. Hosted survey responses and verified Demo Studio behavior carry substantial direct weight. Cited market research can corroborate a conclusion but cannot substitute for people acting or describing a recent behavior.\n\nPMF Lab can run early, but it caps confidence and keeps the recommendation provisional until the evidence earns the next level.',
    },
    {
      question: 'How does PMF Lab connect with ICP Builder and Demo Studio?',
      answer:
        'PMF Lab is designed as the third and final validation tool in the BizMap journey, and it builds directly on the work you did in Stage I and Stage II. In ICP Builder, you defined who your target customer is: their segment, recurring pain, and behavioral triggers. In Demo Studio, you tested whether that customer would express enough interest to sign up before your product exists. PMF Lab now asks whether the real-world evidence you have gathered confirms or contradicts those earlier assumptions.\n\nWhen you open PMF Lab, it automatically pulls your ICP persona name and your waitlist product name and displays them in a context banner. The questions in the evidence form are designed to be answered in relation to the ICP you defined and the waitlist you built, not in isolation. If your interview segments do not match your ICP target, or if buying intent from your waitlist leads is lower than expected, the report will surface that disconnect explicitly.\n\nThe output of PMF Lab, your PMF Readiness Score and the segment-level breakdown, is what you carry into Stage IV. It becomes the evidence base for scoping your MVP, prioritising features, and making the case to co-founders, advisors, or investors that you are building for a real, validated demand. Think of the three tools as one continuous workflow: define your customer, prove they want something, then verify the evidence is strong enough to build.',
    },
  ];
  const pageStructuredData = [
    ...structuredData,
    createFAQSchema(faqs),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'BizMap AI', url: '/bizmap-ai' },
      { name: 'PMF Lab', url: '/pmf-lab' },
    ]),
  ];

  useEffect(() => {
    markToolUsed('pmf-lab');
    captureEvent('pmf_lab_viewed', { is_authenticated: Boolean(user) });
    trackToolOpened('pmf_lab');
  }, [markToolUsed, user]);

  const {
    phase,
    analysis,
    analysisId,
    hasSavedReport,
    isSaving,
    isExporting,
    evidence,
    trend,
    runAnalysis,
    reScore,
    saveReport,
    saveSeanEllis,
    saveChecklist,
    exportReport,
    resetToIntake,
  } = usePMFLab();

  // Production PMF Lab path: score evidence via pmf-evidence-scorer.
  // market-validation-engine is broader market validation, and pmf-analyzer is legacy.
  const {
    survey,
    aggregate: surveyAggregate,
    shareUrl: surveyShareUrl,
    isCreating: isCreatingSurvey,
    createAndPublishSurvey,
  } = usePMFSurvey();

  const {
    discovery,
    loadDiscovery,
  } = useCustomerDiscovery();

  const customerDiscoverySignals =
    (discovery?.painPoints.length ?? 0) +
    (discovery?.people.length ?? 0) +
    (discovery?.communities.length ?? 0) +
    (discovery?.threads.length ?? 0);

  // The single next action to spotlight, in the canonical evidence order:
  // get the 40% survey signal → log interviews → save the checklist → score.
  const savedInterviews = evidence?.interview_notes_count ?? 0;
  const surveyResponsesCount = surveyAggregate.total || evidence?.survey_results_count || 0;
  const checklistCount = evidence?.validation_checklist?.length ?? 0;
  const hubRecommendation: PMFHubRecommendation = (() => {
    if (surveyResponsesCount === 0 && !survey) return 'survey';
    if (savedInterviews === 0) return 'interviews';
    if (checklistCount === 0) return 'checklist';
    return 'score';
  })();
  const recommendedStep: 'gather' | 'score' =
    hubRecommendation === 'survey' || hubRecommendation === 'checklist' ? 'gather' : 'score';

  // Default the open step to the recommendation until the user picks one themselves.
  useEffect(() => {
    if (stepChosenRef.current || phase !== 'intake' || mode !== 'score') return;
    setActiveStep(recommendedStep);
  }, [recommendedStep, phase, mode]);

  useEffect(() => {
    if (!user || !hasAccess || phase !== 'intake' || mode !== 'score' || hubViewedRef.current) return;
    captureEvent('pmf_evidence_hub_viewed', {
      saved_interviews: evidence?.interview_notes_count ?? 0,
      survey_responses: surveyAggregate.total,
      has_survey: Boolean(survey),
      customer_discovery_signals: customerDiscoverySignals,
    });
    hubViewedRef.current = true;
  }, [customerDiscoverySignals, evidence?.interview_notes_count, hasAccess, mode, phase, survey, surveyAggregate.total, user]);

  // Keep the per-user Sean Ellis evidence in sync with real survey responses, so the
  // 40% metric, the 25-signal count, and the score all reflect verified data silently.
  useEffect(() => {
    if (surveyAggregate.total > 0) {
      void saveSeanEllis(
        { very: surveyAggregate.very, somewhat: surveyAggregate.somewhat, not: surveyAggregate.not },
        { silent: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyAggregate.total, surveyAggregate.very, surveyAggregate.somewhat, surveyAggregate.not]);

  const surveyEvidence = surveyAggregate.total > 0
    ? {
        total: surveyAggregate.total,
        veryDisappointedPct: surveyAggregate.veryPct,
        sampleVerbatims: surveyAggregate.verbatims
          .map((v) => v.feedback || v.mainBenefit || '')
          .filter(Boolean)
          .slice(0, 5),
      }
    : undefined;

  const handleCreateSurvey = () => {
    void createAndPublishSurvey({
      productName: waitlistProductName ?? undefined,
      audience: icpPersonaName ?? undefined,
    });
  };

  const handleSurveyHubAction = () => {
    if (!survey) {
      handleCreateSurvey();
      return;
    }
    scrollTo(surveyRef);
  };

  const handleModeChange = (nextMode: 'score' | 'discover') => {
    if (nextMode === 'score') void loadDiscovery();
    setMode(nextMode);
  };
  const ruleCards = [
    {
      label: 'Score 75 or higher',
      title: 'Move to Building',
      description: 'You have enough demand evidence to scope your MVP and move into the building stage.',
      icon: Rocket,
      tone: 'border-success/25 bg-success/10 text-success dark:text-success',
    },
    {
      label: 'Score below 75',
      title: 'Iterate before building',
      description: 'PMF Lab will surface missing features, recurring objections, and what to improve before moving into development.',
      icon: ArrowRight,
      tone: 'border-warning/25 bg-warning/10 text-warning dark:text-warning',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="PMF Lab — Creatives Takeover"
        description="Submit your real customer validation evidence and get an AI-powered PMF Readiness Score. Know if you're ready to build before you commit."
        keywords="product market fit, PMF score, startup validation, customer evidence, lean startup"
        url="/pmf-lab"
        structuredData={pageStructuredData}
      />
      <Navigation />

      <main>
        <section className="px-4 pt-28 pb-20 md:pt-32 lg:pt-36 relative overflow-hidden">
          {/* Background — same as original PMF Lab */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
            <div
              className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(139, 92, 246, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(236, 72, 153, 0.35), transparent 55%)',
                animation: 'spin 28s linear infinite',
              }}
            />
          </div>

          <div className="container mx-auto max-w-5xl relative z-10">
            <div className="mb-12 space-y-8 animate-fade-in">
              <div className="text-center space-y-4">
                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold takeover-gradient creatives-font leading-tight pb-2">
                    PMF Lab
                  </h1>
                  <p className="mx-auto max-w-4xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                    The PMF Lab evaluates user feedback to score and explain a product's chances of market success, guiding whether to build or iterate.
                  </p>
                </div>
              </div>

              {phase === 'intake' && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {ruleCards.map(({ label, title, description, icon: Icon, tone }) => (
                      <div key={title} className={`rounded-2xl border p-5 ${tone}`}>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-xl bg-background/70 p-2 text-current">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</p>
                            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {!user ? (
              publicTab && (
                <PreviewModeWrapper
                  featureName={publicTab.featureName}
                  description={publicTab.description || ''}
                  showPricingCta={publicTab.showPricingCta}
                >
                  <div className="rounded-3xl border border-border/60 bg-background/90 p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                      Evidence-first PMF preview
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-foreground">
                      Log interviews, run the 40% test, then score the evidence.
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      PMF Lab is built to interpret customer proof, not just rate an idea. Create an account to save interviews, publish a Sean Ellis survey, and unlock the full evidence score.
                    </p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {['Interview log', 'Sean Ellis survey', 'Evidence score'].map((item) => (
                        <div key={item} className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm font-medium text-foreground">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </PreviewModeWrapper>
              )
            ) : hasAccess ? (
              <>
                {/* Outcome follow-up deep-link (from the "what happened?" email) */}
                {outcomeAnalysisId && (
                  <div className="mb-8">
                    <h2 className="mb-3 text-lg font-semibold text-foreground">Update what happened with your idea</h2>
                    <PMFOutcomeCapture analysisId={outcomeAnalysisId} />
                  </div>
                )}

                {/* Mode toggle — score existing evidence vs. find customers to talk to */}
                <div className="mb-6 flex justify-center">
                  <div className="inline-flex rounded-xl border border-border/60 bg-muted/30 p-1">
                    {([
                      { id: 'score' as const, label: 'Score my evidence' },
                      { id: 'discover' as const, label: 'Find customers to talk to' },
                    ]).map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleModeChange(id)}
                        className={cn(
                          'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                          mode === id
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {mode === 'discover' ? (
                  <PMFCustomerDiscovery
                    defaultProductName={waitlistProductName}
                    defaultTargetAudience={icpPersonaName}
                    defaultIndustry={icpIndustry}
                    defaultProblem={icpProblem}
                    onCompleted={() => void loadDiscovery()}
                    onLogInterview={(seed) => {
                      setInterviewLeadSeed(seed);
                      setMode('score');
                      setActiveStep('score');
                      requestAnimationFrame(() => scrollTo(scoreFormRef));
                    }}
                  />
                ) : (
                  <>
                    {/* Phase A — Evidence hub + guided steps (one open at a time) */}
                    {phase === 'intake' && (
                      <div className="space-y-6">
                        <PMFEvidenceHub
                          evidence={evidence}
                          requiredSignals={PMF_REQUIRED_SIGNALS}
                          survey={survey}
                          surveyAggregate={surveyAggregate}
                          customerDiscoverySignals={customerDiscoverySignals}
                          recommended={hubRecommendation}
                          onLogInterviews={() => chooseStep('score')}
                          onCreateOrReviewSurvey={() => { chooseStep('gather'); handleSurveyHubAction(); }}
                          onFindCustomers={() => setMode('discover')}
                          onRunScore={() => chooseStep('score')}
                        />

                        {/* Step 1 — Gather evidence */}
                        <div ref={surveyRef} className="scroll-mt-28 overflow-hidden rounded-3xl border border-border/60 bg-background/70">
                          <button
                            type="button"
                            onClick={() => chooseStep('gather')}
                            className="flex w-full items-center justify-between gap-3 p-5 text-left"
                            aria-expanded={activeStep === 'gather'}
                          >
                            <div className="flex items-center gap-3">
                              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold', activeStep === 'gather' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>1</span>
                              <div>
                                <p className="text-base font-semibold text-foreground">Gather your evidence</p>
                                <p className="text-xs text-muted-foreground">Run the Sean Ellis 40% survey and check off the validation milestones you've hit.</p>
                              </div>
                            </div>
                            <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', activeStep === 'gather' && 'rotate-180')} />
                          </button>
                          <div className={cn('border-t border-border/60 p-5', activeStep !== 'gather' && 'hidden')}>
                            <div className="grid gap-4 lg:grid-cols-2">
                              <PMFEvidenceChecklist
                                evidence={evidence}
                                requiredSignals={PMF_REQUIRED_SIGNALS}
                                onSaveChecklist={saveChecklist}
                              />
                              <PMFSeanEllisTest
                                initialVery={evidence?.sean_ellis_very_disappointed}
                                initialSomewhat={evidence?.sean_ellis_somewhat_disappointed}
                                initialNot={evidence?.sean_ellis_not_disappointed}
                                onSave={saveSeanEllis}
                                survey={survey}
                                surveyAggregate={surveyAggregate}
                                shareUrl={surveyShareUrl}
                                isCreatingSurvey={isCreatingSurvey}
                                onCreateSurvey={handleCreateSurvey}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Step 2 — Score your evidence */}
                        <div ref={scoreFormRef} className="scroll-mt-28 overflow-hidden rounded-3xl border border-border/60 bg-background/70">
                          <button
                            type="button"
                            onClick={() => chooseStep('score')}
                            className="flex w-full items-center justify-between gap-3 p-5 text-left"
                            aria-expanded={activeStep === 'score'}
                          >
                            <div className="flex items-center gap-3">
                              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold', activeStep === 'score' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>2</span>
                              <div>
                                <p className="text-base font-semibold text-foreground">Score your evidence</p>
                                <p className="text-xs text-muted-foreground">Log your interviews and demand signals, then get your PMF Readiness Score.</p>
                              </div>
                            </div>
                            <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', activeStep === 'score' && 'rotate-180')} />
                          </button>
                          {/* Kept mounted (hidden) when collapsed so in-progress form answers survive. */}
                          <div className={cn('border-t border-border/60 p-5', activeStep !== 'score' && 'hidden')}>
                            <PMFEvidenceForm
                              initialInterviewLead={interviewLeadSeed}
                              onSubmit={(answers) => runAnalysis(answers, {
                                businessContext: {
                                  productName: waitlistProductName ?? undefined,
                                  targetAudience: icpPersonaName ?? undefined,
                                },
                                surveyEvidence,
                              })}
                              isSubmitting={false}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Phase B — Scoring Loader */}
                    {phase === 'analyzing' && <PMFScoringLoader />}

                    {/* Phase C — PMF Readiness Report */}
                    {phase === 'results' && analysis && (
                      <div className="space-y-6">
                        <PMFReadinessReport
                          analysis={analysis}
                          analysisId={analysisId}
                          isSaving={isSaving}
                          isExporting={isExporting}
                          evidence={evidence}
                          trend={trend}
                          onSave={saveReport}
                          onExport={exportReport}
                          onReanalyze={resetToIntake}
                          onReScore={reScore}
                          onSaveSeanEllis={saveSeanEllis}
                          onSaveChecklist={saveChecklist}
                          onFindCustomers={() => setMode('discover')}
                          survey={survey}
                          surveyAggregate={surveyAggregate}
                          surveyShareUrl={surveyShareUrl}
                          isCreatingSurvey={isCreatingSurvey}
                          onCreateSurvey={handleCreateSurvey}
                          customerDiscoverySignalCount={customerDiscoverySignals}
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <BlurredToolPreview
                featureName="PMF Lab"
                unlockCondition="PMF Lab is available on the Starter plan and above."
                requiredPlan={upgradeTarget}
                locked
              >
                <div />
              </BlurredToolPreview>
            )}

            <div className="mt-10 space-y-8">
              <PageFAQSection
                title="FAQ"
                faqs={faqs}
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
