import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BlogHero from "@/components/blog/BlogHero";
import BlogStickyNav from "@/components/blog/BlogStickyNav";
import FundingOpportunitiesSection from "@/components/blog/FundingOpportunitiesSection";
import TrendingSection from "@/components/blog/TrendingSection";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect, useState, useRef } from "react";
import { FundingFilters } from "@/types/funding";

const Blog = () => {
  const { trackPageVisit } = useReadingAnalytics();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showStickyNav, setShowStickyNav] = useState(false);
  const [fundingFilters, setFundingFilters] = useState<FundingFilters>({});
  const heroRef = useRef<HTMLDivElement>(null);

  // Track page visit when component mounts
  useEffect(() => {
    trackPageVisit('Insighta Blog');
  }, [trackPageVisit]);

  // Show sticky nav after scrolling past hero
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyNav(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Structured data for blog page
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "Creatives Takeover Insighta Blog",
      "description": "Expert insights on creative business trends, AI opportunities, and entrepreneurship strategies",
      "url": "https://creatives-takeover.com/insighta",
      "publisher": {
        "@type": "Organization",
        "name": "Creatives Takeover",
        "logo": {
          "@type": "ImageObject",
          "url": "https://creatives-takeover.com/lovable-uploads/new-favicon.png"
        }
      }
    },
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'News', url: '/insighta' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Creatives Takeover"
        description="Discover AI-powered insights on creative business trends, funding opportunities, and entrepreneurship strategies. Stay ahead with daily curated content for creative entrepreneurs."
        keywords="creative business trends, AI opportunities, entrepreneurship news, startup funding, business insights, creative entrepreneur"
        url="/insighta"
        structuredData={structuredData}
      />
      <Navigation />
      
      {/* Sticky Navigation - shows after scrolling past hero */}
      {showStickyNav && (
        <BlogStickyNav
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      )}
      
      <main>
        <div ref={heroRef}>
          <BlogHero />
        </div>
        <FundingOpportunitiesSection 
          filters={fundingFilters}
          onFiltersChange={setFundingFilters}
        />
        <TrendingSection 
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </main>
      <Footer />
    </div>
  );
};

export default Blog;