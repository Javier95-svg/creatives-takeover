import type { PediaShortcut } from "./types.ts";

// "Startup Shortcuts: 30 terms every founder should know", in the order of the
// original sheet. Terms that people search together share one page and get an
// anchor, so no acronym ends up on a thin page of its own.
export const STARTUP_SHORTCUTS: PediaShortcut[] = [
  { acronym: "MVP", expansion: "Minimum Viable Product", slug: "minimum-viable-product" },
  { acronym: "PMF", expansion: "Product-Market Fit", slug: "product-market-fit" },
  { acronym: "USP", expansion: "Unique Selling Proposition", slug: "unique-selling-proposition" },
  { acronym: "ICP", expansion: "Ideal Customer Profile", slug: "ideal-customer-profile" },
  { acronym: "TAM", expansion: "Total Addressable Market", slug: "tam-sam-som", anchor: "tam" },
  { acronym: "SAM", expansion: "Serviceable Available Market", slug: "tam-sam-som", anchor: "sam" },
  { acronym: "SOM", expansion: "Serviceable Obtainable Market", slug: "tam-sam-som", anchor: "som" },
  { acronym: "GTM", expansion: "Go-to-Market", slug: "go-to-market-strategy" },
  { acronym: "B2B", expansion: "Business-to-Business", slug: "b2b-b2c-d2c", anchor: "b2b" },
  { acronym: "B2C", expansion: "Business-to-Consumer", slug: "b2b-b2c-d2c", anchor: "b2c" },
  { acronym: "D2C", expansion: "Direct-to-Consumer", slug: "b2b-b2c-d2c", anchor: "d2c" },
  { acronym: "SaaS", expansion: "Software as a Service", slug: "saas" },
  { acronym: "MRR", expansion: "Monthly Recurring Revenue", slug: "mrr-and-arr", anchor: "mrr" },
  { acronym: "ARR", expansion: "Annual Recurring Revenue", slug: "mrr-and-arr", anchor: "arr" },
  { acronym: "AOV", expansion: "Average Order Value", slug: "average-order-value" },
  { acronym: "CAC", expansion: "Customer Acquisition Cost", slug: "customer-acquisition-cost" },
  { acronym: "LTV", expansion: "Customer Lifetime Value", slug: "customer-lifetime-value" },
  { acronym: "ROI", expansion: "Return on Investment", slug: "roi-and-roas", anchor: "roi" },
  { acronym: "ROAS", expansion: "Return on Ad Spend", slug: "roi-and-roas", anchor: "roas" },
  { acronym: "KPI", expansion: "Key Performance Indicator", slug: "kpis-and-okrs", anchor: "kpi" },
  { acronym: "OKR", expansion: "Objectives and Key Results", slug: "kpis-and-okrs", anchor: "okr" },
  { acronym: "DAU", expansion: "Daily Active Users", slug: "dau-and-mau", anchor: "dau" },
  { acronym: "MAU", expansion: "Monthly Active Users", slug: "dau-and-mau", anchor: "mau" },
  { acronym: "NPS", expansion: "Net Promoter Score", slug: "net-promoter-score" },
  { acronym: "VC", expansion: "Venture Capital", slug: "venture-capital-vs-private-equity", anchor: "vc" },
  { acronym: "PE", expansion: "Private Equity", slug: "venture-capital-vs-private-equity", anchor: "pe" },
  { acronym: "ESOP", expansion: "Employee Stock Option Plan", slug: "employee-stock-option-plan" },
  { acronym: "NDA", expansion: "Non-Disclosure Agreement", slug: "nda-and-intellectual-property", anchor: "nda" },
  { acronym: "IP", expansion: "Intellectual Property", slug: "nda-and-intellectual-property", anchor: "ip" },
  { acronym: "IPO", expansion: "Initial Public Offering", slug: "startup-funding-stages", anchor: "ipo" },
];

export const shortcutHref = (shortcut: PediaShortcut) =>
  `/startup-pedia/${shortcut.slug}${shortcut.anchor ? `#${shortcut.anchor}` : ""}`;
