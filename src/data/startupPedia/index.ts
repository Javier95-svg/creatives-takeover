import { businessModelEntries } from "./entries/businessModels.ts";
import { customerEntries } from "./entries/customers.ts";
import { fundraisingEntries } from "./entries/fundraising.ts";
import { growthEntries } from "./entries/growth.ts";
import { metricEntries } from "./entries/metrics.ts";
import { productEntries } from "./entries/product.ts";
import { programEntries } from "./entries/programs.ts";
import { validationEntries } from "./entries/validation.ts";
import { PEDIA_TOPICS } from "./topics.ts";
import type { PediaEntry, PediaTopicKey } from "./types.ts";

export * from "./types.ts";
export { PEDIA_TOPICS, getTopic } from "./topics.ts";
export { STARTUP_SHORTCUTS, shortcutHref } from "./shortcuts.ts";

export const PEDIA_BASE_PATH = "/startup-pedia";

export const PEDIA_HUB_SEO = {
  title: "Startup Pedia: Startup Terms, Metrics & How-To Guides",
  description:
    "Plain-English explanations of startup terms, metrics and frameworks, with practical guides on validation, MVPs, go-to-market and fundraising.",
  heading: "Startup Pedia",
  eyebrow: "The founder's reference",
  intro:
    "Short, accurate explanations of the terms, metrics and frameworks you meet while building a startup, plus practical guides for validation, MVPs, go-to-market and fundraising.",
};

export const PEDIA_ENTRIES: PediaEntry[] = [
  ...validationEntries,
  ...customerEntries,
  ...productEntries,
  ...growthEntries,
  ...metricEntries,
  ...businessModelEntries,
  ...fundraisingEntries,
  ...programEntries,
];

/** A topic page is listed and indexable only once it has this many entries. */
export const MIN_ENTRIES_PER_TOPIC_PAGE = 3;

export const entryPath = (slug: string) => `${PEDIA_BASE_PATH}/${slug}`;
export const topicPath = (key: string) => `${PEDIA_BASE_PATH}/topics/${key}`;

export const getEntry = (slug: string) => PEDIA_ENTRIES.find((entry) => entry.slug === slug);

export const getEntriesByTopic = (topic: PediaTopicKey) => PEDIA_ENTRIES.filter((entry) => entry.topic === topic);

export const isTopicIndexable = (topic: PediaTopicKey) =>
  getEntriesByTopic(topic).length >= MIN_ENTRIES_PER_TOPIC_PAGE;

export const indexableTopics = () => PEDIA_TOPICS.filter((topic) => isTopicIndexable(topic.key));

export const getRelatedEntries = (entry: PediaEntry) =>
  entry.relatedSlugs.map((slug) => getEntry(slug)).filter((related): related is PediaEntry => Boolean(related));

/** Old /answers/<slug> → new entry path, for vercel.json redirects and tests. */
export const legacyRedirects = () =>
  PEDIA_ENTRIES.flatMap((entry) =>
    (entry.legacySlugs || []).map((legacy) => ({ from: `/answers/${legacy}`, to: entryPath(entry.slug) })),
  );

/** Tracking parameters for CTA links leaving an entry, matching the site's seo UTM convention. */
export const ctaHref = (href: string, slug: string) => {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}utm_source=seo&utm_medium=startup_pedia&utm_campaign=${slug}`;
};

/**
 * Where a "Put it into practice" link sends a signed-out reader: straight to
 * /signup, then on to the tool once the account exists. Opening the tool first
 * only showed a "Sign in to access" screen, an extra step before signup.
 */
export const ctaSignupHref = (href: string, slug: string) =>
  `/signup?source=startup_pedia&utm_source=seo&utm_medium=startup_pedia&utm_campaign=${slug}&return=${encodeURIComponent(ctaHref(href, slug))}`;

const stripMarkdown = (text: string) =>
  text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Every word a reader sees in the entry body, for word-count floors and search. */
export const entryPlainText = (entry: PediaEntry) =>
  [
    entry.answer,
    ...(entry.formulas || []).flatMap((formula) => [formula.label, formula.expression, formula.note || ""]),
    ...(entry.steps || []).flatMap((step) => [step.title, step.body]),
    ...entry.sections.flatMap((section) => [section.heading, section.body]),
    ...Object.values(entry.roleNotes || {}),
    ...entry.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ]
    .map(stripMarkdown)
    .join(" ");

export const entryWordCount = (entry: PediaEntry) => entryPlainText(entry).split(/\s+/).filter(Boolean).length;

/** Lower-cased haystack for the hub's client-side search. */
export const entrySearchText = (entry: PediaEntry) =>
  [entry.title, entry.answer, ...(entry.acronyms || []), ...(entry.aliases || []), entry.metaDescription].join(" ").toLowerCase();
