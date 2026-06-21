import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PitchDeckUploader } from "@/components/pitch-deck-analyzer/PitchDeckUploader";
import { PitchDeckChecklist } from "@/components/pitch-deck-analyzer/PitchDeckChecklist";
import { AnalysisResults } from "@/components/pitch-deck-analyzer/AnalysisResults";
import { PitchDeckUnlockGate } from "@/components/pitch-deck-analyzer/PitchDeckUnlockGate";
import { PitchDeckBuilder } from "@/components/pitch-deck-builder/PitchDeckBuilder";
import { usePitchDeckAnalyzer } from "@/hooks/usePitchDeckAnalyzer";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, BarChart3, TrendingUp, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { captureEvent } from "@/lib/analytics";
import { toast } from "sonner";

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const RETURN_PATH = "/pitch-deck-analyzer";

export default function PitchDeckAnalyzerPage() {
  const { user } = useAuth();
  const { trackPageVisit } = useReadingAnalytics();
  const {
    analyzePublicDeck,
    analyzePitchDeck,
    submitFeedback,
    resetAnalysis,
    uploading,
    analyzing,
    analysis,
    guestResult,
    limitReached,
    error,
    isProcessing,
  } = usePitchDeckAnalyzer();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    trackPageVisit('Pitch Deck Analyzer');
  }, [trackPageVisit]);

  // Funnel: a logged-out visitor opened a free tool.
  useEffect(() => {
    if (!user) captureEvent('free_tool_opened', { tool: 'pitch_deck_analyzer' });
  }, [user]);

  const handleFileSelected = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF. Export your deck to PDF (Keynote/PowerPoint/Slides all can) and try again.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }
    setSelectedFile(file);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
  };

  // Anonymous: one free full analysis (IP-gated).
  const handlePublicAnalyze = async () => {
    if (!selectedFile) return;
    captureEvent('free_tool_input_submitted', { tool: 'pitch_deck_analyzer', file_size: selectedFile.size });
    const result = await analyzePublicDeck(selectedFile);
    if (result) captureEvent('free_tool_result_shown', { tool: 'pitch_deck_analyzer' });
  };

  // Authenticated: every analysis is credit-metered (10 credits).
  const handleStartAssessment = async () => {
    if (!selectedFile) return;
    await analyzePitchDeck(selectedFile);
  };

  const handleStartNew = () => {
    resetAnalysis();
    setSelectedFile(null);
  };

  const showHero = !analysis && !guestResult && !limitReached;

  const renderProcessing = () => (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold">
          {uploading ? 'Uploading your pitch deck...' : 'Reading your slides...'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {uploading
            ? 'Please wait while we upload your file'
            : 'Scoring your deck across the 6 dimensions investors weigh'}
        </p>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="text-center text-destructive">
      <p className="font-semibold">Analysis Failed</p>
      <p className="text-sm">{error}</p>
      <Button variant="outline" onClick={handleStartNew} className="mt-4">
        Try Again
      </Button>
    </div>
  );

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Pitch Deck Analyzer - AI-Powered Pitch Deck Assessment",
      "description": "Get instant AI-powered analysis of your pitch deck. Receive a comprehensive score across 6 key dimensions with actionable feedback to improve your fundraising success.",
      "url": "https://creatives-takeover.com/pitch-deck-analyzer",
      "publisher": {
        "@type": "Organization",
        "name": "Creatives Takeover",
        "logo": {
          "@type": "ImageObject",
          "url": "https://creatives-takeover.com/favicon.png"
        }
      }
    },
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Pitch Deck Analyzer', url: '/pitch-deck-analyzer' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Pitch Deck Analyzer - AI-Powered Assessment"
        description="Get instant AI-powered analysis of your pitch deck. Comprehensive scoring across story, market, traction, business model, team, and fundraising readiness."
        keywords="pitch deck analyzer, pitch deck score, investor presentation analysis, fundraising assessment, startup pitch analysis"
        url="/pitch-deck-analyzer"
        structuredData={structuredData}
      />
      <Navigation />

      <main className="relative overflow-hidden">
        {/* Artistic background — an "investor canvas": soft color mesh, a faint
            blueprint grid, drifting aurora glows, and floating pitch-deck slides. */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {/* Base wash */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />

          {/* Soft color field (mesh) */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(60% 50% at 15% 8%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(55% 45% at 88% 4%, rgba(192,132,252,0.20), transparent 60%), radial-gradient(60% 55% at 50% 108%, rgba(16,185,129,0.12), transparent 60%)',
            }}
          />

          {/* Blueprint grid, fading toward the edges */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(to right, hsl(var(--foreground) / 0.05) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.05) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              maskImage: 'radial-gradient(ellipse 78% 62% at 50% 6%, black 32%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse 78% 62% at 50% 6%, black 32%, transparent 80%)',
            }}
          />

          {/* Aurora glows */}
          <div
            className="absolute rounded-full blur-3xl animate-[spin_34s_linear_infinite] motion-reduce:animate-none"
            style={{
              top: '-13rem',
              right: '-9rem',
              width: '44rem',
              height: '44rem',
              background:
                'radial-gradient(circle at 30% 30%, rgba(56,189,248,0.30), transparent 60%), radial-gradient(circle at 70% 70%, rgba(192,132,252,0.32), transparent 55%)',
            }}
          />
          <div
            className="absolute rounded-full blur-3xl animate-float-reverse motion-reduce:animate-none"
            style={{
              bottom: '-15rem',
              left: '-12rem',
              width: '40rem',
              height: '40rem',
              background:
                'radial-gradient(circle at 40% 40%, rgba(16,185,129,0.22), transparent 60%), radial-gradient(circle at 65% 60%, rgba(56,189,248,0.22), transparent 55%)',
            }}
          />
          <div
            className="absolute rounded-full blur-3xl animate-float motion-reduce:animate-none"
            style={{
              top: '28%',
              left: '40%',
              width: '26rem',
              height: '26rem',
              background: 'radial-gradient(circle, rgba(244,114,182,0.16), transparent 65%)',
            }}
          />

          {/* Floating pitch-deck "slides" motif */}
          <div className="absolute animate-diagonal-float motion-reduce:animate-none" style={{ top: '24%', left: '8%' }}>
            <div className="h-20 w-28 -rotate-6 rounded-xl border border-primary/20 bg-primary/5 shadow-xl backdrop-blur-sm" />
          </div>
          <div className="absolute hidden animate-float motion-reduce:animate-none md:block" style={{ top: '58%', right: '11%' }}>
            <div className="h-24 w-32 rotate-6 rounded-xl border border-primary/20 bg-primary/5 shadow-xl backdrop-blur-sm" />
          </div>
          <div className="absolute hidden animate-float-reverse motion-reduce:animate-none lg:block" style={{ top: '14%', right: '26%' }}>
            <div className="h-16 w-24 rotate-3 rounded-lg border border-primary/15 bg-primary/5 shadow-lg backdrop-blur-sm" />
          </div>

          {/* Top glow + vignette for depth */}
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(120% 80% at 50% -12%, rgba(56,189,248,0.10), transparent 55%)' }}
          />
          <div
            className="absolute inset-0"
            style={{ boxShadow: 'inset 0 0 220px 70px hsl(var(--background))' }}
          />
        </div>

        <section className="relative z-10 px-4 pt-28 pb-20 md:pt-32 lg:pt-36" data-section="pitch-deck-analyzer">
          <div className="container mx-auto max-w-5xl">
            {showHero && (
              <div className="text-center mb-12 sm:mb-16">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 takeover-gradient creatives-font animate-fade-in leading-tight pb-2">
                  Pitch Deck Analyzer
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                  Upload your deck, get <span className="gradient-text font-semibold">a real investor score</span> in minutes.
                </p>

                <div className="grid md:grid-cols-3 gap-6 mt-12 text-left">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">6-Dimension Scoring</h3>
                      <p className="text-sm text-muted-foreground">Story, market, traction, model, team, readiness</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Reads Your Actual Slides</h3>
                      <p className="text-sm text-muted-foreground">Vision AI weighs your charts and layout, not just text</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Per-Slide Findings</h3>
                      <p className="text-sm text-muted-foreground">Evidence-backed fixes and a prioritized action plan</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analysis ? (
              /* Signed-in saved result */
              <AnalysisResults
                analysis={analysis}
                onSubmitFeedback={(rating, feedback) => submitFeedback(analysis.id, rating, feedback)}
                onStartNew={handleStartNew}
              />
            ) : !user ? (
              guestResult ? (
                /* Anonymous full result + signup CTA for analyzing more */
                <div className="animate-fade-in">
                  <AnalysisResults
                    analysis={guestResult}
                    isGuest
                    onStartNew={handleStartNew}
                    guestCta={<PitchDeckUnlockGate returnPath={RETURN_PATH} />}
                  />
                </div>
              ) : limitReached ? (
                /* Used their free analysis already (IP-gated) */
                <div className="space-y-6 animate-fade-in">
                  <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-2xl font-bold mb-2">You've used your free analysis</h2>
                    <p className="text-muted-foreground">
                      Create a free account to analyze more decks — 10 credits each — and keep every
                      analysis saved.
                    </p>
                  </div>
                  <PitchDeckUnlockGate returnPath={RETURN_PATH} />
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                  <PitchDeckUploader
                    onFileSelected={handleFileSelected}
                    isAnalyzing={analyzing}
                    selectedFile={selectedFile}
                    onClearFile={handleClearFile}
                    allowUploadWhenSignedOut
                  />

                  {selectedFile && !isProcessing && (
                    <div className="flex flex-col items-center gap-2">
                      <Button size="lg" onClick={handlePublicAnalyze} className="px-8 py-6 text-lg">
                        <Sparkles className="h-5 w-5 mr-2" />
                        Analyze My Deck — Free
                      </Button>
                      <p className="text-xs text-muted-foreground">No signup needed for your first analysis.</p>
                    </div>
                  )}

                  {isProcessing && renderProcessing()}
                  {error && !isProcessing && renderError()}

                  <PitchDeckChecklist />
                </div>
              )
            ) : (
              /* Signed in → credit-metered analysis */
              <>
                <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                  <PitchDeckUploader
                    onFileSelected={handleFileSelected}
                    isUploading={uploading}
                    isAnalyzing={analyzing}
                    selectedFile={selectedFile}
                    onClearFile={handleClearFile}
                  />

                  {selectedFile && !isProcessing && (
                    <div className="flex flex-col items-center gap-2">
                      <Button size="lg" onClick={handleStartAssessment} className="px-8 py-6 text-lg">
                        <Sparkles className="h-5 w-5 mr-2" />
                        Analyze Deck
                      </Button>
                      <p className="text-xs text-muted-foreground">Costs 10 credits — refunded automatically if the analysis fails.</p>
                    </div>
                  )}

                  {isProcessing && renderProcessing()}
                  {error && !isProcessing && renderError()}
                </div>

                <PitchDeckChecklist />

                {/* Pitch Deck Builder - Integrated */}
                <div className="mt-16">
                  <PitchDeckBuilder />
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
