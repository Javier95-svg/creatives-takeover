import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, FileText, LineChart, Sparkles, UserCheck, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ShotHotspot } from "@/components/enterprise/EnterpriseVisuals";
import { captureEvent } from "@/lib/analytics";
import cohortJoinShot from "@/assets/enterprise/cohort-join.webp";
import cohortJoinLightShot from "@/assets/enterprise/cohort-join-light.webp";
import cohortFounderShot from "@/assets/enterprise/cohort-founder.webp";
import cohortFounderLightShot from "@/assets/enterprise/cohort-founder-light.webp";
import cohortProgramShot from "@/assets/enterprise/cohort-program.webp";
import cohortProgramLightShot from "@/assets/enterprise/cohort-program-light.webp";
import TitleFx from "@/components/home/TitleFx";
import "@/components/enterprise/enterprise.css";
import "./home-programs.css";

// The homepage band for program managers: the 30-day pilot, day by day.
// Every claim comes from copy already approved on /enterprise (5–10 startups,
// one contact, consent, weekly updates, cohort report, founders keep their
// account); the screens are the same real captures of cohort mode on sample data.

const CONTACT = "/enterprise#talk";

const track = (placement: string) => () => captureEvent("home_programs_band_clicked", { placement });

const MILESTONES: Array<{ when: string; title: string; body: string; icon: LucideIcon }> = [
  { when: "Before day 1", title: "We set up your cohort", body: "Your dates, your check-in day, and two links: one for founders, one for your team.", icon: ClipboardList },
  { when: "Day 1", title: "Founders join with consent", body: "Each one sees exactly what your program will see before agreeing.", icon: UserCheck },
  { when: "Weeks 1–4", title: "The work, on one screen", body: "Weekly plans, customer conversations and a two-minute update from every team.", icon: LineChart },
  { when: "Day 30", title: "Your cohort report", body: "Written from each startup’s recorded work, in your funder’s format if you share it.", icon: FileText },
  { when: "After", title: "Founders keep going", body: "Their account, their work and the free plan stay theirs.", icon: Sparkles },
];

type Crop = { x: number; y: number; w: number; h: number };

// The crop as CSS variables: the box's aspect ratio and the capture's size and
// offset inside it, with a suffix for the phone crop.
const cropVars = (width: number, crop: Crop, suffix = "") => ({
  [`--ar${suffix}`]: `${crop.w} / ${crop.h}`,
  [`--iw${suffix}`]: `${(width / crop.w) * 100}%`,
  [`--il${suffix}`]: `${(-crop.x / crop.w) * 100}%`,
  [`--it${suffix}`]: `${(-crop.y / crop.h) * 100}%`,
});

/**
 * A real product screen cropped to the part worth reading, so its text stays
 * legible at homepage size. The crop is in pixels of the capture (light and dark
 * captures share dimensions); hotspots are in percent of the crop. An optional
 * tighter crop is used on phones, where the hotspots are hidden.
 */
const CroppedShot = ({ src, lightSrc, width, crop, phoneCrop, title, alt, caption, hotspots = [] }: {
  src: string;
  lightSrc: string;
  width: number;
  crop: Crop;
  phoneCrop?: Crop;
  title: string;
  alt: string;
  caption: { when: string; text: string };
  hotspots?: ShotHotspot[];
}) => {
  const vars = { ...cropVars(width, crop), ...cropVars(width, phoneCrop ?? crop, "-p") } as CSSProperties;
  return (
    <figure className="hp-shot">
      <div className="ent-window ent-shot">
        <div className="ent-window__bar">
          <span className="ent-window__dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="ent-window__title">{title}</span>
        </div>
        <div className={`hp-shot__media${phoneCrop ? " has-phone-crop" : ""}`} style={vars}>
          <img className="is-light" src={lightSrc} alt={alt} loading="lazy" decoding="async" />
          <img className="is-dark" src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          {hotspots.map((spot, index) => (
            <span
              key={spot.label}
              className={`ent-hotspot${spot.side && spot.side !== "right" ? ` is-${spot.side}` : ""}`}
              style={{ left: `${spot.left}%`, top: `${spot.top}%`, "--hotspot-delay": `${600 + index * 260}ms` } as CSSProperties}
              aria-hidden="true"
            >
              <i className="ent-hotspot__dot" />
              <span className="ent-hotspot__label">{spot.label}</span>
            </span>
          ))}
        </div>
      </div>
      <figcaption className="hp-shot__caption">
        <span className="hp-shot__when">{caption.when}</span>
        {caption.text}
      </figcaption>
    </figure>
  );
};

