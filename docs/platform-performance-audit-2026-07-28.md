# Creatives Takeover platform audit — 2026-07-28

## Executive summary

The codebase is a Vite 5 / React 18 / TypeScript single-page application using Tailwind CSS, React Router, Supabase, Playwright, and Vercel. It is not Next.js.

This audit found and fixed the only broken core-tool route, all three externally confirmed 404 links, a 147 MB homepage media waterfall, anonymous session-replay blocking, an edge-cache configuration collision, and the largest measured layout shifts on Marketplace, Mentorship, Build, and MVP Builder.

The production build and browser suites pass. The fixed build has not been deployed, so “after” means the final Brotli-compressed production build running locally with the live site's public Supabase configuration. A live-domain Lighthouse and header rerun is still required after deployment.

Key outcomes:

- Core/internal routes: 1 broken route out of 80 live routes → 0 in the fixed crawl.
- Confirmed external 404s: 3 → 0 across 73 rendered external URLs.
- Homepage founder-journey GIF requests during initial load: 147,030,101 bytes (140.2 MiB) → 0.
- Anonymous PostHog recorder requests: present and blocking → 0.
- Average Lighthouse Performance across nine key pages: 35.9 → 51.2.
- Average Lighthouse Total Blocking Time: 1,366 ms → 508 ms, a 63% reduction.
- Marketplace mobile CLS: 0.152 route profiler / 0.135 Lighthouse → 0.000.
- Mentorship mobile CLS: 0.119 → 0.000.
- Build mobile CLS: 0.065 → 0.000.

## Measurement conditions and coverage

Live baseline:

- `https://creatives-takeover.com`, measured 2026-07-28.
- 80 rendered desktop routes crawled.
- 25 core/public routes separately checked at a 390 × 844 mobile viewport.
- Console messages, uncaught exceptions, failed requests, HTTP 4xx/5xx responses, internal links, image attributes, lazy loading, CLS, LCP, and long tasks recorded.
- 73 unique rendered external HTTP(S) links checked with redirect-following HEAD/GET requests.
- Nine Lighthouse 12.8.2 mobile runs: home, pricing, and the six core tools plus Marketplace.
- 11 tool/pricing/auth/form flows containing 23 visible controls checked without performing credit-spending or account-mutating operations.

Fixed-build validation:

- The same route profiler was run against a Brotli-compressed production build with live public Supabase data.
- The 80-route fixed crawl had no 404 page, uncaught exception, or bad HTTP response. Three newspaper pages made localhost-only requests rejected by the production origin allowlist; those same routes had no failures on the live-domain crawl and are not a product regression.
- All affected high-CLS routes were rerun after the final wallpaper fix with zero console, page, request, or HTTP response errors.
- Lighthouse used the same Chrome installation and throttling configuration. Local HTTP lowers edge/network latency but also makes Best Practices non-comparable because Lighthouse penalizes the non-HTTPS audit origin.
- A locally installed Kaspersky extension injected approximately 88 KB and 444 ms of main-thread blocking into the final home run. Absolute lab scores should be repeated in a clean browser after deployment.

## Issues found and fixes applied

