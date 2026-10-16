import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BarChart3,
  FileCheck2,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  ShieldCheck,
  Target,
  Users,
  Wrench,
} from "lucide-react";

import SEO, { createBreadcrumbSchema, createFAQSchema, createWebPageSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Badge } from "@/components/ui/badge";
import PageFAQSection from "@/components/seo/PageFAQSection";
import InstitutionContactForm from "@/components/audience/InstitutionContactForm";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { captureEvent } from "@/lib/analytics";
import { rememberIntendedAccountType } from "@/lib/intendedAccountType";
import type { AudienceCard, AudienceCta, AudienceIcon, AudiencePageContent } from "@/data/audiencePages";
import "@/components/hero-cinematic-spotlight.css";
import "./audience.css";

const ICONS: Record<AudienceIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  report: BarChart3,
  workspace: Layers,
  sponsor: Award,
  match: Target,
  evidence: FileCheck2,
  tools: Wrench,
  people: Users,
};

type AudienceLandingPageProps = {
  content: AudiencePageContent;
  /** The example visual for this audience (dashboard, report, stage strip...). */
  preview: ReactNode;
};

const SectionHeader = ({ badge, title, copy }: { badge: string; title: string; copy?: string }) => (
  <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
    <Badge variant="outline" className="homepage-section-badge mb-5">
      {badge}
    </Badge>
    <h2 className="homepage-section-title mb-4 text-3xl sm:text-4xl lg:text-[2.75rem]">{title}</h2>
    {copy ? <p className="homepage-section-copy text-base sm:text-lg">{copy}</p> : null}
  </div>
);

