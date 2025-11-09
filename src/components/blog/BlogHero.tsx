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
      {/* Animated Ambient Wallpaper */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Base gradient wash */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/80" />

        {/* Rotating aurora glow */}
        <div
          className="absolute -top-48 -left-44 w-[60rem] h-[60rem] rounded-full blur-3xl opacity-70 animate-[spin_36s_linear_infinite]"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(56,189,248,0.28), transparent 55%), radial-gradient(circle at 70% 70%, rgba(161,132,252,0.32), transparent 60%)",
            animationDuration: "36s"
          }}
        />

        {/* Pulsing gradient ribbons */}
        <div
          className="absolute inset-0 opacity-60 animate-[spin_28s_linear_infinite]"
          style={{
            backgroundImage:
              "conic-gradient(from 140deg at 50% 50%, rgba(56,189,248,0.12), rgba(161,132,252,0.18), rgba(56,189,248,0.12))",
            animationDuration: "28s"
          }}
        />

        {/* Floating blurred orbs */}
        <div className="absolute top-24 right-[18%] w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-pulse" style={{ animationDuration: "6.5s" }} />
        <div className="absolute bottom-16 left-[22%] w-80 h-80 rounded-full bg-secondary/20 blur-3xl animate-pulse" style={{ animationDuration: "7.2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-accent/25 blur-[90px] animate-ping" style={{ animationDuration: "9s" }} />

        {/* Animated diagonal mesh */}
        <div
          className="absolute inset-0 opacity-25 animate-[spin_40s_linear_infinite]"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0.12) 25%, transparent 25%, transparent 50%, rgba(161,132,252,0.12) 50%, rgba(161,132,252,0.12) 75%, transparent 75%, transparent)",
            backgroundSize: "220px 220px",
            animationDuration: "40s"
          }}
        />

        {/* Soft dotted shimmer */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.22]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-dots" x="0" y="0" width="90" height="90" patternUnits="userSpaceOnUse">
              <circle cx="6" cy="6" r="2" fill="rgba(56,189,248,0.18)">
                <animate attributeName="opacity" values="0.35;0.7;0.35" dur="4.5s" repeatCount="indefinite" />
              </circle>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-dots)" />
        </svg>

        {/* Subtle top-to-bottom gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/65 via-background/40 to-background/10" />
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