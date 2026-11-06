import type { CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  FileText,
  LineChart,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ProductShot } from "@/components/enterprise/EnterpriseVisuals";
import { captureEvent } from "@/lib/analytics";
import cohortJoinShot from "@/assets/enterprise/cohort-join.webp";
import cohortJoinLightShot from "@/assets/enterprise/cohort-join-light.webp";
import cohortFounderShot from "@/assets/enterprise/cohort-founder.webp";
import cohortFounderLightShot from "@/assets/enterprise/cohort-founder-light.webp";
import cohortProgramShot from "@/assets/enterprise/cohort-program.webp";
import cohortProgramLightShot from "@/assets/enterprise/cohort-program-light.webp";
import "@/components/enterprise/enterprise.css";
import "./home-programs.css";

// The homepage band for program managers. Every claim comes from copy already
// approved on /enterprise (30-day pilot, 5–10 startups, one contact, weekly
// summary, cohort report, founders pay nothing and keep their account); the
// screens are the same real captures of cohort mode on sample data.
//
// Three designs are under review on the homepage-positioning branch; pick one
// with ?programs=a|b|c. The chosen one stays and the others are deleted.

type Variant = "a" | "b" | "c";

const ENTERPRISE = "/enterprise";
const CONTACT = "/enterprise#talk";

const track = (variant: Variant, placement: string) => () =>
  captureEvent("home_programs_band_clicked", { placement, variant });

const programShot = (hotspots = true) => (
  <ProductShot
    src={cohortProgramShot}
    lightSrc={cohortProgramLightShot}
    width={1176}
    height={955}
    title="Program dashboard"
    fade={false}
    hotspots={hotspots ? [
      { left: 83, top: 37.6, label: "Needs attention", side: "left" },
      { left: 40.5, top: 45.1, label: "Verified / total", side: "below" },
    ] : []}
    alt="The program dashboard for five startups: customer profiles ready, median interviews, experiments run, check-ins this week and startups that need attention, then one row per startup with stage, tasks, interviews, evidence, experiments, last activity, check-in and attention flags."
  />
);

const Ctas = ({ variant, center = false }: { variant: Variant; center?: boolean }) => (
  <div className={`hp-ctas${center ? " hp-ctas--center" : ""}`}>
    <Link to={CONTACT} className="hp-btn hp-btn--primary" onClick={track(variant, "book_call")}>
      Book a pilot call
      <ArrowRight aria-hidden="true" />
    </Link>
    <Link to={ENTERPRISE} className="hp-btn hp-btn--ghost" onClick={track(variant, "how_it_works")}>
      See how the pilot works
    </Link>
  </div>
);

// ---- A: Command center ------------------------------------------------------

const FACTS = [
  { value: "5–10", label: "startups in the pilot" },
  { value: "30", label: "days, then shaped to your calendar" },
  { value: "1", label: "contact needed from your team" },
  { value: "$0", label: "for your founders" },
];

const ROLES: Array<{ icon: LucideIcon; who: string; items: string[] }> = [
  {
    icon: Users,
    who: "Your team",
    items: ["Chooses the startups", "Hosts one kickoff session", "Reads a short weekly summary"],
  },
  {
    icon: ShieldCheck,
    who: "Our team",
    items: ["Sets up your cohort and onboards founders", "Follows up with anyone who goes quiet", "Writes the cohort report at day 30"],
  },
  {
    icon: UserCheck,
    who: "Your founders",
    items: ["Join with their own account and consent", "Get our paid tools for 30 days, free", "Keep their account and work afterwards"],
  },
];

