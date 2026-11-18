import { useEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from "react";
import { PILOT_CALL_URL } from "@/config/pilotCall";
import { useLocation } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  CalendarCheck,
  Check,
  FileText,
  Gift,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Rocket,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import SEO, { createBreadcrumbSchema, createFAQSchema, createWebPageSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import InstitutionContactForm from "@/components/audience/InstitutionContactForm";
import {
  AfterProgramFlow,
  FoundingPlaces,
  PilotSetupMock,
  ProductShot,
  ReportDelivered,
  SampleReport,
} from "@/components/enterprise/EnterpriseVisuals";
import javierPhoto from "@/assets/team-javier-pena-profile.jpg";
import cohortJoinShot from "@/assets/enterprise/cohort-join.webp";
import cohortJoinLightShot from "@/assets/enterprise/cohort-join-light.webp";
import cohortProgramShot from "@/assets/enterprise/cohort-program.webp";
import cohortProgramLightShot from "@/assets/enterprise/cohort-program-light.webp";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { captureEvent } from "@/lib/analytics";
import {
  ENTERPRISE_AFTER,
  ENTERPRISE_CONTACT,
  ENTERPRISE_DEAL,
  ENTERPRISE_FAQS,
  ENTERPRISE_FOUNDING,
  ENTERPRISE_HERO,
  ENTERPRISE_PATH,
  ENTERPRISE_PILOT,
  ENTERPRISE_SEO,
} from "@/data/enterprisePage";
import "@/components/enterprise/enterprise.css";

const CONTACT_ID = "talk";
const HOW_ID = "how";

// Dense screens get the full width under their step, so their numbers stay legible.
const WIDE_STEP_VISUALS = new Set(["program"]);

// One visual per pilot step: the real cohort screens on sample data, and two
// labelled example illustrations (the setup and the report sent on day 30).
const STEP_VISUALS: Record<string, ReactNode> = {
  setup: <PilotSetupMock />,
  report: <ReportDelivered />,
  join: (
    <ProductShot
      src={cohortJoinShot}
      lightSrc={cohortJoinLightShot}
      width={712}
      height={594}
      title="Founder invitation"
      fade={false}
      hotspots={[
        { left: 75, top: 49.3, label: "Never shared", side: "below" },
        { left: 10.5, top: 85.7, label: "Joins only with consent" },
      ]}
      alt="The cohort invitation a founder opens: what is shared with the program (name and email, stage and tasks, counts of interviews, evidence and experiments, weekly check-ins), what stays private (files, idea details, messages) and the consent to join."
    />
  ),
  program: (
    <ProductShot
      src={cohortProgramShot}
      lightSrc={cohortProgramLightShot}
      width={1176}
      height={955}
      title="Program dashboard"
      fade={false}
      hotspots={[
        { left: 83, top: 37.6, label: "Needs attention" },
        { left: 40.5, top: 45.1, label: "Verified / total", side: "below" },
      ]}
      alt="The program dashboard for five startups: customer profiles ready, median interviews, experiments run, check-ins this week and startups that need attention, then one row per startup with stage, tasks, interviews, evidence, experiments, last activity, check-in and attention flags such as a reported blocker or no interviews logged."
    />
  ),
};

// Icons for the hero's trust line and for what the program gets.
const TRUST_ICONS: Record<string, LucideIcon> = { founding: Gift, consent: UserCheck, iso: ShieldCheck };
const GET_ICONS: Record<string, LucideIcon> = { dashboard: LayoutDashboard, summary: CalendarCheck, report: FileText, after: Rocket };

/** Delay for an element's scroll reveal, used to stagger lists and pairs. */
const revealDelay = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;

/**
 * Scroll reveals for every `[data-reveal]` element on the page: each one
 * animates in once as it scrolls into view (enterprise.css holds the motion).
 * The page renders fully without it: elements are only hidden once this has
 * armed, and never when the visitor prefers reduced motion.
 */
const useScrollReveal = (root: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const element = root.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    element.querySelectorAll("[data-reveal]").forEach((target) => observer.observe(target));
    element.classList.add("is-reveal-ready");
    return () => observer.disconnect();
  }, [root]);
};

/**
 * The pilot steps fill in as the visitor scrolls: each step lights up once a
 * reading line (60% down the screen) passes its number, and the rail to the
 * next number fills in proportion (enterprise.css draws both). Updates at most
 * once a frame. Without it the timeline simply stays unfilled.
 */
