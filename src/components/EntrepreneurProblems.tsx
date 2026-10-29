import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  ArrowUpRight,
  Boxes,
  FlaskConical,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  Lightbulb,
  Map,
  Rocket,
  Target,
  Users,
  Code,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import FounderJourneyVideo from "./FounderJourneyVideo";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { useIsMobile } from "@/hooks/use-mobile";
import HomeSectionHeader from "@/components/home/HomeSectionHeader";
import GradientMesh from "@/components/home/GradientMesh";

type AccentColor = "blue" | "green" | "red" | "amber";

type JourneyStep = {
  phase: string;
  challenge: string;
  icon: LucideIcon;
  accentColor: AccentColor;
};

type JourneyAction = {
  to: string;
  title: string;
  outcome: string;
  description: string;
  icon: LucideIcon;
  accentName: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  accentBorder: string;
  accentStrong: string;
  panelTint: string;
  meshTint: string;
  idleVariant: "spotlight" | "diagonal" | "halo" | "float" | "beam" | "glint" | "dual";
  shimmerAngle: string;
  floatDistance: string;
  hoverLift: string;
  hoverScale: string;
  sweepDuration: string;
  delay: string;
};

const journeySteps: JourneyStep[] = [
  {
    phase: "The Starting Point",
    challenge: "Scattered ideas without a clear direction",
    icon: Lightbulb,
    accentColor: "blue",
  },
  {
    phase: "Finding Direction",
    challenge: "Aligning your product with a genuine market need",
    icon: Target,
    accentColor: "green",
  },
  {
    phase: "Lack of Experience",
    challenge: "Navigating Uncertainty and Decision-Making",
    icon: Users,
    accentColor: "red",
  },
  {
    phase: "Working Smartly",
    challenge: "Task prioritization and resource management",
    icon: Map,
    accentColor: "blue",
  },
  {
    phase: "Seeking Resources",
    challenge: "Fundraising feels impossible without the right connections",
    icon: Rocket,
    accentColor: "amber",
  },
  {
    phase: "MVP Building",
    challenge: "Deciding what your first version actually needs",
    icon: Code,
    accentColor: "blue",
  },
  {
    phase: "Founder's Mental Tax",
    challenge: "High risk of burnout",
    icon: LayoutDashboard,
    accentColor: "green",
  },
];

const journeyActions: JourneyAction[] = [
  {
    to: "/icp-builder",
    title: "Define Your ICP",
    outcome: "Target Correctly",
    description: "Identify who to serve, what they need, and how to position your offer.",
    icon: Target,
    accentName: "cobalt",
    accent: "218 89% 60%",
    accentSoft: "212 100% 97%",
    accentGlow: "216 95% 69%",
    accentBorder: "217 87% 75%",
    accentStrong: "220 90% 53%",
    panelTint: "214 78% 72%",
    meshTint: "210 75% 93%",
    idleVariant: "spotlight",
    shimmerAngle: "132deg",
    floatDistance: "4px",
    hoverLift: "-6px",
    hoverScale: "1.01",
    sweepDuration: "720ms",
    delay: "0s",
  },
  {
    to: "/pmf-lab",
    title: "Validate Demand",
    outcome: "Understand the Market",
    description: "Turn customer evidence into a clear Build, Narrow, Pivot, or Stop decision.",
    icon: FlaskConical,
    accentName: "teal",
    accent: "183 75% 42%",
    accentSoft: "182 61% 95%",
    accentGlow: "184 82% 52%",
    accentBorder: "183 68% 67%",
    accentStrong: "186 84% 34%",
    panelTint: "182 59% 69%",
    meshTint: "180 46% 92%",
    idleVariant: "diagonal",
    shimmerAngle: "144deg",
    floatDistance: "3px",
    hoverLift: "-6px",
    hoverScale: "1.012",
    sweepDuration: "640ms",
    delay: "0.18s",
  },
  {
    to: "/mentorship",
    title: "Find a Mentor",
    outcome: "Expert guidance",
    description: "Get focused feedback from experienced founders and leave with clear next steps.",
    icon: GraduationCap,
    accentName: "coral",
    accent: "13 84% 63%",
    accentSoft: "18 100% 96%",
    accentGlow: "12 90% 69%",
    accentBorder: "14 86% 78%",
    accentStrong: "10 84% 57%",
    panelTint: "15 66% 74%",
    meshTint: "20 74% 93%",
    idleVariant: "halo",
    shimmerAngle: "124deg",
    floatDistance: "3px",
    hoverLift: "-5px",
    hoverScale: "1.008",
    sweepDuration: "760ms",
    delay: "0.3s",
  },
  {
    to: "/demo",
    title: "Dashboard: Your Project Co-Pilot",
    outcome: "Daily Focus",
    description: "Prioritize tasks, track weekly progress, and stay accountable in one workspace.",
    icon: LayoutDashboard,
    accentName: "amber",
    accent: "42 92% 57%",
    accentSoft: "46 100% 95%",
    accentGlow: "41 96% 66%",
    accentBorder: "43 92% 75%",
    accentStrong: "38 90% 52%",
    panelTint: "43 76% 73%",
    meshTint: "46 78% 92%",
    idleVariant: "float",
    shimmerAngle: "136deg",
    floatDistance: "5px",
    hoverLift: "-8px",
    hoverScale: "1.014",
    sweepDuration: "620ms",
    delay: "0.12s",
  },
  {
    to: "/investors",
    title: "Find Investors",
    outcome: "Investor directory",
    description: "Find relevant investors by stage and sector, then start targeted conversations.",
    icon: Users,
    accentName: "emerald",
    accent: "154 59% 43%",
    accentSoft: "152 54% 95%",
    accentGlow: "154 64% 52%",
    accentBorder: "154 57% 66%",
    accentStrong: "154 67% 37%",
    panelTint: "153 46% 69%",
    meshTint: "152 44% 92%",
    idleVariant: "beam",
    shimmerAngle: "154deg",
    floatDistance: "3px",
    hoverLift: "-6px",
    hoverScale: "1.01",
    sweepDuration: "700ms",
    delay: "0.22s",
  },
  {
    to: "/build",
    title: "Build Your MVP",
    outcome: "Working product",
    description: "Build a working first version, share it with users, and improve it with their feedback.",
    icon: Boxes,
    accentName: "indigo-steel",
    accent: "226 31% 57%",
    accentSoft: "228 43% 96%",
    accentGlow: "225 45% 68%",
    accentBorder: "227 32% 74%",
    accentStrong: "228 36% 49%",
    panelTint: "226 29% 73%",
    meshTint: "228 26% 93%",
    idleVariant: "glint",
    shimmerAngle: "122deg",
    floatDistance: "2px",
    hoverLift: "-6px",
    hoverScale: "1.01",
    sweepDuration: "680ms",
    delay: "0.36s",
  },
  {
    to: "/co-founder",
    title: "Find a Co-Founder",
    outcome: "Shared execution",
    description: "Find a founder with complementary skills to share the work and the decisions.",
    icon: Handshake,
    accentName: "raspberry",
    accent: "338 72% 58%",
    accentSoft: "336 100% 96%",
    accentGlow: "337 84% 68%",
    accentBorder: "338 70% 77%",
    accentStrong: "339 74% 52%",
    panelTint: "337 60% 74%",
    meshTint: "335 72% 93%",
    idleVariant: "dual",
    shimmerAngle: "140deg",
    floatDistance: "4px",
    hoverLift: "-6px",
    hoverScale: "1.012",
    sweepDuration: "740ms",
    delay: "0.28s",
  },
];