const VariantA = () => (
  <div className="hp hp-a">
    <div className="hp-a__glow" aria-hidden="true" />
    <div className="hp-a__grid">
      <div className="hp-a__copy">
        <h3 className="hp-title">
          Run a validation program <span className="hp-accent">without adding work for your team.</span>
        </h3>
        <p className="hp-lede">
          We run a 30-day pilot with your cohort: founders test their ideas with real customers, your team sees every
          startup’s progress on one screen, and your funders get a report built from recorded work.
        </p>
        <Ctas variant="a" />
      </div>
      <div className="hp-a__shot ent">{programShot()}</div>
    </div>

    <dl className="hp-facts">
      {FACTS.map((fact) => (
        <div key={fact.label} className="hp-fact">
          <dt className="hp-fact__value">{fact.value}</dt>
          <dd className="hp-fact__label">{fact.label}</dd>
        </div>
      ))}
    </dl>

    <div className="hp-roles">
      {ROLES.map(({ icon: Icon, who, items }) => (
        <div key={who} className="hp-role">
          <div className="hp-role__head">
            <span className="hp-icon"><Icon aria-hidden="true" /></span>
            <h3>{who}</h3>
          </div>
          <ul>
            {items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ))}
    </div>
  </div>
);

// ---- B: The pilot, day by day -----------------------------------------------

const MILESTONES: Array<{ when: string; title: string; body: string; icon: LucideIcon }> = [
  { when: "Before day 1", title: "We set up your cohort", body: "Your dates, your check-in day, and two links: one for founders, one for your team.", icon: ClipboardList },
  { when: "Day 1", title: "Founders join with consent", body: "Each one sees exactly what your program will see before agreeing.", icon: UserCheck },
  { when: "Weeks 1–4", title: "The work, on one screen", body: "Weekly plans, customer conversations and a two-minute update from every team.", icon: LineChart },
  { when: "Day 30", title: "Your cohort report", body: "Written from each startup’s recorded work, in your funder’s format if you share it.", icon: FileText },
  { when: "After", title: "Founders keep going", body: "Their account, their work and the free plan stay theirs.", icon: Sparkles },
];

const VariantB = () => (
  <div className="hp hp-b">
    <div className="hp-b__head">
      <h3 className="hp-title">
        A 30-day pilot <span className="hp-accent">your team doesn’t have to run.</span>
      </h3>
      <p className="hp-lede">
        Bring 5 to 10 startups and one contact. We onboard the founders, keep every team moving week by week and hand
        you a report your funders can read.
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
      <div className="hp-b__screen hp-b__screen--program">{programShot(false)}</div>
      <div className="hp-b__screen hp-b__screen--founder">
        <ProductShot src={cohortFounderShot} lightSrc={cohortFounderLightShot} width={1176} height={727} title="Founder view" fade={false}
          alt="A founder's cohort view: this week's tasks for their stage and the weekly check-in sent to the program." />
      </div>
    </div>

    <Ctas variant="b" center />
  </div>
);

// ---- C: Before and with -----------------------------------------------------

const SHIFTS: Array<{ icon: LucideIcon; before: string; after: string }> = [
  { icon: MessageSquareText, before: "Chasing founders for updates", after: "Every team sends a two-minute update each week, and we follow up with anyone who goes quiet." },
  { icon: ClipboardList, before: "Self-reported spreadsheets", after: "Numbers come from the work founders do on the platform, with what it can confirm shown apart." },
  { icon: FileText, before: "Writing the funder report at the end", after: "A cohort report at day 30, written by our team, with a next step for every startup." },
  { icon: CalendarCheck, before: "Founders drifting once the program ends", after: "They keep their account, their work and the free plan, with no extra work for you." },
];

const VariantC = () => (
  <div className="hp hp-c">
    <div className="hp-c__copy">
      <h3 className="hp-title">
        See which startups in your cohort <span className="hp-accent">are doing the work.</span>
      </h3>
      <p className="hp-lede">
        Your sessions and mentors teach. We make sure founders act on it, and your team can see it happen.
      </p>
      <ul className="hp-shifts">
        {SHIFTS.map(({ icon: Icon, before, after }) => (
          <li key={before} className="hp-shift">
            <span className="hp-icon"><Icon aria-hidden="true" /></span>
            <div>
              <p className="hp-shift__before">{before}</p>
              <p className="hp-shift__after">{after}</p>
            </div>
          </li>
        ))}
      </ul>
      <Ctas variant="c" />
    </div>
    <div className="hp-c__visual">
      <div className="hp-c__shot ent">{programShot(false)}</div>
      <div className="hp-callout hp-callout--a" aria-hidden="true">
        <span className="hp-callout__icon hp-callout__icon--warn"><AlertTriangle /></span>
        <span><strong>2 startups</strong> need attention</span>
      </div>
      <div className="hp-callout hp-callout--b" aria-hidden="true">
        <span className="hp-callout__icon"><CalendarCheck /></span>
        <span><strong>4 of 5</strong> check-ins this week</span>
      </div>
      <p className="hp-c__note">Real product, sample data</p>
    </div>
  </div>
);

export default function HomeProgramsBand() {
  const [params] = useSearchParams();
  const requested = params.get("programs");
  const variant: Variant = requested === "b" || requested === "c" ? requested : "a";

  return (
    <section className="hp-section" aria-labelledby="home-programs-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="hp-header">
          <Badge variant="outline" className="homepage-section-badge mb-5">
            For Programs
          </Badge>
          <h2 id="home-programs-heading" className="homepage-section-title text-3xl sm:text-4xl lg:text-[2.9rem] mb-4">
            Track Your Cohort Progress Effortlessly
          </h2>
          <p className="homepage-section-copy text-base sm:text-lg">
            We put your founders through the same tasks and methodology, you will be able to see every startup’s
            progress on one screen.
          </p>
          <p className="homepage-section-copy text-base sm:text-lg mt-4">
            We handle the follow-ups and write your cohort report at day 30, so your team can focus on the founders
            instead of chasing updates.
          </p>
        </div>
        {variant === "a" ? <VariantA /> : variant === "b" ? <VariantB /> : <VariantC />}
      </div>
    </section>
  );
}
