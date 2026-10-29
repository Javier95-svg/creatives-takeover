import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Hashes are taken over LF-normalised bytes, not raw bytes. This repo runs with
// core.autocrlf=true and no .gitattributes, so a Windows checkout can hold CRLF
// (Hero.tsx and Index.tsx currently hold a mix of both) while Linux CI holds
// pure LF. A raw-byte pin therefore cannot match in both places at once, and the
// pin silently drifts from the committed content. Normalising first makes the
// hash equal to the git blob hash in every environment.
// Re-pinned 2026-10-13 for the approved two-start, result-before-signup experience.
const frozenFiles = {
  // Rehashed 2026-08-02 for the approved output-led funnel upgrade. The single
  // input now creates a durable, claimable ICP result in place; Product mode
  // auto-starts Demo Studio; and unresolved/off rollout state safely uses the
  // established route handoff. Headline, lede, proof line, and stats are intact.
  // Rehashed 2026-09-08 for the approved evidence-led hero copy update.
  // Rehashed 2026-09-29 for the approved quiz-first funnel: signed-out
  // submissions open the guest onboarding quiz at /start (Idea -> Builder,
  // Product -> Founder); account creation is the last step, then the tool they
  // asked for. Copy, layout and the signed-in route are unchanged.
  // Rehashed 2026-10-06 for two requested hero enhancements: the dashboard
  // preview links to /signup with hover motion, and the scrolling cards show
  // seven sourced figures on modern entrepreneurship (global, not US-only,
  // after review). Headline, lede and layout are unchanged.
  // Rehashed 2026-10-11 for the requested subtitle "Customized workspace for
  // startup founders, product managers and indie builders." (2e04de09). The
  // rest of the copy and the layout are unchanged.
  // Rehashed 2026-10-13 for the requested second lede line "Identify what's
  // worth building, validate demand with reliable evidence, and turn
  // insights into products and go-to-market strategies." The rest of the copy and the layout are unchanged.
  // Rehashed 2026-10-24 for the requested closing line "Free to start. No
  // equity.", which replaces "No application. No cohort. No equity." now that
  // programs run cohorts on the platform. The rest of the hero is unchanged.
  // Rehashed 2026-10-24 (copy audit): the dashboard preview's third stat reads
  // "open tasks" instead of "open coach reviews", a feature the product lacks.
  '../src/components/Hero.tsx': '7b5537fadea96e52d0a02f2947e74ab368bc868d564636057597fa6cb23ed3b5',
  // Rehashed 2026-07-28 for the performance audit: mobile and desktop journey
  // branches are now mutually exclusive, preventing duplicate 147 MB GIF loads.
  // Content, visual order, actions, and responsive layout remain unchanged.
  // Rehashed 2026-08-25 for the approved copy-only replacement of the Tech
  // Stack row with the MVP Builder offer and its /build destination.
  // Rehashed 2026-10-24 (copy audit): the subtitle and two card descriptions
  // describe what the tools do instead of promising speed or a clear path.
  // Rehashed 2026-10-29 (homepage refresh, requested by Javier): the Dashboard
  // card opens the public sample workspace (/demo) instead of the sign-in-only
  // /dashboard, the investor card reads "Investor directory", and the
  // never-rendered `pathway` copy is gone. Layout and GIFs are unchanged.
  '../src/components/EntrepreneurProblems.tsx': '9afa4f0973fbcb267f89e2b264849b4f169ac36aaf5b1ad8f6997621a8a2ce37',
  // Updated for the canonical core-tool navigation: support tools no longer
  // appear as stage prerequisites, while Stage VII retains its original name
  // and order.
  // Rehashed 2026-08-28 for the approved authenticated-nav regrouping: Podcast
  // and Newspaper now live under Content, while Accelerator Hunt and Tech Stack
  // Builder live under Resources, and the top-level label is shortened to
  // BizMap. The redundant signed-in Home label was removed in favor of the
  // existing linked logo. The signed-out navbar remains unchanged.
  // Rehashed 2026-10-04: 83728f13 (2026-09-16) only returns null inside the
  // signed-in workspace frame; visitors get the same navbar as before.
  // Rehashed 2026-10-25: Startup Pedia sits in the Content submenu under
  // Newspaper and Podcast (as requested, instead of its own tab), and Content
  // is active on /startup-pedia. Nothing else in the file changed.
  // Rehashed 2026-10-28 (readiness audit, load timing only): the signed-in
  // navbar moved verbatim to navigation/MemberNavigation.tsx and loads lazily
  // once auth reports a user; this file now picks VisitorNavbar or that. Both
  // navbars render exactly as before. Visitors no longer download ~45KB gz of
  // messaging, notifications and credit UI they never see.
  '../src/components/Navigation.tsx': 'f054a5dabcf1dae579276305ef35364efe1ba51016ec6fff536cfe8710bb83d5',
  // Re-pinned 2026-07-25 (delivery audit, Phase 1): AISpecializationTrends moved
  // from a static import to lazy() + Suspense, matching how HomeFAQ and
  // FounderAnswerLibraryTeaser are already loaded. It is the only homepage
  // section using Recharts, and as a static import it pulled ~77KB gz of
  // charting into the fold-blocking bundle for a section far below the fold.
  //
  // Load timing only â€” no section added, removed, reordered, restyled or
  // re-copied. The Suspense fallback reserves the section's measured rendered
  // height (969px at 390px wide, 753px at lg) so the swap shifts nothing.
  // Hero/EntrepreneurProblems/Navigation hashes were unchanged at that
  // performance checkpoint.
  //
  // Previous hash (approved homepage restored from 1325b121, the parent of
  // 5dd4dbbb): 20234ac0810e38a9cf7fbc6497bd33ec7d3c1da7fc181d068a00dfe2c8ecb4d0
  // Rehashed 2026-08-24: the First Customer Sprint pilot announcement moved
  // from the public homepage to the authenticated Command Center, where
  // platform upgrades and founder-accountability work belong.
  // Rehashed 2026-10-04 for two approved changes the red CI hid: 36bbf23c
  // (2026-08-30, sticky mobile CTA removed) and 8a1bdfe9 (2026-09-08, new
  // social image).
  // Rehashed 2026-10-28 (readiness audit, load timing only): the three lazy
  // sections (Recharts trends, Startup Pedia teaser, FAQ) mount when they come
  // within 800px of the viewport instead of on first render, behind the same
  // placeholders. No section added, removed, reordered, restyled or re-copied.
  // Rehashed 2026-10-29 (homepage refresh, requested by Javier): adds Who's
  // here, Pricing, a Proof slot (hidden until real quotes exist) and a closing
  // CTA; moves the AI trends after the product sections; collapses the
  // duplicated mobile and desktop trees; new title and description. The
  // Hero, journey, cycle, value cards, Pedia teaser and FAQ keep their place
  // and look. The lazy-section placeholders now reserve the measured heights
  // (they were about half), which removed most of the phone layout shift.
  // Same day, after review: each section below the hero is wrapped in a
  // HomeScene (its own display face) and the muted bands are gone; the page
  // keeps the one HomeWallpaper.
  '../src/pages/Index.tsx': 'c749f74113a5a768822d85575450b9c7044947332a72898be5d0586ef2c455a7',
} as const;

test('the approved unauthenticated landing page remains frozen during core-tool work', () => {
  Object.entries(frozenFiles).forEach(([path, expected]) => {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(createHash('sha256').update(source, 'utf8').digest('hex'), expected, `${path} changed`);
  });
});