const READING_LINE = 0.6;
const useStepsProgress = (list: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * READING_LINE;
      const steps = [...element.children] as HTMLElement[];
      const centres = steps.map((step) => {
        const rect = (step.querySelector(".ent-step__num") ?? step).getBoundingClientRect();
        return rect.top + rect.height / 2;
      });
      steps.forEach((step, index) => {
        step.classList.toggle("is-reached", line >= centres[index]);
        const next = centres[index + 1];
        if (next === undefined) return;
        const fill = Math.min(1, Math.max(0, (line - centres[index]) / (next - centres[index])));
        step.style.setProperty("--fill", fill.toFixed(3));
      });
    };
    const request = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [list]);
};

const SectionHead = ({
  eyebrow,
  title,
  accent,
  copy,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  /** The end of the title to set in the hero's accent gradient; must be how the title ends. */
  accent?: string;
  copy?: string;
  wide?: boolean;
}) => {
  const lead = accent && title.endsWith(accent) ? title.slice(0, -accent.length) : null;
  return (
    <header className={wide ? 'ent-head ent-head--wide' : 'ent-head'} data-reveal="up">
      <p className="ent-eyebrow">{eyebrow}</p>
      <h2 className="ent-h2">
        {lead !== null ? (
          <>
            {lead}
            <span className="ent-h2__accent">{accent}</span>
          </>
        ) : (
          title
        )}
      </h2>
      {copy ? <p className="ent-head__copy">{copy}</p> : null}
    </header>
  );
};

