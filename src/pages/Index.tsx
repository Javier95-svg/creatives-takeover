import { useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import ValuePropositionCards from "@/components/ValuePropositionCards";
import UserReviews from "@/components/UserReviews";
import EntrepreneurProblems from "@/components/EntrepreneurProblems";
import AISpecializationTrends from "@/components/AISpecializationTrends";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";

import SEO, { createOrganizationSchema, createWebSiteSchema, createBreadcrumbSchema } from "@/components/SEO";
import Footer from "@/components/Footer";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Lazy load below-the-fold components for better performance
const HomeFAQ = lazy(() => import("@/components/HomeFAQ"));

const Index = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  // Track homepage analytics
  usePageAnalytics('/', 'Home - Creatives Takeover');
  
  // Manage session storage in useEffect with proper cleanup
  useEffect(() => {
    // Clear popup session storage on fresh page load
    sessionStorage.removeItem('credit-popup-time-seen');
  }, []);

  // Redirect to onboarding only if explicitly not completed
  useEffect(() => {
    if (authLoading || !user) return;

    const checkOnboardingRedirect = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          // Only redirect to onboarding if explicitly false
          // Authenticated users can freely browse the homepage
          if (profile.onboarding_completed === false) {
            navigate('/onboarding');
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingRedirect();
  }, [user, authLoading, navigate]);
  
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
        // TODO: Add your Google Search Console verification code here
        // Get it from: https://search.google.com/search-console
        // googleSiteVerification="paste-your-verification-code-here"
      />
      <Navigation />
      <main>
        {isMobile ? (
          <PullToRefresh onRefresh={handleRefresh}>
            <Hero />
            <EntrepreneurProblems />
            
            <AISpecializationTrends />
            
            <ValuePropositionCards />
            
            <UserReviews />
            
            <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
              <HomeFAQ />
            </Suspense>
          </PullToRefresh>
        ) : (
          <>
            <Hero />
            <EntrepreneurProblems />
            
            <AISpecializationTrends />
            
            <ValuePropositionCards />
            
            <UserReviews />
            
            <Suspense fallback={<div className="h-96 animate-pulse bg-muted/20" />}>
              <HomeFAQ />
            </Suspense>
          </>
        )}
      </main>
      <Footer />
      
      {/* Sticky Mobile CTA - appears after scroll on mobile */}
      <StickyMobileCTA />
      
    </div>
  );
};

export default Index;
