import { useState, useEffect, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  Fingerprint,
  DraftingCompass,
  CheckCircle,
  Hammer,
  Rocket,
  ChartNoAxesCombined,
  TrendingUp,
  Play,
  Pause,
  ArrowRight
} from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import HomeSectionHeader from "@/components/home/HomeSectionHeader";
import GradientMesh from "@/components/home/GradientMesh";

type CycleStep = {
  shortLabel: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  /** The tool built for this stage. */
  tool: { name: string; href: string };
};

const cycleSteps: CycleStep[] = [
  {
    shortLabel: "Identity",
    title: "Stage 1: Identity",
    description:
      "In this stage, founders clarify the foundation of their startup by answering a few core questions:\n\nWhat specific problem are you solving?\nWho are you solving it for?\nWhat makes your solution different and more efficient?\nWhy are you the right person to build it?\n\nThe goal is to define your Ideal Customer Profile (ICP) and set clear, specific goals for what you want to achieve next.",
    icon: Fingerprint,
    color: "from-warning/20 to-warning/20",
    tool: { name: "ICP Builder", href: "/icp-builder" }
  },
  {
    shortLabel: "Prototyping",
    title: "Stage 2: Prototyping",
    description:
      "After defining your identity, the next step is to create a simple landing page that works as your waitlist. This page should clearly explain what your product is, who it is for, and the core problem it solves so visitors quickly understand the value.\n\nIt should also describe the key features you plan to offer and give a simple overview of how the product will work, without building the MVP yet. The goal is to make the idea feel real enough to test interest, collect sign-ups, and confirm there is market demand before investing time and money into development.",
    icon: DraftingCompass,
    color: "from-info/20 to-info/20",
    tool: { name: "Demo Studio", href: "/demo-studio/try" }
  },
  {
    shortLabel: "Validation",
    title: "Stage 3: Validation",
    description:
      "In this stage, founders actively reach out to potential customers and book one-on-one conversations to gather honest feedback on the concept. The goal is to confirm real demand by tracking signals like interview insights and how many people join the waitlist.\n\nThis step is crucial because it helps you avoid building something nobody wants. If validation is strong, you move forward to Step 4; if it’s weak, you iterate by asking your ideal customers what’s missing, what would make it valuable, or what alternatives they would choose instead.",
    icon: CheckCircle,
    color: "from-success/20 to-success/20",
    tool: { name: "PMF Lab", href: "/pmf-lab" }
  },
  {
    shortLabel: "Building",
    title: "Stage 4: Building",
    description:
      "Once validation is confirmed, founders can start building the MVP they’ve been promising. This is where the idea becomes a working product, supported by the tools and guidance available on Creatives Takeover, such as the MVP and Tech Stack Builder, plus access to mentors who have experience launching MVPs.\n\nThe focus at this stage is not to build the “perfect” final product. Instead, founders should develop only the core features that deliver the main value, so they can launch sooner, learn faster, and improve the product steadily as they grow.",
    icon: Hammer,
    color: "from-warning/20 to-warning/20",
    tool: { name: "MVP Builder", href: "/build" }
  },
  {
    shortLabel: "Launch",
    title: "Stage 5: Launch",
    description:
      "In this stage, founders bring the product to the public and start actively promoting it wherever their audience already spends time. That includes direct outreach and consistent posting across channels like Product Hunt, LinkedIn, X, Reddit, Instagram, and other relevant sites.\n\nThey should also submit the startup to directories to increase visibility and begin building the brand through clear messaging, visuals, and a steady online presence. The goal is to generate early attention, attract first users, and start building momentum.",
    icon: Rocket,
    color: "from-purple-500/20 to-purple-600/20",
    tool: { name: "GTM Strategist", href: "/go-to-market" }
  },
  {
    shortLabel: "Traction",
    title: "Stage 6: Traction",
    description:
      "Launch brings your first users. Traction is about learning which of them stay and which channel keeps bringing more. In this stage you choose one acquisition channel that fits your product, track retention in the first 30 days, and tell real growth apart from constant effort. GTM Strategist helps you choose the channel, and Traction Engine helps you run and measure it week by week.\n\nThe milestone is three consecutive weeks above your score threshold: people come back, your channel converts, and you can keep up the pace.",
    icon: ChartNoAxesCombined,
    color: "from-pink-500/20 to-pink-600/20",
    tool: { name: "Traction Engine", href: "/traction-engine" }
  },
  {
    shortLabel: "Fundraising",
    title: "Stage 7: Fundraising",
    description:
      "Not every business needs to raise money. If yours does, this is the stage to prepare: a working product, evidence of demand, early paying customers, and a clear plan for what the money is for.\n\nInsighta helps you check your readiness, improve your pitch deck, and find investors and accelerators that match your stage and sector. No platform can guarantee funding; the stronger your evidence, the better your conversations with investors will be.",
    icon: TrendingUp,
    color: "from-indigo-500/20 to-indigo-600/20",
    tool: { name: "Insighta", href: "/insighta" }
  }
];

