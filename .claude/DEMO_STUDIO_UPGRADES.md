# Demo Studio Upgrade Context

Last updated: 2026-06-29
Commit pushed to main: `af55c573 Enhance Demo Studio launch workflow`
Latest production reliability fix: `6e8a938d Make demo studio try flow resilient`

## Product Direction

Demo Studio replaced the old Waitlist Maker direction. The core promise is now:

Founder leaves with:

- An interactive product demo.
- A recorded or embedded VSL.
- A public launch/proof page with signup capture.

The intended flow is:

1. Define demo story.
2. Build guided demo.
3. Record or attach VSL.
4. Compose launch page.
5. Publish and measure.

## Current Architecture

This repo is Vite + React Router, not Next.js App Router. Keep future Demo Studio work inside this architecture.

Important routes:

- `/demo-studio`
- `/demo-studio/projects/:id`
- `/demo-studio/projects/:id/demos/:demoId/edit`
- `/demo-studio/projects/:id/vsl`
- `/demo-studio/projects/:id/launch`
- `/demo/:shareSlug`
- `/p/:slug`

## Implemented Upgrade Scope

### 2026-06-29 `/demo-studio/try` Production Reliability Fix

Codex audited the public activation route at `https://creatives-takeover.com/demo-studio/try` because it is now the main logged-out "aha" moment from the homepage CTA.

What was found:

- The route itself was reachable in production and returned `200 OK`.
- The homepage CTA for logged-out visitors correctly resolved to `/demo-studio/try`.
- Pulse was correctly excluded from `/demo-studio/try`.
- Upload input worked and the generate button became enabled.
- The critical failure was after submit: the live `demo-studio-generator` Edge Function returned `500` with `errorCode: VALIDATION_FAILED`, so visitors could not reach the demo preview or signup/save CTA.
- The UI promised `2 to 3 screenshots`, but anonymous generator validation expected at least `3` storyboard steps.
- The client could reference `shots[i].url` for a missing screenshot if the storyboard had more steps than uploaded screenshots.

What was fixed in commit `6e8a938d`:

- Added `src/lib/demoStudio/tryPreview.ts` as the shared source of truth for the anonymous try-preview flow.
- Added deterministic fallback storyboard generation for 2-step and 3-step previews.
- Updated `src/pages/demo-studio/TryPage.tsx` so the visitor gets a rendered `DemoPlayer` even when the generator fails, times out, or returns invalid/short output.
- Updated `src/lib/demoStudio/api.ts` so `generateDemoStudioDraftStoryboard` sends a draft-only `stepCount?: 2 | 3`.
- Updated `supabase/functions/demo-studio-generator/index.ts` so anonymous draft mode asks for exactly the uploaded screenshot count and returns fallback success instead of dead-ending with `500`.
- Preserved authenticated Demo Studio generation as strict, credit-protected, and unchanged.
- Preserved `/signup?from=demo-try&return=/demo-studio/try?hydrate=1` so anonymous drafts can hydrate after signup.
- Added `tests/demo-studio-try-preview.test.ts` for 2-step and 3-step behavior, fallback repair, and safe screenshot/storyboard pairing.

Important behavior after the fix:

- Logged-out visitors can upload 2 screenshots and reach the preview.
- Logged-out visitors can upload 3 screenshots and reach the preview.
- If OpenAI or the Edge Function draft generation path fails, the client still renders a simple personalized fallback demo based on screenshot order and optional URL/product name.
- Rate-limit messages are still shown as errors and are not bypassed by the client fallback.
- Pulse remains absent on this route.
- The post-preview CTA remains `Save and publish this demo`.

Verification run by Codex:

- `npm.cmd run typecheck`
- `node --experimental-strip-types --test tests/demo-studio-production-v2.test.ts tests/demo-studio-try-preview.test.ts`
- Local browser smoke test with 2 screenshots: preview rendered, CTA rendered, Pulse absent.
- Local browser smoke test with 3 screenshots: preview rendered, CTA rendered, Pulse absent.
- Forced generator `500` browser smoke test: fallback preview rendered and CTA navigated to `/signup?from=demo-try&return=/demo-studio/try?hydrate=1`.
- After the user deployed `demo-studio-generator`, production browser smoke tests passed for 2 and 3 screenshots. The live Edge Function returned `200` with `{ "success": true, "mode": "storyboard" }`.

