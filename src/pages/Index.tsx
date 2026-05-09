import { useEffect, lazy, Suspense, useRef } from "react";
import { useFeatureFlagEnabled } from "posthog-js/react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import IcpWedgeHero from "@/components/IcpWedgeHero";
import ValuePropositionCards from "@/components/ValuePropositionCards";
import UserReviews from "@/components/UserReviews";
import EntrepreneurProblems from "@/components/EntrepreneurProblems";
import AISpecializationTrends from "@/components/AISpecializationTrends";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { useExitIntent } from "@/hooks/useExitIntent";
import { ExitIntentModal } from "@/components/ExitIntentModal";
import { useConversionTracking } from "@/hooks/useConversionTracking";

import SEO, { createOrganizationSchema, createWebSiteSchema, createBreadcrumbSchema } from "@/components/SEO";
import Footer from "@/components/Footer";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { trackLandingViewed } from "@/lib/analytics";

// Lazy load below-the-fold components for better performance
const HomeFAQ = lazy(() => import("@/components/HomeFAQ"));

const Index = () => {
  const isMobile = useIsMobile();
  const wedgeEnabled = useFeatureFlagEnabled('homepage-hero-wedge');
  const { showExitIntent, closeExitIntent } = useExitIntent();
  const { trackTriggerView, trackDismissal } = useConversionTracking();
  // Always show the previous Hero section design
  const hasTrackedLandingView = useRef(false);
  // Track homepage analytics
  usePageAnalytics('/', 'Home - Creatives Takeover');

  // Track when exit intent modal fires
  useEffect(() => {
    if (showExitIntent) {
      trackTriggerView('exit-intent');
      trackLandingViewed({ page: '/', exit_intent: true });
    }
  }, [showExitIntent, trackTriggerView]);

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
        title="Creatives Takeover"
        description="Turn your creative idea into a real business. Get AI-powered planning, community support, and funding resources designed for creative entrepreneurs. Start building today."
        keywords="AI co-founder, creative business, creative entrepreneur, business planning, accountability partners, business for creatives, startup funding"
        url="/"
        image="/lovable-uploads/new-favicon.png"
        structuredData={structuredData}
      />
      <Navigation />
      <main>
        {isMobile ? (
          <PullToRefresh onRefresh={handleRefresh}>
            {wedgeEnabled ? <IcpWedgeHero /> : <Hero />}
            <div className="homepage-band-muted">
              <EntrepreneurProblems />
            </div>
            <UserReviews />
            <div className="homepage-band-muted">
              <AISpecializationTrends />
            </div>
            <ValuePropositionCards />
            <div className="homepage-band-muted">
              <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
                <HomeFAQ />
              </Suspense>
            </div>
          </PullToRefresh>
        ) : (
          <>
            {wedgeEnabled ? <IcpWedgeHero /> : <Hero />}
            <div className="homepage-band-muted">
              <EntrepreneurProblems />
            </div>
            <UserReviews />
            <div className="homepage-band-muted">
              <AISpecializationTrends />
            </div>
            <ValuePropositionCards />
            <div className="homepage-band-muted">
              <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
                <HomeFAQ />
              </Suspense>
            </div>
          </>
        )}
      </main>
      <Footer />
      <StickyMobileCTA />
      <ExitIntentModal
        isOpen={showExitIntent}
        onClose={() => { closeExitIntent(); trackDismissal('exit-intent'); }}
      />
      {/* SoftGateModal intentionally omitted for this hero design */}
    </div>
  );
};

export default Index;
