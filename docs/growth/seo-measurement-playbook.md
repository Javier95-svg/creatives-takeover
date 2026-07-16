# SEO measurement and governance

This document is the operational source of truth for SEO measurement. The legacy keyword workbook is directional only; use [seo-query-page-map.csv](./seo-query-page-map.csv) for query ownership and update it with Google Search Console evidence.

## Baseline to capture after deployment

Export the previous 16 months and the most recent 28 days from Google Search Console for queries, pages, countries, devices, indexing, Core Web Vitals, and links. Export GA4 organic landing sessions and conversions for the same periods. Record the date, filters, property, and exporter in the dashboard so comparisons are reproducible.

The baseline scorecard contains:

| Metric | Source | Weekly decision |
|---|---|---|
| Valid indexed canonical pages | GSC Page indexing | Investigate exclusions and canonical mismatches |
| Clicks, impressions, CTR, average position by canonical page | GSC Performance | Rewrite snippets or strengthen pages with rising impressions |
| Organic landing sessions | GA4 | Reconcile tracking and page-level demand |
| `seo_cta_click` rate | PostHog | Improve page-to-tool relevance and CTA clarity |
| `signup_completed` from organic first touch | PostHog + stored UTMs | Evaluate acquisition quality |
| `activation_completed` from organic first touch | PostHog + stored UTMs | Make investment decisions on activated users, not traffic alone |
| p75 LCP, INP, CLS | GSC CWV + Vercel Speed Insights | Open engineering work when a URL group fails |
| Earned referring domains and reclaimed mentions | GSC Links + backlink export | Prioritize cluster-specific outreach |

## Event contract

- `seo_landing_view`: `path`, `referrer`; emitted once per route visit in the SPA.
- `seo_cta_click`: `source_path`, `destination`, `link_text`; emitted for internal links clicked inside primary content.
- `signup_completed`: existing signup event. First-touch UTMs remain registered through the OAuth/signup flow.
- `activation_completed`: existing activation event and the primary organic-quality outcome.

Do not rename these events without updating this playbook, the PostHog funnel, and downstream reporting together.

## Weekly review

1. Compare the last 7 days with the previous 7 and trailing 28 days.
2. Review canonical/indexing changes before interpreting traffic changes.
3. Segment query and page performance by the five clusters in the query map.
4. Create no more than three actions: one technical, one page/content, and one authority action, each with an owner and due date.
5. Annotate deployments, migrations, redirects, content refreshes, and major links.

## Content and authority governance

- Growth owns query research, SERP validation, the query-to-page map, and organic activation outcomes.
- Editorial owns accuracy, named authorship, citations, visible update dates, consolidation, and refresh decisions.
- Engineering owns status codes, redirects, canonicals, prerendering, structured data, internal-link contracts, and CWV.
- The founder owns mentor, accelerator, university, podcast, partner, and founder-community relationships.

For each cluster, record three to five current organic competitors from live search results, their ranking URLs, useful content formats, and linkable assets. Maintain a monthly outreach sheet for original templates, benchmark reports, datasets, partner links, and unlinked-brand-mention reclamation. Generic volume estimates and impression-only distribution are not decision criteria.

## Release and audit cadence

Run SEO contract tests on every build. Review this scorecard weekly, content inventory monthly, and the full technical/content/authority system quarterly. After this remediation deploys, monitor GSC-selected canonicals, indexing, impressions, CTR, and organic activations weekly for four weeks before judging impact.
