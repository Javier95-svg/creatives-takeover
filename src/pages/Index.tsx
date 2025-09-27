import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import EntrepreneurProblems from "@/components/EntrepreneurProblems";
import HowItWorks from "@/components/HowItWorks";
import SocialProof from "@/components/SocialProof";
import FinalCTA from "@/components/FinalCTA";
import { ExitIntentModal } from "@/components/ExitIntentModal";
import { ScrollTriggeredCTA } from "@/components/ScrollTriggeredCTA";
import { CreditCampaignPopup } from "@/components/CreditCampaignPopup";
import ChatbotWidget from "@/components/ChatbotWidget";
import { Helmet } from "react-helmet-async";
import Footer from "@/components/Footer";
import { useExitIntent } from "@/hooks/useExitIntent";

const Index = () => {
  const { showExitIntent, closeExitIntent } = useExitIntent();
  
  // Clear popup session storage on fresh page load to ensure popups can appear
  useEffect(() => {
    sessionStorage.removeItem('exit-intent-seen');
    sessionStorage.removeItem('scroll-cta-dismissed');  
    sessionStorage.removeItem('credit-popup-time-seen');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Creatives Takeover - From Idea to Execution | AI-Powered Business Plans</title>
        <meta name="description" content="Transform your business ideas into comprehensive, actionable business plans in minutes with BizMap AI. Get GPT-5 powered analysis, validation experiments, and custom execution strategies." />
        <meta name="keywords" content="business plan, AI business planning, startup planning, business ideas, entrepreneurship, BizMap AI, GPT-5" />
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
      
      {/* Conversion Optimization Components - Less Invasive */}
      <ExitIntentModal isOpen={showExitIntent} onClose={closeExitIntent} />
      <ScrollTriggeredCTA />
      
      {/* Minimal Campaign Popup - Faster for testing */}
      <CreditCampaignPopup trigger="time" delay={5000} />
      
      {/* AI Chatbot Assistant */}
      <ChatbotWidget />
    </div>
  );
};

export default Index;
