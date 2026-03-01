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
        answer: "Creatives Takeover is a founder support platform built to help people build startups from scratch. BizMap AI guides users through the Startup Development Cycle, while tools like PMF Lab, ICP Builder, Tech Stack Builder, Focus Funnel, VC Search, and the mentor and co-founder community help turn ideas into real execution."
      },
      {
        question: "How much does it cost?",
        answer: "We offer three plans: Rookie (Free) with 25 credits/month for idea validation, Rising at $32.99/month with 100 credits for building your startup, and Pro at $74.99/month with 300 credits for scaling with unlimited access. Annual billing saves approximately 25%. You can also buy extra credit packs (20, 40, or 60 credits) on any plan - they never expire."
      },
      {
        question: "What is the credit system?",
        answer: "Credits power AI actions across the platform. BizMap AI chat costs 1 credit per message, Prompt Generation costs 2 credits, Waitlist publishing costs 3 credits, Tech Stack and Email Templates cost 4 credits, Launch Reports and Roadmap Generation cost 6 credits, deeper analysis tools like PMF Lab and Pitch Deck Analyzer cost 10 credits, and premium founder actions like Investor Matching cost 12 credits. Credits refresh monthly based on your plan tier. If you run out mid-month, you can buy extra credit packs (20, 40, or 60 credits) on any plan - purchased credits never expire and are used after your monthly quota."
      },
      {
        question: "What makes Creatives Takeover different?",
        answer: "Our moat is not generic business-plan generation. We help founders, indie hackers, and builders move from scratch to launch through a practical Startup Development Cycle supported by AI, founder tools, mentors, co-founders, and fundraising resources."
      },
      {
        question: "Can I try it for free?",
        answer: "Yes. Our Rookie plan is free forever with 25 credits per month and no credit card required. You get access to BizMap AI, read-only PMF Lab, 5 VC profile views, basic Insighta Test, and community features."
      },
      {
        question: "Is my business idea safe?",
        answer: "Yes. Your workspace is private by default. We do not share or sell your private startup work, and your data stays protected with secure infrastructure and access controls. More importantly, startup success comes from execution, customer understanding, and speed, not from someone casually hearing a rough idea."
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
