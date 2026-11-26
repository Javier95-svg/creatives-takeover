import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, PlayCircle } from "lucide-react";

import { useCTAAttribution } from "@/hooks/useCTAAttribution";
import { trackHeroModelCta } from "./heroModel";

// Model B, product-driven. Shows the workspace itself: the seven stages of the
// development cycle, the tool each one uses, and the three things a founder
// leaves each stage with. Stage names and results follow the homepage cycle
// section (UserReviews.tsx) and the tool map in homeFaq.ts.

type Stage = { name: string; tool: string; deliverables: [string, string, string] };

const STAGES: Stage[] = [
  { name: "Identity", tool: "ICP Builder", deliverables: ["Ideal customer profile", "Top 3 pains ranked by urgency", "One customer to focus on"] },
  { name: "Prototyping", tool: "Demo Studio", deliverables: ["One-line value proposition", "Headline and core benefits", "Waitlist page with a shareable link"] },
  { name: "Validation", tool: "PMF Lab", deliverables: ["Key hypotheses and risks", "Interviews and surveys logged", "Build, narrow, pivot or stop"] },
  { name: "Building", tool: "MVP Builder", deliverables: ["MVP scope and product spec", "Tech stack with an estimated budget", "One workflow a customer can pay for"] },
  { name: "Launch", tool: "GTM Strategist", deliverables: ["One measurable acquisition play", "10 prospects, 10 direct messages", "Repeat or drop the channel"] },
  { name: "Traction", tool: "Traction Engine", deliverables: ["A second cycle of the same play", "Results logged week by week", "A qualified buyer signal"] },
  { name: "Fundraising", tool: "Find Your Angel", deliverables: ["Fundraising readiness check", "Pitch deck narrative review", "Investors that match your stage"] },
];

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

export default function HeroModelB() {
  const { set: setAttribution } = useCTAAttribution();
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const windowRef = useRef<HTMLDivElement>(null);

  // Steps through the stages until the visitor picks one, and only while the
  // window is on screen. Reduced motion keeps the first stage still.
  useEffect(() => {
    if (!autoplay) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const element = windowRef.current;
    let visible = true;
    const observer = element && typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => { visible = entries.some((entry) => entry.isIntersecting); })
      : null;
    if (element && observer) observer.observe(element);
    const timer = window.setInterval(() => {
      if (visible) setActive((index) => (index + 1) % STAGES.length);
    }, 3200);
    return () => {
      window.clearInterval(timer);
      observer?.disconnect();
    };
  }, [autoplay]);

  const pick = (index: number) => {
    setAutoplay(false);
    setActive(index);
    trackHeroModelCta("b", "stage_selected", { stage: STAGES[index].name });
  };

  const stage = STAGES[active];

  return (
    <div className="hm hm-b">
      <div className="hm-b__copy">
        <p className="hm__eyebrow">7 stages · one workspace</p>
        <h1 className="hm-b__title">One workspace for every stage of your startup.</h1>
        <p className="hm__lede hm-b__lede">
          Each stage has its own tool and a clear result. Your dashboard keeps the work, the evidence
          and what to do next in one place. Free to start, no equity.
        </p>
        <div className="hm-b__ctas">
          <Link
            to="/signup?source=hero_model_b"
            className="ct-hero__cta"
            onClick={() => {
              trackHeroModelCta("b", "create_account");
              setAttribution("hero_model_b_create_account", "/");
            }}
          >
            Create free account <ArrowRight aria-hidden="true" />
          </Link>
          <Link
            to="/demo"
            className="ct-hero__cta ct-hero__cta--secondary"
            onClick={() => trackHeroModelCta("b", "tour")}
          >
            <PlayCircle aria-hidden="true" /> Tour the workspace
          </Link>
        </div>
        <p className="hm-b__note">The tour opens a sample project. No sign-up needed.</p>
      </div>

      <div className="hm-b__window" ref={windowRef}>
        <div className="hm-b__chrome" aria-hidden="true">
          <span className="hm-b__dots"><i /><i /><i /></span>
          <span className="hm-b__url">creatives-takeover.com/dashboard</span>
        </div>
        <div className="hm-b__body">
          <div className="hm-b__rail" role="tablist" aria-label="Development stages">
            {STAGES.map((item, index) => (
              <button
                key={item.name}
                type="button"
                role="tab"
                id={`hm-b-tab-${index}`}
                aria-selected={index === active}
                aria-controls="hm-b-panel"
                className={`hm-b__stage${index === active ? " is-on" : ""}${index < active ? " is-done" : ""}`}
                onClick={() => pick(index)}
              >
                <span className="hm-b__numeral">{NUMERALS[index]}</span>
                <span className="hm-b__stage-name">{item.name}</span>
              </button>
            ))}
          </div>
          <div className="hm-b__panel" id="hm-b-panel" role="tabpanel" aria-labelledby={`hm-b-tab-${active}`}>
            <div className="hm-b__panel-head">
              <span className="hm-b__kicker">Stage {NUMERALS[active]} of VII</span>
              <span className="hm-b__tool">{stage.tool}</span>
            </div>
            <h2 className="hm-b__panel-title">{stage.name}</h2>
            <p className="hm-b__panel-sub">You leave this stage with:</p>
            <ul className="hm-b__list" key={stage.name}>
              {stage.deliverables.map((item, index) => (
                <li key={item} style={{ animationDelay: `${index * 90}ms` }}>
                  <span className="hm-b__check" aria-hidden="true"><Check /></span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="hm-b__progress" aria-hidden="true">
              <span style={{ width: `${((active + 1) / STAGES.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
