import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import heroImage from "@/assets/hero-bg-animated.jpg";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";

interface BlogHeroProps {
  onSearch?: (searchTerm: string) => void;
}

const BlogHero = ({ onSearch }: BlogHeroProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const fullText = "Discover up-to-date funding opportunities curated for creative entrepreneurs. Browse grants, accelerators, contests, and microfunds. Filter by type, location, or search keywords. Find the perfect funding opportunity for your project.";
  
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
      {/* Animated Background with Multiple Layers */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 animate-fade-in" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 takeover-title creatives-font">
            <span className="takeover-gradient">Insighta</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed px-4">
            Your curated funding board. Find grants, accelerators, contests, and microfunds.
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