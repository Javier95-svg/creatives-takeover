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
      <div className="min-h-screen bg-background overflow-hidden">
        <Helmet>
          <title>Interactive Demo - Experience BizMap AI Platform</title>
          <meta name="description" content="Try BizMap AI services for free: AI business planning, prompt library, curated insights, and entrepreneur community. No signup required." />
        </Helmet>
        
        <div className="relative">
          <AnimatedBackground />
          
          {/* Gradient Orbs for Visual Interest */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          
          <div className="relative z-10">
            <Navigation />
            
            {/* Hero Section with Story */}
            <section className="container mx-auto px-4 py-20">
              <div className="text-center max-w-5xl mx-auto mb-20 animate-fade-in">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-sm px-6 py-3 rounded-full mb-8 border border-primary/20 hover-scale">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  <span className="text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Join 10,000+ Entrepreneurs Building Their Dreams
                  </span>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                  Your Business Journey
                  <br />
                  <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-fade-in">
                    Starts Here
                  </span>
                </h1>
                
                <p className="text-xl md:text-2xl text-muted-foreground mb-6 max-w-3xl mx-auto leading-relaxed">
                  From <span className="text-primary font-semibold">idea</span> to <span className="text-accent font-semibold">launch</span> in weeks, not months. 
                  Experience the complete platform that&apos;s helped entrepreneurs raise <span className="text-secondary font-semibold">$50M+</span> in funding.
                </p>
                
                <div className="flex flex-wrap gap-6 justify-center mb-12">
                  <Button 
                    size="lg" 
                    onClick={() => handleServiceSelect('bizmap')}
                    className="group relative overflow-hidden bg-gradient-to-r from-primary to-accent hover:shadow-2xl hover:shadow-primary/50 transition-all duration-300 text-lg px-8 py-6 h-auto"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Start Interactive Demo
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-accent to-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => navigate('/pricing')}
                    className="text-lg px-8 py-6 h-auto border-2 hover:border-primary hover:bg-primary/5 transition-all duration-300"
                  >
                    View Pricing
                  </Button>
                </div>

                {/* Social Proof Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-16">
                  {[
                    { number: "10K+", label: "Entrepreneurs", icon: "👥" },
                    { number: "$50M+", label: "Funding Raised", icon: "💰" },
                    { number: "85%", label: "Success Rate", icon: "🎯" },
                    { number: "4.9★", label: "User Rating", icon: "⭐" }
                  ].map((stat, index) => (
                    <div 
                      key={index} 
                      className="p-6 rounded-2xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm border border-primary/10 hover:border-primary/30 transition-all duration-300 hover-scale animate-fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="text-3xl mb-2">{stat.icon}</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
                        {stat.number}
                      </div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Story-Driven Section Intro */}
              <div className="max-w-4xl mx-auto mb-16 text-center animate-fade-in">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Every Great Business Starts with a <span className="text-primary">Simple Question</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  &quot;What if I could turn my idea into reality?&quot; We&apos;ve helped thousands answer that question. 
                  Now it&apos;s your turn. Explore our platform and see how we can help you validate, plan, and launch your business.
                </p>
              </div>

              {/* Service Selector with Enhanced Design */}
              <ServiceSelector onSelectService={handleServiceSelect} />

              {/* Testimonial Section */}
              <div className="max-w-5xl mx-auto mt-20 p-8 rounded-3xl bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 border border-primary/20 backdrop-blur-sm animate-fade-in">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">💬</div>
                  <p className="text-xl md:text-2xl italic font-medium mb-4">
                    &quot;BizMap AI helped me go from confused first-timer to funded founder in just 3 months. 
                    The AI guidance felt like having a co-founder who&apos;s been there before.&quot;
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                      SK
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Sarah Kim</p>
                      <p className="text-sm text-muted-foreground">Founder, TechFlow AI • Raised $500K</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Helmet>
        <title>{`${currentService === 'bizmap' ? 'BizMap AI' : currentService === 'prompts' ? 'Prompt Library' : currentService === 'insighta' ? 'Insighta' : 'Community'} Demo`}</title>
      </Helmet>
      
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <Navigation />
        
        <div className="container mx-auto px-4 py-8">
          {/* Enhanced Header with Progress Story */}
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border border-primary/20 backdrop-blur-sm animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    {currentService === 'bizmap' && '🤖'}
                    {currentService === 'prompts' && '💡'}
                    {currentService === 'insighta' && '📈'}
                    {currentService === 'community' && '👥'}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {currentService === 'bizmap' && 'BizMap AI: Your AI Co-Founder'}
                      {currentService === 'prompts' && 'Prompt Library: Instant Inspiration'}
                      {currentService === 'insighta' && 'Insighta: Your Success Intel'}
                      {currentService === 'community' && 'Community: Your Support Network'}
                    </h1>
                    <p className="text-muted-foreground">
                      {currentService === 'bizmap' && 'Experience empathetic AI that guides you through every step of business planning'}
                      {currentService === 'prompts' && 'Jumpstart your planning with battle-tested prompts from successful founders'}
                      {currentService === 'insighta' && 'Stay ahead with curated insights, trends, and funding opportunities'}
                      {currentService === 'community' && 'Connect with entrepreneurs who are building alongside you'}
                    </p>
                  </div>
                </div>
                
                {/* Journey Progress */}
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-sm font-medium text-muted-foreground">Your Demo Journey:</span>
                  <div className="flex gap-1">
                    {['bizmap', 'prompts', 'insighta', 'community'].map((service, idx) => (
                      <div 
                        key={service}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                          servicesExplored.includes(service) 
                            ? 'bg-gradient-to-r from-primary to-accent scale-110' 
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {servicesExplored.length}/4 Explored
                  </span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                onClick={resetDemo}
                className="hover:border-primary hover:text-primary transition-all"
              >
                Exit Demo
              </Button>
            </div>
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

            <div className="lg:col-span-3 space-y-6">
              <div className="animate-fade-in">
                {renderServiceContent()}
              </div>
              
              {/* Dynamic CTA based on progress */}
              {servicesExplored.length >= 2 && (
                <div className="p-8 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/15 to-secondary/20 border-2 border-primary/30 backdrop-blur-sm relative overflow-hidden animate-scale-in">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
                  
                  <div className="relative z-10">
                    <div className="text-5xl mb-4">
                      {servicesExplored.length === 4 ? '🎉' : '🚀'}
                    </div>
                    <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {servicesExplored.length === 4 
                        ? "You've Seen It All! Time to Build Your Dream" 
                        : `${servicesExplored.length === 2 ? "You're" : "Almost There! You're"} Making Great Progress!`}
                    </h3>
                    <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
                      {servicesExplored.length === 4 ? (
                        <>
                          You&apos;ve explored all 4 services. Join <span className="font-semibold text-primary">10,000+ entrepreneurs</span> who are 
                          already using BizMap AI to turn their ideas into reality. Your journey to success starts with one click.
                        </>
                      ) : (
                        <>
                          You&apos;ve explored <span className="font-semibold text-primary">{servicesExplored.length} of 4 services</span>. 
                          Keep going to see the complete platform, or sign up now to start building your business for real.
                        </>
                      )}
                    </p>
                    <div className="flex gap-4 flex-wrap">
                      <Button 
                        size="lg" 
                        onClick={() => navigate('/signup')}
                        className="bg-gradient-to-r from-primary to-accent hover:shadow-xl hover:shadow-primary/50 transition-all duration-300 text-lg px-8"
                      >
                        {servicesExplored.length === 4 ? 'Start Building Now' : 'Start Free Trial'}
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline" 
                        onClick={() => navigate('/pricing')}
                        className="border-2 hover:border-primary hover:bg-primary/5"
                      >
                        View Pricing
                      </Button>
                    </div>
                    
                    {/* Social Proof */}
                    <div className="mt-6 flex items-center gap-6 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {['SK', 'MJ', 'AL', 'RD'].map((initials) => (
                            <div 
                              key={initials}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-background flex items-center justify-center text-xs font-bold text-white"
                            >
                              {initials}
                            </div>
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">200+</span> signed up today
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xl">⭐⭐⭐⭐⭐</span>
                        <span className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">4.9/5</span> from 1,200+ reviews
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    </div>
  );
};

export default Demo;
