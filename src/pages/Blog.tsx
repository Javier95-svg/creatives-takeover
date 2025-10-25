import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BlogHero from "@/components/blog/BlogHero";
import BlogStickyNav from "@/components/blog/BlogStickyNav";
import FundingOpportunitiesSection from "@/components/blog/FundingOpportunitiesSection";
import TrendingSection from "@/components/blog/TrendingSection";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect, useState, useRef } from "react";

const Blog = () => {
  const { trackPageVisit } = useReadingAnalytics();
  const [searchTerm, setSearchTerm] = useState<string>();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showStickyNav, setShowStickyNav] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Scroll to opportunities section
    const opportunitiesSection = document.querySelector('[data-section="opportunities"]');
    if (opportunitiesSection) {
      opportunitiesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSearchClick = () => {
    // Scroll to hero search
    heroRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      "url": "https://creatives-takeover.com/news",
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
      { name: 'News', url: '/news' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Creative Business Trends & AI Opportunities for Entrepreneurs | Insighta"
        description="AI-powered insights on creative business trends, funding opportunities, and entrepreneurship strategies for solopreneurs. Stay ahead with daily curated content, AI tools analysis, and business opportunities."
        keywords="creative business trends, AI opportunities for entrepreneurs, solopreneur insights, creative entrepreneurship, AI business tools, startup funding, business insights, creative entrepreneur trends"
        url="/news"
        structuredData={structuredData}
      />
      <Navigation />
      
      {/* Sticky Navigation - shows after scrolling past hero */}
      {showStickyNav && (
        <BlogStickyNav
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onSearchClick={handleSearchClick}
        />
      )}
      
      <main>
        <div ref={heroRef}>
          <BlogHero onSearch={handleSearch} />
        </div>
        <FundingOpportunitiesSection />
        <TrendingSection 
          searchTerm={searchTerm} 
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </main>
      <Footer />
    </div>
  );
};

export default Blog;