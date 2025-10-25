import { useEffect, lazy, Suspense } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import EntrepreneurProblems from "@/components/EntrepreneurProblems";
import { CreditCampaignPopup } from "@/components/CreditCampaignPopup";
import ChatbotWidget from "@/components/ChatbotWidget";
import SEO, { createOrganizationSchema, createWebSiteSchema, createBreadcrumbSchema } from "@/components/SEO";
import Footer from "@/components/Footer";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";

// Lazy load below-the-fold components for better performance
const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const SocialProof = lazy(() => import("@/components/SocialProof"));
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
        title="AI Co-Founder for Creative Entrepreneurs | Business Planning Tool for Solopreneurs"
        description="The creative entrepreneur's AI co-founder for solopreneurs. Go from scattered ideas to profitable business launch in 30 days. Join 15,000+ creative entrepreneurs building real businesses with AI-powered planning."
        keywords="AI co-founder, creative entrepreneur, solopreneur, business planning tool, AI business planning, creative business launch, 30-day launch, solopreneur tools, creative business planning"
        url="/"
        image="/lovable-uploads/new-favicon.png"
        structuredData={structuredData}
        // TODO: Add your Google Search Console verification code here
        // Get it from: https://search.google.com/search-console
        // googleSiteVerification="paste-your-verification-code-here"
      />
      <Navigation />
      <main>
        <Hero />
        <EntrepreneurProblems />
        
        {/* Lazy-loaded below-the-fold components with loading fallback */}
        <Suspense fallback={<div className="h-screen animate-pulse bg-muted/20" />}>
          <HowItWorks />
        </Suspense>
        
        <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
          <SocialProof />
        </Suspense>
        
        <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
          <HomeFAQ />
        </Suspense>
      </main>
      <Footer />
      
      {/* Enhanced Quiz Popup - Only popup to avoid overwhelming visitors */}
      <CreditCampaignPopup trigger="time" delay={20000} />
      
      {/* AI Creative Operating System */}
      <ChatbotWidget />
    </div>
  );
};

export default Index;
