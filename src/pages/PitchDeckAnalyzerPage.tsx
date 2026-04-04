import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { PitchDeckUploader } from "@/components/pitch-deck-analyzer/PitchDeckUploader";
import { AnalysisResults } from "@/components/pitch-deck-analyzer/AnalysisResults";
import { PitchDeckBuilder } from "@/components/pitch-deck-builder/PitchDeckBuilder";
import { usePitchDeckAnalyzer } from "@/hooks/usePitchDeckAnalyzer";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, BarChart3, TrendingUp, Target } from "lucide-react";
import { getPublicTabConfig } from "@/config/publicTabVisibility";
import { useAuth } from "@/contexts/AuthContext";

export default function PitchDeckAnalyzerPage() {
  const { user } = useAuth();
  const publicTab = getPublicTabConfig('/insighta/pitch-deck-analyzer');
  const { trackPageVisit } = useReadingAnalytics();
  const { analyzePitchDeck, submitFeedback, resetAnalysis, uploading, analyzing, analysis, error, isProcessing } = usePitchDeckAnalyzer();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    trackPageVisit('Pitch Deck Analyzer');
  }, [trackPageVisit]);

  const handleFileSelected = (file: File) => {
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
      "url": "https://creatives-takeover.com/insighta/pitch-deck-analyzer",
      "publisher": {
        "@type": "Organization",
        "name": "Creatives Takeover",
        "logo": {
          "@type": "ImageObject",
          "url": "https://creatives-takeover.com/lovable-uploads/new-favicon.png"
        }
      }
    },
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Insighta', url: '/insighta' },
      { name: 'Pitch Deck Analyzer', url: '/insighta/pitch-deck-analyzer' }
    ])
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
            {!user ? (
              publicTab && (
                <SignedOutFeaturePreview
                  featureName={publicTab.featureName}
                  description={publicTab.description || ''}
                  previewItems={publicTab.previewItems}
                  showPricingCta={publicTab.showPricingCta}
                />
              )
            ) : !analysis ? (
              <>
                {/* Hero Section */}
                <div className="text-center mb-12 sm:mb-16">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 takeover-gradient creatives-font animate-fade-in leading-tight pb-2">
                    Pitch Deck Analyzer
                  </h1>
                  <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                    Investor-Ready Pitch Analysis.<span className="gradient-text font-semibold" style={{ lineHeight: 'inherit', marginLeft: '0.25rem' }}> Clear, comparable, actionable.</span>
                  </p>

                  {/* Value Props */}
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

                {/* Upload Section */}
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

