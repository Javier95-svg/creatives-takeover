import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BookOpen, Search } from "lucide-react";

import TitleFx from "@/components/home/TitleFx";
import { FEATURED_PEDIA_ENTRIES, type FeaturedPediaEntry } from "@/data/startupPedia/featured";
import { PEDIA_TOPICS } from "@/data/startupPedia/topics";
import "./home-pedia.css";

// The homepage Startup Pedia section, styled as a reference library. Entries
// show their real one- or two-sentence answer (featured.ts, kept equal to the
// library by tests/startup-pedia.test.ts). The full dataset is never imported.
//
// Three designs are under review on the homepage-positioning branch; pick one
// with ?pedia=a|b|c. The chosen one stays and the others are deleted.

type Variant = "a" | "b" | "c";

const TITLE = "Practical answers for your next decision";
const INTRO = "Clear guides for defining your customer, testing demand, scoping a first version and planning go-to-market.";
const ICP_HREF = "/icp-builder?utm_source=internal&utm_medium=answer_teaser&utm_campaign=build_icp_free";
const entryHref = (entry: FeaturedPediaEntry) => `/startup-pedia/${entry.slug}`;
const topicHref = (key: string) => `/startup-pedia/topics/${key}`;

// Short tab labels for the featured entries, in their order.
const SHORT: Record<string, string> = {
  "ideal-customer-profile": "ICP",
  "how-to-validate-a-startup-idea": "Validation",
  "minimum-viable-product": "MVP",
  "go-to-market-strategy": "Go-to-market",
  "pitch-deck-outline": "Pitch deck",
};

// The questions the search box cycles through, one per featured entry.
const QUESTIONS = [
  "What is an ideal customer profile?",
  "How do I validate a startup idea?",
  "What is a minimum viable product?",
  "How do I plan my go-to-market?",
  "What goes on each pitch deck slide?",
];

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Cycles through `count` items every `ms`, until the visitor picks one. */
function useRotation(count: number, ms: number) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setIndex((value) => (value + 1) % count);
    }, ms);
    return () => window.clearInterval(timer);
  }, [count, ms, paused]);
  return { index, pick: (next: number) => { setIndex(next); setPaused(true); } };
}

const Ctas = () => (
  <div className="hpd-ctas">
    <Link to="/startup-pedia" className="hpd-btn hpd-btn--primary">
      Explore Startup Pedia
      <ArrowRight aria-hidden="true" />
    </Link>
    <Link to={ICP_HREF} className="hpd-btn hpd-btn--ghost">
      Build My ICP Free
    </Link>
  </div>
);

const Pill = () => (
  <span className="hpd-pill">
    <BookOpen aria-hidden="true" />
    Startup Pedia
  </span>
);

const KindTag = ({ entry }: { entry: FeaturedPediaEntry }) => (
  <span className="hpd-kind">
    <span className={`hpd-kind__dot hpd-kind__dot--${entry.kind}`} aria-hidden="true" />
    {entry.kind === "term" ? "Term" : "Guide"}
    <span className="hpd-kind__sep" aria-hidden="true">·</span>
    {entry.topicLabel}
  </span>
);

// ---- A: Encyclopedia entry ---------------------------------------------------

const VariantA = () => {
  const { index, pick } = useRotation(FEATURED_PEDIA_ENTRIES.length, 6500);
  const entry = FEATURED_PEDIA_ENTRIES[index];
  return (
    <div className="hpd hpd-a">
      <div className="hpd-a__index">
        <Pill />
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
        <Ctas />
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
              onClick={() => pick(i)}
            >
              {SHORT[item.slug] ?? item.title}
            </button>
          ))}
        </div>
        <article key={entry.slug} className="hpd-a__page" role="tabpanel">
          <KindTag entry={entry} />
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
  );
};

// ---- B: Search first ---------------------------------------------------------

function useTyping(lines: string[]) {
  const [text, setText] = useState(lines[0]);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let line = 0;
    let chars = lines[0].length;
    let deleting = true;
    let timer = 0;
    // Deletes the current question, then types the next one, then holds it.
    const step = () => {
      if (deleting) {
        chars -= 1;
        if (chars <= 0) { deleting = false; line = (line + 1) % lines.length; }
      } else {
        chars += 1;
      }
      setText(lines[line].slice(0, Math.max(chars, 0)));
      const done = !deleting && chars >= lines[line].length;
      if (done) deleting = true;
      timer = window.setTimeout(step, done ? 2200 : deleting ? 28 : 55);
    };
    timer = window.setTimeout(step, 2400);
    return () => window.clearTimeout(timer);
  }, [lines]);
  return text;
}

