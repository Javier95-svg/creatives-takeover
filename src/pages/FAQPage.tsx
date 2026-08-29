import SEO, { createFAQSchema, createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import FAQHero from "@/components/FAQHero";
import SearchableFAQ from "@/components/SearchableFAQ";
import FAQNavigation from "@/components/FAQNavigation";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

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
        answer: "We offer four plans: Rookie starts free with 50 credits and standard AI models. Starter adds 100 credits, the PROVE workspace, Email Templates, and deeper research. Rising adds 250 credits, advanced MVP models, and the complete First Customer Proof workflow. Pro adds 600 credits, Find Your Angel, and unlimited research. Extra credit packs remain available on every plan."
      },
      {
        question: "What is the credit system?",
        answer: "Credits power metered AI actions across the platform. Core founder tools are available across plans, while model levels and monthly research quotas vary. GTM Strategist is available on every plan and uses 6 credits per researched generation; ICP Builder remains free."
      },
      {
        question: "What makes Creatives Takeover different?",
        answer: "Our moat is not generic business-plan generation. We help founders, indie hackers, and builders move from scratch to launch through a practical Startup Development Cycle supported by AI, founder tools, mentors, co-founders, and fundraising resources."
      },
      {
        question: "Can I try it for free?",
        answer: "Yes. Rookie is free forever with 50 credits per month and no credit card required. It includes core founder tools with standard AI models, Insighta Test, Newspaper, investor and accelerator browsing, 3 directory visits, and mentor marketplace access. Mentor services are paid separately."
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
        title="FAQ | Creatives Takeover"
        description="Answers to common questions about Creatives Takeover's AI startup tools, pricing, credits, BizMap AI, PMF Lab, Insighta, and community features."
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
          <ScrollReveal>
            <SearchableFAQ />
          </ScrollReveal>
          <ScrollReveal>
            <FAQNavigation />
          </ScrollReveal>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default FAQPage;
