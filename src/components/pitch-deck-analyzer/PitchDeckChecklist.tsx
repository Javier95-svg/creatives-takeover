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
import { Badge } from "@/components/ui/badge";
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
const SLIDES: DeckSlide[] = [
  {
    title: "Problem",
    tagline: "Hook them in the first 30 seconds.",
    cover: "The specific, painful problem you solve — and exactly who feels it.",
    want: "A problem they recognize instantly, not a vague 'market gap.'",
    mistake: "Burying the problem or making it too broad to feel real.",
    icon: HelpCircle,
  },
  {
    title: "Solution",
    tagline: "One sentence. No jargon.",
    cover: "How you solve the problem, simply enough to repeat back.",
    want: "Clarity — if they can't explain it after one slide, it's too complex.",
    mistake: "Drowning the idea in buzzwords and technical detail.",
    icon: Lightbulb,
  },
  {
    title: "Market Size",
    tagline: "Show the prize is big.",
    cover: "TAM / SAM / SOM — ideally built bottom-up from real numbers.",
    want: "A credible path to a huge market, not 'just 1% of $50B.'",
    mistake: "Top-down math no investor actually believes.",
    icon: Globe,
  },
  {
    title: "Product",
    tagline: "Show it, don't describe it.",
    cover: "What it actually does — a screenshot, short demo, or how-it-works.",
    want: "Proof it's real and people would genuinely use it.",
    mistake: "Walls of text where one screenshot would land harder.",
    icon: LayoutDashboard,
  },
  {
    title: "Business Model",
    tagline: "How the money works.",
    cover: "What you charge, who pays, and how often.",
    want: "A model that scales, with margins that make sense.",
    mistake: "Hand-waving pricing or 'we'll figure out revenue later.'",
    icon: DollarSign,
  },
  {
    title: "Traction",
    tagline: "Evidence beats promises.",
    cover: "Revenue, users, growth, retention, or signed LOIs — your proof.",
    want: "A chart going up and to the right, with honest numbers.",
    mistake: "No traction slide, or hiding weak numbers inside text.",
    icon: TrendingUp,
  },
  {
    title: "Competition & Why Now",
    tagline: "Own your space.",
    cover: "Who else solves this, your real edge, and why this moment.",
    want: "Honest positioning and a defensible reason you win now.",
    mistake: "Claiming 'no competitors' — investors hear 'no market.'",
    icon: Crosshair,
  },
  {
    title: "Team",
    tagline: "Why you, why this.",
    cover: "Who you are and why you're the ones to pull this off.",
    want: "Founder–market fit and a reason you won't quit.",
    mistake: "Listing titles instead of proving a relevant edge.",
    icon: Users,
  },
  {
    title: "Financials",
    tagline: "Know your own numbers.",
    cover: "Where you are today and a simple 18–36 month projection.",
    want: "Realistic figures that show you understand the economics.",
    mistake: "Hockey-stick forecasts with no assumptions behind them.",
    icon: BarChart3,
  },
  {
    title: "The Ask",
    tagline: "Make the ask obvious.",
    cover: "How much you're raising and exactly what it buys.",
    want: "A clear number tied to the milestones this round unlocks.",
    mistake: "A vague ask with no use of funds or next milestone.",
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
        <Badge variant="outline" className="mb-4">
          Pitch Deck Playbook
        </Badge>
        <h2
          id="pitch-deck-checklist-heading"
          className="mb-3 text-2xl font-bold sm:text-3xl lg:text-4xl"
        >
          What should you include in your pitch deck?
        </h2>
        <p className="text-muted-foreground">
          The 10 slides investors expect, in order — what each must cover, what they're really
          looking for, and the mistakes that get decks rejected. Use it as a checklist while you
          build.
        </p>
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
