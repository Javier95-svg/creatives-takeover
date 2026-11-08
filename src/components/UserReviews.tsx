import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Fingerprint,
  DraftingCompass,
  CheckCircle,
  Hammer,
  Rocket,
  ChartNoAxesCombined,
  TrendingUp,
  Play,
  Pause
} from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import TitleFx from "@/components/home/TitleFx";
import CycleWheel from "@/components/home/CycleWheel";
import StageCard from "@/components/home/StageCard";
type CycleStep = {
  shortLabel: string;
  /** The stage card's colour for this stage. */
  accent: string;
  /** What the stage is for. */
  objective: string;
  /** What the founder completes in it, from STAGE_TASKS (src/lib/bizmapStages.ts). */
  result: string;
  icon: React.ElementType;
};

const cycleSteps: CycleStep[] = [
  {
    shortLabel: "Identity",
    accent: "#f5a524",
    objective:
      "Every venture starts with a precise answer to who it serves. This stage turns a broad idea into a defined problem, a specific customer who feels it and a clear reason your solution is different.",
    result:
      "You complete an ideal customer profile, rank the top three customer pains by urgency, and select your target industries and buyer persona. You leave with one customer to focus on and a clear goal for what to prove next.",
    icon: Fingerprint,
  },
  {
    shortLabel: "Prototyping",
    accent: "#38bdf8",
    objective:
      "Before any code is written, the idea needs to be visible. This stage produces a page that explains what the product does, who it is for and the problem it solves, so real people can respond to it.",
    result:
      "You write a one-line value proposition, draft the headline and core benefits, and publish the page as a waitlist with a shareable link. The stage is complete once the waitlist is live and ready to collect sign-ups.",
    icon: DraftingCompass,
  },
  {
    shortLabel: "Validation",
    accent: "#34d399",
    objective:
      "This stage tests whether the demand is real before time and money go into building. The evidence comes from one-to-one conversations with potential customers, the alternatives they use today and waitlist sign-ups.",
    result:
      "You define your key hypotheses and risks, then record at least 25 interviews or surveys against them. The evidence leads to one clear decision: build, narrow the focus, pivot or stop.",
    icon: CheckCircle,
  },
  {
    shortLabel: "Building",
    accent: "#fb923c",
    objective:
      "With demand confirmed, the goal is a first version, not a finished product. It covers only the core features that deliver the main value, so customers can start using it and the product improves from real use.",
    result:
      "You save an MVP scope and product spec based on your validated evidence, choose a tech stack with an estimated budget, and publish one workflow a customer can pay for. Experts in specific fields can review the plan along the way.",
    icon: Hammer,
  },
  {
    shortLabel: "Launch",
    accent: "#a78bfa",
    objective:
      "A product gains users only when it reaches the places its customers already spend time. This stage concentrates effort on one acquisition channel instead of spreading it across many.",
    result:
      "You design one measurable acquisition play, then run a first-customer cycle: 10 qualified prospects, 10 direct messages and a decision on whether the channel is worth repeating. Launch directories and outreach templates extend your reach.",
    icon: Rocket,
  },
  {
    shortLabel: "Traction",
    accent: "#f472b6",
    objective:
      "Early users prove interest; traction proves it can be repeated. This stage separates growth that compounds from growth that depends on constant effort, measured through acquisition, retention and revenue.",
    result:
      "You repeat the same acquisition motion in a second cycle, log results week by week and verify at least one qualified buyer signal. Three consecutive strong weeks mark the point where fundraising preparation can begin.",
    icon: ChartNoAxesCombined,
  },
  {
    shortLabel: "Fundraising",
    accent: "#818cf8",
    objective:
      "Fundraising is optional and only makes sense once traction is verified. Investors look for the same proof: a working product, evidence of demand, early paying customers and a clear use of funds.",
    result:
      "You measure your fundraising readiness, review your pitch deck narrative and build a target list of investors and accelerators that match your stage and sector. No platform can guarantee funding; stronger evidence leads to stronger conversations.",
    icon: TrendingUp,
  }
];

const UserReviews = () => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const prefersReducedMotion = usePrefersReducedMotion();
  // The wheel and the stage card share this index, so both always show the
  // same stage; picking a stage in either place stops the auto-play.
  const selectStep = (index: number) => {
    setActiveStepIndex(index);
    setIsAutoPlaying(false);
  };

  // Auto-play functionality
  useEffect(() => {
    if (prefersReducedMotion) {
      setIsAutoPlaying(false);
      return;
    }

    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % cycleSteps.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, prefersReducedMotion]);

  return (
    <section id="startup-development-cycle" className="startup-cycle-section section-shell overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="startup-cycle-header text-center mb-16 sm:mb-20 px-6 sm:px-8 lg:px-12">
          <Badge variant="outline" className="homepage-section-badge mb-5 animate-in fade-in slide-in-from-top duration-700">
            A Proven Methodology
          </Badge>
          <h2 className="homepage-section-title startup-cycle-title text-3xl sm:text-4xl lg:text-[2.9rem] mb-5 break-words animate-in fade-in slide-in-from-bottom duration-700 delay-100">
            <TitleFx variant="evolve" text="Track Your Project Evolution" />
          </h2>
          <p className="homepage-section-copy startup-cycle-copy text-base sm:text-lg max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom duration-700 delay-200">
            Creatives Takeover functions as an Accelerator-as-a-Service (AaaS): every user has full access to our methodology, tools and experts from day one, without giving up equity.
          </p>
          <p className="homepage-section-copy startup-cycle-copy text-base sm:text-lg max-w-3xl mx-auto mt-4 animate-in fade-in slide-in-from-bottom duration-700 delay-300">
            Our development cycle has 7 stages, each with a clear result, and a dashboard that always shows what to focus on next.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-8 lg:gap-10 lg:grid-cols-2 items-stretch">
          <Card className="surface-panel trust-outline overflow-hidden">
            <CardContent className="p-4 sm:p-8">
              <CycleWheel steps={cycleSteps} active={activeStepIndex} onSelect={selectStep} />
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className="gap-2 border-border/80 bg-background/70 hover:bg-background hover:scale-105 transition-transform duration-200"
                >
                  {isAutoPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Play
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <StageCard steps={cycleSteps} active={activeStepIndex} onSelect={selectStep} />
        </div>
      </div>
    </section>
  );
};

export default UserReviews;