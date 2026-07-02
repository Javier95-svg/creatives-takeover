import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { lazy, Suspense } from "react";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useLeanStartupStore } from "@/store/leanStartupStore";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { captureEvent } from "@/lib/analytics";

// Lazy load the Tech Stack component
const TechStack = lazy(() => import("@/components/tech-stack/TechStack"));

export default function TechStackPage() {
  const { user } = useAuth();
  const { trackPageVisit } = useReadingAnalytics();
  const markToolUsed = useLeanStartupStore(s => s.markToolUsed);

  useEffect(() => { markToolUsed('tech-stack'); }, [markToolUsed]);

  // Track page visit when component mounts
  useEffect(() => {
    trackPageVisit('Tech Stack');
  }, [trackPageVisit]);

  // Funnel: a logged-out visitor opened a free tool.
  useEffect(() => {
    if (!user) captureEvent('free_tool_opened', { tool: 'tech_stack' });
  }, [user]);

  // Structured data for Tech Stack page
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Tech Stack Builder - Build Your Ideal Technology Stack",
      "description": "Get AI-powered recommendations for your technology stack. Choose the right tools, frameworks, and platforms for your startup based on your specific needs.",
      "url": "https://creatives-takeover.com/tech-stack",
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
      { name: 'BizMap AI', url: '/bizmap-ai' },
      { name: 'Tech Stack', url: '/tech-stack' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Tech Stack Builder - Creatives Takeover"
        description="Get AI-powered recommendations for your technology stack. Choose the right tools, frameworks, and platforms for your startup based on your specific needs and budget."
        keywords="tech stack, technology stack, startup tools, development tools, platform selection, framework selection"
        url="/tech-stack"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="relative overflow-hidden px-4 pt-28 pb-20 md:pt-32 lg:pt-36" data-section="tech-stack">
          {/* Background styling */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
            <div
              className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(34, 211, 238, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(59, 130, 246, 0.35), transparent 55%)',
                animationDuration: '28s'
              }}
            />
          </div>

          <div className="container mx-auto max-w-5xl relative z-10">
            {/* Page Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 takeover-gradient creatives-font animate-fade-in leading-tight pb-2">
                Tech Stack Builder
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-white max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                Pick one product per category and define your monthly budget.
              </p>
            </div>

            {/* Everyone gets the builder: guests use it freely, and signing up must
                never feel like a downgrade. The tool itself gates only the AI build
                plan behind credits (handled inside <TechStack />). */}
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading Tech Stack Builder...</p>
                </div>
              }
            >
              <TechStack />
            </Suspense>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
