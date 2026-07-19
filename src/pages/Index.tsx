import { useEffect, lazy, Suspense, useRef } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import ValuePropositionCards from "@/components/ValuePropositionCards";
import UserReviews from "@/components/UserReviews";
import EntrepreneurProblems from "@/components/EntrepreneurProblems";
import AISpecializationTrends from "@/components/AISpecializationTrends";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

import SEO, { createOrganizationSchema, createWebSiteSchema, createBreadcrumbSchema } from "@/components/SEO";
import Footer from "@/components/Footer";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { trackLandingViewed } from "@/lib/analytics";

// Lazy load below-the-fold components for better performance
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
      <HomeWallpaper />
      <SEO
        title="The Founders Compass | Creatives Takeover"
        description="Turn your idea into a validated startup through one evidence backed path for customer clarity, proof, PMF decisions, MVP building, GTM execution, and verified traction."
        keywords="founder operating system, startup idea validation, customer decision brief, interactive product demo, product market fit evidence, MVP builder, go-to-market execution, traction engine, first-time solo founders"
        url="/"
        image="/og-image.png"
        structuredData={structuredData}
      />
      <Navigation />
      <main>
        {isMobile ? (
          <PullToRefresh onRefresh={handleRefresh}>
            <Hero ctaHref="/demo-studio" />
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
                <AISpecializationTrends />
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
            <Hero ctaHref="/demo-studio" />
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
                <AISpecializationTrends />
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
