import { useTypingAnimation } from "@/hooks/useTypingAnimation";

const StoriesHero = () => {
  const fullText = "Welcome to the Creatives Takeover Newspaper, where we share founder stories, startup case studies, and deep dives into emerging tech. Learn from real wins, failures, pivots, and breakthroughs, with insights you can apply as you build and grow. Stay close to what is working now, spot trends early, and sharpen your thinking before they go mainstream.";
  
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

