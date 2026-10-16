import { useEffect, type MouseEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight, CalendarDays, Check, Info, Layers, Mail, Target, Users } from "lucide-react";

import SEO, { createBreadcrumbSchema, createFAQSchema, createWebPageSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import InstitutionContactForm from "@/components/audience/InstitutionContactForm";
import {
  CheckInCard,
  CohortReportMock,
  NetworkHub,
  PilotBoardMock,
  PilotSetupMock,
  ProductShot,
  ToolFlow,
} from "@/components/enterprise/EnterpriseVisuals";
import javierPhoto from "@/assets/team-javier-pena-profile.jpg";
import icpBuilderShot from "@/assets/enterprise/icp-builder.webp";
import pmfLabShot from "@/assets/enterprise/pmf-lab.webp";
import founderWorkspaceShot from "@/assets/enterprise/founder-workspace.webp";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { captureEvent } from "@/lib/analytics";
import {
  ENTERPRISE_ADAPT,
  ENTERPRISE_CONTACT,
  ENTERPRISE_FAQS,
  ENTERPRISE_HERO,
  ENTERPRISE_OUTCOMES,
  ENTERPRISE_PATH,
  ENTERPRISE_PERKS,
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
      width={1152}
      height={1137}
      title="ICP Builder"
      alt="ICP Builder in the sample workspace: an idea score, a draft ideal customer, and the steps from market to experiment and recommendation."
    />
  ),
  evidence: (
    <ProductShot
      src={pmfLabShot}
      width={1171}
      height={1280}
      title="PMF Lab"
      alt="PMF Lab in the sample workspace: calls, replies and objections logged as evidence, 21 of 25 signals, with the verdict locked until the threshold is met."
    />
  ),
  report: <CohortReportMock />,
  admin: (
    <div className="ent-outcome__stack">
      <ProductShot
        src={founderWorkspaceShot}
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

const SectionHead = ({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) => (
  <header className="ent-head">
    <p className="ent-eyebrow">{eyebrow}</p>
    <h2 className="ent-h2">{title}</h2>
    {copy ? <p className="ent-head__copy">{copy}</p> : null}
  </header>
);

const Enterprise = () => {
  const location = useLocation();
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
      <div className="ent relative min-h-screen overflow-hidden">
        <HomeWallpaper variant="landing" />
        <div className="relative z-10">
          <Navigation />
          <main>
            {/* Hero: the pilot offer, its terms at a glance, and the pilot as a program sees it. */}
            <section className="ent-hero" aria-labelledby="ent-title">
              <div className="ent-hero__backdrop" aria-hidden="true" />
              <div className="ent-container ent-hero__grid">
                <div className="ent-hero__copy">
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
                  <p className="ent-hero__note">{ENTERPRISE_HERO.note}</p>
                </div>

                <div className="ent-hero__visual">
                  <PilotBoardMock />
                </div>
              </div>
            </section>

            {/* The four outcomes, each with the screen or document that delivers it. */}
            <section className="ent-section">
              <div className="ent-container">
                <SectionHead eyebrow={ENTERPRISE_OUTCOMES.eyebrow} title={ENTERPRISE_OUTCOMES.title} />
                <ol className="ent-outcomes">
                  {ENTERPRISE_OUTCOMES.items.map((outcome, index) => (
                    <li key={outcome.key} className="ent-outcome">
                      <ScrollReveal variant="fade" amount={0.15}>
                        <div className="ent-outcome__grid">
                          <div className="ent-outcome__text">
                            <p className="ent-outcome__meta">
                              <span className="ent-outcome__num">{String(index + 1).padStart(2, "0")}</span>
                              <span className="ent-outcome__when">{outcome.when}</span>
                            </p>
                            <h3 className="ent-outcome__title">{outcome.title}</h3>
                            <ul className="ent-outcome__includes">
                              {outcome.includes.map((item) => (
                                <li key={item}>
                                  <Check aria-hidden="true" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="ent-outcome__visual">{OUTCOME_VISUALS[outcome.key]}</div>
                        </div>
                      </ScrollReveal>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* How the pilot runs: the 30 days, who brings what, and what it won't do. */}
            <ScrollReveal variant="fade" amount={0.1}>
              <section className="ent-section ent-section--tint">
                <div className="ent-container">
                  <SectionHead eyebrow={ENTERPRISE_PILOT.eyebrow} title={ENTERPRISE_PILOT.title} />
                  <ol className="ent-track">
                    {ENTERPRISE_PILOT.track.map((step, index) => (
                      <li key={step.when} className={index === 0 || index === ENTERPRISE_PILOT.track.length - 1 ? "is-key" : undefined}>
                        <span className="ent-track__dot" aria-hidden="true" />
                        <span className="ent-track__when">{step.when}</span>
                        <span className="ent-track__label">{step.label}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="ent-terms">
                    <div className="ent-terms__card is-ours">
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
                    <div className="ent-terms__card">
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
                  <p className="ent-terms__honest">
                    <Info aria-hidden="true" />
                    {ENTERPRISE_PILOT.honesty}
                  </p>
                </div>
              </section>
            </ScrollReveal>

            {/* Programs differ in size, founders and length; the pilot is set up around each. */}
            <ScrollReveal variant="fade" amount={0.1}>
              <section className="ent-section">
                <div className="ent-container ent-adapt">
                  <div>
                    <SectionHead eyebrow={ENTERPRISE_ADAPT.eyebrow} title={ENTERPRISE_ADAPT.title} />
                    <ul className="ent-adapt__list">
                      {ENTERPRISE_ADAPT.items.map((item) => {
                        const Icon = ADAPT_ICONS[item.key] ?? Users;
                        return (
                          <li key={item.key}>
                            <span className="ent-hub__icon" aria-hidden="true">
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
                  <div className="ent-adapt__visual">
                    <PilotSetupMock />
                  </div>
                </div>
              </section>
            </ScrollReveal>

            {/* The ecosystem every founder in the pilot joins. */}
            <ScrollReveal variant="fade" amount={0.08}>
              <section className="ent-section ent-section--tint">
                <div className="ent-container">
                  <SectionHead eyebrow={ENTERPRISE_PERKS.eyebrow} title={ENTERPRISE_PERKS.title} />
                  <div className="ent-perks">
                    <article className="ent-tile ent-perks__tools">
                      <div className="ent-tile__text">
                        <Layers className="ent-tile__icon" aria-hidden="true" />
                        <h3>{ENTERPRISE_PERKS.tools.title}</h3>
                        <p>{ENTERPRISE_PERKS.tools.body}</p>
                      </div>
                      <ToolFlow />
                    </article>
                    <NetworkHub nodes={ENTERPRISE_PERKS.network} />
                  </div>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fade" amount={0.1}>
              <section className="ent-section">
                <div className="ent-container ent-faq">
                  <div className="ent-faq__intro">
                    <p className="ent-eyebrow">Questions</p>
                    <h2 className="ent-h2">What programs ask us</h2>
                    <p className="ent-head__copy">
                      Something else on your mind?{" "}
                      <a href="mailto:javier@creatives-takeover.com?subject=Programs%20and%20partnerships">Email us</a>.
                    </p>
                  </div>
                  <Accordion type="single" collapsible className="ent-faq__list">
                    {ENTERPRISE_FAQS.map((faq, index) => (
                      <AccordionItem key={faq.question} value={`faq-${index}`} className="ent-faq__item">
                        <AccordionTrigger className="ent-faq__q">{faq.question}</AccordionTrigger>
                        <AccordionContent className="ent-faq__a">{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </section>
            </ScrollReveal>

            {/* Contact: a brand panel with what the pilot includes and who
                replies, and the form beside it. */}
            <section id={CONTACT_ID} className="ent-section ent-contact scroll-mt-24">
              <div className="ent-container">
                <div className="ent-contact__card">
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
