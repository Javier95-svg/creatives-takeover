import SEO, { createFAQSchema, createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import FAQHero from "@/components/FAQHero";
import SearchableFAQ from "@/components/SearchableFAQ";
import FAQNavigation from "@/components/FAQNavigation";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";

const FAQPage = () => {
  // Structured data for FAQ page
  const structuredData = [
    createFAQSchema([
      {
        question: "What is Creatives Takeover?",
        answer: "Creatives Takeover is an AI-powered startup platform featuring BizMap AI, your AI co-founder that helps you go from idea to launch. Our tools include PMF Lab for product-market fit analysis, Pitch Deck Analyzer, VC Search for investor discovery, Insighta Test for landing page validation, and Focus Funnel for goal management."
      },
      {
        question: "How much does it cost?",
        answer: "We offer three plans: Rookie (Free) with 25 credits/month for idea validation, Rising at $32.99/month with 50 credits for building your startup, and Pro at $74.99/month with 150 credits for scaling with unlimited access. Annual billing saves approximately 25%."
      },
      {
        question: "What is the credit system?",
        answer: "Credits power all AI features. BizMap AI chat costs 1 credit per message, analyses like PMF and Pitch Deck cost 8 credits, and features like Tech Stack Generation cost 3 credits. Credits refresh monthly based on your plan tier."
      },
      {
        question: "What makes Creatives Takeover different?",
        answer: "We combine AI intelligence with founder-focused tools: BizMap AI for strategic planning, PMF Lab for market validation, Pitch Deck Analyzer for fundraising prep, VC Search for investor matching, and Founder Stories for community support. All designed specifically for first-time founders and startup entrepreneurs."
      },
      {
        question: "Can I try it for free?",
        answer: "Yes! Our Rookie plan is free forever with 25 credits per month, no credit card required. You get access to BizMap AI, read-only PMF Lab, 5 VC profile views, basic Insighta Test, and community features. It's perfect for validating your startup idea."
      }
    ]),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'FAQ', url: '/faq' }
    ])
  ];

  return (
    <>
      <SEO
        title="FAQ - Creatives Takeover"
        description="Find answers to frequently asked questions about Creatives Takeover's AI startup tools, pricing plans, credits system, BizMap AI, PMF Lab, and community features."
        keywords="FAQ, frequently asked questions, startup platform help, BizMap AI, PMF Lab, pricing, credits, VC Search, Pitch Deck Analyzer"
        url="/faq"
        canonical="https://creatives-takeover.com/faq"
        structuredData={structuredData}
      />
      <div className="relative min-h-screen overflow-hidden">
        <HomeWallpaper />
        <div className="relative z-10">
          <Navigation />
          <FAQHero />
          <SearchableFAQ />
          <FAQNavigation />
        </div>
        <Footer />
      </div>
    </>
  );
};

export default FAQPage;