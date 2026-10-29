import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Briefcase, GraduationCap, Lightbulb, Rocket, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import { WHO_IS_THIS_FOR_ACCOUNT_TYPES } from "@/components/whoIsThisForProfiles";
import { RevealGroup, ScrollReveal } from "@/components/animations/ScrollReveal";
import HomeSectionHeader from "./HomeSectionHeader";

type AccountId = (typeof WHO_IS_THIS_FOR_ACCOUNT_TYPES)[number]["id"];

// The public page that explains each account type best. The rows themselves
// come from "Who is this for?", so the homepage and the dialog say the same.
const ACCOUNT_LINKS: Record<AccountId, { href: string; label: string; icon: LucideIcon; hue: string }> = {
  founder: { href: "/for-founders", label: "For founders", icon: Rocket, hue: "228 90% 64%" },
  builder: { href: "/start", label: "Take the quick quiz", icon: Lightbulb, hue: "152 68% 48%" },
  mentor: { href: "/mentorship", label: "Meet the mentors", icon: GraduationCap, hue: "40 95% 56%" },
  marketplace: { href: "/marketplace", label: "Browse services", icon: Briefcase, hue: "192 90% 52%" },
  investor: { href: "/for-investors", label: "For investors", icon: TrendingUp, hue: "330 85% 62%" },
};

// Node positions on the diagram, as percentages of its square: a ring around
// "your project" in the middle, starting at the top.
const RING = WHO_IS_THIS_FOR_ACCOUNT_TYPES.map((_, index, all) => {
  const angle = ((-90 + (360 / all.length) * index) * Math.PI) / 180;
  return { x: 50 + Math.cos(angle) * 37, y: 50 + Math.sin(angle) * 37 };
});

const EcosystemSection = () => {
  // The row being hovered lights up its line and node on the diagram.
  const [focus, setFocus] = useState<AccountId | null>(null);

  return (
    <section className="hs-section section-shell hx-env" aria-labelledby="ecosystem-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <HomeSectionHeader badge="Who's Here" title="A Unique Environment" id="ecosystem-heading">
          Solo or just curious, you meet mentors, cofounders, experts and investors here.
        </HomeSectionHeader>

        <div className="hx-env__grid">
          <ScrollReveal variant="scale">
            <div className="hx-env__diagram" aria-hidden="true">
              <svg viewBox="0 0 100 100" className="hx-env__lines" focusable="false">
                <defs>
                  {WHO_IS_THIS_FOR_ACCOUNT_TYPES.map((account, index) => (
                    <linearGradient
                      key={account.id}
                      id={`env-line-${account.id}`}
                      gradientUnits="userSpaceOnUse"
                      x1="50"
                      y1="50"
                      x2={RING[index].x}
                      y2={RING[index].y}
                    >
                      <stop offset="0" stopColor="hsl(228 90% 66%)" stopOpacity="0.9" />
                      <stop offset="1" stopColor={`hsl(${ACCOUNT_LINKS[account.id].hue})`} stopOpacity="0.9" />
                    </linearGradient>
                  ))}
                </defs>
                <circle cx="50" cy="50" r="37" className="hx-env__orbit" />
                <circle cx="50" cy="50" r="24" className="hx-env__orbit hx-env__orbit--inner" />
                {WHO_IS_THIS_FOR_ACCOUNT_TYPES.map((account, index) => (
                  <line
                    key={account.id}
                    x1="50"
                    y1="50"
                    x2={RING[index].x}
                    y2={RING[index].y}
                    stroke={`url(#env-line-${account.id})`}
                    className={`hx-env__line${focus === account.id ? " is-focus" : ""}`}
                  />
                ))}
              </svg>

              <span className="hx-env__core">
                <span className="hx-env__pulse" />
                <Sparkles />
                <span>Your project</span>
              </span>

              {WHO_IS_THIS_FOR_ACCOUNT_TYPES.map((account, index) => {
                const Icon = ACCOUNT_LINKS[account.id].icon;
                const nodeStyle = {
                  left: `${RING[index].x}%`,
                  top: `${RING[index].y}%`,
                  "--node-hue": ACCOUNT_LINKS[account.id].hue,
                  "--node-delay": `${index * -1.3}s`,
                } as CSSProperties;
                return (
                  <span key={account.id} className={`hx-env__node${focus === account.id ? " is-focus" : ""}`} style={nodeStyle}>
                    <span className="hx-env__node-dot">
                      <Icon />
                    </span>
                    <span className="hx-env__node-label">{account.label}</span>
                  </span>
                );
              })}
            </div>
          </ScrollReveal>

          <RevealGroup className="hx-env__list" stagger={0.07}>
            {WHO_IS_THIS_FOR_ACCOUNT_TYPES.map((account) => {
              const link = ACCOUNT_LINKS[account.id];
              const Icon = link.icon;
              const rowStyle = { "--node-hue": link.hue } as CSSProperties;
              return (
                <Link
                  key={account.id}
                  to={link.href}
                  className="hx-env__row"
                  style={rowStyle}
                  onMouseEnter={() => setFocus(account.id)}
                  onMouseLeave={() => setFocus(null)}
                  onFocus={() => setFocus(account.id)}
                  onBlur={() => setFocus(null)}
                >
                  <span className="hx-env__row-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="hx-env__row-body">
                    <span className="hx-env__row-top">
                      <span className="hx-env__row-label">{account.label}</span>
                      <span className="hs-chip">{account.access === "invitation" ? "By invitation" : "Open to everyone"}</span>
                    </span>
                    <span className="hx-env__row-promise">“{account.promise}”</span>
                    <span className="hx-env__row-next">{account.next}</span>
                  </span>
                  <span className="hx-env__row-cta">
                    <span className="sr-only">{link.label}</span>
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </RevealGroup>
        </div>

        <div className="hs-actions hx-actions--start">
          <Link to="/start" className="hs-button hs-button--primary">
            Find your path
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default EcosystemSection;