// Each stage's colour for its track dot and its gradient panel.
const STAGE_HUES = [
  ["38 92% 56%", "18 90% 58%", "48 96% 62%", "330 80% 62%"],
  ["192 90% 50%", "220 90% 62%", "170 75% 48%", "250 85% 66%"],
  ["152 68% 45%", "170 80% 45%", "90 60% 50%", "200 85% 55%"],
  ["24 92% 56%", "4 85% 60%", "42 95% 58%", "320 75% 60%"],
  ["262 83% 64%", "290 75% 62%", "228 90% 64%", "330 85% 62%"],
  ["330 85% 60%", "350 85% 62%", "290 70% 60%", "20 90% 60%"],
  ["235 85% 66%", "205 90% 58%", "262 80% 66%", "180 75% 50%"],
] as const;

const AUTOPLAY_MS = 6000;

const UserReviews = () => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const running = isAutoPlaying && !isHovering && !prefersReducedMotion;
  const stopsRef = useRef<HTMLDivElement | null>(null);

  // On a phone the track scrolls sideways; keep the active stage in view.
  // Only the track's own scrollLeft moves, never the page.
  useEffect(() => {
    const track = stopsRef.current;
    const stop = track?.children[activeStepIndex] as HTMLElement | undefined;
    if (!track || !stop || track.scrollWidth <= track.clientWidth) return;
    const left = stop.offsetLeft - (track.clientWidth - stop.offsetWidth) / 2;
    track.scrollTo({ left, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [activeStepIndex, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) setIsAutoPlaying(false);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      setActiveStepIndex((prev) => (prev + 1) % cycleSteps.length);
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [running, activeStepIndex]);

  const choose = (index: number) => {
    setActiveStepIndex(index);
    setIsAutoPlaying(false);
  };

  const progress = activeStepIndex / (cycleSteps.length - 1);

  return (
    <section
      id="startup-development-cycle"
      className="startup-cycle-section section-shell hx-cycle"
      aria-labelledby="cycle-heading"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="hx-cycle__top">
          <HomeSectionHeader badge="The 7 Stage Journey" title="Startup Development Cycle" id="cycle-heading">
            Seven stages, one project. Start where you are.
          </HomeSectionHeader>
          <button
            type="button"
            className="hx-cycle__play"
            onClick={() => setIsAutoPlaying((value) => !value)}
            disabled={prefersReducedMotion}
            aria-pressed={isAutoPlaying}
          >
            {isAutoPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            {isAutoPlaying ? "Pause" : "Play"}
          </button>
        </div>

        <div
          className="hx-cycle__body"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className="hx-cycle__track">
            <div className="hx-cycle__rail" aria-hidden="true">
              <div className="hx-cycle__fill" style={{ transform: `scaleX(${progress})` }} />
            </div>
            <div ref={stopsRef} className="hx-cycle__stops" role="tablist" aria-label="Startup stages">
              {cycleSteps.map((step, index) => {
                const Icon = step.icon;
                const selected = index === activeStepIndex;
                const stopStyle = { "--stage-hue": STAGE_HUES[index][0] } as CSSProperties;
                return (
                  <button
                    key={step.shortLabel}
                    type="button"
                    role="tab"
                    id={`cycle-tab-${index}`}
                    aria-selected={selected}
                    aria-controls={`cycle-panel-${index}`}
                    aria-label={`Select Stage ${index + 1}: ${step.shortLabel}`}
                    className={`hx-cycle__stop${index < activeStepIndex ? " is-done" : ""}`}
                    style={stopStyle}
                    onClick={() => choose(index)}
                  >
                    <span className="hx-cycle__dot">
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="hx-cycle__label">
                      <span className="hx-cycle__num">{index + 1}</span>
                      {step.shortLabel}
                    </span>
                    {selected && running ? <span key={activeStepIndex} className="hx-cycle__timer" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Every panel sits in the same grid cell, so the block is as tall as
              the longest stage and switching stages never moves the page. */}
          <div className="hx-cycle__panels">
            {cycleSteps.map((step, index) => {
              const Icon = step.icon;
              const selected = index === activeStepIndex;
              const hues = STAGE_HUES[index];
              const panelStyle = { "--stage-hue": hues[0] } as CSSProperties;
              return (
                <div
                  key={step.shortLabel}
                  id={`cycle-panel-${index}`}
                  role="tabpanel"
                  aria-labelledby={`cycle-tab-${index}`}
                  aria-hidden={!selected}
                  className={`hx-cycle__panel${selected ? " is-active" : ""}`}
                  style={panelStyle}
                >
                  <div className="hx-cycle__copy">
                    <p className="hx-cycle__kicker">
                      Stage {index + 1} of {cycleSteps.length}
                    </p>
                    <h3 className="hx-cycle__title">{step.shortLabel}</h3>
                    <div className="hx-cycle__text">
                      {step.description.split("\n\n").map((paragraph) => (
                        <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                      ))}
                    </div>
                    <Link
                      to={step.tool.href}
                      className="startup-cycle-tool-link hx-cycle__link"
                      tabIndex={selected ? 0 : -1}
                    >
                      Open {step.tool.name}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                  <div className="hx-cycle__art" aria-hidden="true">
                    <GradientMesh colors={[hues[0], hues[1], hues[2], hues[3]]} />
                    <span className="hx-cycle__big">{String(index + 1).padStart(2, "0")}</span>
                    <span className="hx-cycle__orb">
                      <Icon />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default UserReviews;