| Priority | Issue and user impact | Location | Fix applied | Before → after |
|---|---|---|---|---|
| Critical | Seven large founder-journey GIFs were mounted eagerly in both responsive branches. This could consume over 147 MB before a visitor reached the section. | `src/components/FounderJourneyVideo.tsx`, `src/components/EntrepreneurProblems.tsx` | Reserved the media aspect ratio, added near-viewport loading with `IntersectionObserver`, native lazy/async/low-priority image hints, explicit dimensions, and rendered only the active responsive branch. | Journey GIF initial requests 147.0 MB → 0; DOM 1,236 → 1,008 elements; home JS transfer 404 KB → 366 KB. |
| High | Anonymous PostHog session replay and statically preloaded analytics competed with first interaction. The recorder alone blocked about 5,969 ms in the live baseline. | `src/lib/analytics.ts`, `src/main.tsx`, `vite.config.ts`, `src/hooks/usePosthogFeatureFlag.ts`, nine feature-flag consumers | Preserved true dynamic imports, removed the root static provider, queued events until idle bootstrap, disabled anonymous replay/surveys/performance/dead-click capture, and enabled replay only after authenticated identity during idle time. | Recorder requests present → 0; PostHog 158.7 KB raw chunk preloaded → deferred; home Lighthouse TBT 2,002 ms → 1,401 ms. |
| High | `/gtm-strategist`, one of the six named core tools, rendered the SPA 404 component with HTTP 200 instead of opening GTM Strategist. | `src/App.tsx`, `vercel.json`, `e2e/smoke.spec.ts` | Added a client-side replace redirect and permanent Vercel edge redirect to canonical `/go-to-market`; added smoke coverage. | Broken core routes 1 → 0; final URL `/gtm-strategist` → `/go-to-market`. |
| High | The catch-all Vercel header rule overwrote longer cache policies. Even content-hashed JS/CSS shipped with `max-age=0, must-revalidate`. | `vercel.json` | Removed Cache-Control from the catch-all security-header rule, retained one-year immutable caching for hashed assets, and added bounded caching for static asset folders. | Hashed asset cache `max-age=0` → `max-age=31536000, immutable` in the fixed config/production server validation. |
| High | Marketplace loaded into a differently sized result grid; service and mentor images lacked intrinsic dimensions and too many mentor portraits were eager. | `src/pages/community/ServiceMarketplaceHub.tsx`, `src/pages/community/MentorMarketplaceHub.tsx`, `src/components/service-marketplace/ServiceCard.tsx`, `src/components/mentor-marketplace/MentorCard.tsx` | Added route-owned loading state, stable card-shaped skeletons, intrinsic dimensions, and limited eager loading to the first result. | Marketplace CLS 0.152 route / 0.135 Lighthouse → 0.000; missing dimensions 6 → 0; one intentionally prioritized first result remains eager. |
| High | Mentorship decorative elements used percentages of a page-height container. When fetched mentor data changed document height, the background itself created layout shifts. | `src/components/wallpapers/CommunityMentorsWallpaper.tsx`, `src/pages/community/MentorMarketplaceHub.tsx` | Anchored the decorative wallpaper to the viewport and paired it with stable loading skeletons and sized portraits. | Mobile CLS 0.119 → 0.000; missing dimensions 10 → 0; eager below-fold images 4 → 1 intentionally prioritized result. |
| Medium | Build loaded six below-fold showcase screenshots eagerly without explicit dimensions and kept two marquees animating offscreen. | `src/pages/BuildPage.tsx` | Added 1600 × 1000 dimensions, lazy/async/low-priority loading, viewport-controlled animation pause/resume, conditional `will-change`, and reduced-motion support. | Mobile CLS 0.065 → 0.000; missing dimensions 12 → 0; eager below-fold images 6 → 0. |
| Medium | MVP Builder avatar/preview media had no intrinsic size, allowing a small layout shift during decode. | `src/components/mvp-builder/MVPBuilderChat.tsx`, `src/components/mvp-builder/MVPBuilderPreview.tsx` | Added fixed intrinsic dimensions to the affected images. | Missing dimensions 1 → 0; CLS remained low at approximately 0.003. |
| Medium | Three guide CTAs linked to resources that returned confirmed 404 responses. | `src/components/GuidesSection.tsx` | Replaced only the destination URLs with current Designhill, McKinsey, and Shopify resources; visible product copy was not changed. | Confirmed external 404s 3 → 0. Final external audit: 48 reachable, 25 bot-blocked by the remote site, 0 confirmed broken. |
| Low | Performance regressions above had no focused automated guard. | `tests/performance-regressions.test.ts`, `scripts/audit-*.mjs` | Added regression tests and reusable route, form, validation, link, header, production-build, and compressed-server audit scripts. | Four new regression assertions pass inside the 428-test suite. |

