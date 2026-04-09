# Event Schema

## `landing_viewed`
- Wrapper: `trackLandingViewed({ page, exit_intent? })`
- Fires in:
  - `src/pages/Index.tsx` when the homepage mounts
  - `src/components/auth/SoftGateModal.tsx` when the modal is dismissed with `exit_intent: true`
- Properties:
  - `page: string`
  - `exit_intent?: boolean`

## `icp_builder_started`
- Wrapper:
  - `trackICPBuilderStarted(properties?)`
  - `trackIcpBuilderStartedUngated({ source })`
- Fires in:
  - `src/components/home/Hero.tsx` for the homepage wedge start
  - existing ICP builder save/start flows
- Properties added by the homepage wedge:
  - `source: "hero"`
  - `entry_variant: "ungated"`

## `soft_gate_shown`
- Wrapper: `trackSoftGateShown({ trigger })`
- Fires in:
  - `src/components/auth/SoftGateModal.tsx` when the modal first opens
- Properties:
  - `trigger: string`

## `signup_started`
- Wrapper: `trackSignupStarted({ method })`
- Fires in:
  - `src/components/auth/SoftGateModal.tsx` on Google click
  - `src/components/auth/SoftGateModal.tsx` on LinkedIn click
  - `src/components/auth/SoftGateModal.tsx` on email form submit
- Properties:
  - `method: "google" | "linkedin" | "email"`

## `signup_completed`
- Wrapper: `trackSignupCompleted({ method })`
- Fires in:
  - `src/components/auth/SoftGateModal.tsx` after successful email signup + session creation
  - `src/pages/AuthCallback.tsx` after successful OAuth callback when the modal stored an OAuth signup method
- Properties:
  - `method: "google" | "linkedin" | "email"`

## `activation_completed`
- Wrapper: `trackActivationCompleted({ artifact })`
- Fires in:
  - `src/components/icp/ICPBuilder.tsx` when a `seed` param is accepted and prefills the expanded ICP builder
- Properties:
  - `artifact: string`