Deployment note:

- The frontend changes are in `main` at commit `6e8a938d`.
- The Supabase Edge Function must also be deployed for production to use the new no-dead-end generator behavior:

```powershell
supabase functions deploy demo-studio-generator --project-ref rcjlaybjnozqbsoxzboa
```

The user reported this deploy was completed, and Codex verified the production route afterward.

Added VSL Studio:

- Three visible VSL variation slots: A, B, C.
- Primary VSL selection.
- Delete VSL.
- Paste Loom link fallback.
- Loom SDK recording button when `VITE_LOOM_APP_ID` is configured.

Added Launch Composer:

- Select primary demo.
- Select primary VSL.
- Edit headline, subheadline, CTA label, CTA URL.
- Preview selected demo/VSL.
- Publish/unpublish launch page.
- Shows readiness blockers and basic funnel metrics.

Added public proof page:

- Route: `/p/:slug`
- Renders hero, embedded VSL, interactive demo, signup form, and CT branding.
- Tracks `launch_page_view`, `vsl_impression`, and signup attribution.

Improved Demo Editor:

- Richer demo step fields: `title`, `caption`, `speaker_notes`.
- Duplicate step action.
- Demo brief fields stored in theme: audience, promise, aha moment.
- End CTA label/URL stored in demo theme.

Improved Demo Player:

- Shows step title and caption overlays.
- Uses theme CTA fallback when explicit CTA props are not passed.

Updated dashboard/project overview:

- Copy now frames Demo Studio as demo + founder pitch + launch page.
- Roadmap actions now link to real VSL Studio and Launch Composer pages.

## Important Files

- `src/App.tsx`
- `src/lib/demoStudio/types.ts`
- `src/lib/demoStudio/api.ts`
- `src/lib/demoStudio/vsl.ts`
- `src/components/demo-studio/vsl/*`
- `src/pages/demo-studio/VslStudioPage.tsx`
- `src/pages/demo-studio/LaunchComposerPage.tsx`
- `src/pages/demo-studio/PublicLaunchPage.tsx`
- `src/pages/demo-studio/DemoEditorPage.tsx`
- `src/pages/demo-studio/ProjectOverviewPage.tsx`
- `src/pages/demo-studio/ProjectsDashboardPage.tsx`
- `src/components/demo-studio/player/DemoPlayer.tsx`
- `src/components/demo-studio/editor/StepThumbnailList.tsx`
- `scripts/seo-route-config.mjs`
- `tests/demo-studio-vsl.test.ts`
- `supabase/migrations/20260608190000_demo_studio_vsl_launch_enhancements.sql`

## Database Upgrade

Migration file:

`supabase/migrations/20260608190000_demo_studio_vsl_launch_enhancements.sql`

It adds:

- `title`, `caption`, `speaker_notes` to `demo_studio_demo_steps`.
- `title`, `hook` to `demo_studio_vsls`.
- Backfilled step titles.
- Trigger enforcing that `launch_published = true` requires at least one published demo and at least one VSL.
- Updated event type comment for launch/VSL/signup tracking.

Run this migration in Supabase before testing published launch pages.

## Environment

Optional Loom SDK recording requires:

`VITE_LOOM_APP_ID`

If unset, the product still works with paste-a-Loom-link fallback.

## Verification From Implementation Pass

Passed:

- `npm run typecheck`
- `npm run build`
- `node --experimental-strip-types --test tests\demo-studio-vsl.test.ts`
- Targeted ESLint check on the final changed dashboard page

Known caveats:

- Full `npm run lint` is blocked by existing repo-wide lint/config issues unrelated to Demo Studio.
- Full `npm test` has existing unrelated failures, but the new Demo Studio helper tests pass.
- `npm install @loomhq/record-sdk` updated `package.json` and `package-lock.json`.
- NPM reported dependency/audit warnings during install; they were not part of this feature scope.

## Future Work

Good next improvements:

- Add a more guided "Demo Brief" wizard before the editor instead of only brief fields in the editor rail.
- Add richer launch-page styling controls.
- Add variation mode for rotating VSL A/B/C on public pages.
- Add deeper analytics once Loom exposes reliable viewer events.
- Replace remaining old Waitlist Maker internals only where they still affect visible Demo Studio UX.
