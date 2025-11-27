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
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const autoScrollRef = useRef<number | null>(null);

  // Duplicate snippets to create seamless infinite loop
  const duplicatedSnippets = [...platformSnippets, ...platformSnippets];

  // Auto-scroll with smooth animation matching UserReviews (60s loop)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Wait for content to render and get dimensions
    const initAutoScroll = () => {
      // Fast-paced auto-scroll speed for visible lateral movement
      const scrollSpeed = 5; // pixels per frame (~300px/s, cycles through all boxes in ~10-15s)
      
      const autoScroll = () => {
        if (!container || isUserInteracting) {
          autoScrollRef.current = requestAnimationFrame(autoScroll);
          return;
        }

        const scrollWidth = container.scrollWidth;
        const clientWidth = container.clientWidth;
        
        // Only auto-scroll if content is wider than container (with small buffer)
        if (scrollWidth <= clientWidth + 10) {
          autoScrollRef.current = requestAnimationFrame(autoScroll);
          return;
        }

        const currentScroll = container.scrollLeft;
        const halfWidth = scrollWidth / 2;

        // Reset to beginning when we've scrolled past the first set for seamless loop
        if (currentScroll >= halfWidth - 10) {
          container.scrollLeft = currentScroll - halfWidth;
        } else {
          container.scrollLeft += scrollSpeed;
        }

        autoScrollRef.current = requestAnimationFrame(autoScroll);
      };

      autoScrollRef.current = requestAnimationFrame(autoScroll);
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(initAutoScroll, 100);

    return () => {
      clearTimeout(timeoutId);
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
      }
    };
  }, [isUserInteracting]);

  // Detect user interaction (scroll, mouse down, touch)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let interactionTimeout: NodeJS.Timeout;

    const handleInteraction = () => {
      setIsUserInteracting(true);
      clearTimeout(interactionTimeout);
      // Resume auto-scroll after 2 seconds of no interaction
      interactionTimeout = setTimeout(() => {
        setIsUserInteracting(false);
      }, 2000);
    };

    const handleMouseEnter = () => {
      setIsUserInteracting(true);
    };

    const handleMouseLeave = () => {
      setIsUserInteracting(false);
    };

    container.addEventListener('scroll', handleInteraction, { passive: true });
    container.addEventListener('mousedown', handleInteraction);
    container.addEventListener('touchstart', handleInteraction, { passive: true });
    container.addEventListener('wheel', handleInteraction, { passive: true });
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('scroll', handleInteraction);
      container.removeEventListener('mousedown', handleInteraction);
      container.removeEventListener('touchstart', handleInteraction);
      container.removeEventListener('wheel', handleInteraction);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(interactionTimeout);
    };
  }, []);

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

  return (
    <div className="w-full mb-12 sm:mb-16 px-4">
      {/* Horizontal Scrollable Container */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide relative w-full"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          maxWidth: '100%'
        }}
      >
        <div 
          className="flex gap-4 sm:gap-6 lg:gap-8"
          style={{ width: 'max-content' }}
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
                  colors.shadow
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

