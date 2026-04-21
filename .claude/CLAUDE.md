# Claude Project Context

## ICP Builder Activation Funnel

The current ICP Builder onboarding flow is intentionally value-first for cold traffic.

### Funnel goal

Convert cold visitors into new accounts only after they have seen useful ICP output.

Target flow:

1. Visitor lands on `/icp-builder` or is routed there from homepage ICP CTAs.
2. Visitor starts with one sentence about their startup idea.
3. Builder generates a predicted ICP and moves through a short guided flow.
4. Visitor sees a readable draft preview before any account wall.
5. Account creation or login is prompted only to save and unlock the full draft.
6. If the visitor is not ready to create an account, they can request an emailed resume link.

### Important product rules

- Do not reintroduce pre-value auth gates for signed-out homepage traffic.
- `/icp-builder` should remain public and value-first.
- The builder should not open with a heavy mode-choice wall as the primary cold-traffic experience.
- Guided pre-auth friction is intentionally reduced to:
  - startup idea
  - predicted persona confirmation or edit
  - main pain
  - current workaround
- Advanced sharpening fields such as founder edge, market context, and deeper positioning should stay post-unlock unless there is a strong reason to move them earlier.
- The unlock gate must support:
  - free account creation
  - existing-user login
  - emailed resume-link recovery

### Key implementation files

- `src/components/IcpWedgeHero.tsx`
  - Homepage wedge CTA should send visitors into the public builder, not an auth modal.
- `src/components/icp/ICPBuilder.tsx`
  - Primary activation flow, guided steps, preview generation, unlock prompt, and recovery behavior.
- `src/components/icp/IcpUnlockGate.tsx`
  - Value-tied account wall with login and email resume-link options.
- `src/lib/analytics.ts`
  - Funnel events for preview, unlock, resume, and dashboard handoff.
- `supabase/functions/icp-analyzer/index.ts`
  - Server-side draft generation and guided input validation.
- `supabase/functions/request-icp-draft-email/index.ts`
  - Resume-link email path for incomplete or locked drafts.

### Analytics events added for this funnel

- `icp_seed_submitted`
- `icp_preview_ready`
- `icp_unlock_gate_shown`
- `icp_unlock_clicked`
- `icp_login_clicked`
- `icp_resume_link_requested`
- `icp_resume_restored`
- `icp_dashboard_opened`

### Session note

The ICP builder session schema was bumped to version `4` when this funnel changed. Old in-progress local sessions from the previous 8-step guided flow are intentionally invalidated.
