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
    description: "Pitch your startup",
    icon: DollarSign,
    route: "/blog",
    color: "planning"
  },
  {
    name: "Product Market Fit Lab",
    description: "Find your niche",
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
      const scrollSpeed = 18; // pixels per frame (~1080px/s, faster and smoother scrolling)
      
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

    // Keyboard navigation for arrow keys
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!container) return;
      
      // Only handle if container or a card is focused
      const activeElement = document.activeElement;
      const isWithinContainer = container.contains(activeElement as Node);
      
      if (!isWithinContainer) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsUserInteracting(true);
        container.scrollBy({ left: -300, behavior: 'smooth' });
        clearTimeout(interactionTimeout);
        interactionTimeout = setTimeout(() => {
          setIsUserInteracting(false);
        }, 2000);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsUserInteracting(true);
        container.scrollBy({ left: 300, behavior: 'smooth' });
        clearTimeout(interactionTimeout);
        interactionTimeout = setTimeout(() => {
          setIsUserInteracting(false);
        }, 2000);
      }
    };

    container.addEventListener('scroll', handleInteraction, { passive: true });
    container.addEventListener('mousedown', handleInteraction);
    container.addEventListener('touchstart', handleInteraction, { passive: true });
    container.addEventListener('wheel', handleInteraction, { passive: true });
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('scroll', handleInteraction);
      container.removeEventListener('mousedown', handleInteraction);
      container.removeEventListener('touchstart', handleInteraction);
      container.removeEventListener('wheel', handleInteraction);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(interactionTimeout);
    };
  }, []);

  const getGradientStyles = (color: 'planning' | 'action' | 'growth') => {
    const gradientMap = {
      planning: 'linear-gradient(120deg, #1e3a8a, #3b82f6)', // Blue gradient
      action: 'linear-gradient(120deg, #dc2626, #f97316)',   // Red-orange gradient
      growth: 'linear-gradient(120deg, #10b981, #34d399)'   // Green/Teal gradient
    };
    return gradientMap[color];
  };

  return (
    <div className="w-full mb-12 sm:mb-16 px-4">
      {/* Horizontal Scrollable Container */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide relative w-full focus:outline-none"
        tabIndex={0}
        role="region"
        aria-label="Platform feature cards"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          maxWidth: '100%',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          willChange: 'transform'
        }}
      >
        <div 
          className="flex gap-3 sm:gap-4 px-3 sm:px-5"
          style={{ width: 'max-content' }}
        >
          {duplicatedSnippets.map((snippet, index) => {
            const Icon = snippet.icon;
            const gradient = getGradientStyles(snippet.color);
            
            return (
              <Link
                key={`${snippet.name}-${index}`}
                to={snippet.route}
                aria-label={`${snippet.name}, ${snippet.description}`}
                className={cn(
                  "hero-snippet-card flex-shrink-0",
                  "w-[260px] sm:w-[300px]",
                  "h-[130px] sm:h-[160px]",
                  "p-3 sm:p-4 rounded-lg border transition-all duration-300 ease-out",
                  "flex flex-row items-start relative overflow-hidden",
                  "cursor-pointer group",
                  "animate-fade-in-up",
                  "focus:outline-2 focus:outline-white/50 focus:outline-offset-2"
                )}
                style={{
                  background: gradient,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  scrollSnapAlign: 'center',
                  animationDelay: `${(index % platformSnippets.length) * 200}ms`
                }}
              >
                {/* Subtle white overlay for depth */}
                <div 
                  className="absolute inset-0 opacity-5 bg-white pointer-events-none"
                  aria-hidden="true"
                />
                
                {/* Left section: Icon + Text */}
                <div className="flex flex-col items-start justify-between h-full z-10 flex-1 min-w-0">
                  <div className="flex flex-col gap-2">
                    <Icon className="w-8 h-8 text-white/90" style={{ minWidth: '32px', minHeight: '32px' }} aria-hidden="true" />
                    <div className="text-sm font-bold text-white leading-tight" style={{ fontSize: '14px' }}>
                      {snippet.name}
                    </div>
                  </div>
                  <div className="text-xs text-white/85 leading-relaxed" style={{ fontSize: '12px' }}>
                    {snippet.description}
                  </div>
                </div>

                {/* Right section: Optional accent gradient overlay */}
                <div 
                  className="absolute top-0 right-0 w-20 h-20 opacity-10 bg-white rounded-full blur-2xl -mr-10 -mt-10"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeroSnippets;

