import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BlogStickyNav from "@/components/blog/BlogStickyNav";
import FundingOpportunitiesSection from "@/components/blog/FundingOpportunitiesSection";
import FundraisingReadinessToolkit from "@/components/blog/FundraisingReadinessToolkit";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect, useState } from "react";
import { FundingFilters } from "@/types/funding";

const Blog = () => {
  const { trackPageVisit } = useReadingAnalytics();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [fundingFilters, setFundingFilters] = useState<FundingFilters>({});

  // Track page visit when component mounts
  useEffect(() => {
    trackPageVisit('Insighta Blog');
  }, [trackPageVisit]);

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
      
      <main>
        <FundraisingReadinessToolkit />
        <FundingOpportunitiesSection 
          filters={fundingFilters}
          onFiltersChange={setFundingFilters}
        />
      </main>
      <Footer />
    </div>
  );
};

export default Blog;