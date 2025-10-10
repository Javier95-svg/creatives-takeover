import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";
import DemoScenarios from "@/components/demo/DemoScenarios";
import DemoControlPanel from "@/components/demo/DemoControlPanel";
import ChatbotDemo from "@/components/demo/ChatbotDemo";
import BusinessPlanningDemo from "@/components/demo/BusinessPlanningDemo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDemoState } from "@/hooks/useDemoState";
import { Play, Sparkles, ArrowRight, Video, Calendar, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Demo = () => {
  const {
    currentScenario,
    isInDemoMode,
    currentFeature,
    featuresExplored,
    startDemo,
    resetDemo,
    switchScenario,
    navigateToFeature,
    getDemoMetrics
  } = useDemoState();

  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({ timeSpent: 0, featuresExplored: 0, completionRate: 0, currentScenario: '' });

  useEffect(() => {
    if (isInDemoMode) {
      const interval = setInterval(() => {
        setMetrics(getDemoMetrics());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isInDemoMode, getDemoMetrics]);

  const renderFeatureContent = () => {
    if (!currentScenario) return null;

    switch (currentFeature) {
      case 'chatbot':
        return <ChatbotDemo scenario={currentScenario} />;
      case 'business-plan':
        return <BusinessPlanningDemo scenario={currentScenario} />;
      case 'sprint':
        return (
          <div className="glass-card p-8 text-center space-y-4">
            <Calendar className="h-16 w-16 mx-auto text-primary" />
            <h3 className="text-2xl font-bold">Sprint Planning Demo</h3>
            <p className="text-muted-foreground">
              See how to break down your business plan into actionable 2-week sprints
            </p>
            <Button onClick={() => navigate('/dream2plan')}>
              Try Sprint Planning <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      case 'market':
        return (
          <div className="glass-card p-8 text-center space-y-4">
            <TrendingUp className="h-16 w-16 mx-auto text-primary" />
            <h3 className="text-2xl font-bold">Market Intelligence Demo</h3>
            <p className="text-muted-foreground">
              Real-time market trends and competitive insights powered by AI
            </p>
            <Button onClick={() => navigate('/dream2plan')}>
              Explore Market Intel <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      case 'community':
        return (
          <div className="glass-card p-8 text-center space-y-4">
            <Users className="h-16 w-16 mx-auto text-primary" />
            <h3 className="text-2xl font-bold">Community Demo</h3>
            <p className="text-muted-foreground">
              Connect with fellow entrepreneurs, share progress, and get feedback
            </p>
            <Button onClick={() => navigate('/community')}>
              Join Community <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      default:
        return <DemoScenarios onSelectScenario={switchScenario} currentScenarioId={currentScenario.id} />;
    }
  };

  if (!isInDemoMode) {
    return (
      <>
        <Helmet>
          <title>Interactive Demo | BizMap AI Platform | Try Before You Buy</title>
          <meta 
            name="description" 
            content="Experience BizMap AI in action. Try our interactive demo with real business scenarios and see how our AI chatbot can help you build a successful business plan." 
          />
        </Helmet>
        <div className="relative min-h-screen overflow-hidden">
          <AnimatedBackground />
          <div className="relative z-10">
            <Navigation />
            
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-20 lg:py-32">
              <div className="max-w-4xl mx-auto text-center space-y-8">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <Sparkles className="h-3 w-3 mr-2" />
                  Interactive Demo
                </Badge>
                
                <h1 className="text-4xl lg:text-6xl font-bold">
                  Experience <span className="gradient-text">BizMap AI</span>
                  <br />in Action
                </h1>
                
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  See how our AI-powered platform helps entrepreneurs build comprehensive business plans, 
                  analyze markets, and launch successful ventures - all in one place.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button 
                    size="lg" 
                    onClick={() => startDemo()}
                    className="text-lg px-8 py-6"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Start Interactive Demo
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => navigate('/dream2plan')}
                    className="text-lg px-8 py-6"
                  >
                    Skip to Full Platform
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>

                <div className="pt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    <span>No signup required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Real AI interactions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    <span>5-minute walkthrough</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Features Preview */}
            <section className="container mx-auto px-4 py-16">
              <div className="text-center space-y-4 mb-12">
                <h2 className="text-3xl font-bold">What You'll Experience</h2>
                <p className="text-muted-foreground">
                  Choose from pre-built business scenarios across different industries
                </p>
              </div>

              <DemoScenarios onSelectScenario={(id) => {
                startDemo(id);
                navigateToFeature('chatbot');
              }} />
            </section>

            <Footer />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Demo: {currentScenario?.name} | BizMap AI</title>
        <meta 
          name="description" 
          content={`Interactive demo of ${currentScenario?.name} - ${currentScenario?.description}`} 
        />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Control Panel */}
              <div className="lg:col-span-1">
                <DemoControlPanel
                  currentFeature={currentFeature}
                  featuresExplored={featuresExplored}
                  onNavigate={navigateToFeature}
                  onReset={resetDemo}
                  timeSpent={metrics.timeSpent}
                  scenarioName={currentScenario?.name}
                />
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                {renderFeatureContent()}
              </div>
            </div>

            {/* CTA Section */}
            {metrics.completionRate >= 50 && (
              <div className="mt-8 glass-card p-8 text-center space-y-4">
                <h3 className="text-2xl font-bold">Ready to Build Your Own Business?</h3>
                <p className="text-muted-foreground">
                  Start your journey with BizMap AI and turn your ideas into reality
                </p>
                <div className="flex gap-4 justify-center">
                  <Button size="lg" onClick={() => navigate('/signup')}>
                    Start Free Trial
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate('/pricing')}>
                    View Pricing
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Footer />
        </div>
      </div>
    </>
  );
};

export default Demo;