## Lighthouse results

Scores are `live baseline → fixed pre-deploy production build`. Timings are seconds except TBT, which is milliseconds.

| Page | Performance | Accessibility | Best Practices* | SEO | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Home | 28 → 32 | 100 → 100 | 82 → 64 | 100 → 100 | 6.1 → 7.1 | 8.8 → 9.2 | 2,002 → 1,401 | 0.003 → 0.003 |
| Pricing | 30 → 54 | 85 → 85 | 82 → 64 | 100 → 100 | 5.1 → 5.2 | 8.9 → 6.2 | 2,677 → 432 | 0 → 0 |
| ICP Builder | 39 → 54 | 96 → 96 | 82 → 64 | 100 → 100 | 6.3 → 6.0 | 8.9 → 7.7 | 929 → 308 | 0.001 → 0 |
| Demo Studio | 36 → 58 | 100 → 100 | 82 → 64 | 92 → 92 | 6.2 → 5.8 | 8.7 → 7.1 | 1,209 → 225 | 0.038 → 0 |
| PMF Lab | 33 → 59 | 95 → 95 | 82 → 64 | 100 → 100 | 6.4 → 6.2 | 9.7 → 7.9 | 1,494 → 127 | 0.003 → 0.003 |
| MVP Builder | 47 → 49 | 91 → 91 | 82 → 64 | 100 → 100 | 5.4 → 5.7 | 6.9 → 6.8 | 644 → 538 | 0.003 → 0.003 |
| GTM Strategist alias | 33 → 39 | 92 → 92 | 82 → 64 | 100 → 92 | 6.7 → 4.7 | 9.0 → 8.9 | 1,529 → 1,101 | 0.001 → 0 |
| Traction Engine | 39 → 60 | 92 → 92 | 82 → 64 | 100 → 100 | 6.0 → 5.9 | 7.8 → 7.0 | 985 → 153 | 0 → 0 |
| Marketplace | 38 → 56 | 87 → 87 | 82 → 64 | 92 → 92 | 5.4 → 5.7 | 7.2 → 7.1 | 827 → 285 | 0.135 → 0 |
| **Average** | **35.9 → 51.2** | — | — | — | — | **8.4 → 7.6** | **1,366 → 508** | — |

\* The fixed build ran on local HTTP, so every Best Practices run failed HTTPS-related checks. Kaspersky also injected third-party code. Treat the fixed Best Practices score as invalid until the clean post-deploy HTTPS rerun.

The homepage Performance score improved only four points despite materially lower blocking time. Its final LCP candidate was the small hero compass image and spent most of its 9.2 seconds in load/render delay while the SPA booted. This is the leading unresolved performance problem.

## Link and form results

- All rendered internal navigation, footer links, CTAs, and discovered routes were followed during the 80-route crawl.
- The live crawl found only `/gtm-strategist` as an in-app 404 state. The fixed crawl found none.
- All 73 rendered external URLs were retested after the replacements:
  - 48 returned 2xx/3xx.
  - 25 returned anti-bot/rate-limit responses such as LinkedIn 429/999 or remote 403. These are not classified as broken because the remote sites intentionally block automated clients.
  - 0 returned confirmed 404/410.
- The six core tools, Marketplace, Pricing, Contact, Login, and Signup were checked for visible controls, empty submission behavior, browser errors, and failed requests.
- ICP Builder and Demo Studio correctly keep their primary action disabled on empty input.
- Login displayed required-email and required-password errors; Signup retained native required-field validation.
- No authenticated generation, booking, checkout, save, or other credit-spending write was executed. Those flows need approved test accounts and sandbox payment/credit data.

## Bundle, media, animation, and caching observations

