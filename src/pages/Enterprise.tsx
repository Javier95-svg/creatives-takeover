import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { PILOT_CALL_URL } from "@/config/pilotCall";
import { useLocation } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  CalendarCheck,
  Check,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Rocket,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import SEO, { createBreadcrumbSchema, createFAQSchema, createWebPageSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import InstitutionContactForm from "@/components/audience/InstitutionContactForm";
import {
  EvidenceCard,
  PilotSetupMock,
  OutcomeCards,
  ProductShot,
  SampleReport,
} from "@/components/enterprise/EnterpriseVisuals";
import javierPhoto from "@/assets/team-javier-pena-profile.jpg";
import cohortProgramShot from "@/assets/enterprise/cohort-program.webp";
import cohortProgramLightShot from "@/assets/enterprise/cohort-program-light.webp";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { captureEvent } from "@/lib/analytics";
import {
  ENTERPRISE_AFTER,
  ENTERPRISE_CONTACT,
  ENTERPRISE_DEAL,
  ENTERPRISE_FAQS,
  ENTERPRISE_OUTCOMES,
  ENTERPRISE_HERO,
  ENTERPRISE_PATH,
  ENTERPRISE_PILOT,
  ENTERPRISE_REPORT,
  ENTERPRISE_SEO,
} from "@/data/enterprisePage";
import "@/components/enterprise/enterprise.css";

const CONTACT_ID = "talk";
const HOW_ID = "how";
const REPORT_ID = "report";

// Real dashboard with two points of interest.
const HERO_DASHBOARD = (
  <ProductShot
    src={cohortProgramShot}
    lightSrc={cohortProgramLightShot}
    width={1176}
    height={955}
    title="Program dashboard"
    fade={false}
    hotspots={[
      { left: 83, top: 37.6, label: "Needs attention", side: "left" },
      { left: 40.5, top: 45.1, label: "Recorded activity / total", side: "below" },
    ]}
    alt="The program dashboard for five startups: customer profiles ready, median interviews, experiments run, check-ins this week and startups that need attention, then one row per startup with stage, tasks, interviews, evidence, experiments, last activity, check-in and attention flags such as a reported blocker or no interviews logged."
  />
);

// Icons for the hero's trust line and for what the program gets.
const TRUST_ICONS: Record<string, LucideIcon> = { contact: Users, consent: UserCheck, iso: ShieldCheck };
const GET_ICONS: Record<string, LucideIcon> = { dashboard: LayoutDashboard, summary: CalendarCheck, report: FileText, kickoff: Rocket };
const REPORT_ICONS: Record<string, LucideIcon> = { cohort: LayoutDashboard, next: ArrowRight, confirmed: ShieldCheck };

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
            {/* Hero: the pilot offer, its terms at a glance and three trust facts,
                beside the real program dashboard (version B). */}
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
                    <a href={ENTERPRISE_HERO.secondaryCta.href} className="ent-btn ent-btn--ghost" onClick={() => track(ENTERPRISE_HERO.secondaryCta.label, "hero")}>
                      {ENTERPRISE_HERO.secondaryCta.label}
                      <ArrowDown aria-hidden="true" />
                    </a>
                  </div>

                  <ul className="ent-hero__trust">
                    {ENTERPRISE_HERO.trust.map((item) => {
                      const Icon = TRUST_ICONS[item.key] ?? ShieldCheck;
                      return (
                        <li key={item.key}>
                          <Icon aria-hidden="true" />
                          {item.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Product evidence before the engagement details. */}
                <div className="ent-hero__visual" data-reveal="zoom" style={revealDelay(150)}>
                  {HERO_DASHBOARD}
                  <Dialog>
                    <DialogTrigger asChild>
                      <button type="button" className="ent-btn ent-btn--ghost ent-dashboard-expand">Enlarge dashboard</button>
                    </DialogTrigger>
                    <DialogContent className="ent-dashboard-dialog">
                      <DialogTitle>Program dashboard</DialogTitle>
                      <DialogDescription>Real product · Sample data. Activity counts inform support decisions; they do not independently verify business results.</DialogDescription>
                      <div className="ent-dashboard-detail">
                        <img className="block dark:hidden" src={cohortProgramLightShot} width={1176} height={955} alt="Sample program dashboard showing cohort activity and support flags for five startups." />
                        <img className="hidden dark:block" src={cohortProgramShot} width={1176} height={955} alt="Sample program dashboard showing cohort activity and support flags for five startups." />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </section>

            {/* Outcomes: what the program gets from partnering with us, in the order it happens. */}
            <section className="ent-section">
              <div className="ent-container">
                <SectionHead
                  eyebrow={ENTERPRISE_OUTCOMES.eyebrow}
                  title={ENTERPRISE_OUTCOMES.title}
                  copy={ENTERPRISE_OUTCOMES.copy}
                  wide
                />
                <OutcomeCards items={ENTERPRISE_OUTCOMES.items} />
              </div>
            </section>

            {/* Sample deliverable, clearly distinguished from customer results. */}
            <section id={REPORT_ID} className="ent-section scroll-mt-24">
              <div className="ent-container ent-adapt">
                <div>
                  <SectionHead eyebrow={ENTERPRISE_REPORT.eyebrow} title={ENTERPRISE_REPORT.title} />
                  <ul className="ent-adapt__list">
                    {ENTERPRISE_REPORT.points.map((point, index) => {
                      const Icon = REPORT_ICONS[point.key] ?? FileText;
                      return (
                        <li key={point.key} data-reveal="left" style={revealDelay(index * 100)}>
                          <span className="ent-icon" aria-hidden="true">
                            <Icon />
                          </span>
                          <div>
                            <h3>{point.title}</h3>
                            <p>{point.body}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="ent-adapt__visual" data-reveal="zoom" style={revealDelay(150)}>
                  <SampleReport />
                </div>
              </div>
            </section>

            {/* Compact delivery sequence, with responsibilities made explicit. */}
            <section id={HOW_ID} className="ent-section ent-section--tint scroll-mt-24">
              <div className="ent-container">
                <SectionHead
                  eyebrow={ENTERPRISE_PILOT.eyebrow}
                  title={ENTERPRISE_PILOT.title}
                  copy={ENTERPRISE_PILOT.copy}
                  wide
                />
                <ol className="ent-process">
                  {ENTERPRISE_PILOT.steps.map((step, index) => (
                    <li key={step.key}>
                      <span className="ent-process__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                      <p className="ent-step__meta">{step.when} · {step.owner}</p>
                      <h3 className="ent-step__title">{step.title}</h3>
                      <p className="ent-step__copy">{step.body}</p>
                      <EvidenceCard kind={step.key} />
                    </li>
                  ))}
                </ol>
                <p className="ent-honesty" data-reveal="up">{ENTERPRISE_PILOT.honesty}</p>
              </div>
            </section>

            {/* What the program gets and what it provides, then where founders go after day 30. */}
            <section className="ent-section">
              <div className="ent-container">
                <SectionHead eyebrow={ENTERPRISE_DEAL.eyebrow} title={ENTERPRISE_DEAL.title} copy={ENTERPRISE_DEAL.copy} wide />
                <div className="ent-deal">
                  <div className="ent-scope__card is-in ent-deal__card" data-reveal="left">
                    <p className="ent-scope__head ent-conditions__head">
                      <span className="ent-icon" aria-hidden="true">
                        <Check />
                      </span>
                      {ENTERPRISE_DEAL.get.title}
                    </p>
                    <EvidenceCard kind="join" />
                    <ul>
                      {ENTERPRISE_DEAL.get.items.map((item) => {
                        const Icon = GET_ICONS[item.key] ?? Check;
                        return (
                          <li key={item.key}>
                            <Icon aria-hidden="true" />
                            <div>
                              <strong>{item.title}</strong>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="ent-pilot-package" data-reveal="right" style={revealDelay(120)}>
                    <PilotSetupMock />
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
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
                <div className="ent-deal__after" data-reveal="zoom">
                  <h3 className="ent-conditions__title">{ENTERPRISE_AFTER.title}</h3>
                  <p className="ent-head__copy">{ENTERPRISE_AFTER.copy}</p>
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

                    <EvidenceCard kind="call" />

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
