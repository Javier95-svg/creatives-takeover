import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, LayoutDashboard, Users, Zap, DollarSign, Play, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useConversionTracking } from "@/hooks/useConversionTracking";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroPlanningFlatlay from "@/assets/hero-planning-flatlay.svg";
import heroFounderWorkspace from "@/assets/hero-founder-workspace.svg";

interface HeroImage {
  position: number;
  image_url: string;
  alt_text: string | null;
}

const Hero = () => {
  const { isAuthenticated } = useAuth();
  const { trackTriggerView, trackEngagement, trackSignupStarted } = useConversionTracking();
  const heroRef = useRef<HTMLElement>(null);
  const hasTrackedView = useRef(false);
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);

  // Fetch hero images from database
  useEffect(() => {
    const fetchHeroImages = async () => {
      try {
        console.log('🖼️ Fetching hero images from database...');
        const { data, error } = await supabase
          .from('hero_images')
          .select('position, image_url, alt_text')
          .eq('is_active', true)
          .order('position', { ascending: true });

        if (error) {
          console.error('❌ Error fetching hero images:', error);
          return;
        }

        console.log('✅ Hero images fetched:', data);
        if (data && data.length > 0) {
          console.log(`📸 Found ${data.length} active hero images:`, data);
          setHeroImages(data);
        } else {
          console.log('⚠️ No active hero images found in database');
        }
      } catch (error) {
        console.error('❌ Error fetching hero images:', error);
      }
    };

    fetchHeroImages();
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

  // Track hero CTA view when component is visible
  useEffect(() => {
    if (hasTrackedView.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            hasTrackedView.current = true;
            trackTriggerView('hero-primary-cta', {
              ctaType: 'primary',
              authenticated: isAuthenticated,
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
    };
  }, [trackTriggerView, isAuthenticated]);

  // Handle CTA clicks
  const handlePrimaryCTAClick = () => {
    trackEngagement('hero-primary-cta', 85);
  };

  const handleDashboardCTAClick = () => {
    trackEngagement('hero-dashboard-cta', 90);
  };

  const handleSecondaryCTAClick = (e: React.MouseEvent) => {
    e.preventDefault();
    trackEngagement('hero-secondary-cta', 70);
    
    // Small delay to ensure tracking is logged
    setTimeout(() => {
      // Find the target section
      const targetSection = document.getElementById('what-you-get');
      if (targetSection) {
        // Get the navigation bar height (typically 64px for h-16)
        const navHeight = 64;
        const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - navHeight;
        
        // Smooth scroll to the section
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      } else {
        // Fallback: try scrolling after a short delay in case component hasn't rendered
        setTimeout(() => {
          const targetSection = document.getElementById('what-you-get');
          if (targetSection) {
            const navHeight = 64;
            const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - navHeight;
            window.scrollTo({
              top: targetPosition,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    }, 10);
  };

  const handleTertiaryCTAClick = () => {
    trackSignupStarted('hero-tertiary-cta');
  };
  
  return (
    <section
      ref={heroRef}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Section - All existing content */}
          <div className="text-left">
            {/* Main Headline */}
            <h1 className="text-headline-lg sm:text-headline-xl font-bold mb-6 takeover-title creatives-font leading-[1.1]">
              <span className="gradient-unified animate-fade-in">
                The Zero to One Platform
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-body sm:text-body-lg text-foreground/85 mb-6 max-w-2xl leading-relaxed animate-fade-in">
              We blend technology, strategy and community to democratize startup formation, empowering pre-seed founders with AI-driven planning, community support, and fundraising tools.
            </p>
            
            {/* Platform-Specific Trust Indicators - Linked to Main Tools */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-8 sm:mb-10">
            {/* Community - Meet Founders & Mentors */}
            <Link 
              to="/community" 
              className="flex items-center gap-2 text-xs sm:text-sm hover:scale-105 transition-transform duration-200 group cursor-pointer"
            >
              <Users className="w-4 h-4 text-growth group-hover:text-growth/80 transition-colors" />
              <span className="text-muted-foreground group-hover:text-foreground/80 transition-colors">Meet Founders & Mentors</span>
            </Link>
            
            {/* Dashboard - Measure your progress */}
            <Link 
              to="/dashboard" 
              className="flex items-center gap-2 text-xs sm:text-sm hover:scale-105 transition-transform duration-200 group cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-action group-hover:text-action/80 transition-colors" />
              <span className="text-muted-foreground group-hover:text-foreground/80 transition-colors">Measure your progress</span>
            </Link>
            
            {/* BizMap AI - Business Plan in 3 Minutes */}
            <Link 
              to="/bizmap-ai" 
              className="flex items-center gap-2 text-xs sm:text-sm hover:scale-105 transition-transform duration-200 group cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-planning group-hover:text-planning/80 transition-colors" />
              <span className="text-muted-foreground group-hover:text-foreground/80 transition-colors">Business Plan in 3 Minutes</span>
            </Link>
            
            {/* Insighta - Discover Funding Opportunities */}
            <Link 
              to="/insighta" 
              className="flex items-center gap-2 text-xs sm:text-sm hover:scale-105 transition-transform duration-200 group cursor-pointer"
            >
              <DollarSign className="w-4 h-4 text-growth group-hover:text-growth/80 transition-colors" />
              <span className="text-muted-foreground group-hover:text-foreground/80 transition-colors">Discover Funding Opportunities</span>
            </Link>
          </div>

            {/* Enhanced CTA Section */}
            <div className="mb-8 sm:mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {isAuthenticated ? (
                /* Authenticated User CTAs: Open Dashboard + Explore Features */
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                {/* Primary CTA - Open Dashboard with Animation */}
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 sm:px-12 py-5 sm:py-6 text-lg sm:text-xl font-bold relative overflow-hidden group w-full sm:w-auto shadow-xl transition-all duration-300 animate-dashboard-cta" 
                  asChild
                >
                  <Link to="/dashboard" onClick={handleDashboardCTAClick}>
                    <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2">
                      <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                      <span className="relative z-10">Open Dashboard</span>
                      <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Link>
                </Button>

                {/* Secondary CTA - Explore Features */}
                <Button 
                  variant="outline"
                  size="lg" 
                  className="border-2 hover:bg-primary/10 text-foreground px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-semibold w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleSecondaryCTAClick(e as any);
                  }}
                >
                  <Play className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                  Explore Features
                </Button>
              </div>
            ) : (
              /* Unauthenticated User CTAs: Design Your Plan + Explore Features + Join */
              <>
                {/* Primary CTA - Value-Focused */}
                <div className="mb-4 sm:mb-6">
                  <Button 
                    size="lg" 
                    className="bg-gradient-unified hover:opacity-90 text-primary-foreground px-8 sm:px-12 py-5 sm:py-6 text-lg sm:text-xl font-bold btn-magnetic btn-start-creating relative overflow-hidden group w-full sm:w-auto shadow-xl hover:shadow-2xl transition-all duration-300 mb-2" 
                    asChild
                  >
                    <Link to="/bizmap-ai" onClick={handlePrimaryCTAClick}>
                      <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2">
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                        <span className="relative z-10">Design Your Plan in 3 Minutes</span>
                        <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-unified opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                    </Link>
                  </Button>
                </div>

                  {/* Secondary & Tertiary CTAs */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                  {/* Secondary CTA - Exploration */}
                  <Button 
                    variant="outline"
                    size="lg" 
                    className="border-2 hover:bg-primary/10 text-foreground px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleSecondaryCTAClick(e as any);
                    }}
                  >
                    <Play className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                    Explore Features
                  </Button>

                  {/* Tertiary CTA - Sign-up */}
                  <Button 
                    variant="ghost"
                    size="lg" 
                    className="text-muted-foreground hover:text-foreground px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium w-full sm:w-auto transition-all duration-300 underline-offset-4 hover:underline" 
                    asChild
                  >
                    <Link to="/signup" className="flex items-center" onClick={handleTertiaryCTAClick}>
                      Join 1,000+ Founders
                      <ArrowRight className="ml-1.5 w-4 h-4" />
                    </Link>
                  </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Section - 4-Pic Grid Layout */}
          <div className="hidden md:block animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {[1, 2, 3, 4].map((position) => {
                const image = heroImages.find(img => img.position === position);
                const imageSrc = image?.image_url || (position === 1 ? heroFounderWorkspace : position === 2 ? heroPlanningFlatlay : '');
                const altText = image?.alt_text || (position === 1 ? 'Founder working at night with Creatives Takeover dashboard' : `Business planning illustration ${position}`);

                if (!imageSrc) {
                  return (
                    <div
                      key={position}
                      className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border bg-muted/30 aspect-square flex items-center justify-center"
                    >
                      <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  );
                }

                return (
                  <div
                    key={position}
                    className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border bg-muted/30"
                  >
                    <img
                      src={imageSrc}
                      alt={altText}
                      className="w-full h-auto object-cover aspect-square"
                      style={{
                        filter: 'saturate(1.15) brightness(0.97) contrast(1.08)',
                      }}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;