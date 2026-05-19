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
        answer: "We offer four plans: Rookie is free with 50 credits/month, Starter is $9/month or $79/year with 100 credits, Rising is $29/month or $239/year with 250 credits, and Pro is $65/month or $589/year with 600 credits. Extra credit packs remain available on every plan."
      },
      {
        question: "What is the credit system?",
        answer: "Credits power metered AI actions across the platform. Plan gates decide which tools you can access, and credits meter generative actions inside unlocked tools. Waitlist Maker uses credits on every plan, PMF Lab uses credits on Starter and above, and MVP Builder, Tech Stack Builder, GTM Strategist, and Pitch Deck Analyzer use credits on Rising and Pro. ICP Builder remains free."
      },
      {
        question: "What makes Creatives Takeover different?",
        answer: "Our moat is not generic business-plan generation. We help founders, indie hackers, and builders move from scratch to launch through a practical Startup Development Cycle supported by AI, founder tools, mentors, co-founders, and fundraising resources."
      },
      {
        question: "Can I try it for free?",
        answer: "Yes. Rookie is free forever with 50 credits per month and no credit card required. You get free ICP Builder access, Insighta Test, Newspaper, early-stage browsing or preview access, and community browsing features."
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