const Enterprise = () => {
  const location = useLocation();
  const pageRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLOListElement>(null);
  useScrollReveal(pageRef);
  useStepsProgress(stepsRef);
  usePageAnalytics(ENTERPRISE_PATH, "Enterprise - Creatives Takeover");

  // Links like /enterprise#talk (pricing band, tour panel) land on the form.
  // The router doesn't scroll to hashes and the page is lazy-loaded, so wait a
  // frame for the section to exist.
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

  const track = (cta: string, placement: string) => captureEvent("enterprise_cta_clicked", { cta, placement });

  // The secondary call to action stays on the page: it shows how the pilot runs.
  const scrollToHow = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    track(ENTERPRISE_HERO.secondaryCta.label, "hero");
    document.getElementById(HOW_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const structuredData = [
    createWebPageSchema({ name: ENTERPRISE_SEO.title, description: ENTERPRISE_SEO.description, url: ENTERPRISE_PATH }),
    createBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Enterprise", url: ENTERPRISE_PATH },
    ]),
    createFAQSchema(ENTERPRISE_FAQS),
  ];

  return (
    <>
      <SEO
        title={ENTERPRISE_SEO.title}
        description={ENTERPRISE_SEO.description}
        keywords={ENTERPRISE_SEO.keywords}
        url={ENTERPRISE_PATH}
        image="/og-founders-compass-2026-09.png"
        structuredData={structuredData}
      />
      <div ref={pageRef} className="ent relative min-h-screen overflow-hidden">
        <HomeWallpaper variant="landing" />
        <div className="relative z-10">
          <Navigation />
          <main>
            {/* Hero: the pilot offer, its terms at a glance, the founding offer and
                two trust facts, beside the day-30 report a program receives. */}
            <section className="ent-hero" aria-labelledby="ent-title">
              <div className="ent-hero__backdrop" aria-hidden="true" />
              <div className="ent-container ent-hero__grid">
                <div className="ent-hero__copy" data-reveal="up">
                  <p className="ent-eyebrow ent-eyebrow--live">
                    <span className="ent-eyebrow__dot" aria-hidden="true" />
                    {ENTERPRISE_HERO.eyebrow}
                  </p>
                  <h1 id="ent-title" className="ent-hero__title">
                    {ENTERPRISE_HERO.titleLead} <span className="ent-hero__accent">{ENTERPRISE_HERO.titleAccent}</span>
                  </h1>
                  <p className="ent-hero__lede">{ENTERPRISE_HERO.lede}</p>

                  <ul className="ent-hero__facts">
                    {ENTERPRISE_HERO.facts.map((fact) => (
                      <li key={fact.label}>
                        <strong>{fact.value}</strong>
                        <span>{fact.label}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="ent-hero__ctas">
                    {/* Straight to Javier's booking page, in a new tab (src/config/pilotCall.ts). */}
                    <a href={PILOT_CALL_URL} target="_blank" rel="noopener noreferrer" className="ent-btn ent-btn--primary" onClick={() => track(ENTERPRISE_HERO.primaryCta, "hero")}>
                      {ENTERPRISE_HERO.primaryCta}
                      <ArrowRight aria-hidden="true" />
                    </a>
                    <a href={`#${HOW_ID}`} className="ent-btn ent-btn--ghost" onClick={scrollToHow}>
                      {ENTERPRISE_HERO.secondaryCta.label}
                      <ArrowDown aria-hidden="true" />
                    </a>
                  </div>

                  <ul className="ent-hero__trust">
                    {ENTERPRISE_HERO.trust.map((item) => {
                      const Icon = TRUST_ICONS[item.key] ?? ShieldCheck;
                      return (
                        <li key={item.key} className={item.key === "founding" ? "is-offer" : undefined}>
                          <Icon aria-hidden="true" />
                          {item.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="ent-hero__visual" data-reveal="zoom" style={revealDelay(150)}>
                  <SampleReport />
                </div>
              </div>
            </section>

            {/* How the pilot runs, in four steps with who does the work, each beside a visual. */}
            <section id={HOW_ID} className="ent-section ent-section--tint scroll-mt-24">
              <div className="ent-container">
                <SectionHead
                  eyebrow={ENTERPRISE_PILOT.eyebrow}
                  title={ENTERPRISE_PILOT.title}
                  accent={ENTERPRISE_PILOT.titleAccent}
                  copy={ENTERPRISE_PILOT.copy}
                  wide
                />
                <ol ref={stepsRef} className="ent-steps">
                  {ENTERPRISE_PILOT.steps.map((step, index) => {
                    const visual = STEP_VISUALS[step.visual];
                    const stepClass = ["ent-step", visual && "has-visual", WIDE_STEP_VISUALS.has(step.visual) && "is-wide"]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <li key={step.key} className={stepClass}>
                        <span className="ent-step__num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                        <div className="ent-step__body">
                          <div className="ent-step__text" data-reveal="up">
                            <p className="ent-step__meta">
                              <span className="ent-step__when">{step.when}</span>
                              <span className={`ent-step__owner is-${step.owner === "Your team" ? "you" : step.owner === "Our team" ? "us" : "other"}`}>
                                {step.owner}
                              </span>
                            </p>
                            <h3 className="ent-step__title">
                              <span className="sr-only">Step {index + 1}: </span>
                              {step.title}
                            </h3>
                            <p className="ent-step__copy">{step.body}</p>
                          </div>
                          {visual ? (
                            <div className="ent-step__visual" data-reveal="tilt" style={revealDelay(120)}>
                              {visual}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <p className="ent-honesty" data-reveal="up">{ENTERPRISE_PILOT.honesty}</p>
              </div>
            </section>

            {/* What the program gets and what it provides, then where founders go after day 30. */}
            <section className="ent-section">
              <div className="ent-container">
                <SectionHead eyebrow={ENTERPRISE_DEAL.eyebrow} title={ENTERPRISE_DEAL.title} wide />
                <div className="ent-deal">
                  <div className="ent-scope__card is-in ent-deal__card" data-reveal="left">
                    <p className="ent-scope__head ent-conditions__head">
                      <span className="ent-icon" aria-hidden="true">
                        <Gift />
                      </span>
                      {ENTERPRISE_DEAL.get.title}
                    </p>
                    <ul>
                      {ENTERPRISE_DEAL.get.items.map((item) => {
                        const Icon = GET_ICONS[item.key] ?? Check;
                        return (
                          <li key={item.key}>
                            <Icon aria-hidden="true" />
                            <div>
                              <strong>{item.title}</strong>
                              <span>{item.body}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="ent-scope__card ent-conditions__card ent-deal__card" data-reveal="right" style={revealDelay(120)}>
                    <p className="ent-scope__head ent-conditions__head">
                      <span className="ent-icon" aria-hidden="true">
                        <Building2 />
                      </span>
                      {ENTERPRISE_DEAL.need.title}
                    </p>
                    <ol>
                      {ENTERPRISE_DEAL.need.items.map((item, index) => (
                        <li key={item.title}>
                          <span className="ent-conditions__num" aria-hidden="true">{index + 1}</span>
                          <div>
                            <strong>{item.title}</strong>
                            <span>{item.body}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
                <div className="ent-deal__after" data-reveal="zoom">
                  <h3 className="ent-conditions__title">{ENTERPRISE_AFTER.title}</h3>
                  <AfterProgramFlow
                    programStages={ENTERPRISE_HERO.cycle.pilotStages}
                    duringLabel={ENTERPRISE_AFTER.duringLabel}
                    endLabel={ENTERPRISE_AFTER.endLabel}
                    afterLabel={ENTERPRISE_AFTER.afterLabel}
                  />
                </div>
              </div>
            </section>

            {/* The founding offer: the first three programs run the pilot free. */}
            <section className="ent-section ent-section--tint">
              <div className="ent-container">
                <div className="ent-founding" data-reveal="zoom">
                  <div className="ent-founding__copy">
                    <p className="ent-eyebrow ent-eyebrow--live">
                      <span className="ent-eyebrow__dot" aria-hidden="true" />
                      {ENTERPRISE_FOUNDING.eyebrow}
                    </p>
                    <h2 className="ent-h2">
                      {ENTERPRISE_FOUNDING.title.slice(0, -ENTERPRISE_FOUNDING.titleAccent.length)}
                      <span className="ent-h2__accent">{ENTERPRISE_FOUNDING.titleAccent}</span>
                    </h2>
                    <p className="ent-head__copy">{ENTERPRISE_FOUNDING.copy}</p>
                    <div className="ent-hero__ctas">
                      <a href={PILOT_CALL_URL} target="_blank" rel="noopener noreferrer" className="ent-btn ent-btn--primary" onClick={() => track(ENTERPRISE_HERO.primaryCta, "founding")}>
                        {ENTERPRISE_HERO.primaryCta}
                        <ArrowRight aria-hidden="true" />
                      </a>
                    </div>
                    <p className="ent-founding__note">{ENTERPRISE_FOUNDING.note}</p>
                  </div>
                  <FoundingPlaces places={ENTERPRISE_FOUNDING.places} terms={ENTERPRISE_FOUNDING.terms} />
                </div>
              </div>
            </section>

            <section className="ent-section">
              <div className="ent-container ent-faq">
                <div className="ent-faq__intro" data-reveal="left">
                  <p className="ent-eyebrow">Questions</p>
                  <h2 className="ent-h2">What program managers ask us</h2>
                  <p className="ent-head__copy">
                    Something else on your mind?{" "}
                    <a href="mailto:javier@creatives-takeover.com?subject=Programs%20and%20partnerships">Email us</a>.
                  </p>
                </div>
                <Accordion type="single" collapsible className="ent-faq__list">
                  {ENTERPRISE_FAQS.map((faq, index) => (
                    <AccordionItem
                      key={faq.question}
                      value={`faq-${index}`}
                      className="ent-faq__item"
                      data-reveal="up"
                      style={revealDelay(index * 60)}
                    >
                      <AccordionTrigger className="ent-faq__q">{faq.question}</AccordionTrigger>
                      <AccordionContent className="ent-faq__a">{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </section>

            {/* Contact: what happens on the call and who replies, with the form beside it. */}
            <section id={CONTACT_ID} className="ent-section ent-contact scroll-mt-24">
              <div className="ent-container">
                <div className="ent-contact__card" data-reveal="zoom">
                  <div className="ent-contact__panel">
                    <div className="ent-contact__glow" aria-hidden="true" />
                    <p className="ent-eyebrow ent-contact__eyebrow">{ENTERPRISE_CONTACT.eyebrow}</p>
                    <h2 className="ent-contact__title">{ENTERPRISE_CONTACT.title}</h2>
                    <p className="ent-contact__copy">{ENTERPRISE_CONTACT.copy}</p>

                    <p className="ent-contact__label">{ENTERPRISE_CONTACT.callLabel}</p>
                    <ol className="ent-contact__includes ent-contact__steps">
                      {ENTERPRISE_CONTACT.callSteps.map((item, index) => (
                        <li key={item}>
                          <span className="ent-contact__stepnum" aria-hidden="true">{index + 1}</span>
                          {item}
                        </li>
                      ))}
                    </ol>

                    <div className="ent-contact__person">
                      <img src={javierPhoto} alt="" width={56} height={56} loading="lazy" decoding="async" />
                      <div>
                        <p className="ent-contact__name">
                          {ENTERPRISE_CONTACT.person.name}
                          <span>{ENTERPRISE_CONTACT.person.role}</span>
                        </p>
                        <p className="ent-contact__line">{ENTERPRISE_CONTACT.person.line}</p>
                        <a
                          className="ent-contact__mail"
                          href={`mailto:${ENTERPRISE_CONTACT.person.email}?subject=Pilot%20for%20our%20program`}
                          onClick={() => track("email", "contact")}
                        >
                          <Mail aria-hidden="true" />
                          {ENTERPRISE_CONTACT.person.email}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="ent-contact__form">
                    <p className="ent-contact__form-title">Tell us about your program</p>
                    <p className="ent-contact__form-copy">Two minutes. No commitment.</p>
                    <InstitutionContactForm
                      audience="enterprise"
                      defaultOrgType="accelerator"
                      submitLabel={ENTERPRISE_HERO.primaryCta}
                      variant="plain"
                      // Every field first; the answers are emailed to Javier
                      // (contact-form-submission), then his Cal page opens.
                      requireAll
                      bookingUrl={PILOT_CALL_URL}
                    />
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Enterprise;
