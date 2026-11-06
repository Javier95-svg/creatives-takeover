import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import TitleFx from "@/components/home/TitleFx";
import { FEATURED_PEDIA_ENTRIES, type FeaturedPediaEntry } from "@/data/startupPedia/featured";
import { PEDIA_TOPICS } from "@/data/startupPedia/topics";
import "./home-pedia.css";

// The homepage Startup Pedia section, laid out as an encyclopedia: a numbered
// topic index beside one entry page, with tabs for the featured entries. Each
// entry shows its real one- or two-sentence answer (featured.ts, kept equal to
// the library by tests/startup-pedia.test.ts). The full dataset is never imported.

const TITLE = "Practical answers for your next decision";
const INTRO = "Clear guides for defining your customer, testing demand, scoping a first version and planning go-to-market.";
const entryHref = (entry: FeaturedPediaEntry) => `/startup-pedia/${entry.slug}`;
const topicHref = (key: string) => `/startup-pedia/topics/${key}`;

// Short tab labels for the featured entries.
const SHORT: Record<string, string> = {
  "ideal-customer-profile": "ICP",
  "how-to-validate-a-startup-idea": "Validation",
  "minimum-viable-product": "MVP",
  "go-to-market-strategy": "Go-to-market",
  "pitch-deck-outline": "Pitch deck",
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function HomePediaBand() {
  const count = FEATURED_PEDIA_ENTRIES.length;
  const [index, setIndex] = useState(0);
  // Turns the page every few seconds until the visitor picks a tab.
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setIndex((value) => (value + 1) % count);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  const entry = FEATURED_PEDIA_ENTRIES[index];

  return (
    <section className="hpd-section" aria-labelledby="home-pedia-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="hpd hpd-a">
          <div className="hpd-a__index">
            {/* The same badge as every other section, centred over the title. It is
                also the link to the library itself; the section has no button. */}
            <Link to="/startup-pedia" className="hpd-badge-link">
              <Badge variant="outline" className="homepage-section-badge">
                Startup Pedia
              </Badge>
            </Link>
            <h2 id="home-pedia-heading" className="hpd-title"><TitleFx variant="reading" text={TITLE} /></h2>
            <p className="hpd-lede">{INTRO}</p>
            <ol className="hpd-a__topics" aria-label="Startup Pedia topics">
              {PEDIA_TOPICS.map((topic, i) => (
                <li key={topic.key}>
                  <Link to={topicHref(topic.key)} className="hpd-a__topic">
                    <span className="hpd-a__num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="hpd-a__label">{topic.label}</span>
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          <div className="hpd-a__entry">
            <div className="hpd-a__tabs" role="tablist" aria-label="Featured entries">
              {FEATURED_PEDIA_ENTRIES.map((item, i) => (
                <button
                  key={item.slug}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  className="hpd-a__tab"
                  onClick={() => { setIndex(i); setPaused(true); }}
                >
                  {SHORT[item.slug] ?? item.title}
                </button>
              ))}
            </div>
            <article key={entry.slug} className="hpd-a__page" role="tabpanel">
              <span className="hpd-kind">
                <span className={`hpd-kind__dot hpd-kind__dot--${entry.kind}`} aria-hidden="true" />
                {entry.kind === "term" ? "Term" : "Guide"}
                <span className="hpd-kind__sep" aria-hidden="true">·</span>
                {entry.topicLabel}
              </span>
              <h3 className="hpd-a__term">{entry.title}</h3>
              <p className="hpd-a__answer">{entry.answer}</p>
              <Link to={entryHref(entry)} className="hpd-a__read">
                Read the full entry
                <ArrowRight aria-hidden="true" />
              </Link>
              <span className="hpd-a__corner" aria-hidden="true" />
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
