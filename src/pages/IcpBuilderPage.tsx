import SEO, { createBreadcrumbSchema, createFAQSchema, createSoftwareApplicationSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageFAQSection from "@/components/seo/PageFAQSection";
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
      setShowOverlay(true);
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

      {showOverlay && (
        <FirstWinOverlay onDismiss={() => setShowOverlay(false)} />
      )}

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
                    Define the pain point you're solving, who you're solving it for, and what your moat is.
                  </p>
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
