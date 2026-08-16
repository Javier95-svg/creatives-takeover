import { useEffect, lazy, Suspense, useRef } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import ValuePropositionCards from "@/components/ValuePropositionCards";
import EvidenceWorkflow from "@/components/EvidenceWorkflow";
import UserReviews from "@/components/UserReviews";
import { COMPETITIVE_HARDENING_FLAGS } from "@/config/competitiveHardeningFlags";
import EntrepreneurProblems from "@/components/EntrepreneurProblems";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

import SEO, { createOrganizationSchema, createWebSiteSchema, createBreadcrumbSchema } from "@/components/SEO";
import Footer from "@/components/Footer";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { trackLandingViewed } from "@/lib/analytics";
import FirstCustomerSprintPilotCallout from "@/components/FirstCustomerSprintPilotCallout";

// Lazy load below-the-fold components for better performance.
// AISpecializationTrends is the only homepage section that uses Recharts; as a
// static import it pulled ~77KB gz of charting into the fold-blocking bundle
// for a section that renders well below the fold. The Suspense fallback below
// reserves its measured height (969px mobile / 753px at lg) so deferring it
// costs no layout shift.
const AISpecializationTrends = lazy(() => import("@/components/AISpecializationTrends"));
const HomeFAQ = lazy(() => import("@/components/HomeFAQ"));
const FounderAnswerLibraryTeaser = lazy(() => import("@/components/seo/FounderAnswerLibraryTeaser"));

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
        title="Creatives Takeover | From Idea to Customer Conversations"
        description="Creatives Takeover moves an untested B2B SaaS idea to qualified customer conversations through one connected evidence workflow."
        keywords="founder operating system, startup idea validation, customer decision brief, interactive product demo, product market fit evidence, MVP builder, go-to-market execution, traction engine, first-time solo founders"
        url="/"
        image="/og-founders-compass-2026-07.png"
        structuredData={structuredData}
      />
      <Navigation />
      <main>
        {isMobile ? (
          <PullToRefresh onRefresh={handleRefresh}>
            <Hero />
            <FirstCustomerSprintPilotCallout />
            <ScrollReveal variant="fade" amount={0.05}>
              <div className="homepage-band-muted">
                <EntrepreneurProblems />
              </div>
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              {COMPETITIVE_HARDENING_FLAGS.categoryPositioningV2 ? <EvidenceWorkflow /> : <UserReviews />}
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <div className="homepage-band-muted">
                <Suspense fallback={<div className="min-h-[969px] lg:min-h-[753px] animate-pulse bg-muted/20" />}>
                  <AISpecializationTrends />
                </Suspense>
              </div>
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <ValuePropositionCards />
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <Suspense fallback={<div className="h-64 animate-pulse bg-muted/20" />}>
                <FounderAnswerLibraryTeaser compact />
              </Suspense>
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <div className="homepage-band-muted">
                <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
                  <HomeFAQ />
                </Suspense>
              </div>
            </ScrollReveal>
          </PullToRefresh>
        ) : (
          <>
            <Hero />
            <FirstCustomerSprintPilotCallout />
            <ScrollReveal variant="fade" amount={0.05}>
              <div className="homepage-band-muted">
                <EntrepreneurProblems />
              </div>
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              {COMPETITIVE_HARDENING_FLAGS.categoryPositioningV2 ? <EvidenceWorkflow /> : <UserReviews />}
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <div className="homepage-band-muted">
                <Suspense fallback={<div className="min-h-[969px] lg:min-h-[753px] animate-pulse bg-muted/20" />}>
                  <AISpecializationTrends />
                </Suspense>
              </div>
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <ValuePropositionCards />
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <Suspense fallback={<div className="h-64 animate-pulse bg-muted/20" />}>
                <FounderAnswerLibraryTeaser compact />
              </Suspense>
            </ScrollReveal>
            <ScrollReveal variant="fade" amount={0.05}>
              <div className="homepage-band-muted">
                <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
                  <HomeFAQ />
                </Suspense>
              </div>
            </ScrollReveal>
          </>
        )}
      </main>
      <Footer />
      <StickyMobileCTA />
      {/* SoftGateModal intentionally omitted for this hero design */}
    </div>
  );
};

export default Index;
