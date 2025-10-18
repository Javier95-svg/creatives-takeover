import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import EntrepreneurProblems from "@/components/EntrepreneurProblems";
import HowItWorks from "@/components/HowItWorks";
import SocialProof from "@/components/SocialProof";
import FinalCTA from "@/components/FinalCTA";
import { CreditCampaignPopup } from "@/components/CreditCampaignPopup";
import ChatbotWidget from "@/components/ChatbotWidget";
import { Helmet } from "react-helmet-async";
import Footer from "@/components/Footer";

const Index = () => {
  
  // Clear popup session storage on fresh page load to ensure quiz popup can appear
  useEffect(() => {
    sessionStorage.removeItem('credit-popup-time-seen');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Creatives Takeover - Your AI Co-Founder for Creative Businesses | Launch in 30 Days</title>
        <meta name="description" content="The creative entrepreneur's AI co-founder. Go from scattered ideas to profitable launch in 30 days. Join 15,000+ creatives building real businesses with sprint-based planning, accountability partners, and creative-first intelligence." />
        <meta name="keywords" content="creative business, AI co-founder, creative entrepreneur, launch in 30 days, creative business planning, accountability partners, creative startup, business for creatives" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
        <meta name="theme-color" content="hsl(195 100% 50%)" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Helmet>
      <Navigation />
      <main>
        <Hero />
        <EntrepreneurProblems />
        <HowItWorks />
        <SocialProof />
        <FinalCTA />
      </main>
      <Footer />
      
      {/* Enhanced Quiz Popup - Only popup to avoid overwhelming visitors */}
      <CreditCampaignPopup trigger="time" delay={10000} />
      
      {/* AI Creative Operating System */}
      <ChatbotWidget />
    </div>
  );
};

export default Index;
