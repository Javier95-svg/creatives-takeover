import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { LucideIcon, MessageSquare, Sparkles, Rocket, BarChart3, MessageCircle, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PlatformSnippet {
  name: string;
  description: string;
  icon: LucideIcon;
  route: string;
  color: 'planning' | 'action' | 'growth';
}

// Platform snippets with icons
const platformSnippets: PlatformSnippet[] = [
  {
    name: "Share Your Creative Work",
    description: "Share your projects, progress, challenges, or insights with fellow creatives",
    icon: MessageSquare,
    route: "/community",
    color: "action"
  },
  {
    name: "Business Planning",
    description: "7-step wizard to build your 30-day launch plan with BizMap AI",
    icon: Sparkles,
    route: "/bizmap-ai",
    color: "planning"
  },
  {
    name: "The Future Belongs to Founders",
    description: "Transform raw thoughts into clear, actionable roadmaps",
    icon: Rocket,
    route: "/",
    color: "growth"
  },
  {
    name: "Market Validation",
    description: "Validate your business idea by analyzing market size, competition, and demand",
    icon: BarChart3,
    route: "/dashboard",
    color: "action"
  },
  {
    name: "BizMap AI Chat",
    description: "AI-powered conversational business planning to build your launch plan",
    icon: MessageCircle,
    route: "/bizmap-ai",
    color: "growth"
  },
  {
    name: "Funding Opportunities",
    description: "Find grants, accelerators, contests, and microfunds for your project",
    icon: TrendingUp,
    route: "/blog",
    color: "planning"
  }
];

const HeroSnippets = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  // Duplicate snippets multiple times to create seamless infinite loop
  const duplicatedSnippets = [...platformSnippets, ...platformSnippets, ...platformSnippets];

  const getColorClasses = (color: 'planning' | 'action' | 'growth') => {
    const colorMap = {
      planning: {
        glass: 'glass-blue',
        border: 'border-planning/30 hover:border-planning/60',
        shadow: 'hover:shadow-lg hover:shadow-blue/20',
        icon: 'text-planning'
      },
      action: {
        glass: 'glass-red',
        border: 'border-action/30 hover:border-action/60',
        shadow: 'hover:shadow-lg hover:shadow-red/20',
        icon: 'text-action'
      },
      growth: {
        glass: 'glass-green',
        border: 'border-growth/30 hover:border-growth/60',
        shadow: 'hover:shadow-lg hover:shadow-green/20',
        icon: 'text-growth'
      }
    };
    return colorMap[color];
  };

  // Initialize scroll position to start of second set for seamless loop
  useEffect(() => {
    const container = scrollContainerRef.current;
    const content = scrollContentRef.current;
    if (!container || !content) return;

    // Wait for layout to calculate proper widths
    const initScroll = () => {
      const singleSetWidth = content.scrollWidth / 3; // Since we have 3 sets
      container.scrollLeft = singleSetWidth;
    };

    // Use setTimeout to ensure DOM is fully rendered
    const timeoutId = setTimeout(initScroll, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  // Handle auto-scroll with infinite loop
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollSpeed = 0.5; // pixels per frame
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

  return (
    <div className="w-full mb-12 sm:mb-16 px-4">
      {/* Horizontal Scrollable Container */}
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
          className="flex gap-4 sm:gap-6 lg:gap-8 min-w-max pb-4"
        >
          {duplicatedSnippets.map((snippet, index) => {
            const colors = getColorClasses(snippet.color);
            const Icon = snippet.icon;
            
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
            const iconColors = colorClasses[snippet.color as keyof typeof colorClasses];
            
            return (
              <Link
                key={`${snippet.name}-${index}`}
                to={snippet.route}
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
                        iconColors.bg,
                        "group-hover:scale-110 group-hover:rotate-3"
                      )}>
                        <Icon className={cn("w-6 h-6", iconColors.text)} />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg sm:text-xl font-semibold mb-2 group-hover:text-foreground transition-colors">
                      {snippet.name}
                    </h3>

                    {/* Description */}
                    <p className="text-sm sm:text-base text-muted-foreground group-hover:text-foreground/80 transition-colors leading-relaxed">
                      {snippet.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeroSnippets;

