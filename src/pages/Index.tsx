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
  
  // Clear popup session storage for debugging (remove this in production)
  // sessionStorage.removeItem('exit-intent-seen');
  // sessionStorage.removeItem('scroll-cta-dismissed');  
  // sessionStorage.removeItem('credit-popup-time-seen');

  // Debug function to clear all popup session storage
  const clearPopupStorage = () => {
    sessionStorage.removeItem('exit-intent-seen');
    sessionStorage.removeItem('scroll-cta-dismissed');  
    sessionStorage.removeItem('credit-popup-time-seen');
    console.log('Cleared all popup session storage');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Creatives Takeover - From Idea to Execution | AI-Powered Business Plans</title>
        <meta name="description" content="Transform your business ideas into comprehensive, actionable business plans in minutes with BizMap AI. Get GPT-5 powered analysis, validation experiments, and custom execution strategies." />
        <meta name="keywords" content="business plan, AI business planning, startup planning, business ideas, entrepreneurship, BizMap AI, GPT-5" />
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
      
      {/* DEBUG: Temporary popup testing button (remove in production) */}
      <button 
        onClick={clearPopupStorage}
        className="fixed top-4 right-4 z-[200] bg-red-500 text-white p-2 rounded text-xs"
        style={{ fontSize: '10px' }}
      >
        Clear Popups
      </button>
      
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
