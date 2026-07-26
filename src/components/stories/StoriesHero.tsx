import { useTypingAnimation } from "@/hooks/useTypingAnimation";

const DESCRIPTION =
  "Creatives Takeover Newspaper is your front-row seat to the stories that matter in the world of building. We cover founder journeys, startup case studies, and the emerging technologies reshaping industries, told by the people who lived it.\n\nFrom hard-won pivots to breakthrough moments, every piece is designed to sharpen how you think and accelerate how you build. Stay ahead of the curve, spot what is working before it goes mainstream, and walk away with insights you can actually use.";

const FULL_PARAGRAPHS = DESCRIPTION.split("\n\n");

const PARAGRAPH_CLASS =
  "text-sm sm:text-base md:text-lg text-foreground/70 leading-7 font-normal tracking-wide";
const PARAGRAPH_STYLE = { fontFamily: "'Space Grotesk', 'Poppins', sans-serif" } as const;

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

          {/* Description — two paragraphs.
              The typing animation used to grow this block one wrapped line at a
              time, and every new line shifted the article grid below it — about
              a dozen shifts over ~12s, measured CLS 0.30 desktop / 0.25 mobile,
              the worst offender on the page. A hidden copy of the finished text
              sits in the same grid cell and reserves the final height, so the
              typed text now fills a box that never changes size. Using the real
              text rather than a magic min-height keeps it correct across
              breakpoints and after the webfont swaps in. */}
          <div className="max-w-3xl mx-auto px-4 grid">
            <div className="col-start-1 row-start-1 invisible space-y-4" aria-hidden="true">
              {FULL_PARAGRAPHS.map((para, index) => (
                <p key={index} className={PARAGRAPH_CLASS} style={PARAGRAPH_STYLE}>
                  {para}
                </p>
              ))}
            </div>
            <div className="col-start-1 row-start-1 space-y-4">
              {paragraphs.map((para, index) => (
                <p key={index} className={PARAGRAPH_CLASS} style={PARAGRAPH_STYLE}>
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
      </div>
    </section>
  );
};

export default StoriesHero;
