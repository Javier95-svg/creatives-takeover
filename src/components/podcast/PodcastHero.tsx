import { Mic, Headphones } from "lucide-react";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";

const DESCRIPTION =
  "A series of conversations with founders building real products, told as stories, not pitches. Each episode digs into the unusual paths, contrarian bets, and hard moments behind the company, with concrete takeaways for anyone building their own.";

const PodcastHero = () => {
  const { displayedText, isTyping } = useTypingAnimation({
    text: DESCRIPTION,
    speed: 20,
    startDelay: 500,
  });

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Eyebrow / on-air badge */}
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/70 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
              The Podcast
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl mb-6 sm:mb-7 podcast-display-font">
            <span className="takeover-gradient">Founders Unleashed</span>
          </h1>

          {/* Description */}
          <div className="max-w-3xl mx-auto px-4">
            <p
              className="text-sm sm:text-base md:text-lg text-foreground/70 leading-7 font-normal tracking-wide"
              style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}
            >
              {displayedText}
              {isTyping && (
                <span className="inline-block w-0.5 h-5 sm:h-6 bg-primary ml-1 animate-pulse" />
              )}
            </p>
          </div>

          {/* Listen-in cue */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <Headphones className="h-4 w-4" aria-hidden="true" />
            New episodes, watched right here
          </div>
        </div>
      </div>
    </section>
  );
};

export default PodcastHero;
