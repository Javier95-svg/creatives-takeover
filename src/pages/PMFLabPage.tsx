import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { lazy, Suspense, useEffect, useState } from "react";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useLeanStartupStore } from "@/store/leanStartupStore";
import { Loader2 } from "lucide-react";
import type { PMFFormPrefillData } from "@/components/pmf/ProductMarketFitLab";
import { getSafeLocalStorage } from "@/lib/safeStorage";
import PMFValidationTracker from "@/components/pmf/PMFValidationTracker";
import { useBizMapProgress } from "@/hooks/useBizMapProgress";

// Lazy load the PMF Lab component
const ProductMarketFitLab = lazy(() => import("@/components/pmf/ProductMarketFitLab"));

const DECISION_STORAGE_KEY = "validateDecisionSprint";
const DECISION_SIGNAL_LABELS: Record<string, string> = {
  search_demand: "Search or community demand",
  competitor_spend: "Competitors spending on ads",
  manual_workaround: "Painful manual workaround",
  paid_alternatives: "Paid alternatives exist",
  urgent_deadline: "Urgent deadline or regulatory pressure",
  early_interest: "Early inbound interest",
};

export default function PMFLabPage() {
  const { trackPageVisit } = useReadingAnalytics();
  const { markToolUsed } = useLeanStartupStore();
  const { refreshProgress } = useBizMapProgress();
  const [prefillData, setPrefillData] = useState<PMFFormPrefillData | null>(null);

  useEffect(() => { markToolUsed('pmf-lab'); }, [markToolUsed]);

  // Track page visit when component mounts
  useEffect(() => {
    trackPageVisit('PMF Lab');
  }, [trackPageVisit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storage = getSafeLocalStorage();
    const stored = storage.getItem(DECISION_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as {
        ideas?: Array<{
          id: string;
          oneLiner?: string;
          targetCustomer?: string;
          coreProblem?: string;
          currentAlternative?: string;
          marketSignals?: string[];
          risks?: string;
        }>;
        chosenIdeaId?: string | null;
      };

      const ideas = parsed.ideas || [];
      const chosenIdea = parsed.chosenIdeaId
        ? ideas.find((idea) => idea.id === parsed.chosenIdeaId)
        : null;

      if (!chosenIdea) return;

      const signalLabels = (chosenIdea.marketSignals || [])
        .map((signalId) => DECISION_SIGNAL_LABELS[signalId])
        .filter(Boolean);

      setPrefillData({
        problemStatement: chosenIdea.coreProblem || "",
        solutionDescription: chosenIdea.oneLiner || "",
        targetMarket: chosenIdea.targetCustomer || "",
        competitiveLandscape: chosenIdea.currentAlternative
          ? `Current alternative: ${chosenIdea.currentAlternative}`
          : "",
        tractionValidation: signalLabels.length
          ? `Signals observed: ${signalLabels.join(", ")}`
          : "",
        keyAssumptions: chosenIdea.risks ? [`Risk to validate: ${chosenIdea.risks}`] : undefined,
      });
    } catch (error) {
      console.error("Failed to read decision sprint data", error);
    }
  }, []);

  // Structured data for PMF Lab page
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "PMF Lab - Clarify Market Need",
      "description": "Clarify the core problem, confirm market need, and get actionable evidence plans before you build.",
      "url": "https://creatives-takeover.com/pmf-lab",
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
      { name: 'BizMap AI', url: '/bizmap-ai' },
      { name: 'PMF Lab', url: '/pmf-lab' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="PMF Lab - Creatives Takeover"
        description="Clarify the core problem and confirm market need with AI-powered insights, experiments, and scoring."
        keywords="market need, problem clarity, PMF analysis, market validation, startup validation"
        url="/pmf-lab"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="py-20 px-4 relative overflow-hidden" data-section="pmf-lab">
          {/* Background styling */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
            <div
              className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(139, 92, 246, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(236, 72, 153, 0.35), transparent 55%)',
                animationDuration: '28s'
              }}
            />
          </div>

          <div className="container mx-auto max-w-5xl relative z-10">
            {/* Page Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 takeover-gradient creatives-font animate-fade-in leading-tight pb-2">
                PMF Lab
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                Clarify the core problem and confirm there is<span className="gradient-text font-semibold" style={{ lineHeight: 'inherit', marginLeft: '0.25rem' }}> real market need before you build.</span>
              </p>
            </div>

            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading PMF Lab...</p>
                </div>
              }
            >
              <div className="mb-6">
                <PMFValidationTracker onSaved={refreshProgress} />
              </div>
              <ProductMarketFitLab prefillData={prefillData ?? undefined} />
            </Suspense>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
