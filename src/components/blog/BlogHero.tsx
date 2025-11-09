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
      {/* Stock-inspired animated wallpaper */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#030914] via-[#071322] to-[#0b1f33]" />

        {/* Market grid */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(59,130,246,0.25) 1px, transparent 1px),
              linear-gradient(0deg, rgba(59,130,246,0.25) 1px, transparent 1px)
            `,
            backgroundSize: '120px 120px'
          }}
        />

        {/* Animated line charts */}
        <svg className="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 1440 900">
          <defs>
            <linearGradient id="insighta-line-1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(59,130,246,0)" />
              <stop offset="50%" stopColor="rgba(59,130,246,0.6)" />
              <stop offset="100%" stopColor="rgba(59,130,246,0)" />
            </linearGradient>
            <linearGradient id="insighta-line-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(16,185,129,0)" />
              <stop offset="50%" stopColor="rgba(16,185,129,0.6)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0)" />
            </linearGradient>
          </defs>
          {/* Primary trend line */}
          <path
            d="M120 540 Q240 420 360 460 T600 400 Q780 360 900 460 T1200 380"
            fill="none"
            stroke="url(#insighta-line-1)"
            strokeWidth="2"
            strokeDasharray="10 20"
          />
          {/* Secondary trend line */}
          <path
            d="M160 640 Q320 620 460 520 T720 560 Q900 600 1080 540 T1300 600"
            fill="none"
            stroke="url(#insighta-line-2)"
            strokeWidth="1.6"
            strokeDasharray="14 24"
          />
        </svg>

        {/* Rotating data discs */}
        <div className="absolute -top-32 right-1/4 w-[32rem] h-[32rem] rounded-full border border-sky-400/20 blur-[1px] animate-[spin_36s_linear_infinite]" />
        <div className="absolute top-1/3 -left-28 w-[28rem] h-[28rem] rounded-full border border-emerald-300/20 blur-[1px] animate-[spin_28s_linear_infinite_reverse]" />

        {/* Pulsing data nodes */}
        {[
          { top: '24%', left: '28%' },
          { top: '40%', left: '50%' },
          { top: '58%', left: '34%' },
          { top: '48%', left: '66%' },
          { top: '32%', left: '74%' },
          { top: '62%', left: '78%' }
        ].map((pos, index) => (
          <div
            key={`insighta-node-${index}`}
            className="absolute w-2.5 h-2.5 rounded-full bg-cyan-300/80 shadow-[0_0_14px_rgba(56,189,248,0.6)]"
            style={{
              ...pos,
              animation: 'pulse 2.8s ease-in-out infinite',
              animationDelay: `${index * 0.5}s`
            }}
          />
        ))}

        {/* Readability overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/72 via-background/45 to-background/78" />
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