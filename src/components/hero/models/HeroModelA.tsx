import { Link } from "react-router-dom";
import { ArrowRight, Check, MousePointerClick, Users } from "lucide-react";

import StartingExperiences from "@/components/hero/StartingExperiences";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";
import { trackHeroModelCta } from "./heroModel";

// Model A, outcome-driven. Leads with the result founders want (know before
// building) and keeps the idea box as the primary action, because getting a
// free draft first is the path that converts best (2 of 6 in Oct-Nov 2026).
// The three outcomes below use an example project so visitors see real output
// shapes, not feature names.

const OUTCOMES = [
  {
    step: "Know your customer",
    detail: "A customer profile with the pains that matter most.",
    kind: "icp" as const,
  },
  {
    step: "Test demand",
    detail: "A live page and real conversations before you build.",
    kind: "demand" as const,
  },
  {
    step: "Build what they ask for",
    detail: "A clickable first version of the one workflow they need.",
    kind: "build" as const,
  },
];

export default function HeroModelA() {
  const { set: setAttribution } = useCTAAttribution();

  return (
    <div className="hm hm-a">
      <p className="hm__eyebrow">Free to start · No equity</p>

      <h1 className="hm-a__title">
        <span className="hm-a__title-1">Find out if people want it</span>
        <span className="hm-a__title-2">before you build it.</span>
      </h1>

      <p className="hm__lede">
        Define who you're building for, put your idea in front of real people and build what they ask for,
        with mentors, service providers and other founders on the same platform.
      </p>

      <div className="hm-a__start">
        <StartingExperiences />
        <Link
          to="/signup?source=hero_model_a"
          className="hm__textlink"
          onClick={() => {
            trackHeroModelCta("a", "create_account");
            setAttribution("hero_model_a_create_account", "/");
          }}
        >
          Or create a free account <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      <section className="hm-a__path" aria-label="What you leave with">
        <p className="hm-a__example">Example project: an app that helps barbers stop losing no-shows</p>
        <ol className="hm-a__steps">
          {OUTCOMES.map((outcome, index) => (
            <li key={outcome.step} className="hm-a__step">
              <span className="hm-a__num" aria-hidden="true">{index + 1}</span>
              <h2 className="hm-a__step-title">{outcome.step}</h2>
              <p className="hm-a__step-detail">{outcome.detail}</p>
              <OutcomeArtifact kind={outcome.kind} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function OutcomeArtifact({ kind }: { kind: "icp" | "demand" | "build" }) {
  if (kind === "icp") {
    return (
      <div className="hm-a__card" aria-hidden="true">
        <div className="hm-a__row"><span>Customer</span><b>Barbers with 1–3 chairs</b></div>
        <div className="hm-a__row"><span>Top pain</span><b>No-shows leave empty slots</b></div>
        <div className="hm-a__row"><span>Build first</span><b>Deposit at booking</b></div>
      </div>
    );
  }
  if (kind === "demand") {
    return (
      <div className="hm-a__card" aria-hidden="true">
        <div className="hm-a__page">
          <span className="hm-a__page-url">yourpage · waitlist</span>
          <span className="hm-a__page-h">Stop losing no-shows</span>
          <span className="hm-a__page-btn">Join the waitlist</span>
        </div>
        <div className="hm-a__chips">
          <span><Users /> Conversations logged</span>
          <span><Check /> Sign-ups counted</span>
        </div>
      </div>
    );
  }
  return (
    <div className="hm-a__card hm-a__card--phone" aria-hidden="true">
      <div className="hm-a__phone">
        <span className="hm-a__phone-h">Tue 14:30 · Fade</span>
        <span className="hm-a__phone-line" />
        <span className="hm-a__phone-line hm-a__phone-line--short" />
        <span className="hm-a__phone-btn">Pay deposit and book <MousePointerClick /></span>
      </div>
    </div>
  );
}
