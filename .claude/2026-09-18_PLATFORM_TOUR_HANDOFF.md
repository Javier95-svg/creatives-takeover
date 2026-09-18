# Platform Tour at /demo — 2026-09-18

## What changed

`/demo` used to be a stale marketing page for a retired product taxonomy (BizMap AI, Prompt Library,
Insighta, Community). It now renders the **Platform Tour**: the real workspace shell driven by a
seeded sample founder, for sharing with universities, business schools and funds who want a proper
look before a partnership conversation.

Naming rule: the feature is `PlatformTour` everywhere in code. The string `demo` appears only in the
`<Route path="/demo">` and the SEO config entry, so it is never confusable with **Demo Studio**, the
separate founder tool for building product demos.

## Files

- `src/pages/PlatformTour.tsx` — route, SEO, panel resolution, the only navigation handler
- `src/lib/platformTour/` — `tourFixture.ts` (seeded founder), `tourPanels.ts` (registry, resolution,
  route classification), `tourArtifacts.ts` (derived stage status), `tourAnalytics.ts`
- `src/components/platform-tour/` — shell, gate context, signup gate, frame bar, header badge,
  search field, `panels/` (Pulse, Dashboard, ICP, PMF Lab, Network, ToolCatalog, Institutions)
- `src/components/workspace/ProfilePhoto.tsx` — split out of `WorkspaceProfileAvatar` (re-exported)
- `tests/platform-tour.test.ts` — 11 assertions

Deleted 11 files: `src/pages/Demo.tsx`, `src/hooks/useDemoState.ts`, `src/utils/demoDataSeeder.ts`,
and 8 of `src/components/demo/*`. **`DemoCall*.tsx` are live product (`/demo-calls`) and stay** —
the test pins their existence so a future cleanup of "the demo folder" cannot take them.

## Additive shell changes (production behaviour unchanged)

- `WorkspaceLayout`: optional `onNavigate` and `currentPath`. Defaults are the existing behaviour and
  `WorkspaceLive` passes neither.
- `WorkspaceSidebar`: `Brand` now goes through `navigateTo` instead of calling `enterWorkspaceRoute`
  directly, which was an escape hatch out of any caller that intercepts navigation.
- `PulseHomeView`: optional `navigate`, defaulted to `enterWorkspaceRoute`, used at the three sites
  that previously called it directly.
- `IcpSamplePreviewSection`: optional `initialSampleKey`.

## The no-data guarantee

The tour performs **no product reads or writes**. It imports only named presentational exports,
because the defaults of `PulseHome`, `WorkspaceAccountSearch` and `WorkspaceProfileAvatar` are
`hasApplicationConfig` switches that lazy-load a Live sibling in production.

The single edge to the database is `captureEvent`, which reaches `recordRoadmapAnalyticsEvent`. That
function early-returns for any event name outside three product events, so `platform_tour_*` can
never write roadmap activity. `tests/platform-tour.test.ts` asserts that guard rather than trusting it.

Verified in a browser: 19 panels rendered, **0 requests to the Supabase host** across a full session
including using the composer.

## Caveats

- `/demo` must stay out of `roots`/`exact` in `src/lib/workspacePolicy.ts`, or a signed-in visitor
  would get their own workspace instead of the tour. Pinned by test.
- Panels are `?panel=`, never a path segment: `/demo/:publicId` serves published founder demos.
- The frame bar is `position: fixed` and must stay outside `WorkspaceLayout`, whose route region
  sets `contain: layout paint`. It publishes its measured height as `--platform-tour-bar` and
  `platform-tour.css` shortens the shell by it so the Pulse composer stays reachable.

## Verification run

- `npx tsc --noEmit` clean
- `npm test` — 941 tests, 935 pass, 6 fail, all 6 pre-existing on this branch and unrelated
  (consent banner ×2, hero no-JS, hub child links, sign-in row, landing-page freeze). The four
  SHA-pinned landing files are untouched.
- `eslint` on all new and changed files: 0 errors, 0 new warnings
- `npm run build` — 63 prerendered shells; `dist/demo/index.html` is 447 words of indexable copy
  (was heroCopy only), canonical `https://creatives-takeover.com/demo`, no noindex
- Playwright smoke `/demo` passes. On a cold dev server the first compile of this route can exceed
  the spec's 25s budget, the same as the existing `/demo-studio/try` entry.
