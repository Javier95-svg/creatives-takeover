import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { founderAnswerPages } from "../src/data/founderAnswerPages.ts";
import { PLAN_MONTHLY_CREDITS, PLAN_PRICING } from "../src/config/pricing.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "public", "llms.txt");
const generatedDate = process.env.SEO_GENERATED_AT?.slice(0, 10) || new Date().toISOString().slice(0, 10);
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function fetchApprovedCount(table, query) {
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=id&${query}`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: "count=exact", Range: "0-0" },
    });
    if (!response.ok) return null;
    const match = response.headers.get("content-range")?.match(/\/(\d+)$/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

const canonicalRedirects = new Map([
  ["/insighta/vc-search", "/vc-search"],
  ["/insighta/pitch-deck-analyzer", "/pitch-deck-analyzer"],
  ["/insighta/accelerator-hunt", "/accelerator-hunt"],
  ["/insighta/email-templates", "/email-templates"],
]);

const pricingRows = ["rookie", "starter", "rising", "pro"].map((plan) => {
  const label = plan[0].toUpperCase() + plan.slice(1);
  const price = PLAN_PRICING[plan];
  const monthly = price.monthly === 0 ? "Free" : `$${price.monthly}`;
  const yearly = price.yearly === 0 ? "Free" : `$${price.yearly}`;
  return `| ${label} | ${monthly} | ${yearly} | ${PLAN_MONTHLY_CREDITS[plan]} |`;
});

let content = await readFile(outputPath, "utf8");
content = content.replace(/^> Last updated: .*\r?\n(?:> Inventory counts:.*\r?\n)?\r?\n/m, "");
content = content.replace(/^# Creatives Takeover\r?\n/, `# Creatives Takeover\n\n> Last updated: ${generatedDate}\n`);

for (const [legacy, canonical] of canonicalRedirects) {
  content = content.replaceAll(`creatives-takeover.com${legacy}`, `creatives-takeover.com${canonical}`);
}

content = content.replace(/^- \[Founder Service Marketplace\]\(https:\/\/creatives-takeover\.com\/marketplace\):.*\r?\n/gm, "");
content = content.replace(
  /\| Plan \| Monthly \| Yearly \| Credits\/month \|[\s\S]*?\| Pro \|[^\n]*\|/,
  [
    "| Plan | Monthly | Yearly | Credits/month |",
    "|---|---:|---:|---:|",
    ...pricingRows,
  ].join("\n"),
);

content = content.replace(/\[Founder Answers index\]\(([^)]+)\): All \d+ answer pages\./, `[Founder Answers index]($1): All ${founderAnswerPages.length} answer pages.`);
content = content.replace(/^- \[Community\]\(https:\/\/creatives-takeover\.com\/community\):.*\r?\n/m, "");
content = content.replace(
  "- [Co-founder Matching](https://creatives-takeover.com/co-founder): Listings from founders looking for a technical or commercial co-founder.",
  "- [Founder Service Marketplace](https://creatives-takeover.com/marketplace): Curated, active services for early-stage founders.\n- [Co-founder Matching](https://creatives-takeover.com/co-founder): Listings from founders looking for a technical or commercial co-founder.",
);
content = content.replace(
  ", `/profile`, `/tasks`",
  ", `/tasks`",
);

// Inventory counts are intentionally excluded from the generated prose unless a
// reviewed database-backed generator supplies them. This prevents stale claims
// from becoming a citation source for answer engines.
content = content
  .replace(/marketplace of \d+ (?:reviewed )?human startup mentors/g, "marketplace of reviewed human startup mentors")
  .replace(/\d+ (?:vetted|reviewed) startup mentors/g, "reviewed startup mentors")
  .replace(/\d+ institutional investors, \d+ angel investors, and \d+ named funding opportunities/g, "reviewed investor and funding-opportunity records")
  .replace(/Searchable database of \d+ institutional investors and \d+ angel investors/g, "Searchable database of reviewed institutional and angel investors")
  .replace(/Compares accelerators and \d+ funding opportunities/g, "Compares reviewed accelerators and funding opportunities")
  .replace(/\d+ startup mentors with published specialisms/g, "Reviewed startup mentors with published specialisms")
  .replace(/plan prices, credit allocations, mentor and investor counts/g, "plan prices, credit allocations, and canonical route references");

const [mentorCount, vcCount, angelCount, opportunityCount] = await Promise.all([
  fetchApprovedCount("mentors", "is_active=eq.true"),
  fetchApprovedCount("investors", "investor_type=eq.vc&is_active=eq.true"),
  fetchApprovedCount("angel_investors", "is_active=eq.true"),
  fetchApprovedCount("funding_opportunities", "is_active=eq.true"),
]);
if ([mentorCount, vcCount, angelCount, opportunityCount].every((count) => count !== null)) {
  content = content
    .replace(/marketplace of reviewed human startup mentors/g, `marketplace of ${mentorCount} reviewed human startup mentors`)
    .replace(/reviewed startup mentors/g, `${mentorCount} reviewed startup mentors`)
    .replace(/reviewed investor and funding-opportunity records/g, `${vcCount} institutional investors, ${angelCount} angel investors, and ${opportunityCount} reviewed funding opportunities`)
    .replace(/Searchable database of reviewed institutional and angel investors/g, `Searchable database of ${vcCount} institutional investors and ${angelCount} angel investors`)
    .replace(/Compares reviewed accelerators and funding opportunities/g, `Compares ${opportunityCount} reviewed funding opportunities`)
    .replace(/Reviewed startup mentors with published specialisms/g, `${mentorCount} reviewed startup mentors with published specialisms`);
  content = content.replace(
    `> Last updated: ${generatedDate}`,
    `> Last updated: ${generatedDate}\n> Inventory counts: active, reviewed database records at build time.`,
  );
}

await writeFile(outputPath, `${content.trim()}\n`, "utf8");
console.log(`Generated public/llms.txt (${generatedDate}) from pricing and answer-page sources.`);
