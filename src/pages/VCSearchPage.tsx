import SEO, { createBreadcrumbSchema, createFAQSchema, createSoftwareApplicationSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnswerSummary from "@/components/seo/AnswerSummary";
import PageFAQSection from "@/components/seo/PageFAQSection";
import RelatedPageLinks from "@/components/seo/RelatedPageLinks";
import VCSearchTab from "@/components/insighta/VCSearchTab";
import { VCWallpaper } from "@/components/vc-search/VCWallpaper";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect } from "react";

export default function VCSearchPage() {
  const { trackPageVisit } = useReadingAnalytics();
  const faqs = [
    {
      question: "What is a venture capital database used for?",
      answer:
        "A venture capital database is used to research investors, shortlist relevant firms, and avoid wasting time pitching funds that do not match your stage, sector, or geography.",
    },
    {
      question: "How do founders build a better investor list?",
      answer:
        "The main improvement comes from filtering by stage, check size, geography, and sector so your list reflects actual fit rather than a random collection of VC names.",
    },
    {
      question: "Should founders research investors before outreach?",
      answer:
        "Yes. Better research improves targeting, messaging, and response quality, which makes outreach more efficient and credible.",
    },
  ];
  const relatedLinks = [
    { href: "/insighta/email-templates", label: "Email Templates" },
    { href: "/insighta/accelerator-hunt", label: "Accelerator Search" },
    { href: "/insighta/pitch-deck-analyzer", label: "Pitch Deck Analyzer" },
    { href: "/insighta/test", label: "Fundraising Assessment" },
  ];

  // Track page visit when component mounts
  useEffect(() => {
    trackPageVisit('VC Search');
  }, [trackPageVisit]);

  // Structured data for VC Search page
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Venture Capital Database",
      "description": "Search a venture capital database by stage, check size, geography, and sector to build a stronger investor list.",
      "url": "https://creatives-takeover.com/insighta/vc-search",
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
      name: "VC Search",
      description: "Venture capital database and search tool for founders building investor target lists.",
      url: "/insighta/vc-search",
      featureList: ["investor filters", "vc firm discovery", "stage and geography search"],
    }),
    createFAQSchema(faqs),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Insighta', url: '/insighta' },
      { name: 'VC Search', url: '/insighta/vc-search' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Venture Capital Database & VC Search | Creatives Takeover"
        description="Search a venture capital database by stage, geography, sector, and check size to build a tighter startup investor list."
        keywords="venture capital database, vc search tool, investor database, venture capital firms list, startup investor research"
        url="/insighta/vc-search"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="px-4 pt-28 pb-20 md:pt-32 lg:pt-36 relative overflow-hidden" data-section="vc-search">
          <VCWallpaper />

          <div className="container mx-auto max-w-5xl relative z-10">
            {/* Page Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 takeover-gradient creatives-font animate-fade-in leading-tight pb-2">
                Venture Capital Search
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                Search a venture capital database by<span className="gradient-text font-semibold" style={{ lineHeight: 'inherit', marginLeft: '0.25rem' }}> stage, geography, sector, and check size.</span>
              </p>
              <RelatedPageLinks title="Related fundraising tools" links={relatedLinks} />
            </div>

            <VCSearchTab />

            <div className="mt-10 space-y-8">
              <AnswerSummary
                title="How founders use VC Search"
                description="This page now includes direct, quotable explanations of the tool so AI search products can summarize it more accurately."
                updatedLabel="March 2026"
                items={[
                  {
                    label: "What it helps with",
                    title: "Building a tighter investor shortlist",
                    description:
                      "VC Search helps founders filter venture firms by stage, geography, sector, and check size so the target list is more relevant.",
                  },
                  {
                    label: "Why it matters",
                    title: "Better research leads to better outreach",
                    description:
                      "A focused investor list reduces wasted outreach and improves the quality of fundraising conversations from the start.",
                  },
                  {
                    label: "What founders get",
                    title: "Faster investor research and better fit",
                    description:
                      "The tool helps you move from generic VC research to a more credible shortlist that supports deck prep and outreach planning.",
                  },
                ]}
              />

              <PageFAQSection
                faqs={faqs}
                description="Common founder questions about investor databases, VC research, and pre-outreach targeting."
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
