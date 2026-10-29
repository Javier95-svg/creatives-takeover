import { useEffect, lazy, Suspense, useRef, type ReactNode } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import ValuePropositionCards from "@/components/ValuePropositionCards";
import UserReviews from "@/components/UserReviews";
import EntrepreneurProblems from "@/components/EntrepreneurProblems";
import EcosystemSection from "@/components/home/EcosystemSection";
import PricingTeaser from "@/components/home/PricingTeaser";
import ProofSection from "@/components/home/ProofSection";
import ClosingCta from "@/components/home/ClosingCta";
import HomeScene, { useHomeSceneFonts } from "@/components/home/HomeScene";
import "@/components/home/home-sections.css";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { LoadWhenNear } from "@/components/LoadWhenNear";

import SEO, { createOrganizationSchema, createWebSiteSchema, createBreadcrumbSchema } from "@/components/SEO";
import Footer from "@/components/Footer";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { trackLandingViewed } from "@/lib/analytics";

// Lazy load below-the-fold components for better performance.
// AISpecializationTrends is the only homepage section that uses Recharts; as a
// static import it pulled ~77KB gz of charting into the fold-blocking bundle
// for a section that renders well below the fold. The Suspense fallback below
// reserves its measured height (see the placeholders below) so deferring it
// costs no layout shift.
const AISpecializationTrends = lazy(() => import("@/components/AISpecializationTrends"));
const HomeFAQ = lazy(() => import("@/components/HomeFAQ"));
const FounderAnswerLibraryTeaser = lazy(() => import("@/components/seo/FounderAnswerLibraryTeaser"));

// lazy() alone still fetched all three chunks on first render (~190KB gz with
// Recharts), before the visitor scrolled. LoadWhenNear defers each until it is
// 800px from the viewport. Each placeholder reserves the section's rendered
// height (measured 2026-10-29 at 390, 768 and 1024+ px wide); the old ones were
// half the real height, so every swap pushed the page down on phones.
const trendsPlaceholder = <div className="min-h-[1635px] md:min-h-[1509px] lg:min-h-[1191px] animate-pulse bg-muted/20" />;
const teaserPlaceholder = <div className="min-h-[902px] md:min-h-[722px] lg:min-h-[468px] animate-pulse bg-muted/20" />;
const faqPlaceholder = <div className="min-h-[1172px] md:min-h-[1244px] lg:min-h-[1300px] animate-pulse bg-muted/20" />;

const Reveal = ({ children }: { children: ReactNode }) => (
  <ScrollReveal variant="fade" amount={0.05}>
    {children}
  </ScrollReveal>
);

const Index = () => {
  const isMobile = useIsMobile();
  const hasTrackedLandingView = useRef(false);
  // Track homepage analytics
  usePageAnalytics('/', 'Home - Creatives Takeover');
  useHomeSceneFonts();

  useEffect(() => {
    if (hasTrackedLandingView.current) return;
    trackLandingViewed({ page: '/' });
    hasTrackedLandingView.current = true;
  }, []);

  // Manage session storage in useEffect with proper cleanup
  useEffect(() => {
    // Clear popup session storage on fresh page load
    sessionStorage.removeItem('credit-popup-time-seen');
  }, []);

  const handleRefresh = async () => {
    window.location.reload();
  };

  // Structured data for homepage
  const structuredData = [
    createOrganizationSchema(),
    createWebSiteSchema(),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' }
    ])
  ];

  // The story, in order: what it is (hero), the problems and the tool for each,
  // the stages, what is inside, who is here, why now, what it costs, what people
  // say (hidden until real quotes exist), answers, and one last way in.
  // Each section after the hero is its own scene with its own display face
  // (see home-scenes.css); HomeWallpaper stays behind the whole page.
  const sections = (
    <>
      <Hero />
      <HomeScene scene="journey">
        <Reveal>
          <EntrepreneurProblems />
        </Reveal>
      </HomeScene>
      <HomeScene scene="orbit">
        <Reveal>
          <UserReviews />
        </Reveal>
      </HomeScene>
      <HomeScene scene="studio">
        <Reveal>
          <ValuePropositionCards />
        </Reveal>
      </HomeScene>
      <HomeScene scene="network">
        <Reveal>
          <EcosystemSection />
        </Reveal>
      </HomeScene>
      <HomeScene scene="data">
        <Reveal>
          <LoadWhenNear id="ai-trends" placeholder={trendsPlaceholder}>
            <Suspense fallback={trendsPlaceholder}>
              <AISpecializationTrends />
            </Suspense>
          </LoadWhenNear>
        </Reveal>
      </HomeScene>
      <HomeScene scene="tiers">
        <Reveal>
          <PricingTeaser />
        </Reveal>
      </HomeScene>
      {/* Renders nothing (zero height) until src/data/homeProof.ts has quotes. */}
      <HomeScene scene="quote">
        <ProofSection />
      </HomeScene>
      <HomeScene scene="library">
        <Reveal>
          <LoadWhenNear id="pedia-teaser" placeholder={teaserPlaceholder}>
            <Suspense fallback={teaserPlaceholder}>
              <FounderAnswerLibraryTeaser compact />
            </Suspense>
          </LoadWhenNear>
        </Reveal>
      </HomeScene>
      <HomeScene scene="calm">
        <Reveal>
          <LoadWhenNear id="home-faq" placeholder={faqPlaceholder}>
            <Suspense fallback={faqPlaceholder}>
              <HomeFAQ />
            </Suspense>
          </LoadWhenNear>
        </Reveal>
      </HomeScene>
      <HomeScene scene="launch">
        <ClosingCta />
      </HomeScene>
    </>
  );

  return (
    <div className="min-h-screen relative">
      <HomeWallpaper variant="landing" />
      <SEO
        title="Creatives Takeover | Start and Test Your Startup Project"
        description="Creatives Takeover is a SaaS platform where founders start and test their projects, with tools for every stage plus mentors, service providers and investors."
        keywords="founder operating system, startup idea validation, customer decision brief, interactive product demo, product market fit evidence, MVP builder, go-to-market execution, traction engine, first-time solo founders"
        url="/"
        image="/og-founders-compass-2026-09.png"
        imageWidth={3159}
        imageHeight={1462}
        structuredData={structuredData}
      />
      <Navigation />
      <main>
        {isMobile ? <PullToRefresh onRefresh={handleRefresh}>{sections}</PullToRefresh> : sections}
      </main>
      <Footer />
      {/* SoftGateModal intentionally omitted for this hero design */}
    </div>
  );
};

export default Index;
