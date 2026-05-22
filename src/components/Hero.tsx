import { ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutDashboard, User } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useConversionTracking } from "@/hooks/useConversionTracking";
import { supabase } from "@/integrations/supabase/client";
import "./hero-cinematic-spotlight.css";

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
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
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
    You shouldn&apos;t need the right connections, the right city, or the right background to build a serious startup.
    <br />
    <br />
    Creatives Takeover gives every founder a structured 7-stage roadmap, access to experienced mentors and investors,
    and a personalized dashboard that guides you at every step.
    <br />
    <br />
    <strong>No application. No cohort. No equity.</strong>
  </>
);

const SIGNED_IN_LEDE =
  "Set up your profile, then head to your dashboard to see what matters now, plan your next steps, and keep moving forward one task at a time.";

const Hero = ({
  eyebrow = "Referral program available in your dashboard — invite friends and earn a free plan upgrade.",
  eyebrowPill = "New",
  titleLine1 = "The founders'",
  titleLine2 = "compass",
  lede = DEFAULT_LEDE,
  ctaLabel = "Start Free — Build Your ICP",
  ctaHref = "/icp-builder",
  onCtaClick,
  dashboardUrl = "creatives-takeover.com/dashboard",
  dashboardBread = "Validation · Stage 3 of 7",
  navItems = DEFAULT_NAV,
  stats = DEFAULT_STATS,
}: HeroProps) => {
  const { isAuthenticated, user } = useAuth();
  const { trackTriggerView, trackEngagement } = useConversionTracking();
  const heroRef = useRef<HTMLElement>(null);
  const hasTrackedView = useRef(false);
  const [userUsername, setUserUsername] = useState<string | null>(null);

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
            trackTriggerView("hero-primary-cta", {
              ctaType: "primary",
              authenticated: isAuthenticated,
            });
          }
        });
      },
      { threshold: 0.5 },
    );

    if (heroElement) {
      observer.observe(heroElement);
    }

    return () => {
      if (heroElement) {
        observer.unobserve(heroElement);
      }
    };
  }, [trackTriggerView, isAuthenticated]);

  const handleCtaClick = () => {
    trackEngagement("hero-primary-cta", 85);
    onCtaClick?.();
  };

  const handleProfileCtaClick = () => {
    trackEngagement("hero-profile-cta", 80);
  };

  const handleDashboardCtaClick = () => {
    trackEngagement("hero-dashboard-cta", 90);
  };

  const handleEyebrowClick = () => {
    trackEngagement("hero-referral-banner", 55);
  };

  return (
    <section
      ref={heroRef}
      id="overview"
      className={`ct-hero${isAuthenticated ? " ct-hero--signed-in" : ""}`}
      aria-label="Creatives Takeover hero"
    >
      <div className="ct-hero__container">
        {!isAuthenticated ? (
          <a
            className="ct-hero__eyebrow"
            href="https://creatives-takeover.com/signup"
            onClick={handleEyebrowClick}
          >
            <span className="ct-hero__eyebrow-pill">{eyebrowPill}</span>
            {eyebrow}
          </a>
        ) : null}

        <h1 className="ct-hero__title">
          <span className="ct-hero__title-row-1">{titleLine1}</span>
          <span className="ct-hero__title-row-2">
            {titleLine2}
            <span className="ct-hero__compass-glyph" aria-hidden="true" />
          </span>
        </h1>

        <p className="ct-hero__lede">{isAuthenticated ? SIGNED_IN_LEDE : lede}</p>

        <div className="ct-hero__cta-row">
          {isAuthenticated ? (
            <>
              <Link
                className="ct-hero__cta ct-hero__cta--secondary"
                to={userUsername ? `/profile/${userUsername}` : "/dashboard"}
                onClick={handleProfileCtaClick}
              >
                <User aria-hidden="true" />
                My Profile
              </Link>
              <Link className="ct-hero__cta" to="/dashboard" onClick={handleDashboardCtaClick}>
                <LayoutDashboard aria-hidden="true" />
                Dashboard
                <ArrowRight aria-hidden="true" />
              </Link>
            </>
          ) : (
            <Link className="ct-hero__cta" to={ctaHref} onClick={handleCtaClick}>
              {ctaLabel}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          )}
        </div>

        {!isAuthenticated ? <div className="ct-hero__spotlight" role="img" aria-label="Preview of the Creatives Takeover dashboard">
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
