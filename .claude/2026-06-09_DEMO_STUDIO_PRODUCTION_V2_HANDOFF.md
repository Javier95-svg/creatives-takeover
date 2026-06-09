# 2026-06-09 Demo Studio Production v2 Handoff

This handoff documents the Demo Studio Production v2 implementation pass.

## Product Direction

Demo Studio is now being upgraded from a functional MVP into a founder proof system:

- Define the proof story first.
- Generate AI storyboard, VSL scripts, and launch copy.
- Build the interactive demo from storyboard steps and screenshots.
- Record or attach Loom VSL variations.
- Publish one proof page with demo, VSL, signup capture, and funnel metrics.

Do not reintroduce Waitlist Maker framing into Demo Studio-facing UX.

## Implemented Changes

Added project-level Demo Brief:

- New route: `/demo-studio/projects/:id/brief`
- New page: `src/pages/demo-studio/DemoBriefPage.tsx`
- New table migration: `supabase/migrations/20260609090000_demo_studio_production_v2.sql`
- New brief API helpers in `src/lib/demoStudio/api.ts`
- New pure helper file: `src/lib/demoStudio/brief.ts`

Added AI generation:

- New Supabase function: `supabase/functions/demo-studio-generator/index.ts`
- Function config added in `supabase/config.toml`
- Modes: `full_kit`, `storyboard`, `vsl_scripts`, `launch_copy`
- Uses `WAITLIST_GENERATION` credit key because the app labels it as Demo Studio
- Server validates JSON output and refunds credits on generation/validation failure

Upgraded demo editor:

- New storyboard rail: `src/components/demo-studio/editor/StoryboardRail.tsx`
- AI storyboard steps can be imported as screenshot placeholders
- Selected empty storyboard steps can receive an uploaded screenshot
- Step thumbnails show `Needs image`
- Demo readiness scoring added through `src/lib/demoStudio/readiness.ts`
- Publish warns on weak readiness but does not hard-block

Upgraded VSL Studio:

- VSL rows now support `script`, `script_outline`, and `target_duration_seconds`
- AI scripts are passed into VSL Studio from the project brief
- Slots show script panels, readiness badges, teleprompter, and rewrite actions
- Script-first VSL rows are allowed, but launch readiness requires an actual Loom/video URL
- Public launch selection filters out script-only VSLs

Upgraded Launch Composer and public page:

- Default Demo Studio CTA is now `Get early access`
- Composer has public slug editing with availability checks
- Composer can apply AI launch copy variants
- Composer has theme controls: color, background, layout, success message
- Composer has launch checklist and date-windowed metrics
- Public `/p/:slug` tracks CTA clicks and signup attempts
- Demo player tracks demo start, demo complete, and demo-complete CTA clicks

Language cleanup:

- `WhatIsADemoPopover` rewritten to describe demo + VSL + launch page
- Pulse Demo Studio hint now says demo/VSL/proof page
- ICP draft recommendation now points to demo brief, VSL script, and proof page

## Important Files

- `src/lib/demoStudio/types.ts`
- `src/lib/demoStudio/api.ts`
- `src/lib/demoStudio/brief.ts`
- `src/lib/demoStudio/readiness.ts`
- `src/pages/demo-studio/DemoBriefPage.tsx`
- `src/pages/demo-studio/DemoEditorPage.tsx`
- `src/pages/demo-studio/VslStudioPage.tsx`
- `src/pages/demo-studio/LaunchComposerPage.tsx`
- `src/pages/demo-studio/PublicLaunchPage.tsx`
- `src/components/demo-studio/vsl/VslStudio.tsx`
- `src/components/demo-studio/vsl/VslSlot.tsx`
- `src/components/demo-studio/player/DemoPlayer.tsx`
- `supabase/functions/demo-studio-generator/index.ts`
- `supabase/migrations/20260609090000_demo_studio_production_v2.sql`
- `tests/demo-studio-production-v2.test.ts`

## Verification Status

Command execution became blocked by the environment usage limit during this pass, so automated verification could not be run from Codex at the time this note was written.

Run when available:

- `npm run typecheck`
- `node --experimental-strip-types --test tests\demo-studio-vsl.test.ts tests\demo-studio-production-v2.test.ts`
- targeted ESLint on changed Demo Studio files
- `npm run build`

Known pre-existing caveats from the prior pass still apply:

- Full `npm run lint` has unrelated repo-wide lint/config failures.
- Full `npm test` has unrelated failures outside Demo Studio.

## Backend SQL To Run

Run:

`supabase/migrations/20260609090000_demo_studio_production_v2.sql`

Also deploy:

`supabase/functions/demo-studio-generator`

Required secret:

- `OPENAI_API_KEY`

Optional frontend env remains:

- `VITE_LOOM_APP_ID`

