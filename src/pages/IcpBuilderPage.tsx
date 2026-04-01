import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { lazy, Suspense, useEffect, useState } from "react";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useLeanStartupStore } from "@/store/leanStartupStore";
import { Loader2, Target, Users, TrendingUp } from "lucide-react";
import { captureEvent } from "@/lib/analytics";

const ICPBuilder = lazy(() => import("@/components/icp/ICPBuilder"));

const FIRST_WIN_KEY = 'icp_builder_visited';

function FirstWinOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border border-border/60 rounded-2xl shadow-2xl p-8 animate-fade-in">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#32b8c6]/15 mb-6 mx-auto">
          <Target className="h-6 w-6 text-[#32b8c6]" />
        </div>
        <h2 className="text-xl font-bold text-center mb-2 font-space-grotesk">
          Your first milestone: Define who you're building for
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Founders who complete an ICP profile are 3× more likely to find paying customers in their first 90 days.
        </p>
        <ul className="space-y-3 mb-8">
          <li className="flex items-start gap-3 text-sm">
            <Users className="h-4 w-4 text-[#32b8c6] mt-0.5 flex-shrink-0" />
            <span>Get a precise picture of exactly who will pay for your product</span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <TrendingUp className="h-4 w-4 text-[#32b8c6] mt-0.5 flex-shrink-0" />
            <span>Receive a viability score and positioning strategy you can use today</span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <Target className="h-4 w-4 text-[#32b8c6] mt-0.5 flex-shrink-0" />
            <span>Takes about 5 minutes — your first saved output on the platform</span>
          </li>
        </ul>
        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-full font-semibold text-white text-sm shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: '#32b8c6' }}
        >
          Let's do it →
        </button>
      </div>
    </div>
  );
}

export default function ICPBuilderPage() {
  const { trackPageVisit } = useReadingAnalytics();
  const { markToolUsed } = useLeanStartupStore();
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => { markToolUsed('icp-builder'); }, [markToolUsed]);

  useEffect(() => {
    trackPageVisit('ICP Builder');
  }, [trackPageVisit]);

  useEffect(() => {
    const hasVisited = localStorage.getItem(FIRST_WIN_KEY);
    const isFirstVisit = !hasVisited;
    captureEvent('icp_builder_opened', { isFirstVisit });
    if (isFirstVisit) {
      localStorage.setItem(FIRST_WIN_KEY, 'true');
      setShowOverlay(true);
    }
  }, []);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "ICP Builder - Identify Your Ideal Customer",
      "description": "Identify your ideal customer profile and niche market. Get detailed pain point analysis and positioning strategy to stand out.",
      "url": "https://creatives-takeover.com/icp-builder",
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
      { name: 'ICP Builder', url: '/icp-builder' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="ICP Builder - Creatives Takeover"
        description="Identify your ideal customer profile and niche market with AI-powered insights, pain point analysis, and positioning strategy."
        keywords="ICP, ideal customer profile, niche market, target market, customer persona, positioning strategy, pain points"
        url="/icp-builder"
        structuredData={structuredData}
      />
      <Navigation />

      {showOverlay && (
        <FirstWinOverlay onDismiss={() => setShowOverlay(false)} />
      )}

      <main>
        <section className="py-20 px-4 relative overflow-hidden" data-section="icp-builder">
          {/* Background styling */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
            <div
              className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(16, 185, 129, 0.35), transparent 55%)',
                animationDuration: '28s'
              }}
            />
          </div>

          <div className="container mx-auto max-w-5xl relative z-10">
            {/* Page Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 takeover-gradient creatives-font animate-fade-in leading-tight pb-2">
                ICP Builder
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                Identify your ideal customer and specific niche market.
                <span className="gradient-text font-semibold" style={{ lineHeight: 'inherit', marginLeft: '0.25rem' }}>
                  Get a positioning strategy that makes you stand out.
                </span>
              </p>
            </div>

            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading ICP Builder...</p>
                </div>
              }
            >
              <ICPBuilder />
            </Suspense>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
