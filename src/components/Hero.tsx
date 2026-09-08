import { ReactNode, Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, LayoutDashboard, User } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useConversionTracking } from "@/hooks/useConversionTracking";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";
import { supabase } from "@/integrations/supabase/client";
import heroCompass from "@/assets/hero-compass.svg";
import HeroIdeaInput from "@/components/hero/HeroIdeaInput";
import "./hero-cinematic-spotlight.css";
import { trackActivationEntry, trackActivationFunnelEvent } from "@/lib/activationEntry";
import { classifyHeroInput, trackHeroInputFocused, trackHeroInputSubmitted } from "@/lib/heroFunnel";
import { buildHeroProductPath, DEFAULT_HERO_MODE, type HeroMode } from "@/lib/heroFunnelRules";
import { buildIcpSeedReturnPath, persistIcpSeed } from "@/lib/icpSeed";

/*
 * The hero no longer generates anything in place.
 *
 * It used to render the customer brief on the homepage, behind a lazy island.
 * That design never produced a single submission: `hero_input_submitted` was 0
 * for its entire life, because visitors clicked the CTA before typing and the
 * empty-field path only pulsed. Both modes now hand straight off to the tool
 * that owns the work, carrying the description, so the hero has exactly one
 * job - take the idea and get out of the way.
 */

// Also lazy: it renders nothing until opened, but statically it dragged the
// Radix dialog and ~20 lucide icons into the homepage's critical path. Homepage
// FCP p75 is 4.05s against an LCP p75 of 4.72s, so almost all of the delay is
// before the hero paints at all - it is a bundle problem, not an image problem.
const WhoIsThisForDialog = lazy(() => import("@/components/WhoIsThisForDialog"));

type HeroNavItem = {
  label: string;
  active?: boolean;
};

type HeroStat = {
  value: string;
  unit?: string;
  label: string;
};

type HeroProps = {
  eyebrow?: string;
  eyebrowPill?: string;
  titleLine1?: string;
  titleLine2?: string;
  lede?: ReactNode;
  dashboardUrl?: string;
  dashboardBread?: string;
  navItems?: HeroNavItem[];
  stats?: HeroStat[];
};

type DashStatProps = {
  value: string;
  unit?: string;
  label: string;
  trend: "up" | "down";
  trendLabel: string;
};

const DEFAULT_NAV: HeroNavItem[] = [
  { label: "Home", active: true },
  { label: "My Files" },
  { label: "Your Tasks" },
  { label: "Routine" },
  { label: "Referral Program" },
  { label: "Focus Funnel" },
];

const DEFAULT_STATS: HeroStat[] = [
  { value: "5", unit: "×", label: "Faster idea → MVP than pre-AI builders" },
  { value: "$680B", unit: "+", label: "Into AI-native startups since 2024" },
  { value: "1 in 4", label: "New 2026 launches are solo founders" },
  { value: "~18", unit: "mo", label: "Before incumbents close the AI-native gap" },
];

const DEFAULT_LEDE = (
  <>
    <span className="ct-hero__lede-block">
      A guided platform for validating, building, and growing your startup.
    </span>
    <span className="ct-hero__lede-block">
      Know what to build, who it's for, and whether they'll pay before you spend months building.
    </span>
    <strong className="ct-hero__lede-final">No application. No cohort. No equity.</strong>
  </>
);

const SIGNED_IN_LEDE =
  "Set up your profile, then head to your dashboard to see what matters now, plan your next steps, and keep moving forward one task at a time.";

