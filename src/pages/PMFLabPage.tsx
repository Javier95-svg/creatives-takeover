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

      <main className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">

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
      </main>

      <Footer />
    </div>
  );
}
