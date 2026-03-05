import { useTypingAnimation } from "@/hooks/useTypingAnimation";

const StoriesHero = () => {
  const fullText = "Welcome to the Creatives Takeover Newspaper, where we publish founder stories, startup case studies, and thoughtful deep dives into the technologies shaping what gets built next. Explore real lessons from wins, failures, pivots, and breakthroughs, with insights you can actually apply whether you are validating an idea, launching a product, or scaling a team. Stay close to what is working in the startup world right now, understand the trends behind the headlines, and sharpen your thinking so you can move faster, make better decisions, and spot what is coming before it goes mainstream.";
  
  const { displayedText, isTyping } = useTypingAnimation({ 
    text: fullText, 
    speed: 20,
    startDelay: 500
  });

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-7 takeover-title creatives-font">
            <span className="takeover-gradient">Newspaper</span>
          </h1>

          {/* Description */}
          <div className="max-w-3xl mx-auto px-4">
            <p 
              className="text-base sm:text-lg md:text-xl text-foreground/90 leading-relaxed"
              style={{ 
                fontFamily: "'Space Grotesk', 'Poppins', sans-serif"
              }}
            >
              {displayedText}
              {isTyping && <span className="inline-block w-0.5 h-5 sm:h-6 bg-primary ml-1 animate-pulse" />}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StoriesHero;

