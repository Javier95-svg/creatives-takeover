import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2, Sparkles, Target, TrendingUp } from 'lucide-react';
import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { PitchDeckUploader } from '@/components/pitch-deck-analyzer/PitchDeckUploader';
import { AnalysisResults } from '@/components/pitch-deck-analyzer/AnalysisResults';
import { PitchDeckBuilder } from '@/components/pitch-deck-builder/PitchDeckBuilder';
import { usePitchDeckAnalyzer } from '@/hooks/usePitchDeckAnalyzer';
import { useReadingAnalytics } from '@/hooks/useReadingAnalytics';
import { Button } from '@/components/ui/button';

const PROCESSING_COPY: Record<
  NonNullable<ReturnType<typeof usePitchDeckAnalyzer>['processingStage']>,
  { title: string; description: string }
> = {
  idle: {
    title: 'Ready to analyze',
    description: 'Upload a PDF deck to start the scoring workflow.',
  },
  uploading: {
    title: 'Uploading your pitch deck...',
    description: 'Securing the file before parsing begins.',
  },
  parsing: {
    title: 'Parsing slides and extracting content...',
    description: 'Turning the PDF into structured text for the analyzer.',
  },
  analyzing: {
    title: 'Scoring the deck across 6 investor dimensions...',
    description: 'Evaluating clarity, market, traction, model, team, and raise readiness.',
  },
  saving: {
    title: 'Saving your analysis...',
    description: 'Wrapping up the report so you can review and iterate.',
  },
};

export default function PitchDeckAnalyzerPage() {
  const { trackPageVisit } = useReadingAnalytics();
  const {
    analyzePitchDeck,
    submitFeedback,
    resetAnalysis,
    uploading,
    analyzing,
    analysis,
    error,
    isProcessing,
    processingStage,
  } = usePitchDeckAnalyzer();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    trackPageVisit('Pitch Deck Analyzer');
  }, [trackPageVisit]);

  const processingCopy = useMemo(
    () => PROCESSING_COPY[processingStage],
    [processingStage]
  );

  const handleStartAssessment = async () => {
    if (!selectedFile) return;
    await analyzePitchDeck(selectedFile);
  };

  const handleStartNew = () => {
    resetAnalysis();
    setSelectedFile(null);
  };

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Pitch Deck Analyzer - AI-Powered Pitch Deck Assessment',
      description:
        'Get instant AI-powered analysis of your pitch deck. Receive a comprehensive score across 6 key dimensions with actionable feedback to improve your fundraising success.',
      url: 'https://creatives-takeover.com/insighta/pitch-deck-analyzer',
      publisher: {
        '@type': 'Organization',
        name: 'Creatives Takeover',
        logo: {
          '@type': 'ImageObject',
          url: 'https://creatives-takeover.com/lovable-uploads/new-favicon.png',
        },
      },
    },
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Insighta', url: '/insighta' },
      { name: 'Pitch Deck Analyzer', url: '/insighta/pitch-deck-analyzer' },
    ]),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Pitch Deck Analyzer - AI-Powered Assessment"
        description="Get instant AI-powered analysis of your pitch deck. Comprehensive scoring across story, market, traction, business model, team, and fundraising readiness."
        keywords="pitch deck analyzer, pitch deck score, investor presentation analysis, fundraising assessment, startup pitch analysis"
        url="/insighta/pitch-deck-analyzer"
        structuredData={structuredData}
      />
      <Navigation />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.1),transparent_24%),radial-gradient(circle_at_10%_20%,rgba(34,211,238,0.18),transparent_26%),linear-gradient(180deg,rgba(248,250,252,0.96),rgba(248,250,252,1))]" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(to right, rgba(15,23,42,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.6) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
          <div className="absolute -left-24 top-36 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="absolute right-0 top-12 h-[28rem] w-[28rem] rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        </div>

        <section
          className="relative z-10 px-4 pb-20 pt-28 md:pt-32 lg:pt-36"
          data-section="pitch-deck-analyzer"
        >
          <div className="container mx-auto max-w-6xl">
            {!analysis ? (
              <>
                <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                      Pitch Deck Analyzer
                    </p>
                    <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                      Investor-grade scoring for the deck you are about to send
                    </h1>
                    <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
                      Upload the PDF export of your deck and get a 1–100 score, a full six-part
                      breakdown, missing-section detection, and practical revision guidance that
                      helps you tighten the story before outreach.
                    </p>

                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-[24px] border border-border/60 bg-background/75 p-4 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.75)]">
                        <div className="rounded-2xl bg-primary/10 p-2.5 text-primary w-fit">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 font-semibold">1–100 quality score</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Weighted scoring across story, market, traction, model, team, and raise readiness.
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-border/60 bg-background/75 p-4 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.75)]">
                        <div className="rounded-2xl bg-primary/10 p-2.5 text-primary w-fit">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 font-semibold">Actionable recommendations</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Prioritized fixes based on what weakens investor conviction right now.
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-border/60 bg-background/75 p-4 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.75)]">
                        <div className="rounded-2xl bg-primary/10 p-2.5 text-primary w-fit">
                          <Target className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 font-semibold">Template-ready workflow</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Move directly from diagnosis into deck templates, frameworks, and tools.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,#081421_0%,#10263d_48%,#173b52_100%)] p-6 text-white shadow-[0_50px_120px_-70px_rgba(8,20,33,1)] sm:p-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/55">
                          Analyzer flow
                        </p>
                        <h2 className="mt-3 text-2xl font-semibold">Upload, parse, score, improve</h2>
                      </div>
                      <Sparkles className="h-5 w-5 text-cyan-300" />
                    </div>

                    <div className="mt-6 space-y-4">
                      {[
                        'Extracts slide text from your PDF export',
                        'Evaluates six investor-facing dimensions',
                        'Returns a score, verdict, and next revision priorities',
                      ].map((item) => (
                        <div
                          key={item}
                          className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/82"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-12 space-y-6">
                  <PitchDeckUploader
                    onFileSelected={setSelectedFile}
                    isUploading={uploading}
                    isAnalyzing={analyzing}
                    selectedFile={selectedFile}
                    onClearFile={() => setSelectedFile(null)}
                  />

                  {selectedFile && !isProcessing && (
                    <div className="flex justify-center">
                      <Button
                        size="lg"
                        onClick={handleStartAssessment}
                        className="h-14 rounded-2xl px-8 text-base"
                      >
                        <Sparkles className="mr-2 h-5 w-5" />
                        Start deck assessment
                      </Button>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="rounded-[30px] border border-border/60 bg-background/80 px-6 py-8 text-center shadow-[0_30px_80px_-60px_rgba(15,23,42,0.85)]">
                      <div className="flex justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      </div>
                      <p className="mt-4 text-xl font-semibold">{processingCopy.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {processingCopy.description}
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-[30px] border border-destructive/20 bg-destructive/5 px-6 py-6 text-center">
                      <p className="font-semibold text-destructive">Analysis failed</p>
                      <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                      <Button variant="outline" onClick={handleStartNew} className="mt-4 rounded-2xl">
                        Try again
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-16">
                  <PitchDeckBuilder />
                </div>
              </>
            ) : (
              <AnalysisResults
                analysis={analysis}
                onSubmitFeedback={(rating, feedback) =>
                  submitFeedback(analysis.id, rating, feedback)
                }
                onStartNew={handleStartNew}
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
