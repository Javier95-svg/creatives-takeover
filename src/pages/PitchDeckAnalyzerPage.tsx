import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { BlurredToolPreview } from '@/components/ui/BlurredToolPreview';
import { PitchDeckUploader } from "@/components/pitch-deck-analyzer/PitchDeckUploader";
import { PitchDeckChecklist } from "@/components/pitch-deck-analyzer/PitchDeckChecklist";
import { AnalysisResults } from "@/components/pitch-deck-analyzer/AnalysisResults";
import { PitchDeckBuilder } from "@/components/pitch-deck-builder/PitchDeckBuilder";
import { usePitchDeckAnalyzer } from "@/hooks/usePitchDeckAnalyzer";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, BarChart3, TrendingUp, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { captureEvent } from "@/lib/analytics";
import { toast } from "sonner";

const ALLOWED_EXTENSIONS = ['.pdf', '.pptx', '.ppt'];
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function PitchDeckAnalyzerPage() {
  const { user } = useAuth();
  const { hasAccess, upgradeTarget } = usePlanAccess('pitch_deck_analyzer');
  const { trackPageVisit } = useReadingAnalytics();
  const { analyzePitchDeck, submitFeedback, resetAnalysis, uploading, analyzing, analysis, error, isProcessing } = usePitchDeckAnalyzer();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Logged-out visitors can upload a deck and submit; the score/findings deliverable
  // is gated behind a free account (no anonymous backend processing).
  const [publicSubmitted, setPublicSubmitted] = useState(false);

  useEffect(() => {
    trackPageVisit('Pitch Deck Analyzer');
  }, [trackPageVisit]);

  // Funnel: a logged-out visitor opened a free tool.
  useEffect(() => {
    if (!user) captureEvent('free_tool_opened', { tool: 'pitch_deck_analyzer' });
  }, [user]);

  const handlePublicAnalyze = () => {
    if (!selectedFile) return;
    captureEvent('free_tool_input_submitted', { tool: 'pitch_deck_analyzer', file_size: selectedFile.size });
    setPublicSubmitted(true);
    captureEvent('free_tool_partial_result_shown', { tool: 'pitch_deck_analyzer', gated_only: true });
  };

  const handleFileSelected = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`Unsupported file type. Please upload a PDF, PPTX, or PPT file.`);
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
        {/* Shared Background styling */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
          <div
            className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(192, 132, 252, 0.35), transparent 55%)',
              animationDuration: '28s'
            }}
          />
        </div>

        <section className="relative z-10 px-4 pt-28 pb-20 md:pt-32 lg:pt-36" data-section="pitch-deck-analyzer">
          <div className="container mx-auto max-w-5xl">
            {!analysis && (
              <div className="text-center mb-12 sm:mb-16">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 takeover-gradient creatives-font animate-fade-in leading-tight pb-2">
                  Pitch Deck Analyzer
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                  Investor-Ready Pitch Analysis.<span className="gradient-text font-semibold" style={{ lineHeight: 'inherit', marginLeft: '0.25rem' }}> Clear, comparable, actionable.</span>
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
                      <h3 className="font-semibold mb-1">Actionable Insights</h3>
                      <p className="text-sm text-muted-foreground">Know exactly what to fix and when to raise</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Instant Results</h3>
                      <p className="text-sm text-muted-foreground">Get your comprehensive analysis in minutes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!user ? (
              // Logged-out visitors can upload a deck and hit Analyze. The score +
              // findings deliverable is gated behind a free account.
              <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                {!publicSubmitted ? (
                  <>
                    <PitchDeckUploader
                      onFileSelected={handleFileSelected}
                      selectedFile={selectedFile}
                      onClearFile={handleClearFile}
                      allowUploadWhenSignedOut
                    />

                    {selectedFile && (
                      <div className="flex justify-center">
                        <Button size="lg" onClick={handlePublicAnalyze} className="px-8 py-6 text-lg">
                          <Sparkles className="h-5 w-5 mr-2" />
                          Analyze My Deck
                        </Button>
                      </div>
                    )}

                    <PitchDeckChecklist />
                  </>
                ) : (
                  <PreviewModeWrapper
                    featureName="Your pitch deck analysis"
                    headline="Your deck is ready 🎉"
                    description="Create a free account to unlock your pitch deck score and the findings across all 6 investor dimensions."
                    ctaLabel="Create free account"
                    onCtaClick={() => captureEvent('free_tool_signup_gate_cta_clicked', { tool: 'pitch_deck_analyzer' })}
                  >
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Overall Pitch Score</p>
                        <p className="text-5xl font-bold text-foreground">— / 100</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        {[
                          'Story Clarity',
                          'Market Opportunity',
                          'Traction Proof',
                          'Business Model',
                          'Team Credibility',
                          'Fundraising Readiness',
                        ].map((dimension) => (
                          <div key={dimension} className="rounded-xl border border-border/60 bg-card p-4">
                            <p className="text-sm font-medium">{dimension}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Detailed score + findings</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PreviewModeWrapper>
                )}
              </div>
            ) : !hasAccess ? (
              <BlurredToolPreview
                featureName="Pitch Deck Analyzer"
                unlockCondition="Pitch Deck Analyzer is available on the Rising plan and above."
                requiredPlan={upgradeTarget}
                locked
              >
                <div />
              </BlurredToolPreview>
            ) : !analysis ? (
              <>
                <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                  <PitchDeckUploader
                    onFileSelected={handleFileSelected}
                    isUploading={uploading}
                    isAnalyzing={analyzing}
                    selectedFile={selectedFile}
                    onClearFile={handleClearFile}
                  />

                  {/* Start Assessment Button */}
                  {selectedFile && !isProcessing && (
                    <div className="flex justify-center">
                      <Button
                        size="lg"
                        onClick={handleStartAssessment}
                        className="px-8 py-6 text-lg"
                      >
                        <Sparkles className="h-5 w-5 mr-2" />
                        Start Assessment
                      </Button>
                    </div>
                  )}

                  {/* Processing State */}
                  {isProcessing && (
                    <div className="text-center space-y-4">
                      <div className="flex justify-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">
                          {uploading ? 'Uploading your pitch deck...' : 'Analyzing your pitch deck...'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {uploading ? 'Please wait while we upload your file' : 'Our AI is analyzing your deck across 6 dimensions'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {error && (
                    <div className="text-center text-destructive">
                      <p className="font-semibold">Analysis Failed</p>
                      <p className="text-sm">{error}</p>
                      <Button
                        variant="outline"
                        onClick={handleStartNew}
                        className="mt-4"
                      >
                        Try Again
                      </Button>
                    </div>
                  )}
                </div>

                <PitchDeckChecklist />

                {/* Pitch Deck Builder - Integrated */}
                <div className="mt-16">
                  <PitchDeckBuilder />
                </div>
              </>
            ) : (
              /* Results Section */
              <AnalysisResults
                analysis={analysis}
                onSubmitFeedback={submitFeedback}
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

