import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import EntrepreneurProblems from "@/components/EntrepreneurProblems";
import FeatureHighlights from "@/components/FeatureHighlights";
import Testimonials from "@/components/Testimonials";
import CTASection from "@/components/CTASection";
import { ExitIntentModal } from "@/components/ExitIntentModal";
import { ScrollTriggeredCTA } from "@/components/ScrollTriggeredCTA";
import { CreditCampaignPopup } from "@/components/CreditCampaignPopup";
import ChatbotWidget from "@/components/ChatbotWidget";
import { Helmet } from "react-helmet-async";
import Footer from "@/components/Footer";
import { useExitIntent } from "@/hooks/useExitIntent";

const Index = () => {
  const { showExitIntent, closeExitIntent } = useExitIntent();

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
        <FeatureHighlights />
        <Testimonials />
        <CTASection />
      </main>
      <Footer />
      
      {/* Conversion Optimization Components - Less Invasive */}
      <ExitIntentModal isOpen={showExitIntent} onClose={closeExitIntent} />
      <ScrollTriggeredCTA />
      
      {/* Minimal Campaign Popup - Very Delayed */}
      <CreditCampaignPopup trigger="time" delay={90000} />
      
      {/* AI Chatbot Assistant */}
      <ChatbotWidget />
    </div>
  );
};

export default Index;
