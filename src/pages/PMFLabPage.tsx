import { useEffect } from 'react';
import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useLeanStartupStore } from '@/store/leanStartupStore';
import { usePMFLab } from '@/hooks/usePMFLab';
import PMFEvidenceForm from '@/components/pmf/PMFEvidenceForm';
import PMFScoringLoader from '@/components/pmf/PMFScoringLoader';
import PMFReadinessReport from '@/components/pmf/PMFReadinessReport';

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
        <section className="py-20 px-4 relative overflow-hidden">
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
            {/* Page header — shown on intake phase only */}
            {phase === 'intake' && (
              <div className="text-center mb-12 sm:mb-16 animate-fade-in">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 takeover-gradient creatives-font leading-tight pb-2">
                  PMF Lab
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4" style={{ animationDelay: '0.2s' }}>
                  Submit the real feedback you collected from potential customers and find out if your evidence is strong enough to start building your MVP.
                </p>
              </div>
            )}

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
