import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";
import heroImage from "@/assets/hero-bg-animated.jpg";

interface BlogHeroProps {
  onSearch?: (searchTerm: string) => void;
}

const BlogHero = ({ onSearch }: BlogHeroProps) => {
  const [searchTerm, setSearchTerm] = useState("");

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
    <section className="scroll-mt-24 relative min-h-[85vh] sm:min-h-screen flex items-center justify-center overflow-hidden py-12 sm:py-0">
      {/* Animated Background with Multiple Layers */}
      <div 
        className="absolute inset-0 bg-cover bg-center animate-pulse-glow"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 animate-fade-in" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/95" />
      
      {/* Simplified Floating Elements - 8 strategic animations */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-primary/60 rounded-full animate-float opacity-70" />
      <div className="absolute top-40 right-20 w-6 h-6 bg-secondary/50 rounded-full animate-spiral opacity-60" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-40 left-20 w-3 h-3 bg-accent/60 rounded-full animate-zigzag opacity-70" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/3 right-10 w-8 h-8 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full animate-orbit opacity-50 blur-sm" style={{ animationDelay: '3s' }} />
      <div className="absolute bottom-1/3 left-10 w-6 h-6 bg-gradient-to-r from-accent/30 to-primary/30 rounded-full animate-float-reverse opacity-40 blur-sm" style={{ animationDelay: '4s' }} />
      <div className="absolute top-24 right-1/3 w-10 h-10 bg-gradient-to-r from-primary/10 to-transparent rounded-full animate-diagonal-float opacity-30 blur-md" style={{ animationDelay: '5s' }} />
      <div className="absolute bottom-24 left-1/3 w-12 h-12 bg-gradient-to-l from-secondary/8 to-transparent rounded-full animate-spiral opacity-25 blur-md" style={{ animationDelay: '6s' }} />
      <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-primary/70 rounded-full animate-drift opacity-80" style={{ animationDelay: '7s' }} />

      <div className="container mx-auto px-4 sm:px-6 relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 animate-slide-up takeover-title creatives-font">
            <span className="takeover-gradient">Insighta</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed animate-slide-up px-4" style={{ animationDelay: '0.1s' }}>
            AI-Powered Business Opportunities & Market Intelligence
          </p>

          {/* Value Proposition */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12 animate-slide-up px-2" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-primary/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <Sparkles className="w-3 sm:w-4 h-3 sm:h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium">AI-Powered Analysis</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-secondary/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-secondary rounded-full"></div>
              <span className="text-xs sm:text-sm font-medium">Market Intelligence</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-accent/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-accent rounded-full"></div>
              <span className="text-xs sm:text-sm font-medium">Action Plans</span>
            </div>
          </div>

          {/* Search Bar - Prominent with larger size */}
          <form 
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-2xl mx-auto animate-slide-up px-4 mb-8" 
            style={{ animationDelay: '0.3s' }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search opportunities, trends, or topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 glass h-14 sm:h-16 text-base sm:text-lg touch-manipulation"
              />
            </div>
            <Button type="submit" className="glass bg-primary hover:bg-primary/90 text-primary-foreground btn-magnetic h-14 sm:h-16 px-8 text-base sm:text-lg font-semibold touch-manipulation">
              <Search className="h-5 w-5 mr-2" />
              Discover
            </Button>
          </form>

          {/* Scroll Down Indicator */}
          <div className="mt-16 animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <Button
              variant="ghost"
              onClick={scrollToOpportunities}
              className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
            >
              <span className="text-sm font-medium">Latest Opportunities</span>
              <ChevronDown className="w-5 h-5 animate-bounce group-hover:animate-pulse" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BlogHero;