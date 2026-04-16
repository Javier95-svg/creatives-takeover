import { useEffect, useState } from 'react';
import SEO, { createBreadcrumbSchema, createFAQSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PageFAQSection from '@/components/seo/PageFAQSection';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { useLeanStartupStore } from '@/store/leanStartupStore';
import { usePMFLab } from '@/hooks/usePMFLab';
import PMFEvidenceForm from '@/components/pmf/PMFEvidenceForm';
import PMFScoringLoader from '@/components/pmf/PMFScoringLoader';
import PMFReadinessReport from '@/components/pmf/PMFReadinessReport';
import { PMFContextBanner } from '@/components/pmf/PMFContextBanner';
import { ActivationJourneyStrip } from '@/components/activation/ActivationJourneyStrip';
import { ArrowRight, Rocket } from 'lucide-react';
import { getToolJourneyGuide } from '@/lib/activationJourney';
import { PMF_REQUIRED_SIGNALS } from '@/lib/bizmapStages';
import { getPublicTabConfig } from '@/config/publicTabVisibility';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  const { markToolUsed } = useLeanStartupStore();

  const [icpPersonaName, setIcpPersonaName] = useState<string | null>(null);
  const [waitlistProductName, setWaitlistProductName] = useState<string | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    let active = true;
    const loadContext = async () => {
      setContextLoading(true);
      const [icpRes, waitlistRes] = await Promise.all([
        supabase
          .from('icp_analysis_results')
          .select('target_audience')
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
      setIcpPersonaName((icpRes.data as { target_audience: string | null } | null)?.target_audience ?? null);
      setWaitlistProductName((waitlistRes.data as { product_name: string | null } | null)?.product_name ?? null);
      setContextLoading(false);
    };

    void loadContext();
    return () => { active = false; };
  }, [user]);
  const faqs = [
    {
      question: 'What is a good product-market fit score?',
      answer:
        'A higher score means your startup has stronger evidence of demand, recurring pain, and momentum. In this tool, a score of 75 or above is treated as a stronger signal that you can move into building.',
    },
    {
      question: 'Can PMF Lab replace customer interviews?',
      answer:
        'No. PMF Lab works best when you bring real customer interviews, waitlist data, or traction evidence into the assessment. It helps interpret evidence, not invent it.',
    },
    {
      question: 'Should founders use PMF Lab before building an MVP?',
      answer:
        'Yes. The main use case is checking whether you have enough validation evidence to justify an MVP build instead of relying on assumptions.',
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
  }, [markToolUsed]);

  const {
    phase,
    analysis,
    analysisId,
    hasSavedReport,
    isSaving,
    isExporting,
    runAnalysis,
    saveReport,
    exportReport,
    resetToIntake,
  } = usePMFLab();
  const activationGuide = getToolJourneyGuide('/pmf-lab');

  const ruleCards = [
    {
      label: 'Score 75 or higher',
      title: 'Move to Building',
      description: 'You have enough demand evidence to scope your MVP and move into the building stage.',
      icon: Rocket,
      tone: 'border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-400',
    },
    {
      label: 'Score below 75',
      title: 'Iterate before building',
      description: 'PMF Lab will surface missing features, recurring objections, and what to improve before moving into development.',
      icon: ArrowRight,
      tone: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
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
                    PMF Lab is Phase 3 of the BizMap journey. Run at least {PMF_REQUIRED_SIGNALS} one-to-one interviews with potential customers, then submit your evidence here to find out if demand is strong enough to start building.
                  </p>
                </div>
              </div>

              {phase === 'intake' && user && (
                <PMFContextBanner
                  icpPersonaName={icpPersonaName}
                  waitlistProductName={waitlistProductName}
                  loading={contextLoading}
                  className="mb-2"
                />
              )}

              {phase === 'intake' && (
                <>
                  {activationGuide ? (
                    <ActivationJourneyStrip
                      stageLabel={activationGuide.stageLabel}
                      title={activationGuide.title}
                      description={activationGuide.description}
                      doneLabel={activationGuide.doneLabel}
                      completedLabel={activationGuide.completedLabel}
                      nextRoute={activationGuide.nextRoute}
                      nextLabel={activationGuide.nextLabel}
                      isComplete={hasSavedReport}
                      className="mb-6"
                    />
                  ) : null}
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
                  <div className="space-y-6">
                    {activationGuide ? (
                      <ActivationJourneyStrip
                        stageLabel={activationGuide.stageLabel}
                        title={activationGuide.title}
                        description={activationGuide.description}
                        doneLabel={activationGuide.doneLabel}
                        completedLabel={activationGuide.completedLabel}
                      />
                    ) : null}
                    <PMFEvidenceForm
                      onSubmit={() => {}}
                      isSubmitting={false}
                    />
                  </div>
                </PreviewModeWrapper>
              )
            ) : (
              <>
                {/* Phase A — Evidence Form */}
                {phase === 'intake' && (
                  <PMFEvidenceForm
                    onSubmit={runAnalysis}
                    isSubmitting={false}
                  />
                )}

                {/* Phase B — Scoring Loader */}
                {phase === 'analyzing' && <PMFScoringLoader />}

                {/* Phase C — PMF Readiness Report */}
                {phase === 'results' && analysis && (
                  <div className="space-y-6">
                    {activationGuide ? (
                      <ActivationJourneyStrip
                        stageLabel={activationGuide.stageLabel}
                        title={activationGuide.title}
                        description={activationGuide.description}
                        doneLabel={activationGuide.doneLabel}
                        completedLabel={activationGuide.completedLabel}
                        nextRoute={activationGuide.nextRoute}
                        nextLabel={activationGuide.nextLabel}
                        isComplete={hasSavedReport}
                      />
                    ) : null}
                    <PMFReadinessReport
                      analysis={analysis}
                      analysisId={analysisId}
                      isSaving={isSaving}
                      isExporting={isExporting}
                      onSave={saveReport}
                      onExport={exportReport}
                      onReanalyze={resetToIntake}
                    />
                  </div>
                )}
              </>
            )}

            <div className="mt-10 space-y-8">
              <PageFAQSection
                title="Frequent Questions"
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