// The journey is a picker: the problems on the left, the part of the platform
// for the chosen one on a stage on the right. Only the chosen row's GIF is in
// the page (the others are display: none), so a visit downloads one or two of
// these multi-megabyte GIFs instead of all seven. It does not autoplay for the
// same reason.
const EntrepreneurProblems = () => {
  const isMobile = useIsMobile();
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    const next = (index + journeySteps.length) % journeySteps.length;
    setActiveIndex(next);
    tabRefs.current[next]?.focus();
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      select(index + 1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      select(index - 1);
    }
  };

  const renderStage = (index: number) => {
    const action = journeyActions[index];
    const next = journeyActions[(index + 1) % journeyActions.length];
    const ActionIcon = action.icon;
    const stageStyle = { "--journey-accent": action.accent } as CSSProperties;

    return (
      <div
        key={action.to}
        id={`journey-panel-${index}`}
        role="tabpanel"
        aria-labelledby={`journey-tab-${index}`}
        className="hx-journey__stage"
        style={stageStyle}
        hidden={index !== activeIndex}
      >
        <GradientMesh colors={[action.accent, action.accentGlow, next.accent, action.accentStrong]} />
        <div className="hx-journey__window">
          <div className="hx-journey__chrome" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>creatives-takeover.com{action.to}</span>
          </div>
          <div className="hx-journey__screen">
            {/* Shown until (or instead of) the GIF for this row. */}
            <div className="hx-journey__skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            {index !== activeIndex ? null : (
              <FounderJourneyVideo position={index} className="founder-journey-gif hx-journey__gif" />
            )}
          </div>
        </div>
        <Link to={action.to} className="hx-journey__card group">
          <span className="hx-journey__outcome">
            <ActionIcon aria-hidden="true" />
            {action.outcome}
          </span>
          <h3 className="hx-journey__title">{action.title}</h3>
          <p className="hx-journey__copy">{action.description}</p>
          <span className="hx-journey__cta">
            Open tool
            <ArrowUpRight aria-hidden="true" />
          </span>
        </Link>
      </div>
    );
  };

  return (
    <section className="founder-journey-section section-shell hx-journey" aria-labelledby="journey-heading">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <ScrollReveal>
          <HomeSectionHeader badge="Own Your Path" title="Every Founder's Journey is Unique" id="journey-heading">
            Most founders hit the same problems. Pick yours.
          </HomeSectionHeader>
        </ScrollReveal>

        <ScrollReveal className="hx-journey__grid" variant="fade">
          <div className="hx-journey__list" role="tablist" aria-orientation="vertical" aria-label="Founder problems">
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              const selected = index === activeIndex;
              const tabStyle = { "--journey-accent": journeyActions[index].accent } as CSSProperties;
              return (
                <div key={step.phase} className="hx-journey__item">
                  <button
                    ref={(el) => {
                      tabRefs.current[index] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`journey-tab-${index}`}
                    aria-selected={selected}
                    aria-controls={`journey-panel-${index}`}
                    tabIndex={selected ? 0 : -1}
                    className="hx-journey__tab"
                    style={tabStyle}
                    onClick={() => setActiveIndex(index)}
                    onKeyDown={(event) => onTabKeyDown(event, index)}
                  >
                    <span className="hx-journey__icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="hx-journey__text">
                      <span className="hx-journey__phase">{step.phase}</span>
                      <span className="hx-journey__challenge">{step.challenge}</span>
                    </span>
                  </button>
                  {/* On a phone the stage opens under the row that was tapped. */}
                  {isMobile ? (
                    selected ? renderStage(index) : null
                  ) : null}
                </div>
              );
            })}
          </div>

          {!isMobile && <div className="hx-journey__stages">{journeyActions.map((_, index) => renderStage(index))}</div>}
        </ScrollReveal>
      </div>
    </section>
  );
};

export default EntrepreneurProblems;
