// Startup Pedia content model. Pure types and data, no "@/" imports: the build
// scripts (prerender, sitemap, llms.txt) and node --test import these files
// directly, so the React pages and the crawler HTML render from one source.

export type PediaTopicKey =
  | "validation"
  | "customers"
  | "product"
  | "growth"
  | "metrics"
  | "business-models"
  | "fundraising"
  | "programs";

/** The five account types, plus the programs (accelerators, incubators) that bring founders in. */
export type PediaAudience = "founder" | "builder" | "mentor" | "service-provider" | "investor" | "program";

/** A term explains one concept (or a few searched together); a guide walks through doing something. */
export type PediaKind = "term" | "guide";

export interface PediaSection {
  /** Anchor id. Combined term pages use the acronym ("tam", "sam") so shortcuts can deep-link. */
  id: string;
  heading: string;
  /** Markdown subset: paragraphs, - and 1. lists, **bold**, *italic*, [links](/path or https://), ### subheadings. */
  body: string;
}

export interface PediaFormula {
  label: string;
  expression: string;
  note?: string;
}

export interface PediaStep {
  title: string;
  body: string;
}

export interface PediaFaq {
  question: string;
  answer: string;
}

export interface PediaSource {
  title: string;
  publisher: string;
  url: string;
}

export interface PediaCta {
  label: string;
  /** An app route. Tracking parameters are added at render time. */
  href: string;
  description: string;
}

export interface PediaEntry {
  slug: string;
  kind: PediaKind;
  topic: PediaTopicKey;
  audiences: PediaAudience[];
  /** H1. */
  title: string;
  /** <title>, 60 characters or fewer. */
  metaTitle: string;
  /** Meta description, 160 characters or fewer. */
  metaDescription: string;
  acronyms?: string[];
  /** Other names people search for; used by hub search only. */
  aliases?: string[];
  /** One or two sentences that define the term or answer the question outright. */
  answer: string;
  formulas?: PediaFormula[];
  steps?: PediaStep[];
  sections: PediaSection[];
  roleNotes?: Partial<Record<PediaAudience, string>>;
  faqs: PediaFaq[];
  sources: PediaSource[];
  relatedSlugs: string[];
  cta?: PediaCta;
  publishedAt: string;
  modifiedAt: string;
  /** Retired /answers/<slug> URLs that now 301 here. */
  legacySlugs?: string[];
}

export interface PediaTopic {
  key: PediaTopicKey;
  label: string;
  /** Topic page H1. */
  heading: string;
  metaTitle: string;
  metaDescription: string;
  /** 100 to 150 words, original. */
  intro: string;
  /** Tool pages that genuinely help with this topic. */
  tools: Array<{ href: string; label: string; description: string }>;
}

export interface PediaShortcut {
  acronym: string;
  expansion: string;
  slug: string;
  /** Section id on a combined page. */
  anchor?: string;
}

export const AUDIENCE_LABELS: Record<PediaAudience, string> = {
  founder: "Founders",
  builder: "Builders",
  mentor: "Mentors",
  "service-provider": "Service providers",
  investor: "Investors",
  program: "Accelerators & incubators",
};

export const AUDIENCE_ORDER: PediaAudience[] = ["founder", "builder", "mentor", "service-provider", "investor", "program"];
