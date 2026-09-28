import { useEffect, useRef, useState, type LucideIcon } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
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
  Pause,
  Play,
  Presentation,
  Repeat2,
  Route,
  Target,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { captureEvent } from "@/lib/analytics";
import {
  getNextFounderProfileIndex,
  WHO_IS_THIS_FOR_ACCOUNT_TYPES,
  WHO_IS_THIS_FOR_AUTOPLAY_MS,
  WHO_IS_THIS_FOR_PROFILES,
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

const PRE_BUILD_PATH = [
  { label: "Idea", icon: Lightbulb },
  { label: "Conversation", icon: MessageSquareText },
  { label: "Evidence", icon: BadgeCheck },
  { label: "Build decision", icon: GitBranch },
];

const POST_LAUNCH_PATH = [
  { label: "Reach", icon: Megaphone },
  { label: "Activate", icon: Users },
  { label: "Retain", icon: Repeat2 },
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
  const prefersReducedMotion = usePrefersReducedMotion();
  const { set: setAttribution } = useCTAAttribution();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const updateVisibility = () => setIsDocumentVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setActiveIndex(0);
      setIsPlaying(false);
    }
    wasOpen.current = open;
  }, [open, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsPlaying(false);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!open || !isPlaying || !isDocumentVisible) return;

    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => getNextFounderProfileIndex(currentIndex));
    }, WHO_IS_THIS_FOR_AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [isDocumentVisible, isPlaying, open]);

  const showProfile = (index: number) => {
    setActiveIndex(index);
    setIsPlaying(false);
  };

  const showPreviousProfile = () => {
    const previousIndex =
      (activeIndex - 1 + WHO_IS_THIS_FOR_PROFILES.length) % WHO_IS_THIS_FOR_PROFILES.length;
    showProfile(previousIndex);
  };

  const showNextProfile = () => {
    showProfile(getNextFounderProfileIndex(activeIndex));
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

  const handleJoinClick = () => {
    captureEvent("cta_clicked", { cta_name: "who_is_this_for_join", page: "/" });
    setAttribution("who_is_this_for_join", "/");
  };

  const profile = WHO_IS_THIS_FOR_PROFILES[activeIndex];
  const isPreBuild = profile.id === "pre_build";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-5xl gap-0 overflow-y-auto rounded-3xl border-border/70 bg-background p-0 shadow-[0_36px_120px_-48px_rgba(15,23,42,0.8)] [&>button]:z-40 sm:w-[calc(100%-2rem)]"
      >
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background/95 px-5 py-4 pr-14 backdrop-blur-xl sm:px-7 sm:py-5 sm:pr-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="font-space-grotesk text-xl sm:text-2xl">
                Who is Creatives Takeover for?
              </DialogTitle>
            </DialogHeader>
            <div className="flex shrink-0 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-[92px] rounded-full"
                onClick={() => setIsPlaying((current) => !current)}
                aria-label={isPlaying ? "Stop automatic profile rotation" : "Resume automatic profile rotation"}
              >
                {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                {isPlaying ? "Stop" : "Resume"}
              </Button>
            </div>
          </div>
        </div>

        <section aria-labelledby="who-is-this-for-roles" className="border-b border-border/60 px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 id="who-is-this-for-roles" className="font-space-grotesk text-lg font-semibold text-foreground">Have an idea or a project? Start here.</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Get a clear next step, test demand, and keep your progress in one workspace.</p>
            </div>
            <Link to="/signup" onClick={handleJoinClick} className="inline-flex items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Join as a Founder or Builder <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {WHO_IS_THIS_FOR_ACCOUNT_TYPES.filter((account) => account.featured).map((account) => (
              <div key={account.id} className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                <h4 className="font-space-grotesk text-base font-semibold text-foreground">{account.label}: {account.promise}</h4>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{account.next}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">Investors can also create accounts. Mentor and Marketplace provider accounts are invitation only.</p>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Founder &amp; Builder stages</p>
          <div className="flex gap-2" role="group" aria-label="Choose a founder or builder stage">
            {WHO_IS_THIS_FOR_PROFILES.map((candidate, index) => (
              <Button key={candidate.id} type="button" size="sm" variant={activeIndex === index ? "default" : "outline"} onClick={() => showProfile(index)} aria-pressed={activeIndex === index}>
                {candidate.id === "pre_build" ? "Pre-build" : "Post-launch"}
              </Button>
            ))}
          </div>
        </div>

        <div aria-live={isPlaying ? "off" : "polite"} aria-atomic="true">
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
                  This fits if…
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
                        onFocus={() => setIsPlaying(false)}
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
        </div>

        <section aria-labelledby="other-ways-to-join" className="border-t border-border/60 px-5 py-4 sm:px-8">
          <h3 id="other-ways-to-join" className="text-sm font-semibold text-foreground">Other ways to participate</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {WHO_IS_THIS_FOR_ACCOUNT_TYPES.filter((account) => !account.featured).map((account) => (
              <p key={account.id} className="text-xs leading-5 text-muted-foreground">
                <span className="font-semibold text-foreground">{account.label}:</span> {account.promise} {account.next}
              </p>
            ))}
          </div>
        </section>

        <div className="sticky bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border/60 bg-background/95 px-5 py-4 backdrop-blur-xl sm:px-8">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={showPreviousProfile}
            aria-label="Show previous founder profile"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3" role="group" aria-label="Choose a founder profile">
            {WHO_IS_THIS_FOR_PROFILES.map((candidate, index) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => showProfile(index)}
                className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  activeIndex === index ? "w-8 bg-primary" : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Show ${candidate.label.toLowerCase()} founder profile`}
                aria-pressed={activeIndex === index}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={showNextProfile}
            aria-label="Show next founder profile"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhoIsThisForDialog;
