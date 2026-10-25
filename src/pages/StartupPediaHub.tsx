import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Search, X } from "lucide-react";

import SEO, { createBreadcrumbSchema, createCollectionSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { captureEvent } from "@/lib/analytics";
import {
  AUDIENCE_LABELS,
  AUDIENCE_ORDER,
  PEDIA_BASE_PATH,
  PEDIA_ENTRIES,
  PEDIA_HUB_SEO,
  PEDIA_TOPICS,
  STARTUP_SHORTCUTS,
  entryPath,
  entrySearchText,
  getEntriesByTopic,
  isTopicIndexable,
  shortcutHref,
  topicPath,
  type PediaAudience,
  type PediaEntry,
  type PediaTopicKey,
} from "@/data/startupPedia";
import "@/components/startup-pedia/startup-pedia.css";

const START_HERE = ["how-to-validate-a-startup-idea", "ideal-customer-profile", "minimum-viable-product", "go-to-market-strategy"];

function EntryRow({ entry }: { entry: PediaEntry }) {
  return (
    <li>
      <Link to={entryPath(entry.slug)} className="sp-row">
        <div className="flex flex-wrap items-center gap-2">
          <span className="sp-kind">{entry.kind === "term" ? "Term" : "Guide"}</span>
          <span className="sp-row-title">{entry.title}</span>
        </div>
        <p className="sp-row-text">{entry.answer}</p>
      </Link>
    </li>
  );
}

export default function StartupPediaHub() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const topic = (params.get("topic") ?? "") as PediaTopicKey | "";
  const audience = (params.get("for") ?? "") as PediaAudience | "";

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const filtering = Boolean(query.trim() || topic || audience);
  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return PEDIA_ENTRIES.filter((entry) => {
      if (topic && entry.topic !== topic) return false;
      if (audience && !entry.audiences.includes(audience)) return false;
      if (!terms.length) return true;
      const haystack = entrySearchText(entry);
      return terms.every((term) => haystack.includes(term));
    });
  }, [query, topic, audience]);

  // One event per settled query, not per keystroke.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = window.setTimeout(() => {
      captureEvent("startup_pedia_search", { query_length: trimmed.length, result_count: results.length });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [query, results.length]);

  const setFilter = (key: "topic" | "for", value: string) => {
    update(key, value);
    if (value) captureEvent("startup_pedia_filter", { filter: key === "for" ? "audience" : "topic", value });
  };

  const terms = PEDIA_ENTRIES.filter((entry) => entry.kind === "term");
  const structuredData = [
    createBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Startup Pedia", url: PEDIA_BASE_PATH },
    ]),
    createCollectionSchema({
      name: "Startup Pedia",
      description: PEDIA_HUB_SEO.description,
      url: PEDIA_BASE_PATH,
      items: PEDIA_ENTRIES.map((entry) => ({ name: entry.title, url: entryPath(entry.slug), type: "Article" })),
    }),
    {
      "@context": "https://schema.org",
      "@type": "DefinedTermSet",
      "@id": `https://creatives-takeover.com${PEDIA_BASE_PATH}#terms`,
      name: "Startup Pedia terms",
      hasDefinedTerm: terms.map((entry) => ({
        "@type": "DefinedTerm",
        name: entry.acronyms?.length ? `${entry.acronyms.join(", ")}` : entry.title,
        description: entry.answer,
        url: `https://creatives-takeover.com${entryPath(entry.slug)}`,
      })),
    },
  ];

  return (
    <div className="sp">
      <SEO
        title={PEDIA_HUB_SEO.title}
        description={PEDIA_HUB_SEO.description}
        url={PEDIA_BASE_PATH}
        structuredData={structuredData}
      />
      <Navigation />
      <main className="sp-main">
        <header className="mx-auto max-w-3xl text-center">
          <p className="sp-eyebrow justify-center">{PEDIA_HUB_SEO.eyebrow}</p>
          <h1 className="sp-title mt-5 text-4xl sm:text-6xl">{PEDIA_HUB_SEO.heading}</h1>
          <p className="sp-muted mx-auto mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
            {PEDIA_HUB_SEO.intro}
          </p>
          <form
            role="search"
            className="mx-auto mt-8 max-w-2xl"
            onSubmit={(event) => event.preventDefault()}
          >
            <label className="sp-search">
              <Search className="h-5 w-5 flex-none sp-muted" aria-hidden="true" />
              <span className="sr-only">Search Startup Pedia</span>
              <input
                type="search"
                value={query}
                onChange={(event) => update("q", event.target.value)}
                placeholder="Search terms and guides: CAC, MVP…"
                autoComplete="off"
              />
              {query ? (
                <button type="button" className="sp-chip" onClick={() => update("q", "")} aria-label="Clear search">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </label>
          </form>
        </header>

        <section aria-label="Filters" className="mx-auto mt-8 max-w-4xl space-y-3">
          <div className="sp-chip-row">
            <button type="button" className="sp-chip" aria-pressed={!topic} onClick={() => setFilter("topic", "")}>
              All topics
            </button>
            {PEDIA_TOPICS.filter((item) => getEntriesByTopic(item.key).length).map((item) => (
              <button
                key={item.key}
                type="button"
                className="sp-chip"
                aria-pressed={topic === item.key}
                onClick={() => setFilter("topic", topic === item.key ? "" : item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="sp-chip-row items-center">
            <span className="sp-muted text-xs font-semibold uppercase tracking-[0.14em]">For</span>
            {AUDIENCE_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                className="sp-chip"
                aria-pressed={audience === key}
                onClick={() => setFilter("for", audience === key ? "" : key)}
              >
                {AUDIENCE_LABELS[key]}
              </button>
            ))}
          </div>
        </section>

        {filtering ? (
          <section aria-live="polite" className="mx-auto mt-12 max-w-3xl">
            <p className="sp-muted text-sm">
              {results.length} {results.length === 1 ? "entry" : "entries"}
            </p>
            {results.length ? (
              <ul className="sp-list mt-3">
                {results.map((entry) => (
                  <EntryRow key={entry.slug} entry={entry} />
                ))}
              </ul>
            ) : (
              <div className="sp-card mt-4 p-6 text-center">
                <p className="font-semibold">No entries match yet.</p>
                <p className="sp-muted mt-2 text-sm">
                  Try a shorter term or an acronym, or{" "}
                  <button type="button" className="sp-link" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                    clear the filters
                  </button>
                  .
                </p>
              </div>
            )}
          </section>
        ) : (
          <>
            <section aria-labelledby="shortcuts-heading" className="mt-14">
              <div className="sp-sheet">
                <h2 id="shortcuts-heading" className="sp-sheet-title">Startup Shortcuts</h2>
                <p className="sp-muted mt-1 text-sm sm:text-base">30 terms every founder should know</p>
                <ul className="sp-shortcuts">
                  {STARTUP_SHORTCUTS.map((shortcut) => (
                    <li key={shortcut.acronym}>
                      <Link to={shortcutHref(shortcut)} className="sp-shortcut">
                        <abbr title={shortcut.expansion}>{shortcut.acronym}</abbr>
                        <span>{shortcut.expansion}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section aria-labelledby="start-heading" className="mt-14">
              <h2 id="start-heading" className="sp-title text-2xl sm:text-3xl">Start here</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {START_HERE.map((slug) => PEDIA_ENTRIES.find((entry) => entry.slug === slug))
                  .filter((entry): entry is PediaEntry => Boolean(entry))
                  .map((entry) => (
                    <Link key={entry.slug} to={entryPath(entry.slug)} className="sp-card group flex flex-col p-5">
                      <span className="sp-kind self-start">{entry.kind === "term" ? "Term" : "Guide"}</span>
                      <span className="mt-3 font-semibold leading-snug">{entry.title}</span>
                      <span className="sp-muted mt-auto inline-flex items-center gap-1 pt-4 text-sm group-hover:text-[color:var(--sp-ink)]">
                        Read <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  ))}
              </div>
            </section>

            <div className="mt-16 grid gap-x-12 gap-y-14 lg:grid-cols-2">
              {PEDIA_TOPICS.map((item) => {
                const entries = getEntriesByTopic(item.key);
                if (!entries.length) return null;
                return (
                  <section key={item.key} aria-labelledby={`topic-${item.key}`}>
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 id={`topic-${item.key}`} className="sp-title text-xl sm:text-2xl">
                        {item.label}
                      </h2>
                      {isTopicIndexable(item.key) ? (
                        <Link to={topicPath(item.key)} className="sp-link flex-none text-sm">
                          View topic
                        </Link>
                      ) : null}
                    </div>
                    <ul className="sp-list mt-4">
                      {entries.map((entry) => (
                        <EntryRow key={entry.slug} entry={entry} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
