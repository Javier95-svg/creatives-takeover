import { Linkedin, BookOpen, Sparkles, FileText } from "lucide-react";

const StoriesHero = () => {
  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 takeover-title creatives-font">
            <span className="takeover-gradient">Stories</span>
          </h1>
          
          {/* Value Proposition Badges */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12 px-2">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-primary/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <Linkedin className="w-3 sm:w-4 h-3 sm:h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium">LinkedIn Articles</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-secondary/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <BookOpen className="w-3 sm:w-4 h-3 sm:h-4 text-secondary" />
              <span className="text-xs sm:text-sm font-medium">Expert Insights</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-accent/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <Sparkles className="w-3 sm:w-4 h-3 sm:h-4 text-accent" />
              <span className="text-xs sm:text-sm font-medium">Latest Stories</span>
            </div>
          </div>

          {/* Description */}
          <div className="max-w-3xl mx-auto px-4">
            <p className="text-base sm:text-lg md:text-xl text-foreground/90 leading-relaxed">
              Discover curated articles and insights from our community of creative entrepreneurs. 
              Learn from real experiences, get actionable advice, and stay updated with the latest trends 
              in business, marketing, and entrepreneurship.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StoriesHero;

