import { useEffect, useState } from 'react';
import SEO, { createBreadcrumbSchema, createFAQSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PageFAQSection from '@/components/seo/PageFAQSection';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { BlurredToolPreview } from '@/components/ui/BlurredToolPreview';
import { useLeanStartupStore } from '@/store/leanStartupStore';
import { usePMFLab } from '@/hooks/usePMFLab';
import PMFEvidenceForm from '@/components/pmf/PMFEvidenceForm';
import PMFScoringLoader from '@/components/pmf/PMFScoringLoader';
import PMFReadinessReport from '@/components/pmf/PMFReadinessReport';
import { PMFContextBanner } from '@/components/pmf/PMFContextBanner';
import { ArrowRight, Rocket } from 'lucide-react';
import { PMF_REQUIRED_SIGNALS } from '@/lib/bizmapStages';
import { getPublicTabConfig } from '@/config/publicTabVisibility';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';
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
  const { hasAccess, upgradeTarget } = usePlanAccess('pmf_lab');
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
      question: 'What does a PMF Readiness Score of 75 or higher actually mean?',
      answer:
        'A score of 75 or above means the evidence you submitted across five dimensions (validation setup, interview signals, recurring pain patterns, demand indicators, and your own founder conviction) is strong enough to justify moving into the building stage. It does not mean your product is guaranteed to succeed, but it means you have done the validation work that most founders skip, and the risk of building something nobody wants is substantially reduced.\n\nThe score is not arbitrary. Each dimension is weighted by how closely it correlates with real traction: recurring pain and buying intent signals count for more than founder enthusiasm alone. A founder who has run 25 or more one-on-one interviews, documented recurring objections, and has high-intent customers in two or more segments will score significantly higher than one relying on assumption-based surveys or general market research.\n\nScores below 75 come with a detailed gap report showing which dimensions are weakest and what specific evidence you need to gather before running the analysis again. Treat the score as a diagnostic, not a grade. The goal is to surface where your validation has gaps, not to block you from building.',
    },
    {
      question: 'Why does PMF Lab require 25 customer interviews before running the analysis?',
      answer:
        'Twenty-five one-on-one customer interviews is the minimum sample size needed to identify patterns that are statistically meaningful rather than anecdotal. With fewer than 10 interviews, a single enthusiastic prospect can skew every signal. At 25, segment-level trends start to emerge: you can see which customer types have the highest buying intent, which objections repeat across different demographics, and whether the pain you are solving is truly widespread or niche.\n\nPMF Lab will still run with fewer interviews if you acknowledge the reduced reliability. In that case, the report marks your score with a low sample size warning and weights your dimension scores more conservatively. This is intentional. A founder making a build decision on 8 interviews needs to know that the score carries more uncertainty than one built on 30.\n\nThe 25-interview target is not a bureaucratic gate. It is a forcing function that ensures the evidence feeding the AI analysis reflects real signal rather than confirmation bias. If you have not reached 25 yet, the Interview Tracker on your Stage III dashboard helps you log and monitor progress so you know exactly how many interviews you have left before your score will be reliable.',
    },
    {
      question: 'How does PMF Lab connect with ICP Builder and Waitlist Maker?',
      answer:
        'PMF Lab is designed as the third and final validation tool in the BizMap journey, and it builds directly on the work you did in Stage I and Stage II. In ICP Builder, you defined who your target customer is: their segment, recurring pain, and behavioral triggers. In Waitlist Maker, you tested whether that customer would express enough interest to sign up before your product exists. PMF Lab now asks whether the real-world evidence you have gathered confirms or contradicts those earlier assumptions.\n\nWhen you open PMF Lab, it automatically pulls your ICP persona name and your waitlist product name and displays them in a context banner. The questions in the evidence form are designed to be answered in relation to the ICP you defined and the waitlist you built, not in isolation. If your interview segments do not match your ICP target, or if buying intent from your waitlist leads is lower than expected, the report will surface that disconnect explicitly.\n\nThe output of PMF Lab, your PMF Readiness Score and the segment-level breakdown, is what you carry into Stage IV. It becomes the evidence base for scoping your MVP, prioritising features, and making the case to co-founders, advisors, or investors that you are building for a real, validated demand. Think of the three tools as one continuous workflow: define your customer, prove they want something, then verify the evidence is strong enough to build.',
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
                    The PMF Lab evaluates user feedback to score and explain a product's chances of market success, guiding whether to build or iterate.
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
                    <PMFEvidenceForm
                      onSubmit={() => {}}
                      isSubmitting={false}
                    />
                  </div>
                </PreviewModeWrapper>
              )
            ) : hasAccess ? (
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
