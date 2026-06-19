import SEO, { createBreadcrumbSchema, createFAQSchema, createSoftwareApplicationSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnswerSummary from "@/components/seo/AnswerSummary";
import PageFAQSection from "@/components/seo/PageFAQSection";
import RelatedPageLinks from "@/components/seo/RelatedPageLinks";
import FundraisingReadinessToolkitAll from "@/components/blog/FundraisingReadinessToolkitAll";
import { useAuth } from "@/contexts/AuthContext";
import { captureEvent } from "@/lib/analytics";
import { useEffect } from "react";

export default function InsightaTestPage() {
  const { user } = useAuth();

  // Funnel: a logged-out visitor opened a free tool.
  useEffect(() => {
    if (!user) captureEvent('free_tool_opened', { tool: 'insighta_test' });
  }, [user]);

  const faqs = [
    {
      question: "What is fundraising readiness?",
      answer:
        "Fundraising readiness is how prepared your startup is to present a credible opportunity to investors, including story clarity, traction evidence, market understanding, and overall preparedness.",
    },
    {
      question: "Should founders assess readiness before contacting investors?",
      answer:
        "Yes. A readiness check helps you catch obvious gaps before you start outreach, which can improve both the deck and the fundraising narrative.",
    },
    {
      question: "What if the readiness score is low?",
      answer:
        "A low score usually means the startup should strengthen proof, messaging, or investor materials before pushing harder on fundraising conversations.",
    },
  ];
  const structuredData = [
    createSoftwareApplicationSchema({
      name: "Insighta Test",
      description: "Fundraising readiness self-assessment for founders who want to evaluate investor readiness and identify what to improve.",
      url: "/insighta-test",
      featureList: ["readiness assessment", "fundraising gaps", "investor preparation checklist"],
    }),
    createFAQSchema(faqs),
    createBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Insighta Test", url: "/insighta-test" },
    ]),
  ];
  const relatedLinks = [
    { href: "/vc-search", label: "VC Search" },
    { href: "/email-templates", label: "Email Templates" },
    { href: "/accelerator-hunt", label: "Accelerator Hunt" },
    { href: "/pitch-deck-analyzer", label: "Pitch Deck Analyzer" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Insighta Test - Fundraising Readiness Assessment | Creatives Takeover"
        description="Take our comprehensive self-assessment to evaluate your startup's fundraising readiness, identify gaps, and understand exactly what you need to improve before approaching investors."
        keywords="fundraising readiness assessment, investor readiness test, startup fundraising score, fundraising checklist"
        url="/insighta-test"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="px-4 pt-28 pb-20 md:pt-32 lg:pt-36 relative overflow-hidden" data-section="insighta-test">
          {/* Background styling */}
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

          <div className="container mx-auto max-w-5xl relative z-10">
            {/* Page Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 takeover-gradient creatives-font animate-fade-in leading-tight pb-2">
                Insighta Test
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                Evaluate your startup's fundraising readiness and<span className="gradient-text font-semibold" style={{ lineHeight: 'inherit', marginLeft: '0.25rem' }}> identify what you need to improve.</span>
              </p>
              <RelatedPageLinks title="Related fundraising tools" links={relatedLinks} />
            </div>

            {/* Logged-out visitors can take the assessment and see a real top-line
                readiness score for free; the full diagnostic is gated inside the
                toolkit behind a free-account CTA. */}
            <FundraisingReadinessToolkitAll />

            <div className="mt-10 space-y-8">
              <AnswerSummary
                title="How founders use the readiness assessment"
                description="This makes the purpose of the assessment explicit for both human readers and AI answer products summarizing fundraising tools."
                updatedLabel="March 2026"
                items={[
                  {
                    label: "What it measures",
                    title: "Investor readiness before outreach",
                    description:
                      "The assessment reviews evidence, narrative quality, traction, and investor expectations to show how prepared the startup is for fundraising.",
                  },
                  {
                    label: "Why founders use it",
                    title: "It is cheaper to fix gaps before meetings",
                    description:
                      "This tool is meant to surface weak areas early so founders do not spend outreach effort on a fundraising story that is not ready yet.",
                  },
                  {
                    label: "What happens next",
                    title: "You get priorities to improve",
                    description:
                      "The output helps founders decide whether to improve the deck, traction proof, targeting, or overall fundraising narrative first.",
                  },
                ]}
              />

              <PageFAQSection
                faqs={faqs}
                description="Common founder questions about investor readiness, fundraising preparation, and what to fix before outreach."
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