export default function HomeProgramsBand() {
  // Plays the entrance once, when the band scrolls into view. The CSS only hides
  // anything after "ready" is set, so without JS everything is simply shown.
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "ready" | "in">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    setState("ready");
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setState("in");
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="hp-section" data-anim={state} aria-labelledby="home-programs-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="hp-header">
          <Badge variant="outline" className="homepage-section-badge mb-5">
            For Programs
          </Badge>
          <h2 id="home-programs-heading" className="homepage-section-title text-3xl sm:text-4xl lg:text-[2.9rem]">
            <TitleFx variant="momentum" text="Keep Every Startup in Your Cohort Moving" />
          </h2>
        </div>

        <div className="hp hp-b">
          <div className="hp-b__head">
            <h3 className="hp-title">
              A 30-day pilot <span className="hp-accent">your team doesn’t have to run.</span>
            </h3>
            <p className="hp-lede">
              Bring 5 to 10 startups and one contact. We onboard the founders, keep every team moving week by week and
              hand you a report your funders can read.
            </p>
          </div>

          <ol className="hp-track">
            {MILESTONES.map(({ when, title, body, icon: Icon }, index) => (
              <li key={when} className="hp-step" style={{ "--i": index } as CSSProperties}>
                <span className="hp-step__dot"><Icon aria-hidden="true" /></span>
                <span className="hp-step__when">{when}</span>
                <h3 className="hp-step__title">{title}</h3>
                <p className="hp-step__body">{body}</p>
              </li>
            ))}
          </ol>

          {/* The dashboard large, then what founders see and send, each cropped
              to the part worth reading. */}
          <div className="hp-b__screens ent">
            <div className="hp-b__screen hp-b__screen--program">
              <CroppedShot src={cohortProgramShot} lightSrc={cohortProgramLightShot} width={1176}
                crop={{ x: 0, y: 0, w: 1176, h: 672 }} phoneCrop={{ x: 850, y: 190, w: 326, h: 482 }} title="Program dashboard"
                caption={{ when: "Weeks 1–4", text: "What your team sees" }}
                hotspots={[
                  { left: 83, top: 53.4, label: "Needs attention" },
                  { left: 40.5, top: 64.1, label: "Verified interviews and evidence", side: "below" },
                ]}
                alt="The program dashboard for five startups: customer profiles ready, median interviews, experiments run, check-ins this week and startups that need attention, then one row per startup with stage, tasks, interviews, evidence, experiments, last activity, check-in and attention flags." />
            </div>
            <div className="hp-b__pair">
              <div className="hp-b__screen hp-b__screen--join">
                <CroppedShot src={cohortJoinShot} lightSrc={cohortJoinLightShot} width={712}
                  crop={{ x: 40, y: 40, w: 632, h: 345 }} title="Founder invitation"
                  caption={{ when: "Day 1", text: "What founders see before joining" }}
                  hotspots={[{ left: 78.2, top: 73.3, label: "Never shared", side: "below" }]}
                  alt="The page a founder sees when invited: what is shared with the program and what stays private." />
              </div>
              <div className="hp-b__screen hp-b__screen--founder">
                <CroppedShot src={cohortFounderShot} lightSrc={cohortFounderLightShot} width={1176}
                  crop={{ x: 600, y: 258, w: 556, h: 382 }} title="Founder view"
                  caption={{ when: "Every week", text: "What founders send" }}
                  hotspots={[{ left: 39, top: 19.4, label: "Check-in sent to the program" }]}
                  alt="A founder's weekly check-in, sent to the program: wins, blockers, next week and help needed." />
              </div>
            </div>
            <p className="hp-b__note">Real product screens, sample data.</p>
          </div>

          <div className="hp-ctas hp-ctas--center">
            <Link to={CONTACT} className="hp-btn hp-btn--primary" onClick={track("book_call")}>
              Book a pilot call
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
