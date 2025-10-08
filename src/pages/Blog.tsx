import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BlogHero from "@/components/blog/BlogHero";
import BlogStickyNav from "@/components/blog/BlogStickyNav";
import FundingOpportunitiesSection from "@/components/blog/FundingOpportunitiesSection";
import TrendingSection from "@/components/blog/TrendingSection";
import SignupInviteModal from "@/components/blog/SignupInviteModal";
import { useSignupInvite } from "@/hooks/useSignupInvite";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect, useState, useRef } from "react";

const Blog = () => {
  const { showInvite, closeInvite } = useSignupInvite();
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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>News - Creatives Takeover | Business Tips & AI Insights</title>
        <meta name="description" content="Discover expert insights on business planning, AI tools, entrepreneurship, and creative strategies. Stay updated with the latest trends in business innovation." />
        <meta name="keywords" content="business news, entrepreneurship tips, AI business tools, startup advice, creative business strategies" />
      </Helmet>
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
      
      {/* Signup Invite Modal */}
      <SignupInviteModal 
        isOpen={showInvite} 
        onClose={closeInvite} 
      />
    </div>
  );
};

export default Blog;