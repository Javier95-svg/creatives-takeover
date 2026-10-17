import { useEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Info,
  Mail,
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
  CheckInCard,
  CohortReportMock,
  CycleStrip,
  EvidenceCallouts,
  PilotBoardMock,
  PilotSetupMock,
  ProductShot,
} from "@/components/enterprise/EnterpriseVisuals";
import javierPhoto from "@/assets/team-javier-pena-profile.jpg";
import icpBuilderShot from "@/assets/enterprise/icp-builder.webp";
import icpBuilderLightShot from "@/assets/enterprise/icp-builder-light.webp";
import pmfLabShot from "@/assets/enterprise/pmf-lab.webp";
import pmfLabLightShot from "@/assets/enterprise/pmf-lab-light.webp";
import founderWorkspaceShot from "@/assets/enterprise/founder-workspace.webp";
import founderWorkspaceLightShot from "@/assets/enterprise/founder-workspace-light.webp";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { captureEvent } from "@/lib/analytics";
import {
  ENTERPRISE_ADAPT,
  ENTERPRISE_AFTER,
  ENTERPRISE_CONTACT,
  ENTERPRISE_FAQS,
  ENTERPRISE_HERO,
  ENTERPRISE_OUTCOMES,
  ENTERPRISE_PATH,
  ENTERPRISE_PILOT,
  ENTERPRISE_SEO,
} from "@/data/enterprisePage";
import "@/components/enterprise/enterprise.css";

const CONTACT_ID = "talk";

// Each outcome is shown, not described: the real product screen that produces
// it, or an example of what the program receives.
const OUTCOME_VISUALS: Record<string, ReactNode> = {
  plan: (
    <ProductShot
      src={icpBuilderShot}
      lightSrc={icpBuilderLightShot}
      width={1152}
      height={1137}
      title="ICP Builder"
      alt="ICP Builder in the sample workspace: an idea score, a draft ideal customer, and the steps from market to experiment and recommendation."
    />
  ),
  evidence: (
    <div className="ent-outcome__stack ent-outcome__stack--evidence">
      <ProductShot
        src={pmfLabShot}
        lightSrc={pmfLabLightShot}
        width={1400}
        height={1178}
        title="PMF Lab · Evidence"
        fade={false}
        alt="PMF Lab's evidence log in the sample workspace: calls, newsletter replies, an objection and an out-of-segment signal, 21 of 25 signals logged, with the verdict locked until the threshold is met."
      />
      <EvidenceCallouts />
    </div>
  ),
  report: <CohortReportMock />,
  admin: (
    <div className="ent-outcome__stack">
      <ProductShot
        src={founderWorkspaceShot}
        lightSrc={founderWorkspaceLightShot}
        width={1200}
        height={1044}
        title="Founder workspace"
        alt="A founder's workspace in the sample workspace: today's focus with the next tasks in PMF Lab and Demo Studio, and shortcuts to find a mentor or a co-founder."
      />
      <CheckInCard />
    </div>
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

const SectionHead = ({ eyebrow, title, copy, wide = false }: { eyebrow: string; title: string; copy?: string; wide?: boolean }) => (
  <header className={wide ? 'ent-head ent-head--wide' : 'ent-head'} data-reveal="up">
    <p className="ent-eyebrow">{eyebrow}</p>
    <h2 className="ent-h2">{title}</h2>
    {copy ? <p className="ent-head__copy">{copy}</p> : null}
  </header>
);

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

            {/* The four outcomes, each with the screen or document that delivers it. */}
            <section className="ent-section">
              <div className="ent-container">
                <SectionHead eyebrow={ENTERPRISE_OUTCOMES.eyebrow} title={ENTERPRISE_OUTCOMES.title} wide />
                <ol className="ent-outcomes">
                  {ENTERPRISE_OUTCOMES.items.map((outcome, index) => (
                    <li key={outcome.key} className="ent-outcome">
                      {/* Text slides in from its own side; the screen rises and grows in beside it. */}
                      <div className="ent-outcome__grid">
                        <div className="ent-outcome__text" data-reveal={index % 2 === 0 ? "left" : "right"}>
                          <p className="ent-outcome__meta">
                            <span className="ent-outcome__num">{String(index + 1).padStart(2, "0")}</span>
                            <span className="ent-outcome__when">{outcome.when}</span>
                          </p>
                          <h3 className="ent-outcome__title">{outcome.title}</h3>
                          <ul className="ent-outcome__includes">
                            {outcome.includes.map((item, itemIndex) => (
                              <li key={item} data-reveal="up" style={revealDelay(250 + itemIndex * 80)}>
                                <Check aria-hidden="true" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="ent-outcome__visual" data-reveal="zoom" style={revealDelay(120)}>
                          {OUTCOME_VISUALS[outcome.key]}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* How the pilot runs: the 30 days, who brings what, and what it won't do. */}
            <section className="ent-section ent-section--tint">
              <div className="ent-container">
                <SectionHead eyebrow={ENTERPRISE_PILOT.eyebrow} title={ENTERPRISE_PILOT.title} />
                <ol className="ent-track">
                  {ENTERPRISE_PILOT.track.map((step, index) => (
                    <li
                      key={step.when}
                      className={index === 0 || index === ENTERPRISE_PILOT.track.length - 1 ? "is-key" : undefined}
                      data-reveal="up"
                      style={revealDelay(index * 90)}
                    >
                      <span className="ent-track__dot" aria-hidden="true" />
                      <span className="ent-track__when">{step.when}</span>
                      <span className="ent-track__label">{step.label}</span>
                    </li>
                  ))}
                </ol>

                <div className="ent-terms">
                  <div className="ent-terms__card is-ours" data-reveal="left">
                    <p className="ent-terms__head">We provide</p>
                    <ul>
                      {ENTERPRISE_PILOT.weProvide.map((item) => (
                        <li key={item}>
                          <Check aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="ent-terms__card" data-reveal="right" style={revealDelay(120)}>
                    <p className="ent-terms__head">You provide</p>
                    <ul>
                      {ENTERPRISE_PILOT.youProvide.map((item) => (
                        <li key={item}>
                          <Check aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="ent-terms__honest" data-reveal="up">
                  <Info aria-hidden="true" />
                  {ENTERPRISE_PILOT.honesty}
                </p>
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
