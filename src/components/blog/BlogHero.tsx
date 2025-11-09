import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";

interface BlogHeroProps {
  onSearch?: (searchTerm: string) => void;
}

const BlogHero = ({ onSearch }: BlogHeroProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const fullText = "Insighta blends AI-driven analysis with curated market intelligence to help entrepreneurs uncover funding opportunities, identify market trends, and make informed, data-based decisions. Covering everything from investment contests to accelerator programs, Insighta turns complex market information into practical insights that empower creative businesses to seize the right opportunities at the perfect moment.";
  
  const { displayedText, isTyping } = useTypingAnimation({ 
    text: fullText, 
    speed: 20,
    startDelay: 500
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchTerm.trim()) {
      onSearch(searchTerm.trim());
    }
  };

  const scrollToOpportunities = () => {
    const opportunitiesSection = document.querySelector('[data-section="opportunities"]');
    if (opportunitiesSection) {
      opportunitiesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="scroll-mt-24 relative min-h-[85vh] sm:min-h-screen flex items-center justify-center overflow-hidden py-12 sm:py-0 pb-32">
      {/* Tech-inspired animated wallpaper (mirrors home hero aesthetic) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-background" />

        {/* Multi-layer grid */}
        <div className="absolute inset-0 opacity-[0.1]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(90deg, hsl(var(--primary) / 0.35) 1px, transparent 1px),
                linear-gradient(0deg, hsl(var(--primary) / 0.35) 1px, transparent 1px),
                linear-gradient(90deg, hsl(var(--secondary) / 0.2) 1px, transparent 1px),
                linear-gradient(0deg, hsl(var(--secondary) / 0.2) 1px, transparent 1px),
                linear-gradient(45deg, hsl(var(--accent) / 0.15) 1px, transparent 1px)
              `,
              backgroundSize: '110px 110px, 110px 110px, 28px 28px, 28px 28px, 60px 60px'
            }}
          />
        </div>

        {/* Rotating hex clusters */}
        <div className="absolute top-1/4 left-1/5 hidden sm:block">
          {[...Array(3)].map((_, i) => (
            <div
              key={`hero-hex-left-${i}`}
              className="absolute w-20 h-20"
              style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                border: '1px solid',
                borderColor: `hsl(var(--primary) / ${0.28 - i * 0.08})`,
                transform: `scale(${1 + i * 0.25}) rotate(${i * 12}deg)`,
                animation: `spin ${22 - i * 4}s linear infinite ${i % 2 === 0 ? 'normal' : 'reverse'}`
              }}
            />
          ))}
        </div>

        <div className="absolute bottom-1/4 right-1/6 hidden lg:block">
          {[...Array(3)].map((_, i) => (
            <div
              key={`hero-hex-right-${i}`}
              className="absolute w-16 h-16"
              style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                border: '1px solid',
                borderColor: `hsl(var(--secondary) / ${0.22 - i * 0.07})`,
                transform: `scale(${1 + i * 0.2}) rotate(${-i * 10}deg)`,
                animation: `spin ${20 - i * 3}s linear infinite ${i % 2 === 0 ? 'reverse' : 'normal'}`
              }}
            />
          ))}
        </div>

        {/* Scanning lines */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-slide-down" style={{ animationDuration: '9s' }} />
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-secondary/25 to-transparent animate-slide-down" style={{ animationDuration: '13s', animationDelay: '3s' }} />
          <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-accent/25 to-transparent animate-slide-right" style={{ animationDuration: '11s', animationDelay: '2s' }} />
        </div>

        {/* Ambient gradient glows */}
        <div className="absolute top-10 right-1/4 w-[420px] h-[420px] bg-gradient-radial from-primary/12 via-transparent to-transparent blur-3xl animate-drift" style={{ animationDuration: '22s' }} />
        <div className="absolute bottom-10 left-1/4 w-[380px] h-[380px] bg-gradient-radial from-secondary/10 via-transparent to-transparent blur-3xl animate-drift" style={{ animationDuration: '26s', animationDelay: '4s', animationDirection: 'reverse' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-gradient-radial from-accent/12 via-transparent to-transparent blur-3xl animate-float" style={{ animationDuration: '18s', animationDelay: '3s' }} />

        {/* Soft connector lines */}
        <svg className="absolute inset-0 w-full h-full opacity-15" style={{ pointerEvents: 'none' }}>
          <defs>
            <linearGradient id="insighta-hero-line-1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0 }} />
              <stop offset="50%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.5 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="insighta-hero-line-2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(var(--secondary))', stopOpacity: 0 }} />
              <stop offset="50%" style={{ stopColor: 'hsl(var(--secondary))', stopOpacity: 0.45 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(var(--secondary))', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <line x1="20%" y1="25%" x2="28%" y2="38%" stroke="url(#insighta-hero-line-1)" strokeWidth="1.5" />
          <line x1="75%" y1="35%" x2="65%" y2="52%" stroke="url(#insighta-hero-line-1)" strokeWidth="1.5" />
          <line x1="30%" y1="70%" x2="42%" y2="82%" stroke="url(#insighta-hero-line-2)" strokeWidth="1.5" />
        </svg>

        {/* Tech nodes */}
        {[
          { top: '22%', left: '18%' },
          { top: '32%', left: '26%' },
          { top: '58%', left: '20%' },
          { top: '42%', right: '22%' },
          { bottom: '24%', right: '28%' },
          { bottom: '18%', left: '42%' }
        ].map((pos, i) => (
          <div
            key={`insighta-node-${i}`}
            className="absolute w-1.5 h-1.5 rounded-full bg-primary/35"
            style={{
              ...pos,
              animation: `pulse 2.4s ease-in-out infinite`,
              animationDelay: `${i * 0.6}s`
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 takeover-title creatives-font">
            <span className="takeover-gradient">Insighta</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed px-4">
            Funding Opportunities and market insights.
          </p>

          {/* Value Proposition */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12 px-2">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-primary/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <Sparkles className="w-3 sm:w-4 h-3 sm:h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium">AI-Powered</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-secondary/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-secondary rounded-full"></div>
              <span className="text-xs sm:text-sm font-medium">Funding Opportunities</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-accent/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-accent rounded-full"></div>
              <span className="text-xs sm:text-sm font-medium">Market Trends</span>
            </div>
          </div>

          {/* Description */}
          <div className="max-w-3xl mx-auto px-4">
            <p className="text-base sm:text-lg md:text-xl text-foreground/90 leading-relaxed text-left">
              {displayedText}
              {isTyping && <span className="inline-block w-0.5 h-5 sm:h-6 bg-primary ml-1 animate-pulse" />}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BlogHero;