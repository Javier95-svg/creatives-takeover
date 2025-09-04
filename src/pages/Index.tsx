import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import ProblemSolution from "@/components/ProblemSolution";
import HowWeWork from "@/components/HowWeWork";
import SimpleBizMapGuide from "@/components/SimpleBizMapGuide";
import Benefits from "@/components/Benefits";
import { ExitIntentModal } from "@/components/ExitIntentModal";
import { ScrollTriggeredCTA } from "@/components/ScrollTriggeredCTA";
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
        <ProblemSolution />
        <HowWeWork />
        <SimpleBizMapGuide />
        <Benefits />
      </main>
      <Footer />
      
      {/* Conversion Optimization Components */}
      <ExitIntentModal isOpen={showExitIntent} onClose={closeExitIntent} />
      <ScrollTriggeredCTA />
    </div>
  );
};

export default Index;