const VariantB = () => {
  const typed = useTyping(QUESTIONS);
  return (
    <div className="hpd hpd-b">
      <div className="hpd-b__head">
        <Pill />
        <h2 id="home-pedia-heading" className="hpd-title"><TitleFx variant="reading" text={TITLE} /></h2>
        <p className="hpd-lede">{INTRO}</p>
      </div>

      <Link to="/startup-pedia" className="hpd-b__search" aria-label="Search Startup Pedia">
        <Search className="hpd-b__icon" aria-hidden="true" />
        <span className="hpd-b__query" aria-hidden="true">
          {typed}
          <span className="hpd-b__caret" />
        </span>
        <span className="hpd-b__go">
          Search
          <ArrowRight aria-hidden="true" />
        </span>
      </Link>

      <ul className="hpd-b__topics" aria-label="Startup Pedia topics">
        {PEDIA_TOPICS.map((topic) => (
          <li key={topic.key}>
            <Link to={topicHref(topic.key)} className="hpd-chip">{topic.label}</Link>
          </li>
        ))}
      </ul>

      <div className="hpd-b__cards">
        {FEATURED_PEDIA_ENTRIES.slice(0, 3).map((entry) => (
          <Link key={entry.slug} to={entryHref(entry)} className="hpd-b__card">
            <KindTag entry={entry} />
            <h3 className="hpd-b__title">{entry.title}</h3>
            <p className="hpd-b__answer">{entry.answer}</p>
            <span className="hpd-b__read">
              Read
              <ArrowRight aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>

      <div className="hpd-b__foot"><Ctas /></div>
    </div>
  );
};

// ---- C: Index cards ----------------------------------------------------------

const VariantC = () => {
  const count = FEATURED_PEDIA_ENTRIES.length;
  const { index, pick } = useRotation(count, 5000);
  return (
    <div className="hpd hpd-c">
      <div className="hpd-c__copy">
        <Pill />
        <h2 id="home-pedia-heading" className="hpd-title"><TitleFx variant="reading" text={TITLE} /></h2>
        <p className="hpd-lede">{INTRO}</p>
        <ul className="hpd-c__topics" aria-label="Startup Pedia topics">
          {PEDIA_TOPICS.map((topic) => (
            <li key={topic.key}>
              <Link to={topicHref(topic.key)} className="hpd-chip">{topic.label}</Link>
            </li>
          ))}
        </ul>
        <Ctas />
      </div>

      <div className="hpd-c__drawer">
        <div className="hpd-c__stack">
          {FEATURED_PEDIA_ENTRIES.map((entry, i) => {
            const position = (i - index + count) % count;
            return (
              <article key={entry.slug} className="hpd-c__card" data-pos={position} aria-hidden={position !== 0}>
                <div className="hpd-c__card-top">
                  <span className="hpd-c__hole" aria-hidden="true" />
                  <span className="hpd-c__no">No. {String(i + 1).padStart(3, "0")}</span>
                  <span className="hpd-c__type">{entry.kind === "term" ? "Term" : "Guide"}</span>
                </div>
                <p className="hpd-c__topic">{entry.topicLabel}</p>
                <h3 className="hpd-c__title">{entry.title}</h3>
                <p className="hpd-c__answer">{entry.answer}</p>
                {position === 0 ? (
                  <Link to={entryHref(entry)} className="hpd-c__read">
                    Read the entry
                    <ArrowRight aria-hidden="true" />
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
        <div className="hpd-c__dots" role="tablist" aria-label="Featured entries">
          {FEATURED_PEDIA_ENTRIES.map((entry, i) => (
            <button
              key={entry.slug}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={entry.title}
              className="hpd-c__dot"
              onClick={() => pick(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default function HomePediaBand() {
  const [params] = useSearchParams();
  const requested = params.get("pedia");
  const variant: Variant = requested === "b" || requested === "c" ? requested : "a";
  return (
    <section className="hpd-section" aria-labelledby="home-pedia-heading">
      <div className="container mx-auto px-4 sm:px-6">
        {variant === "a" ? <VariantA /> : variant === "b" ? <VariantB /> : <VariantC />}
      </div>
    </section>
  );
}
