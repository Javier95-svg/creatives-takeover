import { Link } from "react-router-dom";
import { ArrowRight, Check, GraduationCap, Landmark, type LucideIcon, Rocket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { captureEvent } from "@/lib/analytics";
import "@/components/audience/audience.css";

type AudienceTile = {
  icon: LucideIcon;
  who: string;
  title: string;
  points: string[];
  href: string;
  linkLabel: string;
};

// The three sides of the ecosystem, each pointing at its own page (B2B2C
// repositioning, 2026-10-15). Founders use the platform; programs and
// investors bring it to founders.
const TILES: AudienceTile[] = [
  {
    icon: Rocket,
    who: "Founders and builders",
    title: "Start and test your project",
    points: ["A guided tool for every stage", "Mentors, providers and other founders", "Free to start, no equity"],
    href: "/for-founders",
    linkLabel: "For founders",
  },
  {
    icon: GraduationCap,
    who: "Incubators, accelerators and universities",
    title: "See every team’s progress",
    points: ["A live view of your whole cohort", "Alerts when a team stalls", "An anonymized impact report"],
    href: "/for-programs",
    linkLabel: "For programs",
  },
  {
    icon: Landmark,
    who: "VCs and family offices",
    title: "Meet teams that are executing",
    points: ["Sponsor a cohort in your thesis area", "Matches with founders who opted in", "Progress you can read before the first call"],
    href: "/for-investors",
    linkLabel: "For investors",
  },
];

const FLOW = [
  "Founders build and prove",
  "Programs see progress and report impact",
  "Investors meet the teams that opted in",
];

const AudienceSection = () => (
  <section id="who-its-for" className="section-shell scroll-mt-24">
    <div className="container mx-auto px-4 sm:px-6">
      <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-14">
        <Badge variant="outline" className="homepage-section-badge mb-5">
          Who it’s for
        </Badge>
        <h2 className="homepage-section-title mb-4 text-3xl sm:text-4xl lg:text-[2.9rem]">
          One workspace for everyone a startup depends on
        </h2>
        <p className="homepage-section-copy text-base sm:text-lg">
          Founders, the programs that support them and the investors who back them usually work from different
          information. Here they work from the same progress.
        </p>
      </div>

      <div className="audience-grid">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.href}
              to={tile.href}
              className="audience-card surface-panel trust-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => captureEvent("home_audience_tile_clicked", { destination: tile.href })}
            >
              <span className="audience-card__icon" aria-hidden="true">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{tile.who}</span>
              <h3 className="audience-card__title">{tile.title}</h3>
              <ul className="audience-card__list">
                {tile.points.map((point) => (
                  <li key={point}>
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
              <span className="audience-card__link">
                {tile.linkLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>

      <ol className="audience-flow" aria-label="How the three sides connect">
        {FLOW.map((step, index) => (
          <li key={step} className="contents">
            <span className="audience-flow__step">{step}</span>
            {index < FLOW.length - 1 ? <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default AudienceSection;
