import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import SEO, { createBreadcrumbSchema, createCollectionSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import NotFound from "@/pages/NotFound";
import { useAuth } from "@/contexts/AuthContext";
import {
  PEDIA_BASE_PATH,
  ctaHref,
  ctaSignupHref,
  entryPath,
  getEntriesByTopic,
  getTopic,
  indexableTopics,
  isTopicIndexable,
  topicPath,
  type PediaEntry,
} from "@/data/startupPedia";
import "@/components/startup-pedia/startup-pedia.css";

const PUBLIC_PAGES = new Set(["/enterprise", "/mentorship"]);

function EntryList({ title, entries }: { title: string; entries: PediaEntry[] }) {
  if (!entries.length) return null;
  return (
    <section className="mt-12">
      <h2 className="sp-title text-2xl">{title}</h2>
      <ul className="sp-list mt-4">
        {entries.map((entry) => (
          <li key={entry.slug}>
            <Link to={entryPath(entry.slug)} className="sp-row">
              <span className="sp-row-title">{entry.title}</span>
              <p className="sp-row-text">{entry.answer}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function StartupPediaTopic() {
  const { topic: topicKey = "" } = useParams<{ topic: string }>();
  const topic = getTopic(topicKey);
  const { user } = useAuth();

  if (!topic) return <NotFound />;

  // Tools need an account, so signed-out readers go straight to /signup and on
  // to the tool afterwards. Public pages (the programs page, mentor browsing)
  // stay direct links.
  const toolHref = (href: string) =>
    user || PUBLIC_PAGES.has(href) ? ctaHref(href, `topic-${topic.key}`) : ctaSignupHref(href, `topic-${topic.key}`);

  const entries = getEntriesByTopic(topic.key);
  const url = topicPath(topic.key);

  return (
    <div className="sp">
      <SEO
        title={topic.metaTitle}
        description={topic.metaDescription}
        url={url}
        noindex={!isTopicIndexable(topic.key)}
        structuredData={[
          createBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Startup Pedia", url: PEDIA_BASE_PATH },
            { name: topic.label, url },
          ]),
          createCollectionSchema({
            name: topic.heading,
            description: topic.metaDescription,
            url,
            items: entries.map((entry) => ({ name: entry.title, url: entryPath(entry.slug), type: "Article" })),
          }),
        ]}
      />
      <Navigation />
      <main className="sp-main">
        <nav aria-label="Breadcrumb" className="sp-muted text-sm">
          <Link to={PEDIA_BASE_PATH} className="sp-link">
            Startup Pedia
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{topic.label}</span>
        </nav>

        <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <p className="sp-eyebrow">Topic</p>
            <h1 className="sp-title mt-4 text-4xl sm:text-5xl">{topic.heading}</h1>
            <p className="mt-6 max-w-3xl text-base leading-relaxed sm:text-lg">{topic.intro}</p>

            <EntryList title="Key terms" entries={entries.filter((entry) => entry.kind === "term")} />
            <EntryList title="Guides" entries={entries.filter((entry) => entry.kind === "guide")} />
          </div>

          <aside className="space-y-6">
            {topic.tools.length ? (
              <div className="sp-card p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] sp-muted">Put it into practice</h2>
                <ul className="mt-4 space-y-4">
                  {topic.tools.map((tool) => (
                    <li key={tool.href}>
                      <Link to={toolHref(tool.href)} className="group block">
                        <span className="inline-flex items-center gap-1 font-semibold group-hover:text-[color:var(--sp-ink)]">
                          {tool.label} <ArrowRight className="h-4 w-4" />
                        </span>
                        <span className="sp-muted mt-1 block text-sm leading-relaxed">{tool.description}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="sp-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] sp-muted">Other topics</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {indexableTopics()
                  .filter((item) => item.key !== topic.key)
                  .map((item) => (
                    <li key={item.key}>
                      <Link to={topicPath(item.key)} className="sp-link">
                        {item.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
