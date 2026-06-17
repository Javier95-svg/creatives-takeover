import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  DollarSign,
  Eye,
  Globe,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  type LucideIcon,
  Pause,
  Play,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

interface DeckSlide {
  title: string;
  tagline: string;
  cover: string;
  want: string;
  mistake: string;
  icon: LucideIcon;
}

// The slide order investors expect, written to double as a build-it checklist.
// Guidance draws on Sequoia Capital's deck structure, the DocSend and Harvard
// study of how investors read decks, and Guy Kawasaki's clarity rule.
const SLIDES: DeckSlide[] = [
  {
    title: "Problem",
    tagline: "Hook them in the first 30 seconds.",
    cover: "Open with the exact pain you remove and who feels it most. Ground it in a real scenario or a number that shows how often, or how expensively, this happens today. One clear customer in real pain beats a broad description of an industry.",
    want: "A problem they recognize instantly and believe is urgent. Sequoia Capital's classic template puts the problem near the top for a reason: if the pain is not obvious, nothing after it matters.",
    mistake: "Describing a broad market gap instead of one sharp pain, or assuming the problem is self evident. If everyone is your customer, investors hear that no one is.",
    icon: HelpCircle,
  },
  {
    title: "Solution",
    tagline: "One sentence. No jargon.",
    cover: "Say what you do in one plain sentence, then show how it removes the pain you just described. Focus on the outcome for the user, not the underlying technology, and make the value obvious to someone outside your industry.",
    want: "Clarity above all, plus a solution that fits the problem. A useful test, popularized by Guy Kawasaki, is whether a stranger can repeat your idea back after a single slide.",
    mistake: "Hiding the idea behind buzzwords like AI powered synergy platform. Jargon signals you cannot yet explain it simply, and a long feature list is not a solution.",
    icon: Lightbulb,
  },
  {
    title: "Market Size",
    tagline: "Show the prize is big.",
    cover: "Show TAM, SAM, and SOM, and build the number bottom up from realistic units such as customers multiplied by price. Note how fast the market is growing and which slice you can realistically win first.",
    want: "A believable path to a very large market. Investors need the outcome to be big enough to return their fund, so a credible bottom up number earns more trust than a giant headline figure.",
    mistake: "Top down math such as we only need 1 percent of a $50 billion market. Borrowed analyst numbers with no path to reach them are the quickest way to lose the room.",
    icon: Globe,
  },
  {
    title: "Product",
    tagline: "Show it, do not just describe it.",
    cover: "Show the product working through a screenshot, a short demo, or a simple before and after. Walk through the core flow a real user takes and the single moment where they feel the value.",
    want: "Proof it is real and that people would use it. A working demo creates far more conviction than a list of features, and investors look closely at whether the product actually solves the problem.",
    mistake: "Long paragraphs of feature lists, or a vision with nothing built yet. One clear screenshot lands harder than a slide full of text.",
    icon: LayoutDashboard,
  },
  {
    title: "Business Model",
    tagline: "How the money works.",
    cover: "Explain what you charge, who pays, and how often. Include your pricing, the main revenue streams, and any early proof that customers will actually pay it.",
    want: "A model that scales with healthy margins, plus unit economics you understand: what it costs to win a customer versus what that customer is worth over their lifetime.",
    mistake: "Vague pricing, or saying you will figure out revenue later. Investors read that as untested willingness to pay and weak grasp of your economics.",
    icon: DollarSign,
  },
  {
    title: "Traction",
    tagline: "Evidence beats promises.",
    cover: "Lead with your strongest evidence: revenue, active users, growth rate, retention, or signed letters of intent. Show the trend over time rather than a single snapshot, and call out the metric that matters most for your stage.",
    want: "Momentum and proof that people stay. A chart moving up and to the right, backed by retention or repeat usage, says more than any adjective and is one of the first things investors scan for.",
    mistake: "No traction slide, or burying weak numbers in text. Vanity metrics such as total signups with no retention behind them read as a warning sign.",
    icon: TrendingUp,
  },
  {
    title: "Competition and Why Now",
    tagline: "Own your space.",
    cover: "Name the real alternatives, including the status quo of doing nothing. Explain your durable edge and why now is the moment, whether a new technology, a shift in behavior, or a change in regulation.",
    want: "Honest positioning and a defensible reason you win. Sequoia treats why now as a core slide, because timing often separates the winners from everyone else.",
    mistake: "Claiming you have no competitors. Investors hear that as either no market or no homework done, and a flattering two by two chart with you alone in the corner rarely convinces them.",
    icon: Crosshair,
  },
  {
    title: "Team",
    tagline: "Why you, why this.",
    cover: "Show who you are and why this team is uniquely able to build this. Highlight relevant experience, hard won domain insight, and what you have already shipped together.",
    want: "Founder market fit and grit. The team slide is one of the most studied pages in any deck, because early stage investing is ultimately a bet on the people in the room.",
    mistake: "Listing job titles and logos instead of proving a real edge, or padding the slide with advisors you rarely speak to.",
    icon: Users,
  },
  {
    title: "Financials",
    tagline: "Know your own numbers.",
    cover: "Share where you are today and a simple projection for the next 18 to 36 months. Include the few assumptions that drive the model, such as growth rate and cost to acquire a customer, so investors can sanity check it.",
    want: "Realistic numbers that show you understand your own economics and the path to profitability, not a fantasy hockey stick.",
    mistake: "Forecasts that multiply every year with no assumptions, or overly detailed five year models that imply a precision you do not have.",
    icon: BarChart3,
  },
  {
    title: "The Ask",
    tagline: "Make the ask obvious.",
    cover: "State how much you are raising, the rough terms, and exactly what the money buys. Break the use of funds into a few clear buckets and connect them to the milestones this round will reach.",
    want: "A clear number tied to specific goals: the runway you gain and the proof points you will hit before the next raise.",
    mistake: "A vague ask with no use of funds, or raising too little to reach a meaningful milestone before you run out of cash.",
    icon: Target,
  },
];

