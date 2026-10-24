import { useEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Info,
  Mail,
  Minus,
  Target,
  Users,
} from "lucide-react";

import SEO, { createBreadcrumbSchema, createFAQSchema, createWebPageSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import InstitutionContactForm from "@/components/audience/InstitutionContactForm";
import {
  AfterProgramFlow,
  AfterProgramKeeps,
  CycleStrip,
  PilotBoardMock,
  PilotSetupMock,
  ProductShot,
} from "@/components/enterprise/EnterpriseVisuals";
import javierPhoto from "@/assets/team-javier-pena-profile.jpg";
import cohortJoinShot from "@/assets/enterprise/cohort-join.webp";
import cohortJoinLightShot from "@/assets/enterprise/cohort-join-light.webp";
import cohortFounderShot from "@/assets/enterprise/cohort-founder.webp";
import cohortFounderLightShot from "@/assets/enterprise/cohort-founder-light.webp";
import cohortProgramShot from "@/assets/enterprise/cohort-program.webp";
import cohortProgramLightShot from "@/assets/enterprise/cohort-program-light.webp";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { captureEvent } from "@/lib/analytics";
import {
  ENTERPRISE_ADAPT,
  ENTERPRISE_AFTER,
  ENTERPRISE_CONTACT,
  ENTERPRISE_FAQS,
  ENTERPRISE_HERO,
  ENTERPRISE_PATH,
  ENTERPRISE_PILOT,
  ENTERPRISE_SCOPE,
  ENTERPRISE_SEO,
} from "@/data/enterprisePage";
import "@/components/enterprise/enterprise.css";

const CONTACT_ID = "talk";

// Dense screens get the full width under their step, so their numbers stay legible.
const WIDE_STEP_VISUALS = new Set(["founder", "program"]);

// The pilot steps a program can see in the product: cohort mode on sample data.
const STEP_VISUALS: Record<string, ReactNode> = {
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
  founder: (
    <ProductShot
      src={cohortFounderShot}
      lightSrc={cohortFounderLightShot}
      width={1176}
      height={727}
      title="Founder view"
      fade={false}
      hotspots={[
        { left: 70, top: 19, label: "Rising plan, free for the pilot" },
        { left: 69.5, top: 45.7, label: "Check-in sent to the program" },
      ]}
      alt="A founder's cohort view in week 2 of 4: the Rising plan given by the program until the pilot ends, this week's tasks for their stage, and the week 2 check-in sent to the program with wins, a blocker, next week's goal and the help needed."
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

const ADAPT_ICONS: Record<string, typeof Users> = {
  size: Users,
  focus: Target,
  length: CalendarDays,
};

/** Delay for an element's scroll reveal, used to stagger lists and pairs. */
const revealDelay = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;

/**
 * Scroll reveals for every `[data-reveal]` element on the page: each one
 * animates in once as it scrolls into view (enterprise.css holds the motion).
 * The page renders fully without it: elements are only hidden once this has
 * armed, and never when the visitor prefers reduced motion.
 */
const useScrollReveal = (root: RefObject<HTMLElement>) => {
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
  useScrollReveal(pageRef);
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

  const scrollToContact = (event: MouseEvent<HTMLAnchorElement>, placement: string) => {
    event.preventDefault();
    track(ENTERPRISE_HERO.primaryCta, placement);
    document.getElementById(CONTACT_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
            {/* Hero: the pilot offer, its terms at a glance, and the pilot as a program sees it. */}
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
                  <CycleStrip {...ENTERPRISE_HERO.cycle} />

                  <ul className="ent-hero__facts">
                    {ENTERPRISE_HERO.facts.map((fact) => (
                      <li key={fact.label}>
                        <strong>{fact.value}</strong>
                        <span>{fact.label}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="ent-hero__ctas">
                    <a href={`#${CONTACT_ID}`} className="ent-btn ent-btn--primary" onClick={(event) => scrollToContact(event, "hero")}>
                      {ENTERPRISE_HERO.primaryCta}
                      <ArrowRight aria-hidden="true" />
                    </a>
                    <Link
                      to={ENTERPRISE_HERO.secondaryCta.href}
                      className="ent-btn ent-btn--ghost"
                      onClick={() => track(ENTERPRISE_HERO.secondaryCta.label, "hero")}
                    >
                      {ENTERPRISE_HERO.secondaryCta.label}
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                <div className="ent-hero__visual" data-reveal="zoom" style={revealDelay(150)}>
                  <PilotBoardMock />
                </div>
              </div>
            </section>

            {/* How the pilot runs, step by step with who does the work, then
                exactly what it includes, what it doesn't and what the program brings. */}
            <section className="ent-section ent-section--tint">
              <div className="ent-container">
                <SectionHead
                  eyebrow={ENTERPRISE_PILOT.eyebrow}
                  title={ENTERPRISE_PILOT.title}
                  accent={ENTERPRISE_PILOT.titleAccent}
                  copy={ENTERPRISE_PILOT.copy}
                  wide
                />
                <ol className="ent-steps">
                  {ENTERPRISE_PILOT.steps.map((step, index) => {
                    const visualKey = "visual" in step && step.visual ? step.visual : null;
                    const visual = visualKey ? STEP_VISUALS[visualKey] : null;
                    const stepClass = ["ent-step", visual && "has-visual", visualKey && WIDE_STEP_VISUALS.has(visualKey) && "is-wide"]
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

                <div className="ent-scope">
                  <SectionHead eyebrow={ENTERPRISE_SCOPE.eyebrow} title={ENTERPRISE_SCOPE.title} />
                  <div className="ent-scope__grid">
                    <div className="ent-scope__card is-in" data-reveal="left">
                      <p className="ent-scope__head">Included</p>
                      <ul>
                        {ENTERPRISE_SCOPE.included.map((item) => (
                          <li key={item.title}>
                            <Check aria-hidden="true" />
                            <div>
                              <strong>{item.title}</strong>
                              <span>{item.body}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="ent-scope__card is-out" data-reveal="right" style={revealDelay(120)}>
                      <p className="ent-scope__head">Not included</p>
                      <ul>
                        {ENTERPRISE_SCOPE.excluded.map((item) => (
                          <li key={item.title}>
                            <Minus aria-hidden="true" />
                            <div>
                              <strong>{item.title}</strong>
                              <span>{item.body}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="ent-scope__you" data-reveal="up">
                    <p className="ent-scope__you-head">
                      <Info aria-hidden="true" />
                      You provide
                    </p>
                    <ul>
                      {ENTERPRISE_PILOT.youProvide.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Programs differ in size, founders and length; the pilot is set up around each. */}
            <section className="ent-section">
              <div className="ent-container ent-adapt">
                <div>
                  <SectionHead eyebrow={ENTERPRISE_ADAPT.eyebrow} title={ENTERPRISE_ADAPT.title} />
                  <ul className="ent-adapt__list">
                    {ENTERPRISE_ADAPT.items.map((item, index) => {
                      const Icon = ADAPT_ICONS[item.key] ?? Users;
                      return (
                        <li key={item.key} data-reveal="left" style={revealDelay(index * 100)}>
                          <span className="ent-icon" aria-hidden="true">
                            <Icon />
                          </span>
                          <div>
                            <h3>{item.title}</h3>
                            <p>{item.body}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="ent-adapt__visual" data-reveal="zoom" style={revealDelay(150)}>
                  <PilotSetupMock />
                </div>
              </div>
            </section>

            {/* Post-program support: founders keep going on their own once the program ends. */}
            <section className="ent-section ent-section--tint">
              <div className="ent-container">
                <SectionHead eyebrow={ENTERPRISE_AFTER.eyebrow} title={ENTERPRISE_AFTER.title} copy={ENTERPRISE_AFTER.copy} wide />
                <div data-reveal="zoom">
                  <AfterProgramFlow
                    programStages={ENTERPRISE_HERO.cycle.pilotStages}
                    duringLabel={ENTERPRISE_AFTER.duringLabel}
                    endLabel={ENTERPRISE_AFTER.endLabel}
                    afterLabel={ENTERPRISE_AFTER.afterLabel}
                  />
                </div>
                <AfterProgramKeeps items={ENTERPRISE_AFTER.keeps} />
                <p className="ent-after__note" data-reveal="up">{ENTERPRISE_AFTER.note}</p>
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

            {/* Contact: a brand panel with what the pilot includes and who
                replies, and the form beside it. */}
            <section id={CONTACT_ID} className="ent-section ent-contact scroll-mt-24">
              <div className="ent-container">
                <div className="ent-contact__card" data-reveal="zoom">
                  <div className="ent-contact__panel">
                    <div className="ent-contact__glow" aria-hidden="true" />
                    <p className="ent-eyebrow ent-contact__eyebrow">{ENTERPRISE_CONTACT.eyebrow}</p>
                    <h2 className="ent-contact__title">{ENTERPRISE_CONTACT.title}</h2>
                    <p className="ent-contact__copy">{ENTERPRISE_CONTACT.copy}</p>

                    <p className="ent-contact__label">Every pilot includes</p>
                    <ul className="ent-contact__includes">
                      {ENTERPRISE_CONTACT.pilotIncludes.map((item) => (
                        <li key={item}>
                          <Check aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>

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
                      submitLabel="Request a pilot"
                      variant="plain"
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
