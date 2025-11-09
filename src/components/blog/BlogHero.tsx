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
      {/* Insighta ambient wallpaper */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#061424] via-[#0b1e33] to-[#142a44]" />

        {/* Soft spotlight beams */}
        <div className="absolute inset-0 opacity-60">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 25% 30%, rgba(56,189,248,0.18), transparent 55%), radial-gradient(circle at 75% 35%, rgba(129,140,248,0.18), transparent 60%)'
            }}
          />
        </div>

        {/* Rotating data discs */}
        <div className="absolute -top-28 right-1/4 w-[32rem] h-[32rem] rounded-full border border-cyan-400/20 blur-[1px] animate-[spin_40s_linear_infinite]" />
        <div className="absolute top-1/3 -left-28 w-[28rem] h-[28rem] rounded-full border border-sky-300/18 blur-[1px] animate-[spin_30s_linear_infinite_reverse]" />

        {/* Dotted mesh */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 3px 3px, rgba(255,255,255,0.18) 1px, transparent 0)',
            backgroundSize: '28px 28px'
          }}
        />

        {/* Subtle scanning arcs */}
        <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 1440 900">
          <defs>
            <linearGradient id="insighta-arc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(56,189,248,0)" />
              <stop offset="50%" stopColor="rgba(56,189,248,0.45)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0)" />
            </linearGradient>
          </defs>
          <path d="M180 260 Q360 180 520 280 T860 380 Q1080 420 1280 340" fill="none" stroke="url(#insighta-arc)" strokeWidth="1.6" strokeDasharray="10 18" />
          <path d="M140 520 Q320 540 480 620 T840 720 Q1060 760 1230 640" fill="none" stroke="rgba(129,140,248,0.35)" strokeWidth="1.2" strokeDasharray="12 20" />
        </svg>

        {/* Pulsing info nodes */}
        {[
          { top: '24%', left: '22%' },
          { top: '34%', left: '42%' },
          { top: '52%', left: '32%' },
          { top: '46%', left: '62%' },
          { top: '30%', left: '72%' },
          { top: '60%', left: '78%' }
        ].map((pos, index) => (
          <div
            key={`insighta-node-${index}`}
            className="absolute w-2.5 h-2.5 rounded-full bg-cyan-200/80 shadow-[0_0_14px_rgba(56,189,248,0.6)]"
            style={{
              ...pos,
              animation: 'pulse 2.8s ease-in-out infinite',
              animationDelay: `${index * 0.5}s`
            }}
          />
        ))}

        {/* Readability overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/45 to-background/78" />
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