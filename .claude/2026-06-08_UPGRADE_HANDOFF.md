# 2026-06-08 Upgrade Handoff

This file summarizes the major product/code changes made on 2026-06-08 so Claude has the same context in future sessions.

## Current Top-Level Direction

Two important product areas changed today:

- Pulse was upgraded into a compact, contextual, brand-safe in-app assistant for Creatives Takeover.
- Demo Studio was upgraded from a demo-builder foundation into a demo + VSL + launch page workflow.

Keep future work aligned with these directions.

## Pulse Chatbot Upgrades

Pulse is the in-app assistant surfaced by `src/App.tsx` through `PulseWidgetWrapper`.

Important files:

- `src/App.tsx`
- `src/config/pulseRoutes.ts`
- `src/hooks/usePulseWidget.ts`
- `src/hooks/useStreamingChat.ts`
- `src/components/pulse/PulseWidget.tsx`
- `src/components/pulse/PulsePanel.tsx`
- `src/components/pulse/PulseChatView.tsx`
- `src/components/pulse/PulseMessageBubble.tsx`
- `src/components/pulse/PulseQuickReplies.tsx`
- `src/components/pulse/PulseFeedbackView.tsx`
- `supabase/functions/chatbot-streaming/index.ts`
- `supabase/functions/response-templates/index.ts`

### Pulse Product Behavior

- Pulse is a compact Creatives Takeover assistant, not a generic chatbot.
- It helps visitors understand the platform, choose tools, and decide next steps.
- It uses route context from `src/config/pulseRoutes.ts`.
- It is visible on supported product/tool routes, including the homepage.
- It reads authenticated founder project context from the Startup Command Center model when available.
- It shows proactive messages after context loads, with session/local storage guards to avoid repeated nags.
- It shows quick replies after responses, keeping the UI action-oriented.
- Pulse UI defaults compact, with double-click expansion on the panel header.
- Pulse has a feedback tab and improved spacing/layout.

### Pulse Backend Behavior

- Pulse mode is sent through `chatbot-streaming` with `chatMode = 'pulse'`.
- Pulse is product/support guidance and should stay free, including for signed-in users.
- Credit deduction excludes `chatMode === 'pulse'`.
- Current model constants in `supabase/functions/chatbot-streaming/index.ts`:
  - `PULSE_PRIMARY_MODEL = 'google/gemini-2.5-flash'`
  - `PULSE_FALLBACK_MODEL = 'google/gemini-2.5-flash'`
- The backend includes Pulse-specific system prompting that identifies the platform as Creatives Takeover.
- Pulse responses must be brand-safe, contextual, concise, and should not conflate BizMap AI with the whole platform.
- The backend includes stable fallback handling so Pulse does not silently fail when the model/gateway errors.
- Template/stream completion events can include quick actions, which the frontend maps to three quick replies.

### Pulse Commits From Today

- `ce3bd2d5 Upgrade Pulse assistant experience`
- `3fa0a7af Fix Pulse visibility`
- `90c81e90 Tighten Pulse assistant experience`
- `ce1ac39a Show Pulse on homepage`
- `a561f823 Fix Pulse panel layout spacing`
- `e34407ae Make Pulse panel compact by default`
- `e4af6bd6 Add brand-safe Pulse platform answers`
- `e9eda4af Make Pulse answers brand-safe and contextual`
- `cf3b9af7 Upgrade Pulse to Gemini 3 Flash`
- `5d251642 Restore Pulse to Gemini 2.5 Flash`
- `8e12cfe2 Show Pulse CTAs after every response`
- `c1b9c983 Fix Pulse silent fallback responses`
- `9ac92263 Fix signed-in Pulse credit gating`

Note: Gemini 3 Flash was tried during the day, but the final pushed code restored Pulse to Gemini 2.5 Flash for stability.

## Demo Studio Upgrades

Demo Studio replaced the old Waitlist Maker direction. The promise is:

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

Important routes:

- `/demo-studio`
- `/demo-studio/projects/:id`
- `/demo-studio/projects/:id/demos/:demoId/edit`
- `/demo-studio/projects/:id/vsl`
- `/demo-studio/projects/:id/launch`
- `/demo/:shareSlug`
- `/p/:slug`

Important files:

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

### Demo Studio Product Behavior

- VSL Studio has three visible variation slots: A, B, C.
- VSLs support primary selection, delete, Loom SDK recording, and paste-a-Loom-link fallback.
- Loom recording requires `VITE_LOOM_APP_ID`; paste fallback works without it.
- Launch Composer lets founders pick a demo, pick a VSL, edit headline/subheadline/CTA, preview, and publish/unpublish.
- Public proof pages live at `/p/:slug`.
- Public proof pages render hero, VSL embed, interactive demo, signup form, CT branding, and basic tracking.
- Demo Editor now supports step title, caption, speaker notes, duplicate step, demo brief fields, and end CTA fields.
- Demo Player now shows step title/caption and theme CTA fallback.
- Dashboard/project overview now point to real VSL Studio and Launch Composer actions.

### Demo Studio Database

Migration:

`supabase/migrations/20260608190000_demo_studio_vsl_launch_enhancements.sql`

Adds:

- `title`, `caption`, `speaker_notes` to `demo_studio_demo_steps`.
- `title`, `hook` to `demo_studio_vsls`.
- Backfilled step titles.
- Trigger blocking `launch_published = true` unless the project has at least one published demo and one VSL.
- Event type comment for launch/VSL/signup tracking.

### Demo Studio Commits From Today

- `af55c573 Enhance Demo Studio launch workflow`
- `000573fa Document Demo Studio upgrades for Claude`

## Verification Status

During the Demo Studio implementation pass:

- `npm run typecheck` passed.
- `npm run build` passed.
- `node --experimental-strip-types --test tests\demo-studio-vsl.test.ts` passed.
- Targeted ESLint on the final changed dashboard page passed.

Known caveats:

- Full `npm run lint` is blocked by existing repo-wide lint/config issues unrelated to Demo Studio.
- Full `npm test` has existing unrelated failures; the new Demo Studio helper tests pass.
- `npm install @loomhq/record-sdk` updated `package.json` and `package-lock.json`.
- NPM reported dependency/audit warnings during install; not resolved in this pass.

## Follow-Up Notes

- Keep Pulse route copy aligned with Demo Studio's new demo + VSL + launch page promise.
- Do not revive Waitlist Maker framing in Demo Studio UX.
- If Pulse answers about Demo Studio, it should describe interactive demos, founder VSLs, launch pages, signup capture, and measuring interest.
- Future Demo Studio work should stay in Vite + React Router, not Next.js App Router.
