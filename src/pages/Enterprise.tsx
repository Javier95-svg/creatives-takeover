import { useEffect, type MouseEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BarChart3, Bell, Check, FileCheck2, Kanban, Layers, Mail, ShieldCheck } from "lucide-react";

import SEO, { createBreadcrumbSchema, createFAQSchema, createWebPageSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import InstitutionContactForm from "@/components/audience/InstitutionContactForm";
import {
  CohortBoardMock,
  FounderRecord,
  NetworkHub,
  ReportMini,
  StallAlerts,
  TeamProgressList,
  ToolFlow,
  VisibilitySplit,
} from "@/components/enterprise/EnterpriseVisuals";
import javierPhoto from "@/assets/team-javier-pena-profile.jpg";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { captureEvent } from "@/lib/analytics";
import {
  ENTERPRISE_COMPARISON,
  ENTERPRISE_CONTACT,
  ENTERPRISE_FAQS,
  ENTERPRISE_FEATURES,
  ENTERPRISE_HERO,
  ENTERPRISE_PATH,
  ENTERPRISE_PERKS,
  ENTERPRISE_SEO,
  ENTERPRISE_STEPS,
} from "@/data/enterprisePage";
import "@/components/enterprise/enterprise.css";

const CONTACT_ID = "talk";

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
            {/* Hero: promise, the three things a program gets, and the product. */}
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

                  <ul className="ent-hero__points">
                    {ENTERPRISE_HERO.points.map((point) => (
                      <li key={point}>
                        <Check aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <p className="ent-hero__note">{ENTERPRISE_HERO.note}</p>
                </div>

                <div className="ent-hero__visual">
                  <CohortBoardMock />
                </div>
              </div>
            </section>

            {/* Before and after: the switch in four lines. */}
            <ScrollReveal variant="fade" amount={0.1}>
              <section className="ent-section">
                <div className="ent-container">
                  <SectionHead eyebrow={ENTERPRISE_COMPARISON.eyebrow} title={ENTERPRISE_COMPARISON.title} />
                  <div className="ent-compare" role="table" aria-label={ENTERPRISE_COMPARISON.title}>
                    <div className="ent-compare__row ent-compare__row--head" role="row">
                      <span role="columnheader" />
                      <span role="columnheader">Today</span>
                      <span role="columnheader" className="is-after">With Creatives Takeover</span>
                    </div>
                    {ENTERPRISE_COMPARISON.rows.map((row) => (
                      <div key={row.topic} className="ent-compare__row" role="row">
                        <span role="rowheader" className="ent-compare__topic">{row.topic}</span>
                        <span role="cell" className="ent-compare__before">{row.before}</span>
                        <span role="cell" className="ent-compare__after">
                          <Check aria-hidden="true" />
                          {row.after}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </ScrollReveal>

            {/* The CRM, each feature shown with the product. */}
            <ScrollReveal variant="fade" amount={0.08}>
              <section className="ent-section ent-section--tint">
                <div className="ent-container">
                  <SectionHead eyebrow={ENTERPRISE_FEATURES.eyebrow} title={ENTERPRISE_FEATURES.title} />
                  <div className="ent-bento">
                    <article className="ent-tile ent-tile--pipeline">
                      <div className="ent-tile__text">
                        <Kanban className="ent-tile__icon" aria-hidden="true" />
                        <h3>{ENTERPRISE_FEATURES.pipeline.title}</h3>
                        <p>{ENTERPRISE_FEATURES.pipeline.body}</p>
                      </div>
                      <TeamProgressList />
                    </article>

                    <article className="ent-tile ent-tile--alerts">
                      <div className="ent-tile__text">
                        <Bell className="ent-tile__icon" aria-hidden="true" />
                        <h3>{ENTERPRISE_FEATURES.alerts.title}</h3>
                        <p>{ENTERPRISE_FEATURES.alerts.body}</p>
                      </div>
                      <StallAlerts />
                    </article>

                    <article className="ent-tile ent-tile--record">
                      <div className="ent-tile__text">
                        <FileCheck2 className="ent-tile__icon" aria-hidden="true" />
                        <h3>{ENTERPRISE_FEATURES.record.title}</h3>
                        <p>{ENTERPRISE_FEATURES.record.body}</p>
                      </div>
                      <FounderRecord />
                    </article>

                    <article className="ent-tile ent-tile--report">
                      <div className="ent-tile__text">
                        <BarChart3 className="ent-tile__icon" aria-hidden="true" />
                        <h3>{ENTERPRISE_FEATURES.report.title}</h3>
                        <p>{ENTERPRISE_FEATURES.report.body}</p>
                      </div>
                      <ReportMini />
                    </article>

                    <article className="ent-tile ent-tile--privacy">
                      <div className="ent-tile__text">
                        <ShieldCheck className="ent-tile__icon is-good" aria-hidden="true" />
                        <h3>{ENTERPRISE_FEATURES.privacy.title}</h3>
                        <p>{ENTERPRISE_FEATURES.privacy.body}</p>
                      </div>
                      <VisibilitySplit />
                    </article>
                  </div>
                </div>
              </section>
            </ScrollReveal>

            {/* What every founder in the cohort gets for joining. */}
            <ScrollReveal variant="fade" amount={0.08}>
              <section className="ent-section">
                <div className="ent-container">
                  <SectionHead eyebrow={ENTERPRISE_PERKS.eyebrow} title={ENTERPRISE_PERKS.title} copy={ENTERPRISE_PERKS.copy} />
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

            {/* The pilot, on a timeline. */}
            <ScrollReveal variant="fade" amount={0.1}>
              <section className="ent-section">
                <div className="ent-container">
                  <SectionHead eyebrow={ENTERPRISE_STEPS.eyebrow} title={ENTERPRISE_STEPS.title} copy={ENTERPRISE_STEPS.copy} />
                  <ol className="ent-timeline">
                    {ENTERPRISE_STEPS.items.map((step, index) => (
                      <li key={step.title}>
                        <span className="ent-timeline__marker" aria-hidden="true">
                          {index + 1}
                        </span>
                        <p className="ent-timeline__when">{step.when}</p>
                        <h3>{step.title}</h3>
                        <p>{step.body}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fade" amount={0.1}>
              <section className="ent-section ent-section--tint">
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
