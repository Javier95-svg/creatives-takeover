# Demo Studio — Competitive Audit (2026-07-12)

## Verdict: LAGGING
As a standalone interactive-demo tool it is one to two generations behind Supademo, Arcade, and Navattic on capture technology and output formats. Its genuine differentiation — the founder launch bundle (brief → AI kit → demo → VSL → launch page → leads) — is real but undersold, and the capture friction gates everything behind it.

## What's actually shipped (implementation reference)
- Namespaced product at `/demo-studio/*` (`src/pages/demo-studio/`, 11 pages): projects dashboard, demo brief, editor, analytics, VSL studio, launch composer, public demo/embed/launch pages, anonymous `/try` funnel. Legacy waitlist maker lives on at `/demo-studio/classic`.
- **Capture:** screenshot upload + `getDisplayMedia` screen frames (`src/lib/demoStudio/screenCapture.ts`). No browser extension, no DOM/HTML click-through capture. Steps can also be HTML snapshots (`SnapshotFrame`).
- **Editor:** hotspot canvas with normalized coordinates, three hotspot actions (next / goto step / external URL), step thumbnails, storyboard rail (`src/components/demo-studio/editor/`).
- **Player** (`player/DemoPlayer.tsx`): progress bar, keyboard nav, end-screen CTA, "Made with" watermark, client-side MP4/GIF export (currently free — see `TODO(billing)`).
- **AI kit** (`supabase/functions/demo-studio-generator/index.ts`): storyboard (3–7 steps with captions, speaker notes, hotspot labels), three VSL scripts (A/B/C, 30–180s targets), launch copy (3 headline variants with rationale) — with genuinely good output validation (forbidden hype-word list, placeholder detection, per-field length checks).
- **Analytics** (`analytics/DemoAnalyticsPanel.tsx`): unique viewers, completion rate, per-step drop-off funnel, CTA clicks.
- **Lead capture** with webhook delivery + retry (`demo-studio-lead`, `demo-studio-webhook-retry`).
- **VSL studio:** Loom embed/record/paste (no native recording).
- **Anonymous try funnel:** uncharged 2–3-step draft (IP rate-limited), resume email + drip (`demo-try-resume-email`, `process-demo-try-drip`).

## Competitor benchmark
| Competitor | What they actually do | Price |
|---|---|---|
| **Supademo** | Chrome extension click-through capture → instant interactive guide; 6 output formats; AI voiceover; branching and HTML capture on higher tiers | Free plan; $27/user/mo |
| **Arcade** | Screen recording → one capture publishes as interactive demo, 16:9 video, embeddable widget, and share URL; AI voiceover; HTML capture + branching on Growth | $32/user/mo Pro; ~$297/mo Growth |
| **Navattic** | Deepest HTML cloning in category — captures live product as HTML elements for pixel-perfect embedded demos; enterprise PLG analytics | ~$500/mo |

Position: all three start from **automatic capture** (extension or recording). Our workflow starts from manually produced screenshots, which is the single biggest gap — everything downstream (hotspots, analytics, AI copy) is competitive-at-the-low-end once assets exist.

## Scores
- **Usability / value: 6/10** — once assets are in, the editor→player→analytics loop is clean and the AI kit's anti-hype validation produces genuinely usable launch copy, but manual screenshot capture makes creating a 5-step demo 10× slower than Supademo's extension.
- **Market competitiveness: 4/10** — no extension capture, no HTML capture, no AI voiceover, no video output format, no branching UI; we compete only on price ($0-in-bundle) and on being embedded in the founder journey.

## Moat gap
**Weekend-copyable (by them):** everything in our player and editor — competitors already have superior versions.
**Weekend-copyable (by us): nothing critical** — extension capture is weeks not days; HTML capture is years of engineering (Navattic's whole moat).
**Hard for them to replicate:** the bundle. Supademo/Arcade sell demo software to PMMs at companies that already have products. Our demo is one node in a validation journey: brief seeded from the ICP, leads feeding the platform, launch page composing demo + VSL + copy. None of them will rebuild a founder OS to chase our segment.

## Upgrades (severity-tagged)
- **[CRITICAL] Kill capture friction.** Ship a lightweight Chrome extension (or an in-page recorder for web apps built in MVP Builder) that captures a click-through as screenshots + click coordinates → auto-generates steps and hotspot positions. This is the adoption gate for the entire feature; without it, drop-off happens before any moat can form.
- **[HIGH] One capture → many formats.** We already have MP4/GIF export; add AI voiceover over the storyboard's existing `speaker_notes` (they're generated for exactly this) to produce a narrated video variant — Arcade's core value prop, and our storyboard data model already contains the script.
- **[HIGH] Wire demo analytics into PMF Lab as demand evidence.** Completion rate, per-step drop-off, and CTA clicks are demand signals; today they die in the analytics panel (see moat below).
- **[MEDIUM] Branching UX.** The `goto` hotspot action already supports non-linear flows — expose it as named branches ("for admins / for creators") in the editor instead of raw step numbers.
- **[MEDIUM] Demo templates by product category** seeded from the brief, so the first demo is assembleable in under 10 minutes.
- **[LOW] Charge for MP4/GIF export** (`TODO(billing)` already in code) once capture friction is fixed — not before.

## Proposed moat: the demo as a validation instrument (proprietary workflow + data loop)
Supademo, Arcade, and Navattic sell polish — demos as marketing collateral. No one scores demos as **validation evidence**. Mechanism: pipe Demo Studio's per-step drop-off, completion rate, CTA clicks, and captured leads directly into PMF Lab's evidence scorer as first-class demand signals (the scorer already ingests hosted-survey evidence the same way — `surveyEvidence` in `pmf-evidence-scorer`). The demo stops being a launch asset and becomes a falsifiable experiment: "step 3 loses 60% of viewers — your aha moment isn't landing; here's what to retest." That reframing is structurally unavailable to demo-software vendors (they have no scoring system to feed) and turns every demo view into data that makes the founder's PMF assessment — and our dataset — better.
