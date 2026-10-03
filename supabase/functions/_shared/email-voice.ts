// House voice for founder-facing emails: a short note from Javier, not a
// marketing template. Import-free so Node tests and Deno functions share it.
//
// Visitor feedback (Oct 2026) was that retention emails read as machine
// written: dashes as punctuation, "momentum" and "journey" talk, and internal
// team terms ("return trigger", "retained-user signal") leaking into copy.

// Em dash, en dash, horizontal bar, minus sign, and a hyphen used as
// punctuation between spaces. In-word hyphens ("follow-up") are fine.
const DASH_PUNCTUATION = /\s*[\u2014\u2015\u2013\u2212]\s*|\s+-+\s+/g;

export const BANNED_PHRASES = [
  "momentum",
  "journey",
  "unlock",
  "compound",
  "leverage",
  "game changer",
  "game-changer",
  "supercharge",
  "skyrocket",
  "level up",
  "elevate",
  "seamless",
  "dive in",
  "return trigger",
  "high-signal",
  "high signal",
  "retained",
  "retention",
  "stickiest",
  "value-bearing",
  "it's not just",
  "not only",
] as const;

/** Replaces dashes used as punctuation with a comma and collapses spacing. */
export function cleanCopy(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/­/g, "")
    .replace(DASH_PUNCTUATION, ", ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/^,\s*|,\s*$/g, "")
    .trim();
}

/** Cleans a value and cuts it at a word boundary. Returns null when empty. */
export function cleanFact(value: unknown, maxLength = 80): string | null {
  if (typeof value !== "string") return null;
  const cleaned = cleanCopy(value).replace(/[.\s]+$/, "");
  if (!cleaned) return null;
  if (cleaned.length <= maxLength) return cleaned;
  const cut = cleaned.slice(0, maxLength);
  const space = cut.lastIndexOf(" ");
  return `${(space > maxLength * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:\s]+$/, "")}...`;
}

/** Every way a piece of copy breaks the house voice. Empty means it passes. */
export function findVoiceViolations(text: string): string[] {
  const problems: string[] = [];
  if (/[\u2014\u2015\u2013\u2212]/.test(text) || /\s-+\s/.test(text)) problems.push("dash");
  if (text.includes("!")) problems.push("exclamation");
  if (/[←-⇿➔➡]/.test(text)) problems.push("arrow");
  if (/\p{Extended_Pictographic}/u.test(text)) problems.push("emoji");
  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) problems.push(`phrase:${phrase}`);
  }
  return problems;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export interface PlainEmailInput {
  greeting: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  preferencesUrl: string;
  unsubscribeUrl?: string | null;
}

export interface PlainEmail {
  html: string;
  text: string;
  preheader: string;
}

/**
 * One plain layout for every retention email: greeting, two or three short
 * paragraphs, one button, signed by Javier. No banner, no arrows, no "team".
 */
export function renderPlainEmail(input: PlainEmailInput): PlainEmail {
  const paragraphs = input.paragraphs.map(cleanCopy).filter(Boolean);
  const greeting = cleanCopy(input.greeting);
  const ctaLabel = cleanCopy(input.ctaLabel);
  const preheader = paragraphs[0] ?? "";
  const footerLinks = [
    `<a href="${escapeHtml(input.preferencesUrl)}" style="color:#64748b">Manage email preferences</a>`,
    input.unsubscribeUrl
      ? `<a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#64748b">unsubscribe</a>`
      : null,
  ].filter(Boolean).join(" or ");

  const html = [
    `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>`,
    `<div style="max-width:560px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0f172a">`,
    `<p style="margin:0 0 14px">${escapeHtml(greeting)}</p>`,
    ...paragraphs.map((paragraph) => `<p style="margin:0 0 14px">${escapeHtml(paragraph)}</p>`),
    `<p style="margin:20px 0"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:11px 20px;background:#0f172a;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(ctaLabel)}</a></p>`,
    `<p style="margin:0 0 24px">Javier<br>Creatives Takeover</p>`,
    `<p style="font-size:12px;color:#64748b;margin:0">You are getting this because you have a Creatives Takeover account. ${footerLinks}.</p>`,
    `</div>`,
  ].join("");

  const text = [
    greeting,
    ...paragraphs,
    `${ctaLabel}: ${input.ctaUrl}`,
    "Javier\nCreatives Takeover",
    `Manage email preferences: ${input.preferencesUrl}`,
    input.unsubscribeUrl ? `Unsubscribe: ${input.unsubscribeUrl}` : null,
  ].filter(Boolean).join("\n\n");

  return { html, text, preheader };
}
