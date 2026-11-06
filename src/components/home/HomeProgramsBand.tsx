import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, FileText, LineChart, Sparkles, UserCheck, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ProductShot } from "@/components/enterprise/EnterpriseVisuals";
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

const ENTERPRISE = "/enterprise";
const CONTACT = "/enterprise#talk";

const track = (placement: string) => () => captureEvent("home_programs_band_clicked", { placement });

const MILESTONES: Array<{ when: string; title: string; body: string; icon: LucideIcon }> = [
  { when: "Before day 1", title: "We set up your cohort", body: "Your dates, your check-in day, and two links: one for founders, one for your team.", icon: ClipboardList },
  { when: "Day 1", title: "Founders join with consent", body: "Each one sees exactly what your program will see before agreeing.", icon: UserCheck },
  { when: "Weeks 1–4", title: "The work, on one screen", body: "Weekly plans, customer conversations and a two-minute update from every team.", icon: LineChart },
  { when: "Day 30", title: "Your cohort report", body: "Written from each startup’s recorded work, in your funder’s format if you share it.", icon: FileText },
  { when: "After", title: "Founders keep going", body: "Their account, their work and the free plan stay theirs.", icon: Sparkles },
];

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

          <div className="hp-b__screens ent">
            <div className="hp-b__screen hp-b__screen--join">
              <ProductShot src={cohortJoinShot} lightSrc={cohortJoinLightShot} width={712} height={594} title="Founder invitation" fade={false}
                alt="The page a founder sees when invited: what the program will see, what is never shared, and a button to join with consent." />
            </div>
            <div className="hp-b__screen hp-b__screen--program">
              <ProductShot src={cohortProgramShot} lightSrc={cohortProgramLightShot} width={1176} height={955} title="Program dashboard" fade={false}
                alt="The program dashboard for five startups: customer profiles ready, median interviews, experiments run, check-ins this week and startups that need attention, then one row per startup with stage, tasks, interviews, evidence, experiments, last activity, check-in and attention flags." />
            </div>
            <div className="hp-b__screen hp-b__screen--founder">
              <ProductShot src={cohortFounderShot} lightSrc={cohortFounderLightShot} width={1176} height={727} title="Founder view" fade={false}
                alt="A founder's cohort view: this week's tasks for their stage and the weekly check-in sent to the program." />
            </div>
          </div>

          <div className="hp-ctas hp-ctas--center">
            <Link to={CONTACT} className="hp-btn hp-btn--primary" onClick={track("book_call")}>
              Book a pilot call
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link to={ENTERPRISE} className="hp-btn hp-btn--ghost" onClick={track("how_it_works")}>
              See how the pilot works
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
