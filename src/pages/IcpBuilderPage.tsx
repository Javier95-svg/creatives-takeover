import SEO, { createBreadcrumbSchema, createFAQSchema, createSoftwareApplicationSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageFAQSection from "@/components/seo/PageFAQSection";
import { lazy, Suspense, useEffect } from "react";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useLeanStartupStore } from "@/store/leanStartupStore";
import { Loader2 } from "lucide-react";
import { captureEvent } from "@/lib/analytics";
import { ActivationJourneyStrip } from "@/components/activation/ActivationJourneyStrip";
import { useActivationJourney } from "@/hooks/useActivationJourney";
import { getToolJourneyGuide } from "@/lib/activationJourney";

const ICPBuilder = lazy(() => import("@/components/icp/ICPBuilder"));

const FIRST_WIN_KEY = 'icp_builder_visited';

export default function ICPBuilderPage() {
  const { trackPageVisit } = useReadingAnalytics();
  const { markToolUsed } = useLeanStartupStore();
  const { isActivated } = useActivationJourney('stage_i');
  const activationGuide = getToolJourneyGuide('/icp-builder');

  const faqs = [
    {
      question: "What is the Ideal Customer Profile (ICP) and why it is so important?",
      answer:
        "Your Ideal Customer Profile is the specific type of customer most likely to need your product, feel the pain acutely, and act on it. It matters because it shapes your messaging, product decisions, validation interviews, and go-to-market strategy from the start.",
    },
    {
      question: "Why does ICP definition matter before building?",
      answer:
        "It affects product scope, messaging, interviews, and customer acquisition. If the ICP is vague, the rest of the startup plan becomes vague too.",
    },
    {
      question: "Can ICP Builder help with positioning?",
      answer:
        "Yes. The tool is designed to connect customer targeting with pain point clarity and positioning so you can explain the product more clearly.",
    },
  ];

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
    }
  }, []);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Ideal Customer Profile Builder",
      "description": "Define your ideal customer profile, sharpen startup positioning, and choose the right customer segment to target first.",
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
    createSoftwareApplicationSchema({
      name: "ICP Builder",
      description: "Ideal customer profile builder for founders who need clearer positioning, customer targeting, and validation direction.",
      url: "/icp-builder",
      featureList: ["ideal customer profile", "pain point mapping", "positioning guidance"],
    }),
    createFAQSchema(faqs),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'BizMap AI', url: '/bizmap-ai' },
      { name: 'ICP Builder', url: '/icp-builder' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Ideal Customer Profile Builder | Creatives Takeover"
        description="Define your ideal customer profile, sharpen positioning, and choose the customer segment your startup should target first."
        keywords="ideal customer profile builder, icp template, target customer profile, customer persona for startups, positioning strategy"
        url="/icp-builder"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="relative overflow-hidden px-4 pt-28 pb-20 md:pt-32 lg:pt-36" data-section="icp-builder">
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
                    Answer a few sharp questions and unlock an ICP Draft that tells you who to build for, what pain to target, what to ship first, and where your moat is.
                  </p>
                </div>
                {activationGuide ? (
                  <ActivationJourneyStrip
                    stageLabel={activationGuide.stageLabel}
                    title={activationGuide.title}
                    description={activationGuide.description}
                    doneLabel={activationGuide.doneLabel}
                    completedLabel={activationGuide.completedLabel}
                    nextRoute={activationGuide.nextRoute}
                    nextLabel={activationGuide.nextLabel}
                    isComplete={isActivated}
                    className="mx-auto max-w-4xl"
                  />
                ) : null}
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

            <div className="mt-10 space-y-8">
              <PageFAQSection
                title="Frequent Questions"
                faqs={faqs}
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