const Hero = ({
  eyebrow = "Referral program available in your dashboard — invite friends and earn a free plan upgrade.",
  eyebrowPill = "New",
  titleLine1 = "The Founders'",
  titleLine2 = "Compass",
  lede = DEFAULT_LEDE,
  dashboardUrl = "creatives-takeover.com/dashboard",
  dashboardBread = "Building · Stage 4 of 7",
  navItems = DEFAULT_NAV,
  stats = DEFAULT_STATS,
}: HeroProps) => {
  const { isAuthenticated, user } = useAuth();
  const { trackTriggerView, trackEngagement } = useConversionTracking();
  const location = useLocation();
  const navigate = useNavigate();
  const { set: setAttribution } = useCTAAttribution();
  const heroRef = useRef<HTMLElement>(null);
  const hasTrackedView = useRef(false);
  const [userUsername, setUserUsername] = useState<string | null>(null);
  const [isAudienceDialogOpen, setIsAudienceDialogOpen] = useState(false);
  const [hasOpenedAudienceDialog, setHasOpenedAudienceDialog] = useState(false);
  const [ideaText, setIdeaText] = useState("");
  const [heroMode, setHeroMode] = useState<HeroMode>(DEFAULT_HERO_MODE);

  useEffect(() => {
    if (!user) {
      setUserUsername(null);
      return;
    }

    const fetchUsername = async () => {
      const { data, error } = await supabase.from("profiles").select("username").eq("id", user.id).single();
      if (!error && data?.username) {
        setUserUsername(data.username);
      }
    };

    void fetchUsername();
  }, [user]);

  useEffect(() => {
    if (hasTrackedView.current) return;

    const heroElement = heroRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            hasTrackedView.current = true;
            trackActivationEntry("activation_entry_opened", {
              entry_id: "hero_icp_builder",
              tool: "icp_builder",
              source: "homepage_hero",
              step: "impression",
              entry_page: location.pathname,
              placement: "hero_primary",
              is_authenticated: isAuthenticated,
            });
            if (!isAuthenticated) {
              void trackTriggerView("hero-who-is-this-for", {
                ctaType: "audience_education",
                authenticated: false,
              });
            }
          }
        });
      },
      // 0.15, not 0.5. This observes the whole hero section, which contains the
      // ~920px dashboard mock and the stats strip - on a phone the section is
      // far taller than the viewport, so a 0.5 threshold was effectively
      // unreachable and impressions barely fired. That is why
      // hero-who-is-this-for looked like 14 clicks per user: the denominator
      // was missing, not the button broken.
      { threshold: 0.15 },
    );

    if (heroElement) {
      observer.observe(heroElement);
    }

    return () => {
      if (heroElement) {
        observer.unobserve(heroElement);
      }
    };
  }, [trackTriggerView, isAuthenticated, location.pathname]);

  const handleProfileCtaClick = () => {
    void trackEngagement("hero-profile-cta", 80);
  };

  const handleDashboardCtaClick = () => {
    void trackEngagement("hero-dashboard-cta", 90);
  };

  const handleEyebrowClick = () => {
    void trackEngagement("hero-referral-banner", 55);
  };

  const handleWhoIsThisForClick = () => {
    void trackEngagement("hero-who-is-this-for", 60);
    setHasOpenedAudienceDialog(true);
    setIsAudienceDialogOpen(true);
  };

  const handleIdeaSubmit = () => {
    const trimmed = ideaText.trim();
    if (trimmed.length < 3) return;

    const { route, hasUrl } = classifyHeroInput(trimmed, heroMode);
    const isDemo = route === "demo";
    trackHeroInputSubmitted({
      char_count: trimmed.length,
      has_url: hasUrl,
      routed_to: route,
      source: "homepage_hero",
      mode: heroMode,
    });
    setAttribution(isDemo ? "hero_demo_try" : "hero_icp_builder", location.pathname);
    trackActivationFunnelEvent("activation_step_completed", {
      entry_id: isDemo ? "hero_demo_try" : "hero_icp_builder",
      tool: isDemo ? "demo_studio" : "icp_builder",
      source: "homepage_hero",
      step: "entry_click",
      entry_page: location.pathname,
      placement: "hero_input",
      is_authenticated: isAuthenticated,
    });

    // Both modes hand off immediately to the tool that owns the work, carrying
    // the description so neither restarts from an empty field. Product mode
    // always did this; idea mode used to generate on the homepage instead.
    if (isDemo) {
      navigate(buildHeroProductPath(trimmed));
      return;
    }

    persistIcpSeed(trimmed);
    navigate(buildIcpSeedReturnPath(trimmed));
  };

  return (
    <section
      ref={heroRef}
      id="overview"
      className={`ct-hero${isAuthenticated ? " ct-hero--signed-in" : ""}`}
      aria-label="Creatives Takeover hero"
    >
      <div className="ct-hero__container">
        {isAuthenticated ? (
          <Link
            className="ct-hero__eyebrow"
            to="/dashboard/referral"
            onClick={handleEyebrowClick}
          >
            <span className="ct-hero__eyebrow-pill">{eyebrowPill}</span>
            {eyebrow}
          </Link>
        ) : null}

        <h1 className="ct-hero__title">
          <span className="ct-hero__title-row-1">{titleLine1}</span>
          <span className="ct-hero__title-row-2">
            {titleLine2}
            <img className="ct-hero__compass-glyph" src={heroCompass} alt="" aria-hidden="true" />
          </span>
        </h1>

        <p className="ct-hero__lede">{isAuthenticated ? SIGNED_IN_LEDE : lede}</p>

        <div className="ct-hero__cta-row">
          {isAuthenticated ? (
            <>
              <Link className="ct-hero__cta" to="/dashboard" onClick={handleDashboardCtaClick}>
                <LayoutDashboard aria-hidden="true" />
                Dashboard
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                className="ct-hero__cta ct-hero__cta--secondary"
                to={userUsername ? `/profile/${userUsername}` : "/dashboard"}
                onClick={handleProfileCtaClick}
              >
                <User aria-hidden="true" />
                My Profile
              </Link>
            </>
          ) : (
            <>
              <HeroIdeaInput
                value={ideaText}
                onChange={setIdeaText}
                onSubmit={handleIdeaSubmit}
                onFirstFocus={trackHeroInputFocused}
                mode={heroMode}
                onModeChange={setHeroMode}
              />
              <div className="ct-hero__secondary-row">
                <button type="button" className="ct-hero__audience-link" onClick={handleWhoIsThisForClick}>
                  Who is this for?
                </button>
              </div>
            </>
          )}
        </div>

        {!isAuthenticated ? <div
          className="ct-hero__spotlight"
          aria-label="Preview of the Creatives Takeover dashboard"
        >
          <div className="ct-hero__st-chrome">
            <div className="ct-hero__st-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="ct-hero__st-url">{dashboardUrl}</div>
            <div style={{ width: 48 }} />
          </div>

          <div className="ct-hero__st-body">
            <div className="ct-hero__st-side">
              {navItems.map((item) => (
                <div key={item.label} className={`ct-hero__st-nav-item${item.active ? " is-on" : ""}`}>
                  <div className="ic" />
                  {item.label}
                </div>
              ))}
            </div>

            <div className="ct-hero__st-main">
              <div className="ct-hero__st-bread">{dashboardBread}</div>
              <div className="ct-hero__st-h">
                You&apos;re <span className="acc">building</span>. Here&apos;s what matters this week.
              </div>

              <div className="ct-hero__st-row">
                <DashStat value="68" unit="%" label="MVP scope" trend="up" trendLabel="▲ on track" />
                <DashStat value="14" label="user interviews" trend="up" trendLabel="▲ +6 wk" />
                <DashStat value="3" label="open coach reviews" trend="down" trendLabel="▼ overdue" />
              </div>

              <div className="ct-hero__st-chart">
                {[38, 52, 46, 65, 58, 78, 72, 88].map((height, index, bars) => (
                  <div
                    key={`${height}-${index}`}
                    className={`ct-hero__st-bar${index === bars.length - 1 ? " ct-hero__st-bar--peak" : ""}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div> : null}

        <div className="ct-hero__stats" aria-label="Founder stats for 2026">
          <div className="ct-hero__stats-track">
            {[...stats, ...stats].map((stat, index) => (
              <div
                key={`${stat.value}-${stat.label}-${index}`}
                className="ct-hero__strip-stat"
                aria-hidden={index >= stats.length || undefined}
              >
                <div className="v">
                  {stat.value}
                  {stat.unit ? <span className="small">{stat.unit}</span> : null}
                </div>
                <div className="l">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Mounted only once the visitor has actually asked for it, so the chunk
          is never fetched on a page view that ignores the link. */}
      {!isAuthenticated && hasOpenedAudienceDialog ? (
        <Suspense fallback={null}>
          <WhoIsThisForDialog open={isAudienceDialogOpen} onOpenChange={setIsAudienceDialogOpen} />
        </Suspense>
      ) : null}
    </section>
  );
};

const DashStat = ({ value, unit, label, trend, trendLabel }: DashStatProps) => (
  <div className="ct-hero__st-stat">
    <div className="v">
      {value}
      {unit ? <span className="unit">{unit}</span> : null}
    </div>
    <div className="l">{label}</div>
    <div className={`d ${trend}`}>{trendLabel}</div>
  </div>
);

export default Hero;
