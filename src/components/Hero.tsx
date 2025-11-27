import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, LayoutDashboard, Users, Zap, DollarSign, Lightbulb, Rocket, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-bg.jpg";
import HeroSnippets from "@/components/HeroSnippets";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const Hero = () => {
  const { isAuthenticated } = useAuth();
  
  // Feature boxes data
  const featureBoxes = [
    {
      icon: Lightbulb,
      title: "Prompt Library",
      description: "30+ battle-tested prompts for AI, E-commerce, SaaS, and creative businesses",
      link: "/prompt-library",
      color: "planning"
    },
    {
      icon: TrendingUp,
      title: "Insighta",
      description: "Your curated news hub for funding opportunities and the latest AI trends",
      link: "/insighta",
      color: "growth"
    },
    {
      icon: Users,
      title: "Community",
      description: "Join 10,000+ entrepreneurs sharing progress, getting feedback, and growing together",
      link: "/community",
      color: "action"
    },
    {
      icon: Sparkles,
      title: "Business Planning",
      description: "7-step wizard to build your 30-day launch plan with BizMap AI",
      link: "/bizmap-ai",
      color: "planning"
    },
    {
      icon: LayoutDashboard,
      title: "Dashboard",
      description: "Your command center for tracking progress, managing tasks, and monitoring your business",
      link: "/dashboard",
      color: "growth"
    }
  ];

  // Auto-scrolling feature boxes component
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  // Duplicate boxes multiple times to create seamless infinite loop
  const duplicatedBoxes = [...featureBoxes, ...featureBoxes, ...featureBoxes];

  // Initialize scroll position to start of second set for seamless loop
  useEffect(() => {
    const container = scrollContainerRef.current;
    const content = scrollContentRef.current;
    if (!container || !content) return;

    const initScroll = () => {
      const singleSetWidth = content.scrollWidth / 3; // Since we have 3 sets
      container.scrollLeft = singleSetWidth;
    };

    const timeoutId = setTimeout(initScroll, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  // Handle auto-scroll with infinite loop
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollSpeed = 0.4; // pixels per frame (slow enough for comfortable reading)
    let lastTime = performance.now();

    const autoScroll = (currentTime: number) => {
      if (!container || isPaused || isUserInteracting) {
        animationFrameRef.current = requestAnimationFrame(autoScroll);
        return;
      }

      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      // Normalize speed to be consistent regardless of frame rate
      const normalizedSpeed = scrollSpeed * (deltaTime / 16.67); // 16.67ms = 60fps

      const currentScroll = container.scrollLeft;
      const scrollWidth = container.scrollWidth;
      const singleSetWidth = scrollWidth / 3; // Since we have 3 sets

      // Reset to beginning of second set when we've scrolled past it
      if (currentScroll >= singleSetWidth * 2 - container.clientWidth) {
        container.scrollLeft = currentScroll - singleSetWidth;
      } else {
        container.scrollLeft += normalizedSpeed;
      }

      animationFrameRef.current = requestAnimationFrame(autoScroll);
    };

    animationFrameRef.current = requestAnimationFrame(autoScroll);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPaused, isUserInteracting]);

  // Detect user interaction
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let interactionTimeout: NodeJS.Timeout;
    let isScrolling = false;

    const handleInteraction = () => {
      if (!isScrolling) {
        setIsUserInteracting(true);
        isScrolling = true;
      }
      clearTimeout(interactionTimeout);
      interactionTimeout = setTimeout(() => {
        setIsUserInteracting(false);
        isScrolling = false;
      }, 2000); // Resume auto-scroll after 2 seconds of no interaction
    };

    const handleScroll = () => {
      handleInteraction();
    };

    const handleMouseDown = () => {
      handleInteraction();
    };

    const handleTouchStart = () => {
      handleInteraction();
    };

    const handleWheel = (e: WheelEvent) => {
      // Only pause if user is scrolling horizontally
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        handleInteraction();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('wheel', handleWheel);
      clearTimeout(interactionTimeout);
    };
  }, []);

  // RGB colored particles for brand identity
  const creativeParticles = [
    { top: "18%", left: "16%", size: 8, color: "hsl(var(--blue-primary))", delay: "0s" },
    { top: "64%", left: "20%", size: 7, color: "hsl(var(--red-primary))", delay: "1.6s" },
    { top: "42%", left: "75%", size: 6, color: "hsl(var(--green-primary))", delay: "2.4s" },
  ];
  const techNodes = [
    { top: "18%", right: "16%" },
    { top: "30%", right: "24%" },
    { top: "44%", right: "14%" },
    { top: "58%", right: "26%" },
    { top: "70%", right: "18%" },
  ];
  
  return (
    <section
      id="overview"
      className="scroll-mt-24 relative min-h-screen flex items-center justify-center overflow-hidden pt-24 px-4 sm:px-6 bg-gradient-to-br from-background via-background to-muted/30 bg-gradient-rgb-subtle"
    >
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle grid pattern - adjusts for theme */}
        <div className="absolute inset-0 dark:opacity-[0.05] opacity-[0.03]" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px, 80px 80px",
        }} />
        {/* RGB gradient accent lines - more visible in dark mode */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none dark:opacity-20 opacity-15">
          <div
            className="absolute left-1/2 w-full h-px"
            style={{ 
              top: "32%",
              background: "linear-gradient(to right, transparent, hsl(var(--blue-primary)), hsl(var(--red-primary)), hsl(var(--green-primary)), transparent)"
            }}
          />
          <div
            className="absolute left-1/2 w-full h-px"
            style={{ 
              top: "68%",
              background: "linear-gradient(to right, transparent, hsl(var(--green-primary)), hsl(var(--red-primary)), hsl(var(--blue-primary)), transparent)"
            }}
          />
        </div>
        {creativeParticles.map((particle, index) => (
          <div
            key={`creative-spark-${index}`}
            className="absolute rounded-full shadow-lg"
            style={{
              top: particle.top,
              left: particle.left,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: `radial-gradient(circle, ${particle.color}, transparent)`,
              boxShadow: `0 0 30px ${particle.color}`,
            }}
          />
        ))}
        <svg className="absolute inset-0 w-full h-full dark:opacity-30 opacity-15 pointer-events-none">
          <defs>
            <linearGradient id="tech-network" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              <stop offset="45%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Static tech network path – animation removed */}
          <path
            d="M 1760 220 L 1840 360 L 1720 460 L 1860 580 L 1680 660"
            fill="none"
            stroke="url(#tech-network)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {/* Tech nodes made more subtle - reduced opacity - theme-aware */}
        {techNodes.map((node, index) => (
          <div
            key={`tech-node-${index}`}
            className="absolute w-2 h-2 rounded-full dark:bg-[#22d3ee] bg-primary/60 dark:opacity-40 opacity-30"
            style={{
              ...node,
              boxShadow: "0 0 12px hsl(var(--primary) / 0.4)",
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b dark:from-background/50 dark:via-background/35 dark:to-background/75 from-background/90 via-background/95 to-background/90" />

      <div className="container mx-auto relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-headline-lg sm:text-headline-xl font-bold mb-6 takeover-title creatives-font leading-[1.1]">
            <span className="gradient-unified">Your Digital Partner for Building From Zero</span>
          </h1>

          {/* Subheadline */}
          <p className="text-body sm:text-body-lg text-foreground/85 mb-6 max-w-2xl mx-auto leading-relaxed px-4">
            AI-powered planning, community support, and fundraising tools designed for rookie founders. Launch faster, build smarter.
          </p>
          
          {/* Trust Indicators - Enhanced with 4 metrics, all visible on mobile */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8 sm:mb-10 px-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Users className="w-4 h-4 text-growth" />
              <span className="text-muted-foreground">Growing</span>
              <span className="font-semibold text-foreground">Community</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Zap className="w-4 h-4 text-action" />
              <span className="font-semibold text-foreground">30-Day</span>
              <span className="text-muted-foreground">Launch</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-planning" />
              <span className="text-muted-foreground">AI-Powered Business Planning</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <DollarSign className="w-4 h-4 text-growth" />
              <span className="text-muted-foreground">Fundraising Guidance</span>
            </div>
          </div>

          {/* Social Proof in Hero */}
          <div className="mb-6 sm:mb-8 px-4">
            <p className="text-sm sm:text-base text-muted-foreground">
              Join creative entrepreneurs building our future
            </p>
          </div>

          {/* CTA Buttons - Enhanced with better copy and trust elements */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4">
            <Button 
              size="lg" 
              className="bg-gradient-unified hover:opacity-90 text-primary-foreground px-8 sm:px-10 py-4 sm:py-5 text-lg sm:text-xl font-semibold btn-magnetic btn-start-creating relative overflow-hidden group w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300" 
              aria-label="Start Here" 
              asChild
            >
              <Link to="/bizmap-ai">
                <span className="relative z-10">Start Here</span>
                <ArrowRight className="ml-2 w-5 h-5 relative z-10" />
                <div className="absolute inset-0 bg-gradient-unified opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
              </Link>
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-primary/50 hover:bg-primary/10 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg btn-magnetic relative overflow-hidden group w-full sm:w-auto" 
              aria-label="Go to Dashboard"
              asChild
            >
              <Link to="/dashboard">
                <LayoutDashboard className="mr-2 w-4 sm:w-5 h-4 sm:h-5" />
                <span>Go to Dashboard</span>
              </Link>
            </Button>
          </div>

          {/* Feature Boxes - Horizontal Auto-Scrolling Strip */}
          <div className="w-full mb-8 sm:mb-12 px-4">
            <div 
              ref={scrollContainerRef}
              className="overflow-x-auto scrollbar-hide"
              style={{
                scrollbarWidth: 'none', /* Firefox */
                msOverflowStyle: 'none', /* IE and Edge */
                WebkitOverflowScrolling: 'touch', /* iOS smooth scrolling */
              }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div 
                ref={scrollContentRef}
                className="flex gap-4 sm:gap-6 min-w-max pb-4"
              >
                {duplicatedBoxes.map((box, index) => {
                  const Icon = box.icon;
                  const colorClasses = {
                    planning: {
                      border: 'border-planning/30 hover:border-planning/60',
                      bg: 'bg-planning/10 group-hover:bg-planning/20',
                      text: 'text-planning',
                      shadow: 'hover:shadow-planning/20'
                    },
                    action: {
                      border: 'border-action/30 hover:border-action/60',
                      bg: 'bg-action/10 group-hover:bg-action/20',
                      text: 'text-action',
                      shadow: 'hover:shadow-action/20'
                    },
                    growth: {
                      border: 'border-growth/30 hover:border-growth/60',
                      bg: 'bg-growth/10 group-hover:bg-growth/20',
                      text: 'text-growth',
                      shadow: 'hover:shadow-growth/20'
                    }
                  };
                  const colors = colorClasses[box.color as keyof typeof colorClasses];
                  
                  return (
                    <Link
                      key={`${box.title}-${index}`}
                      to={box.link}
                      className={cn(
                        "btn-magnetic flex-shrink-0 group relative overflow-hidden",
                        "w-[280px] sm:w-[320px] lg:w-[360px]",
                        "bg-card border-2 transition-all duration-300",
                        "rounded-lg hover:-translate-y-1",
                        colors.border,
                        colors.shadow
                      )}
                    >
                      <Card className="h-full border-0 shadow-none bg-transparent">
                        <CardContent className="p-5 sm:p-6 flex flex-col h-full">
                          {/* Icon */}
                          <div className="mb-4">
                            <div className={cn(
                              "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300",
                              colors.bg,
                              "group-hover:scale-110 group-hover:rotate-3"
                            )}>
                              <Icon className={cn("w-6 h-6", colors.text)} />
                            </div>
                          </div>

                          {/* Title */}
                          <h3 className="text-lg sm:text-xl font-semibold mb-2 group-hover:text-foreground transition-colors">
                            {box.title}
                          </h3>

                          {/* Description */}
                          <p className="text-sm sm:text-base text-muted-foreground group-hover:text-foreground/80 transition-colors leading-relaxed">
                            {box.description}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Platform Snippets - Horizontal Scrollable */}
          <HeroSnippets />

        </div>
      </div>
    </section>
  );
};

export default Hero;