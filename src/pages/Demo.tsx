import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useDemoState } from "@/hooks/useDemoState";
import DemoControlPanel from "@/components/demo/DemoControlPanel";
import ServiceSelector from "@/components/demo/ServiceSelector";
import ChatbotDemo from "@/components/demo/ChatbotDemo";
import PromptLibraryDemo from "@/components/demo/PromptLibraryDemo";
import InsightaDemo from "@/components/demo/InsightaDemo";
import CommunityDemo from "@/components/demo/CommunityDemo";
import { ArrowRight, Sparkles } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";

const Demo = () => {
  const {
    currentService,
    servicesExplored,
    currentScenario,
    isInDemoMode,
    startDemo,
    resetDemo,
    navigateToService,
    getDemoMetrics
  } = useDemoState();

  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    timeSpent: 0,
    servicesExplored: 0,
    completionRate: 0,
    currentScenario: '',
    interactionCount: 0
  });

  useEffect(() => {
    if (isInDemoMode) {
      const interval = setInterval(() => {
        setMetrics(getDemoMetrics());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isInDemoMode, getDemoMetrics]);

  const handleServiceSelect = (service: 'bizmap' | 'prompts' | 'insighta' | 'community') => {
    if (!isInDemoMode) {
      startDemo(service);
    } else {
      navigateToService(service);
    }
  };

  const renderServiceContent = () => {
    switch (currentService) {
      case 'bizmap':
        return currentScenario ? <ChatbotDemo scenario={currentScenario} /> : null;
      case 'prompts':
        return <PromptLibraryDemo onNavigateToBizMap={() => navigateToService('bizmap')} />;
      case 'insighta':
        return <InsightaDemo />;
      case 'community':
        return <CommunityDemo />;
      default:
        return null;
    }
  };

  if (!isInDemoMode || currentService === 'overview') {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Interactive Demo - Experience BizMap AI Platform</title>
          <meta name="description" content="Try BizMap AI services for free: AI business planning, prompt library, curated insights, and entrepreneur community. No signup required." />
        </Helmet>
        
        <div className="relative">
          <AnimatedBackground />
          <div className="relative z-10">
            <Navigation />
            
            <section className="container mx-auto px-4 py-20">
              <div className="text-center max-w-4xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Interactive Demo - No Signup Required</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Experience BizMap AI Platform
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Explore all our services with live, interactive demos. See how BizMap AI can help you plan, validate, and launch your business idea.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button size="lg" onClick={() => handleServiceSelect('bizmap')}>
                    Start BizMap AI Demo
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate('/pricing')}>
                    View Pricing
                  </Button>
                </div>
              </div>

              <ServiceSelector onSelectService={handleServiceSelect} />
            </section>

            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${currentService === 'bizmap' ? 'BizMap AI' : currentService === 'prompts' ? 'Prompt Library' : currentService === 'insighta' ? 'Insighta' : 'Community'} Demo`}</title>
      </Helmet>
      
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {currentService === 'bizmap' && 'BizMap AI Demo'}
              {currentService === 'prompts' && 'Prompt Library Demo'}
              {currentService === 'insighta' && 'Insighta Demo'}
              {currentService === 'community' && 'Community Demo'}
            </h1>
            <p className="text-muted-foreground">Explore our interactive demo - all features are live</p>
          </div>
          <Button variant="outline" onClick={resetDemo}>Exit Demo</Button>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <DemoControlPanel
              currentService={currentService}
              servicesExplored={servicesExplored}
              onNavigate={navigateToService}
              onReset={resetDemo}
              timeSpent={metrics.timeSpent}
              completionRate={metrics.completionRate}
            />
          </div>

          <div className="lg:col-span-3">
            {renderServiceContent()}
            
            {servicesExplored.length >= 2 && (
              <div className="mt-8 p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border-2 border-primary/20">
                <h3 className="text-2xl font-bold mb-2">Ready to Start Your Journey?</h3>
                <p className="text-muted-foreground mb-4">
                  You've explored {servicesExplored.length} of our 4 services. 
                  {servicesExplored.length === 4 ? " Unlock the full platform with a free account!" : " Keep exploring or sign up to save your progress."}
                </p>
                <div className="flex gap-3">
                  <Button size="lg" onClick={() => navigate('/signup')}>Start Free</Button>
                  <Button size="lg" variant="outline" onClick={() => navigate('/pricing')}>View Pricing</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Demo;
