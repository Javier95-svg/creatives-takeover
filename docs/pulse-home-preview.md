# Pulse Home preview

The three `/prototypes/*` concepts share `PulseHomeView`, a live adapter and the
existing Pulse streaming endpoint. The public homepage, Dashboard, signup and
onboarding are not promoted or redesigned by this change. Existing opt-in
workspace preview navigation remains available; clearing the
`ct-workspace-preview` session-storage key exits that preview.

## Enable live review

1. Configure the existing Vite Supabase URL and publishable key; sign in.
2. Apply `20260916090000_pulse_home_conversations.sql` **before** deploying the
   updated `chatbot-streaming` function. This adds nullable purpose metadata,
   a latest-home index, idempotent turn index and restrictive ownership policies.
3. Deploy `chatbot-streaming` with its shared modules and existing
   `LOVABLE_API_KEY`. No new billing key or per-message credit deduction is added.
4. Open `/prototypes/founder-guide`, `/prototypes/command-center` or
   `/prototypes/guided-journey`. Without application configuration these are
   explicitly non-live design previews, not simulated conversations.

Home conversations use `purpose = pulse_home` and the existing freeform storage
mode. Latest-created Home conversation is resumed, including empty new threads.
Messages carry `homeTurnId` and assistant messages `homeActions`. Retry replays
an already-saved answer or retries the same user turn. Partial responses are not
stored as completed answers. Client state is remounted/cleared on account change.
Priorities use the Dashboard provider and route registry. Focus/visibility changes
refresh that provider and the shared startup context loader.

Tools resolve from the founder tool catalog. Mentor matching uses the existing
ranking function, active directory records and profile URL helper. Fundraising
requires an explicit Fundraising expertise tag; generic Finance/Strategy is not
enough. Model URLs are never executed. No messages, bookings, requests or task
mutations are made by Pulse Home.

## Local checks

```
node --experimental-strip-types --test tests/pulse-home.test.ts
node scripts/verify-pulse-home.mjs
```

The browser check expects Vite on port 8080 and writes screenshots to
`artifacts/pulse-home`. Its conversation fixture is injected only into that test
page. It is not a live-data fallback.

## Live acceptance still required

Local verification passed: six targeted data/service tests, targeted lint and
TypeScript checks for the new files, and twelve concept/theme/viewport browser
checks plus keyboard, reduced-motion, chat composition and navigation-shell
checks using an explicit fixture. The full repository TypeScript check still
reports existing errors outside these new files. No live database migration or
edge-function deployment was performed during local review.

- Fresh account: no invented tasks/history; empty-state planning works.
- Returning account: compare the first three priorities to Dashboard and refresh
  after editing a task or finishing a tool.
- Ask about customer personas, fundraising mentors, an ambiguous goal, and a
  specialty with no active matching mentors. Inspect links and match reasons.
- Navigate into a recommended tool/profile; both bars remain, sidebar collapses;
  returning restores the Home chat.
- Reload, sign out/in, switch accounts, and create a new conversation. Verify no
  other account or unrelated tool thread is loaded. Direct cross-account database
  reads/writes and endpoint calls must be rejected under real RLS.
- Interrupt a stream and retry; one user turn and one completed assistant answer
  should remain. Check response persistence across sign-ins.
- Check dark/light, keyboard use, reduced motion, 1440×900 and 1920×1080.
- Confirm credit balance unchanged by chat, and public landing, Dashboard,
  onboarding and existing billing behavior remain unchanged.

Production promotion is a separate review/deployment decision.