function DetailRow({ icon: Icon, label, text }: { icon: LucideIcon; label: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-label uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground/90">{text}</p>
      </div>
    </div>
  );
}

export function PitchDeckChecklist() {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onSelect = useCallback(() => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    api.on("select", onSelect);
    onSelect();
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  // Auto-advance every 5s; respects reduced-motion and the pause toggle.
  useEffect(() => {
    if (!api) return;
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }
    if (prefersReducedMotion || isPaused) return;
    autoScrollRef.current = setInterval(() => {
      api.scrollNext();
    }, 5000);
    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };
  }, [api, isPaused, prefersReducedMotion]);

  return (
    <section aria-labelledby="pitch-deck-checklist-heading" className="pt-16 sm:pt-24">
      {/* Header */}
      <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
        <h2
          id="pitch-deck-checklist-heading"
          className="text-2xl font-bold sm:text-3xl lg:text-4xl"
        >
          What should I include in my pitch deck?
        </h2>
      </div>

      {/* Auto-scrolling carousel */}
      <Carousel setApi={setApi} opts={{ align: "start", loop: true }} className="w-full">
        <CarouselContent className="items-stretch">
          {SLIDES.map((slide, index) => {
            const Icon = slide.icon;
            return (
              <CarouselItem key={slide.title} className="basis-full">
                <div className="grid h-full overflow-hidden rounded-3xl border border-primary/15 shadow-sm md:grid-cols-5">
                  {/* Hero panel */}
                  <div className="flex flex-col justify-center gap-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-7 sm:p-9 md:col-span-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-unified text-primary-foreground shadow-lg">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-label uppercase tracking-widest text-primary">
                        Slide {index + 1} of {SLIDES.length}
                      </p>
                      <h3 className="font-space-grotesk text-2xl font-bold text-foreground sm:text-3xl">
                        {slide.title}
                      </h3>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{slide.tagline}</p>
                  </div>

                  {/* Details */}
                  <div className="space-y-5 bg-card p-7 sm:p-9 md:col-span-3">
                    <DetailRow icon={Eye} label="What it covers" text={slide.cover} />
                    <DetailRow icon={Target} label="What investors want" text={slide.want} />
                    <div className="flex gap-3 rounded-xl border border-warning bg-warning-subtle p-3 dark:bg-warning/20">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      <div>
                        <p className="text-label uppercase tracking-widest text-warning">
                          Common mistake
                        </p>
                        <p className="text-sm text-muted-foreground">{slide.mistake}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {/* Controls: prev / dots / next */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => api?.scrollPrev()}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1.5" aria-label="Slide navigation">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => api?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}: ${slide.title}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === selectedIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => api?.scrollNext()}
          aria-label="Next slide"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Pause / resume auto-play */}
      <div className="mt-3 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPaused((prev) => !prev)}
          disabled={prefersReducedMotion}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          {isPaused ? "Resume auto-play" : "Pause auto-play"}
        </Button>
      </div>
    </section>
  );
}