const AudienceLandingPage = ({ content, preview }: AudienceLandingPageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  usePageAnalytics(content.path, `${content.navLabel} - Creatives Takeover`);

  // Links like /for-investors#talk land on the form.
  // The router doesn't scroll to hashes, and the page is lazy-loaded, so wait a
  // frame for the section to exist.
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

  const structuredData = [
    createWebPageSchema({ name: content.seo.title, description: content.seo.description, url: content.path }),
    createBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: content.navLabel, url: content.path },
    ]),
    createFAQSchema(content.faqs),
  ];

  const trackCta = (cta: AudienceCta, placement: string) => {
    captureEvent("audience_page_cta_clicked", {
      audience: content.key,
      cta: cta.label,
      kind: cta.kind,
      placement,
    });
  };

  const renderCta = (cta: AudienceCta, placement: string, variant: "primary" | "secondary") => {
    const className = variant === "primary" ? "ct-hero__cta" : "ct-hero__cta ct-hero__cta--secondary";
    const label = (
      <>
        {cta.label}
        <ArrowRight aria-hidden="true" />
      </>
    );

    if (cta.kind === "link") {
      return (
        <Link key={cta.label} to={cta.href} className={className} onClick={() => trackCta(cta, placement)}>
          {label}
        </Link>
      );
    }

    if (cta.kind === "scroll") {
      return (
        <a
          key={cta.label}
          href={`#${cta.target}`}
          className={className}
          onClick={(event) => {
            event.preventDefault();
            trackCta(cta, placement);
            document.getElementById(cta.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          {label}
        </a>
      );
    }

    return (
      <button
        key={cta.label}
        type="button"
        className={className}
        onClick={() => {
          trackCta(cta, placement);
          // Pre-selects the account type in onboarding; the person still confirms it.
          rememberIntendedAccountType(cta.accountType);
          navigate("/signup");
        }}
      >
        {label}
      </button>
    );
  };

  const renderCard = (card: AudienceCard, index: number, numbered: boolean) => {
    const Icon = card.icon ? ICONS[card.icon] : null;
    return (
      <article key={card.title} className="audience-card surface-panel trust-outline">
        {Icon ? (
          <span className="audience-card__icon" aria-hidden="true">
            <Icon className="h-5 w-5" />
          </span>
        ) : numbered ? (
          <span className="audience-card__number" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
        ) : null}
        <h3 className="audience-card__title">{card.title}</h3>
        <p className="audience-card__body">{card.body}</p>
      </article>
    );
  };

  return (
    <>
      <SEO
        title={content.seo.title}
        description={content.seo.description}
        keywords={content.seo.keywords}
        url={content.path}
        image="/og-founders-compass-2026-09.png"
        structuredData={structuredData}
      />
      <div className="relative min-h-screen overflow-hidden">
        <HomeWallpaper variant="landing" />
        <div className="relative z-10">
          <Navigation />
          <main>
            <section className="ct-hero audience-hero" aria-label={content.navLabel}>
              <div className="ct-hero__container">
                <span className="ct-hero__eyebrow audience-hero__badge">{content.badge}</span>
                <h1 className="ct-hero__title">
                  <span className="ct-hero__title-row-1">{content.titleLead}</span>
                  <span className="ct-hero__title-row-2">{content.titleAccent}</span>
                </h1>
                <p className="ct-hero__lede">{content.lede}</p>
                <div className="ct-hero__cta-row">
                  {renderCta(content.primaryCta, "hero", "primary")}
                  {renderCta(content.secondaryCta, "hero", "secondary")}
                </div>
              </div>
            </section>

            <ScrollReveal variant="fade" amount={0.05}>
              <section className="section-shell audience-section">
                <div className="container mx-auto px-4 sm:px-6">
                  <SectionHeader {...content.problem} />
                  <div className="audience-grid">
                    {content.problem.items.map((item, index) => renderCard(item, index, true))}
                  </div>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fade" amount={0.05}>
              <section className="section-shell audience-section homepage-band-muted">
                <div className="container mx-auto px-4 sm:px-6">
                  <SectionHeader {...content.offer} />
                  <div className="audience-grid">
                    {content.offer.items.map((item, index) => renderCard(item, index, false))}
                  </div>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fade" amount={0.05}>
              <section className="section-shell audience-section">
                <div className="container mx-auto px-4 sm:px-6">
                  <SectionHeader {...content.preview} />
                  <div className="mx-auto max-w-5xl">{preview}</div>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fade" amount={0.05}>
              <section className="section-shell audience-section homepage-band-muted">
                <div className="container mx-auto px-4 sm:px-6">
                  <SectionHeader badge={content.steps.badge} title={content.steps.title} copy={content.steps.copy} />
                  <ol className="audience-steps">
                    {content.steps.items.map((step, index) => (
                      <li key={step.title} className="audience-step">
                        <span className="audience-step__number" aria-hidden="true">
                          {index + 1}
                        </span>
                        <h3 className="audience-card__title">{step.title}</h3>
                        <p className="audience-card__body">{step.body}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fade" amount={0.05}>
              <section className="audience-section px-4 pb-6 pt-16 sm:px-6">
                <div className="audience-trust surface-panel trust-outline">
                  <ShieldCheck className="audience-trust__icon" aria-hidden="true" />
                  <div>
                    <h2 className="audience-trust__title">{content.trust.title}</h2>
                    <p className="audience-card__body">{content.trust.body}</p>
                  </div>
                </div>
                {content.crossLink ? (
                  <p className="audience-crosslink">
                    {content.crossLink.text}{" "}
                    <Link
                      to={content.crossLink.href}
                      onClick={() => trackCta({ label: content.crossLink!.label, kind: "link", href: content.crossLink!.href }, "crosslink")}
                    >
                      {content.crossLink.label}
                      <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden="true" />
                    </Link>
                  </p>
                ) : null}
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fade" amount={0.05}>
              <section className="section-shell audience-section">
                <div className="container mx-auto max-w-5xl px-4 sm:px-6">
                  <PageFAQSection title="Questions" faqs={content.faqs} />
                </div>
              </section>
            </ScrollReveal>

            {content.contact ? (
              <section id="talk" className="section-shell audience-section homepage-band-muted scroll-mt-24">
                <div className="container mx-auto px-4 sm:px-6">
                  <SectionHeader badge="Talk to us" title={content.contact.title} copy={content.contact.copy} />
                  <div className="mx-auto max-w-2xl">
                    <InstitutionContactForm
                      audience={content.key}
                      defaultOrgType={content.contact.defaultOrgType}
                      submitLabel={content.contact.submitLabel}
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {content.closing ? (
              <section className="section-shell audience-section homepage-band-muted">
                <div className="container mx-auto px-4 text-center sm:px-6">
                  <h2 className="homepage-section-title mb-4 text-3xl sm:text-4xl">{content.closing.title}</h2>
                  <p className="homepage-section-copy mx-auto mb-8 max-w-xl text-base sm:text-lg">{content.closing.copy}</p>
                  <div className="ct-hero audience-closing">
                    <div className="ct-hero__cta-row">{renderCta(content.closing.cta, "closing", "primary")}</div>
                  </div>
                </div>
              </section>
            ) : null}
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AudienceLandingPage;
