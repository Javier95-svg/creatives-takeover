import { useTypingAnimation } from "@/hooks/useTypingAnimation";

const DESCRIPTION =
  "Creatives Takeover Newspaper is your front-row seat to the stories that matter in the world of building. We cover founder journeys, startup case studies, and the emerging technologies reshaping industries, told by people who are living it.\n\nFrom hard-won pivots to breakthrough moments, every piece is designed to sharpen how you think and accelerate how you build. Stay ahead of the curve, spot what is working before it goes mainstream, and walk away with insights you can actually use.";

const StoriesHero = () => {
  const { displayedText, isTyping } = useTypingAnimation({
    text: DESCRIPTION,
    speed: 20,
    startDelay: 500,
  });

  // Split on the paragraph break so each paragraph renders in its own <p>.
  // While typing the second paragraph hasn't appeared yet — that's fine, the
  // split just returns a single-element array until the \n\n is reached.
  const paragraphs = displayedText.split("\n\n");

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-7 takeover-title creatives-font">
            <span className="takeover-gradient">Newspaper</span>
          </h1>

          {/* Description — two paragraphs */}
          <div className="max-w-3xl mx-auto px-4 space-y-4">
            {paragraphs.map((para, index) => (
              <p
                key={index}
                className="text-base sm:text-lg md:text-xl text-foreground/90 leading-relaxed"
                style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}
              >
                {para}
                {/* Show cursor only on the last visible paragraph while typing */}
                {isTyping && index === paragraphs.length - 1 && (
                  <span className="inline-block w-0.5 h-5 sm:h-6 bg-primary ml-1 animate-pulse" />
                )}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StoriesHero;
