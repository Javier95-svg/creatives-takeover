import { useEffect, useRef, useState, type LucideIcon } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  FlaskConical,
  Gauge,
  GitBranch,
  Lightbulb,
  Megaphone,
  MessageSquareText,
  Presentation,
  Repeat2,
  Route,
  Target,
  Users,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";
import { captureEvent } from "@/lib/analytics";
import { rememberIntendedAccountType } from "@/lib/intendedAccountType";
import { WhoIsThisForAccountTypes } from "@/components/WhoIsThisForAccountTypes";
import {
  WHO_IS_THIS_FOR_PROFILES,
  type AudienceAccountType,
  type FounderProfileId,
  type FounderProfileToolKey,
} from "@/components/whoIsThisForProfiles";

type WhoIsThisForDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const TOOL_ICONS: Record<FounderProfileToolKey, LucideIcon> = {
  icp_builder: Target,
  demo_studio: Presentation,
  pmf_lab: FlaskConical,
  gtm_strategist: Route,
  traction_engine: Gauge,
};

const AUDIENCE_TABS = ["Account types", "Pre-build", "Post-launch"] as const;

const PRE_BUILD_PATH = [
  { label: "Idea", icon: Lightbulb },
  { label: "Ask people", icon: MessageSquareText },
  { label: "Learn", icon: BadgeCheck },
  { label: "Decide", icon: GitBranch },
];

const POST_LAUNCH_PATH = [
  { label: "Reach", icon: Megaphone },
  { label: "Try", icon: Users },
  { label: "Return", icon: Repeat2 },
  { label: "Learn", icon: BarChart3 },
];

