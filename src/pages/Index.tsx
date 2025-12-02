import { useEffect, lazy, Suspense } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import ValuePropositionCards from "@/components/ValuePropositionCards";
import UserReviews from "@/components/UserReviews";
import EntrepreneurProblems from "@/components/EntrepreneurProblems";
import AISpecializationTrends from "@/components/AISpecializationTrends";
import StickyMobileCTA from "@/components/StickyMobileCTA";

import SEO, { createOrganizationSchema, createWebSiteSchema, createBreadcrumbSchema } from "@/components/SEO";
import Footer from "@/components/Footer";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";

// Lazy load below-the-fold components for better performance
const HomeFAQ = lazy(() => import("@/components/HomeFAQ"));

const Index = () => {
  // Track homepage analytics
  usePageAnalytics('/', 'Home - Creatives Takeover');
  
  // Manage session storage in useEffect with proper cleanup
  useEffect(() => {
    // Clear popup session storage on fresh page load
    sessionStorage.removeItem('credit-popup-time-seen');
  }, []);

  // Structured data for homepage
  const structuredData = [
    createOrganizationSchema(),
    createWebSiteSchema(),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
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
      <main className="pb-20 md:pb-0">
        <Hero />
        <EntrepreneurProblems />
        
        <AISpecializationTrends />
        
        <ValuePropositionCards />
        
        <UserReviews />
        
        <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
          <HomeFAQ />
        </Suspense>
      </main>
      <Footer />
      
      {/* Sticky Mobile CTA - appears after scroll on mobile */}
      <StickyMobileCTA />
      
    </div>
  );
};

export default Index;