- Initial bundle inventory: 409 JS files / 9.55 MB raw and three CSS files / 410.8 KB raw.
- Fixed inventory: 410 JS files / 9.48 MB raw and three CSS files / 410.9 KB raw.
- The material initial-load improvement comes from loading behavior, not a dramatic total bundle reduction:
  - The 158.7 KB PostHog chunk is no longer in the HTML preload graph.
  - No founder-journey GIF and no PostHog recorder request appeared in the final home Lighthouse network log.
  - Homepage DOM size fell 18%, from 1,236 to 1,008 elements.
- The fixed home report still identifies about 268 KB of unused JS, 43 KB of unused CSS under Lighthouse's coverage model, a 406.7 KB raw global CSS asset, and 1,008 DOM elements.
- Large PDF/document/chart/App Builder chunks are route-lazy and do not all belong to the public landing-page critical path.
- Build-page showcase and testimonial animations now pause offscreen; testimonial motion is disabled for reduced-motion users.
- Live Vercel responses were Brotli-compressed and CDN hits, but the catch-all rule forced hashed assets to revalidate. The fixed config restores immutable hashed-asset caching. Edge behavior must be confirmed after deployment.

## Prioritized remaining work

| Priority | Remaining item | Recommendation | Auto-fix status |
|---|---|---|---|
| High | Homepage LCP remains about 9.2 s under throttled Lighthouse. | Extract a minimal home entry/critical shell, reduce synchronous providers and initial module preloads, inline or preload only true critical CSS/font assets, and profile the 4+ second render delay in a clean Chrome trace. | Flagged; broader architectural change needs a separate regression pass. |
| High | The seven journey assets still total 147 MB when a user scrolls through every card. | Transcode at the storage/admin-upload layer to MP4/WebM or carefully benchmark animated WebP/AVIF, then update stored URLs and provide poster frames. | Not auto-fixed because assets are remote content records and format changes can affect quality and admin workflows. |
| Medium | Global CSS is 406.7 KB raw and Lighthouse still reports unused CSS. | Split route-specific styles and remove legacy rules using visual-regression coverage. | Not safely removable automatically. |
| Medium | 25 external sites blocked the automated checker. | Manually open the bot-blocked LinkedIn/403 URLs from a normal browser before release. | Flagged; no evidence supports replacing them. |
| Medium | Authenticated and credit-spending flows were not mutated. | Run an approved staging matrix using seeded Rookie/Starter/Rising/Pro accounts, sandbox Stripe, and disposable Supabase records. | Unsafe without test credentials/data authorization. |
| Low | Browser extension injection makes absolute Lighthouse results noisy. | Repeat all nine URLs in clean Chrome on deployed HTTPS and archive those reports as the release baseline. | Pending deployment. |

## Validation completed

- `npm test -- --run`: 428/428 passing.
- `npm run typecheck`: passing.
- `npm run test:smoke`: 27/27 Playwright tests passing across Chromium and Mobile Chrome.
- Production build: passing; 5,966 modules transformed and 60 public route shells prerendered.
- Targeted ESLint over changed source: 0 errors (existing warning policy still reports warnings).
- `git diff --check`: clean.
- Product copy, pricing, and positioning were not changed. Only three broken resource destinations were replaced.

## Audit artifacts

The generated machine-readable evidence is under `test-results/` and intentionally remains outside the source diff:

- `audit-local-final-desktop.json`
- `audit-local-final-mobile.json`
- `audit-local-final-targeted-mobile.json`
- `audit-local-final-external-links.json`
- `audit-local-final-headers.json`
- `lighthouse-local-final-{home,pricing,icp-builder,demo-studio,pmf-lab,mvp-builder,gtm-strategist,traction-engine,marketplace}.json`

The reusable audit harness is in:

- `scripts/audit-routes.mjs`
- `scripts/audit-external-links.mjs`
- `scripts/audit-headers.mjs`
- `scripts/audit-forms.mjs`
- `scripts/audit-empty-validations.mjs`
- `scripts/build-live-audit.mjs`
- `scripts/serve-audit-build.mjs`
