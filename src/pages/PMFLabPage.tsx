import { useEffect } from 'react';
import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useLeanStartupStore } from '@/store/leanStartupStore';
import { usePMFLab } from '@/hooks/usePMFLab';
import PMFEvidenceForm from '@/components/pmf/PMFEvidenceForm';
import PMFScoringLoader from '@/components/pmf/PMFScoringLoader';
import PMFReadinessReport from '@/components/pmf/PMFReadinessReport';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, BrainCircuit, FlaskConical, Lightbulb, MessageSquareQuote, Rocket } from 'lucide-react';
import { PMF_REQUIRED_SIGNALS } from '@/lib/bizmapStages';

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'PMF Lab — Evidence Analyzer',
    description: 'Submit your real validation evidence and get a PMF Readiness Score. Find out if you have enough evidence to start building your MVP.',
    url: 'https://creatives-takeover.com/pmf-lab',
  },
  createBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'BizMap AI', url: '/bizmap-ai' },
    { name: 'PMF Lab', url: '/pmf-lab' },
  ]),
];

export default function PMFLabPage() {
  const { markToolUsed } = useLeanStartupStore();

  useEffect(() => {
    markToolUsed('pmf-lab');
  }, [markToolUsed]);

  const {
    phase,
    analysis,
    isSaving,
    isExporting,
    runAnalysis,
    saveReport,
    exportReport,
    resetToIntake,
  } = usePMFLab();

  const workflowCards = [
    {
      title: 'Stage II Input',
      description: 'Use the landing page you already created in Prototyping as the asset you show in customer interviews.',
      icon: Lightbulb,
    },
    {
      title: `${PMF_REQUIRED_SIGNALS} Founder Interviews`,
      description: 'Capture structured notes from real conversations before you commit time or money to building.',
      icon: MessageSquareQuote,
    },
    {
      title: 'AI PMF Decision',
      description: 'Get a score from 1 to 100, a clear explanation, and a next-step decision tied to the Building stage.',
      icon: BrainCircuit,
    },
  ];

  const ruleCards = [
    {
      label: '75 or higher',
      title: 'Move to Building',
      description: 'You have enough demand evidence to scope the MVP and move into Stage IV.',
      icon: Rocket,
      tone: 'border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-400',
    },
    {
      label: 'Below 75',
      title: 'Iterate before building',
      description: 'PMF Lab will surface missing features, recurring objections, and what to improve before testing again.',
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
        structuredData={structuredData}
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
                <Badge className="border-primary/20 bg-primary/10 text-primary">Stage III: VALIDATION</Badge>
                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold takeover-gradient creatives-font leading-tight pb-2">
                    PMF Lab
                  </h1>
                  <p className="mx-auto max-w-4xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                    AI-powered customer validation for startup founders. Use your Stage II landing page, interview at least {PMF_REQUIRED_SIGNALS} potential customers, and let PMF Lab tell you if demand is real enough to start building.
                  </p>
                </div>
              </div>

              {phase === 'intake' && (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    {workflowCards.map(({ title, description, icon: Icon }) => (
                      <Card key={title} className="border-border/60 bg-background/80 backdrop-blur">
                        <CardContent className="space-y-4 p-5">
                          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="space-y-2">
                            <h2 className="text-base font-semibold">{title}</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

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
              <PMFReadinessReport
                analysis={analysis}
                isSaving={isSaving}
                isExporting={isExporting}
                onSave={saveReport}
                onExport={exportReport}
                onReanalyze={resetToIntake}
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
