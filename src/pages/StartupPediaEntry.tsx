import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import SEO, { createBreadcrumbSchema, createFAQSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PediaMarkdown from "@/components/startup-pedia/PediaMarkdown";
import NotFound from "@/pages/NotFound";
import { useAuth } from "@/contexts/AuthContext";
import { captureEvent } from "@/lib/analytics";
import {
  AUDIENCE_LABELS,
  AUDIENCE_ORDER,
  PEDIA_BASE_PATH,
  pediaCtaHref,
  entryPath,
  entryWordCount,
  getEntry,
  getRelatedEntries,
  getTopic,
  isTopicIndexable,
  topicPath,
} from "@/data/startupPedia";
import "@/components/startup-pedia/startup-pedia.css";

const SITE = "https://creatives-takeover.com";
// The byline links to the author's Founder ID profile (requested 2026-10-25).
const AUTHOR_PROFILE_PATH = "/profile/javier";
const AUTHOR = { "@type": "Person", "@id": `${SITE}/about#founder`, name: "Javier Peña", jobTitle: "Founder & CEO", url: `${SITE}${AUTHOR_PROFILE_PATH}` };

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export default function StartupPediaEntry() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { hash } = useLocation();
  const { user } = useAuth();
  const entry = getEntry(slug);

  // Shortcut links point at section anchors (/startup-pedia/tam-sam-som#sam);
  // client-side navigation does not scroll to them on its own.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) window.requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
  }, [slug, hash]);

  if (!entry) return <NotFound />;

  const topic = getTopic(entry.topic);
  const related = getRelatedEntries(entry);
  const url = entryPath(entry.slug);
  const minutes = Math.max(2, Math.round(entryWordCount(entry) / 200));
  const roleNotes = AUDIENCE_ORDER.filter((key) => entry.roleNotes?.[key]);
  const toc = [
    ...(entry.formulas?.length ? [{ id: "formula", heading: entry.formulas.length > 1 ? "Formulas" : "Formula" }] : []),
    ...(entry.steps?.length ? [{ id: "steps", heading: "Step by step" }] : []),
    ...entry.sections.map((section) => ({ id: section.id, heading: section.heading })),
    ...(roleNotes.length ? [{ id: "for-your-role", heading: "For your role" }] : []),
    { id: "faq", heading: "Questions" },
  ];

  const structuredData = [
    createBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Startup Pedia", url: PEDIA_BASE_PATH },
      ...(topic && isTopicIndexable(topic.key) ? [{ name: topic.label, url: topicPath(topic.key) }] : []),
      { name: entry.title, url },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: entry.title,
      description: entry.metaDescription,
      datePublished: entry.publishedAt,
      dateModified: entry.modifiedAt,
      author: AUTHOR,
      publisher: {
        "@type": "Organization",
        name: "Creatives Takeover",
        logo: { "@type": "ImageObject", url: `${SITE}/favicon-192x192.png` },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}${url}` },
      ...(entry.sources.length ? { citation: entry.sources.map((source) => source.url) } : {}),
      ...(topic ? { articleSection: topic.label } : {}),
    },
    ...(entry.kind === "term"
      ? [
          {
            "@context": "https://schema.org",
            "@type": "DefinedTerm",
            name: entry.acronyms?.length ? entry.acronyms.join(", ") : entry.title,
            ...(entry.aliases?.length ? { alternateName: entry.aliases } : {}),
            description: entry.answer,
            url: `${SITE}${url}`,
            inDefinedTermSet: `${SITE}${PEDIA_BASE_PATH}#terms`,
          },
        ]
      : []),
    createFAQSchema(entry.faqs),
  ];

  return (
    <div className="sp">
      <SEO
        title={entry.metaTitle}
        description={entry.metaDescription}
        url={url}
        type="article"
        author="Javier Peña"
        publishedTime={entry.publishedAt}
        modifiedTime={entry.modifiedAt}
        structuredData={structuredData}
      />
      <Navigation />
      <main className="sp-main">
        <nav aria-label="Breadcrumb" className="sp-muted text-sm">
          <Link to={PEDIA_BASE_PATH} className="sp-link">
            Startup Pedia
          </Link>
          {topic ? (
            <>
              <span aria-hidden="true"> / </span>
              {isTopicIndexable(topic.key) ? (
                <Link to={topicPath(topic.key)} className="sp-link">
                  {topic.label}
                </Link>
              ) : (
                <span>{topic.label}</span>
              )}
            </>
          ) : null}
        </nav>

        <div className="sp-entry-grid mt-6">
          <article className="min-w-0">
            <header>
              <span className="sp-kind">{entry.kind === "term" ? "Term" : "Guide"}</span>
              <h1 className="sp-title mt-4 text-3xl sm:text-5xl">{entry.title}</h1>
              <p className="sp-muted mt-4 text-sm">
                By{" "}
                <Link to={AUTHOR_PROFILE_PATH} className="sp-link">
                  Javier Peña
                </Link>{" "}
                · Updated <time dateTime={entry.modifiedAt}>{formatDate(entry.modifiedAt)}</time> · {minutes} min read
              </p>
            </header>

            <p className="sp-answer mt-8">{entry.answer}</p>

            <div className="sp-prose mt-4">
              {entry.formulas?.length ? (
                <section aria-labelledby="formula">
                  <h2 id="formula">{entry.formulas.length > 1 ? "Formulas" : "Formula"}</h2>
                  <div className="grid gap-3">
                    {entry.formulas.map((formula) => (
                      <div key={formula.label} className="sp-formula">
                        <div className="sp-formula-label">{formula.label}</div>
                        <div className="sp-formula-expr">{formula.expression}</div>
                        {formula.note ? <p className="sp-muted !mb-0 !mt-2 text-sm">{formula.note}</p> : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {entry.steps?.length ? (
                <section aria-labelledby="steps">
                  <h2 id="steps">Step by step</h2>
                  <ol className="!list-none !pl-0">
                    {entry.steps.map((step, index) => (
                      <li key={step.title} className="!my-5 flex gap-4">
                        <span className="sp-step-num">{index + 1}</span>
                        <div className="min-w-0">
                          <h3 className="!mt-1">{step.title}</h3>
                          <PediaMarkdown>{step.body}</PediaMarkdown>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {entry.sections.map((section) => (
                <section key={section.id} aria-labelledby={section.id}>
                  <h2 id={section.id}>{section.heading}</h2>
                  <PediaMarkdown>{section.body}</PediaMarkdown>
                </section>
              ))}

              {roleNotes.length ? (
                <section aria-labelledby="for-your-role">
                  <h2 id="for-your-role">For your role</h2>
                  <dl className="sp-card divide-y divide-[color:var(--sp-line)] px-5">
                    {roleNotes.map((key) => (
                      <div key={key} className="py-4">
                        <dt className="text-sm font-semibold text-[color:var(--sp-ink)]">{AUDIENCE_LABELS[key]}</dt>
                        <dd className="mt-1">{entry.roleNotes?.[key]}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}
            </div>

            {entry.cta ? (
              <aside className="sp-cta mt-12" aria-label="Put it into practice">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">Put it into practice</p>
                <p className="mt-2 max-w-xl text-base leading-relaxed">{entry.cta.description}</p>
                <Link
                  to={pediaCtaHref(entry.cta.href, entry.slug, Boolean(user))}
                  className="sp-cta-button"
                  onClick={() =>
                    captureEvent("startup_pedia_cta_click", {
                      entry_slug: entry.slug,
                      target: entry.cta?.href,
                      destination: pediaCtaHref(entry.cta?.href ?? "", entry.slug, Boolean(user)).startsWith("/signup") ? "signup" : "page",
                    })
                  }
                >
                  {entry.cta.label} <ArrowRight className="h-4 w-4" />
                </Link>
              </aside>
            ) : null}

            <section aria-labelledby="faq" className="sp-faq mt-12">
              <h2 id="faq" className="sp-title text-2xl">Questions</h2>
              <div className="mt-3">
                {entry.faqs.map((faq) => (
                  <details key={faq.question}>
                    <summary>{faq.question}</summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>

            {entry.sources.length ? (
              <section aria-labelledby="sources" className="mt-12">
                <h2 id="sources" className="sp-title text-xl">Sources and further reading</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {entry.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="sp-link">
                        {source.title}
                      </a>{" "}
                      <span className="sp-muted">· {source.publisher}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {related.length ? (
              <section aria-labelledby="related" className="mt-12">
                <h2 id="related" className="sp-title text-xl">Related entries</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {related.map((item) => (
                    <li key={item.slug}>
                      <Link to={entryPath(item.slug)} className="sp-card group flex h-full flex-col p-4">
                        <span className="sp-kind self-start">{item.kind === "term" ? "Term" : "Guide"}</span>
                        <span className="mt-2 font-semibold leading-snug group-hover:text-[color:var(--sp-ink)]">{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>

          <aside className="hidden lg:block" aria-label="On this page">
            <div className="sp-toc">
              <p className="sp-muted mb-3 text-xs font-semibold uppercase tracking-[0.14em]">On this page</p>
              <nav>
                {toc.map((item) => (
                  <a key={item.id} href={`#${item.id}`}>
                    {item.heading}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