const ProfileBannerIllustration = ({ profileId }: { profileId: FounderProfileId }) => {
  const steps = profileId === "pre_build" ? PRE_BUILD_PATH : POST_LAUNCH_PATH;

  return (
    <div
      className="relative mx-auto w-full max-w-xl rounded-2xl border border-white/15 bg-black/15 p-3 shadow-[0_22px_60px_-36px_rgba(0,0,0,0.85)] backdrop-blur-sm sm:p-4"
      aria-hidden="true"
    >
      <div className="absolute left-[12%] right-[12%] top-[34px] h-px bg-gradient-to-r from-transparent via-white/45 to-transparent sm:top-[38px]" />
      {/* sm:grid-cols-4 is not redundant. responsive-overrides.css:84 collapses
          any grid-cols-4 carrying no responsive column class to a single column
          below 768px with !important, which stood this funnel on end and left
          the arrows floating beside it. Declaring a breakpoint variant is that
          rule's own opt-out, and keeps the flow horizontal at every width. */}
      <div className="relative grid grid-cols-4 gap-2 sm:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="relative flex min-w-0 flex-col items-center text-center">
              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-slate-950/75 text-white shadow-lg sm:h-12 sm:w-12">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="mt-2 text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] text-white/80 sm:text-[10px]">
                {step.label}
              </span>
              {index < steps.length - 1 ? (
                <ArrowRight className="absolute -right-3 top-3.5 z-10 h-3.5 w-3.5 text-white/65 sm:top-4 sm:h-4 sm:w-4" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const WhoIsThisForDialog = ({ open, onOpenChange }: WhoIsThisForDialogProps) => {
  const { set: setAttribution } = useCTAAttribution();
  const [activeIndex, setActiveIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setActiveIndex(0);
  }, [open]);

  const showTab = (index: number) => {
    setActiveIndex(index);
    contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  };

  const handleToolClick = (profileId: FounderProfileId, tool: FounderProfileToolKey) => {
    captureEvent("cta_clicked", {
      cta_name: "who_is_this_for_tool",
      profile: profileId,
      tool,
      page: "/",
    });
    setAttribution(`who_is_this_for_${profileId}_${tool}`, "/");
  };

  const handleJoinClick = (accountType: AudienceAccountType["id"]) => {
    captureEvent("cta_clicked", { cta_name: "who_is_this_for_join", account_type: accountType, page: "/" });
    setAttribution(`who_is_this_for_${accountType}_join`, "/");
    // The onboarding quiz pre-selects this so the person is not asked twice.
    rememberIntendedAccountType(accountType);
  };

  const profile = activeIndex > 0 ? WHO_IS_THIS_FOR_PROFILES[activeIndex - 1] : null;
  const isPreBuild = profile?.id === "pre_build";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        aria-describedby={undefined}
        className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-5xl gap-0 overflow-y-auto rounded-3xl border-border/70 bg-background p-0 shadow-[0_36px_120px_-48px_rgba(15,23,42,0.8)] [&>button]:z-40 sm:w-[calc(100%-2rem)]"
      >
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background/95 px-5 py-4 pr-14 backdrop-blur-xl sm:px-7 sm:py-5 sm:pr-16">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-space-grotesk text-xl sm:text-2xl">Who is Creatives Takeover for?</DialogTitle>
          </DialogHeader>
          <div role="tablist" aria-label="Who is this for pages" className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1">
            {AUDIENCE_TABS.map((label, index) => (
              <button
                key={label}
                id={`audience-tab-${index}`}
                type="button"
                role="tab"
                aria-selected={activeIndex === index}
                aria-controls={`audience-panel-${index}`}
                onClick={() => showTab(index)}
                className={`rounded-lg px-2 py-2 text-center text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm ${activeIndex === index ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeIndex === 0 ? (
          <div id="audience-panel-0" role="tabpanel" aria-labelledby="audience-tab-0">
            <WhoIsThisForAccountTypes onJoin={handleJoinClick} onShowPreBuild={() => showTab(1)} />
          </div>
        ) : null}

        {profile ? <div id={`audience-panel-${activeIndex}`} role="tabpanel" aria-labelledby={`audience-tab-${activeIndex}`}>
          <article
            key={profile.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${profile.label}: ${profile.headline}`}
          >
            <div
              className={`relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10 ${
                isPreBuild
                  ? "bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700"
                  : "bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800"
              }`}
            >
              <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-black/20 blur-3xl" />
              <div className="relative grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
                <div className="text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                    {profile.label}
                  </p>
                  <h3 className="mt-3 max-w-2xl font-space-grotesk text-3xl font-semibold leading-tight sm:text-4xl">
                    {profile.headline}
                  </h3>
                  <p className="mt-4 inline-flex max-w-xl rounded-full border border-white/20 bg-black/15 px-4 py-2 text-xs font-medium leading-5 text-white/90 backdrop-blur-sm sm:text-sm">
                    {profile.status}
                  </p>
                </div>
                <ProfileBannerIllustration profileId={profile.id} />
              </div>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-8 sm:py-6">
              <section aria-labelledby={`${profile.id}-mindset-heading`}>
                <h4
                  id={`${profile.id}-mindset-heading`}
                  className="font-space-grotesk text-lg font-semibold text-foreground"
                >
                  Your next move
                </h4>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                  {profile.description}
                </p>
              </section>

              <section aria-labelledby={`${profile.id}-signals-heading`}>
                <h4
                  id={`${profile.id}-signals-heading`}
                  className="font-space-grotesk text-lg font-semibold text-foreground"
                >
                  This fits if...
                </h4>
                <ul className="mt-3 grid gap-2 md:grid-cols-3">
                  {profile.indicators.map((indicator) => (
                    <li
                      key={indicator}
                      className="flex gap-2 rounded-xl border border-border/60 bg-muted/25 p-3 text-sm leading-5 text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>{indicator}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby={`${profile.id}-tools-heading`}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Explore the path
                  </p>
                  <h4
                    id={`${profile.id}-tools-heading`}
                    className="mt-1 font-space-grotesk text-xl font-semibold text-foreground"
                  >
                    Tools for this stage
                  </h4>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {profile.tools.map((tool, toolIndex) => {
                    const ToolIcon = TOOL_ICONS[tool.key];
                    return (
                      <Link
                        key={tool.key}
                        to={tool.href}
                        onClick={() => handleToolClick(profile.id, tool.key)}
                        className="group flex flex-col rounded-xl border border-border/70 bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label={`Open ${tool.name}: ${tool.description}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <ToolIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {toolIndex + 1}
                          </span>
                        </div>
                        <h5 className="mt-4 font-space-grotesk text-base font-semibold text-foreground">
                          {tool.name}
                        </h5>
                        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                          {tool.description}
                        </p>
                        <span className="mt-4 inline-flex items-center text-sm font-semibold text-primary">
                          Open tool
                          <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </div>
          </article>
        </div> : null}

      </DialogContent>
    </Dialog>
  );
};

export default WhoIsThisForDialog;
