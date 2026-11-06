import { useEffect, lazy, Suspense, useRef } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import ValuePropositionCards from "@/components/ValuePropositionCards";
import UserReviews from "@/components/UserReviews";
import EntrepreneurProblems from "@/components/EntrepreneurProblems";
import ProofSection from "@/components/home/ProofSection";
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
// The programs band replaced the AI trends section (and with it the page's only
// Recharts use); it carries the /enterprise styles and a product screen, so it
// loads on approach like the other sections below.
const HomeProgramsBand = lazy(() => import("@/components/home/HomeProgramsBand"));
const HomeFAQ = lazy(() => import("@/components/HomeFAQ"));
const FounderAnswerLibraryTeaser = lazy(() => import("@/components/seo/FounderAnswerLibraryTeaser"));

// lazy() alone still fetched every chunk on first render, before the visitor
// scrolled. LoadWhenNear defers each until it is 800px from the viewport; the
// placeholders keep the space so nothing shifts.
const programsPlaceholder = <div className="min-h-[1060px] lg:min-h-[694px] animate-pulse bg-muted/20" />;
const teaserPlaceholder = <div className="h-64 animate-pulse bg-muted/20" />;
const faqPlaceholder = <div className="h-96 animate-pulse bg-muted/20" />;

const Index = () => {
  const isMobile = useIsMobile();
  const hasTrackedLandingView = useRef(false);
  // Track homepage analytics
  usePageAnalytics('/', 'Home - Creatives Takeover');

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

  return (
    <div className="min-h-screen relative">
      <HomeWallpaper variant="landing" />
      <SEO
        title="Creatives Takeover | Start and Test Your Startup Idea"
        description="Creatives Takeover is where founders start a project and test if people want it: define your customer, show a demo to real people and decide what to build."
        keywords="startup idea validation, test business idea, ideal customer profile, product demo, customer discovery, MVP, go-to-market, founder profile, startup programs, incubator cohort"
        url="/"
        image="/og-founders-compass-2026-09.png"
        imageWidth={3159}
        imageHeight={1462}
        structuredData={structuredData}
      />
      <Navigation />
      <main>
        {isMobile ? (
          <PullToRefresh onRefresh={handleRefresh}>
            <Hero />
            <ScrollReveal variant="fade" amount={0.05}>
              <div className="homepage-band-muted">
                <EntrepreneurProblems />
              </div>
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <UserReviews />
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <div className="homepage-band-muted">
                <LoadWhenNear id="home-programs" placeholder={programsPlaceholder}>
                  <Suspense fallback={programsPlaceholder}>
                    <HomeProgramsBand />
                  </Suspense>
                </LoadWhenNear>
              </div>
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <ValuePropositionCards />
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <LoadWhenNear id="pedia-teaser" placeholder={teaserPlaceholder}>
                <Suspense fallback={teaserPlaceholder}>
                  <FounderAnswerLibraryTeaser compact />
                </Suspense>
              </LoadWhenNear>
            </ScrollReveal>
            <ProofSection />
            <ScrollReveal variant="fade" amount={0.05}>
              <div className="homepage-band-muted">
                <LoadWhenNear id="home-faq" placeholder={faqPlaceholder}>
                  <Suspense fallback={faqPlaceholder}>
                    <HomeFAQ />
                  </Suspense>
                </LoadWhenNear>
              </div>
            </ScrollReveal>
          </PullToRefresh>
        ) : (
          <>
            <Hero />
            <ScrollReveal variant="fade" amount={0.05}>
              <div className="homepage-band-muted">
                <EntrepreneurProblems />
              </div>
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <UserReviews />
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <div className="homepage-band-muted">
                <LoadWhenNear id="home-programs" placeholder={programsPlaceholder}>
                  <Suspense fallback={programsPlaceholder}>
                    <HomeProgramsBand />
                  </Suspense>
                </LoadWhenNear>
              </div>
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <ValuePropositionCards />
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <LoadWhenNear id="pedia-teaser" placeholder={teaserPlaceholder}>
                <Suspense fallback={teaserPlaceholder}>
                  <FounderAnswerLibraryTeaser compact />
                </Suspense>
              </LoadWhenNear>
            </ScrollReveal>
            <ProofSection />
            <ScrollReveal variant="fade" amount={0.05}>
              <div className="homepage-band-muted">
                <LoadWhenNear id="home-faq" placeholder={faqPlaceholder}>
                  <Suspense fallback={faqPlaceholder}>
                    <HomeFAQ />
                  </Suspense>
                </LoadWhenNear>
              </div>
            </ScrollReveal>
          </>
        )}
      </main>
      <Footer />
      {/* SoftGateModal intentionally omitted for this hero design */}
    </div>
  );
};

export default Index;
