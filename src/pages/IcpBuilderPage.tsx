import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { lazy, Suspense, useEffect } from "react";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useLeanStartupStore } from "@/store/leanStartupStore";
import { Compass, Loader2, Target, TestTubeDiagonal } from "lucide-react";

const ICPBuilder = lazy(() => import("@/components/icp/ICPBuilder"));

export default function ICPBuilderPage() {
  const { trackPageVisit } = useReadingAnalytics();
  const { markToolUsed } = useLeanStartupStore();

  useEffect(() => { markToolUsed('icp-builder'); }, [markToolUsed]);

  useEffect(() => {
    trackPageVisit('ICP Builder');
  }, [trackPageVisit]);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "ICP Builder - Identify Your Ideal Customer",
      "description": "Clarify your first ideal customer profile, sharpen your startup positioning, and get concrete validation steps.",
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
        description="Clarify your first ideal customer profile, sharpen your positioning, and get concrete validation steps for your startup."
        keywords="ICP, ideal customer profile, niche market, target market, customer persona, positioning strategy, pain points"
        url="/icp-builder"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="relative overflow-hidden px-4 py-20" data-section="icp-builder">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(34,197,94,0.12),transparent_28%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(248,250,252,0.92))] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(34,197,94,0.14),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,0.98))]" />
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(15,23,42,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.8) 1px, transparent 1px)",
                backgroundSize: "36px 36px",
                maskImage: "linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.02))",
              }}
            />
            <div
              className="absolute -right-48 -top-40 h-[55rem] w-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(16, 185, 129, 0.35), transparent 55%)',
                animationDuration: '28s'
              }}
            />
            <div
              className="absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full blur-3xl"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(249, 115, 22, 0.12), transparent 62%)',
              }}
            />
          </div>

          <div className="container relative z-10 mx-auto max-w-6xl">
            <div className="mb-12 lg:mb-16">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h1 className="pb-2 text-center font-bold leading-[0.95] text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
                    <span className="takeover-gradient creatives-font">ICP Builder</span>
                  </h1>
                  <p className="mx-auto max-w-2xl text-center text-lg leading-relaxed text-foreground/80 sm:text-xl">
                    Define the first customer you should target, the pain worth winning, and the validation steps that move your startup forward.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="group stagger-item hover-lift rounded-3xl border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:bg-slate-950/60">
                    <Target className="mb-3 h-5 w-5 text-sky-600 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105" />
                    <p className="text-sm font-semibold">Pick the first ICP</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Answer five core questions and the tool recommends the one customer segment you should target first, not a vague market.
                    </p>
                  </div>
                  <div className="group stagger-item hover-lift rounded-3xl border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:bg-slate-950/60">
                    <Compass className="mb-3 h-5 w-5 text-emerald-600 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105" />
                    <p className="text-sm font-semibold">Sharpen your wedge</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      It clarifies the pain, current workaround, and why your solution wins so your positioning becomes sharper and easier to explain.
                    </p>
                  </div>
                  <div className="group stagger-item hover-lift rounded-3xl border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:bg-slate-950/60">
                    <TestTubeDiagonal className="mb-3 h-5 w-5 text-orange-600 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105" />
                    <p className="text-sm font-semibold">Validate fast</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      You leave with decision confidence, priority pain points, and practical experiments to test before you spend more time or money.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center space-y-4 rounded-[2rem] border border-border/60 bg-white/80 py-20 shadow-sm backdrop-blur dark:bg-slate-950/70">
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
