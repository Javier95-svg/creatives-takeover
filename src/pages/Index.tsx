import { useEffect, lazy, Suspense } from "react";
import Navigation from "@/components/Navigation";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";

import SEO, { createOrganizationSchema, createWebSiteSchema, createBreadcrumbSchema } from "@/components/SEO";
import Footer from "@/components/Footer";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import HomeHero from "@/components/home/HomeHero";
import HomeSocialProof from "@/components/home/HomeSocialProof";
import HomePillars from "@/components/home/HomePillars";
import HomeHowItWorks from "@/components/home/HomeHowItWorks";
import HomeMetrics from "@/components/home/HomeMetrics";
import HomeTestimonials from "@/components/home/HomeTestimonials";
import HomeCTA from "@/components/home/HomeCTA";

// Lazy load below-the-fold components for better performance
const HomeFAQ = lazy(() => import("@/components/HomeFAQ"));

const Index = () => {
  const isMobile = useIsMobile();
  // Track homepage analytics
  usePageAnalytics('/', 'Home - Creatives Takeover');
  
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

  const content = (
    <>
      <HomeHero />
      <HomeSocialProof />
      <HomePillars />
      <HomeHowItWorks />
      <HomeMetrics />
      <HomeTestimonials />
      <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
        <HomeFAQ />
      </Suspense>
      <HomeCTA />
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Creatives Takeover"
        description="Turn your creative idea into a real business. Get AI-powered planning, community support, and funding resources designed for creative entrepreneurs. Start building today."
        keywords="AI co-founder, creative business, creative entrepreneur, business planning, accountability partners, business for creatives, startup funding"
        url="/"
        image="/lovable-uploads/new-favicon.png"
        structuredData={structuredData}
        // TODO: Add your Google Search Console verification code here
        // Get it from: https://search.google.com/search-console
        // googleSiteVerification="paste-your-verification-code-here"
      />
      <Navigation />
      <main>
        {isMobile ? (
          <PullToRefresh onRefresh={handleRefresh}>
            {content}
          </PullToRefresh>
        ) : (
          content
        )}
      </main>
      <Footer />
      
      {/* Sticky Mobile CTA - appears after scroll on mobile */}
      <StickyMobileCTA />
      
    </div>
  );
};

export default Index;
