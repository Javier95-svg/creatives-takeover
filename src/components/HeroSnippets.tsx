import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Bot, 
  Lightbulb, 
  FlaskConical, 
  TrendingUp, 
  Users, 
  Info,
  DollarSign,
  Target,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface PlatformSnippet {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  color: 'planning' | 'action' | 'growth';
}

const platformSnippets: PlatformSnippet[] = [
  {
    name: "Business Planning",
    description: "7-step wizard to build your 30-day launch plan",
    icon: Target,
    route: "/bizmap-ai",
    color: "planning"
  },
  {
    name: "Dashboard",
    description: "Market Validation, Task Calendar, Revenue Hub",
    icon: LayoutDashboard,
    route: "/dashboard",
    color: "action"
  },
  {
    name: "BizMap AI Chat",
    description: "AI-powered conversational business planning",
    icon: MessageSquare,
    route: "/bizmap-ai",
    color: "growth"
  },
  {
    name: "Funding Opportunities",
    description: "Find grants, accelerators, contests, and microfunds",
    icon: DollarSign,
    route: "/blog",
    color: "planning"
  },
  {
    name: "Product Market Fit Lab",
    description: "Validate your product in the market",
    icon: FlaskConical,
    route: "/bizmap-ai",
    color: "action"
  },
  {
    name: "Prompt Library",
    description: "Pre-built AI prompts for pitches, emails, interviews",
    icon: Lightbulb,
    route: "/prompt-library",
    color: "growth"
  },
  {
    name: "Insighta",
    description: "Curated news hub for funding and AI trends",
    icon: TrendingUp,
    route: "/insighta",
    color: "planning"
  },
  {
    name: "Community",
    description: "Connect with founders, get feedback, demo days",
    icon: Users,
    route: "/community",
    color: "action"
  }
];

const HeroSnippets = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const autoScrollRef = useRef<number | null>(null);

  // Duplicate snippets to create seamless infinite loop
  const duplicatedSnippets = [...platformSnippets, ...platformSnippets];

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

  // Handle auto-scroll with infinite loop
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollSpeed = 0.5; // pixels per frame (~30px per second at 60fps, ~40px at 80fps)
    let lastScrollLeft = container.scrollLeft;

    const autoScroll = () => {
      if (!container || isPaused || isUserInteracting) {
        autoScrollRef.current = requestAnimationFrame(autoScroll);
        return;
      }

      const currentScroll = container.scrollLeft;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const halfWidth = scrollWidth / 2;

      // Reset to beginning when we've scrolled past the first set
      if (currentScroll >= halfWidth - clientWidth) {
        container.scrollLeft = currentScroll - halfWidth;
      } else {
        container.scrollLeft += scrollSpeed;
      }

      lastScrollLeft = container.scrollLeft;
      autoScrollRef.current = requestAnimationFrame(autoScroll);
    };

    autoScrollRef.current = requestAnimationFrame(autoScroll);

    return () => {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
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

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('touchstart', handleTouchStart);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('touchstart', handleTouchStart);
      clearTimeout(interactionTimeout);
    };
  }, []);

  return (
    <div className="w-full mb-12 sm:mb-16 px-4">
      {/* Horizontal Scrollable Container */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* IE and Edge */
          WebkitOverflowScrolling: 'touch' /* iOS smooth scrolling */
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div 
          ref={scrollContentRef}
          className="flex gap-4 sm:gap-6 lg:gap-8 min-w-max pb-4"
        >
          {duplicatedSnippets.map((snippet, index) => {
            const Icon = snippet.icon;
            const colors = getColorClasses(snippet.color);
            
            return (
              <Link
                key={`${snippet.name}-${index}`}
                to={snippet.route}
                className={cn(
                  "btn-magnetic flex-shrink-0 w-[280px] sm:w-[300px]",
                  "h-[200px] sm:h-[220px]",
                  "p-4 sm:p-6 bg-card border-2 transition-all duration-300",
                  "flex flex-col items-center justify-center text-center",
                  colors.glass,
                  colors.border,
                  colors.shadow,
                  "snap-start"
                )}
              >
                <div className="flex justify-center mb-3">
                  <Icon className={cn("w-6 sm:w-8 h-6 sm:h-8", colors.icon)} />
                </div>
                <div className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  {snippet.name}
                </div>
                <div className="text-muted-foreground text-xs sm:text-sm">
                  {snippet.description}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeroSnippets;

