import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

// Import screenshots
import bizmapAiChatImg from "@/assets/screenshots/bizmap-ai-chat.png";
import promptChainImg from "@/assets/screenshots/prompt-chain.png";
import fundingOpportunitiesImg from "@/assets/screenshots/funding-opportunities.png";
import aboutFoundersImg from "@/assets/screenshots/about-founders.png";
import marketValidationImg from "@/assets/screenshots/market-validation.png";
import communityImg from "@/assets/screenshots/community.png";

interface PlatformSnippet {
  name: string;
  imagePath: string;
  route: string;
}

const platformSnippets: PlatformSnippet[] = [
  {
    name: "BizMap AI Output",
    imagePath: bizmapAiChatImg,
    route: "/bizmap-ai"
  },
  {
    name: "Prompt Chain",
    imagePath: promptChainImg,
    route: "/prompt-library"
  },
  {
    name: "Funding Opportunities",
    imagePath: fundingOpportunitiesImg,
    route: "/blog"
  },
  {
    name: "About Founders",
    imagePath: aboutFoundersImg,
    route: "/about"
  },
  {
    name: "Market Validation",
    imagePath: marketValidationImg,
    route: "/dashboard"
  },
  {
    name: "Community",
    imagePath: communityImg,
    route: "/community"
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
            return (
              <Link
                key={`${snippet.name}-${index}`}
                to={snippet.route}
                className={cn(
                  "flex-shrink-0 group relative overflow-hidden",
                  "rounded-lg border-2 border-border/50",
                  "transition-all duration-300",
                  "hover:border-primary/60 hover:shadow-lg hover:shadow-primary/20",
                  "hover:scale-[1.02]",
                  "snap-start"
                )}
              >
                <img 
                  src={snippet.imagePath} 
                  alt={snippet.name}
                  className="w-[400px] h-[250px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-center translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <span className="text-sm font-semibold text-foreground bg-background/90 px-3 py-1 rounded-full inline-block">
                    {snippet.name}
                  </span>
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

