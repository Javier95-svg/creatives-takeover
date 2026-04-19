# Platform-Wide CTA and Interaction Reliability Audit

Generated: 2026-04-19

## Scope

- Route inventory source: `src/App.tsx`
- User-facing routes inventoried: 83
- Total mounted routes inventoried: 90
- Interactive entries inventoried from `src/**/*.tsx`: 2803
- Interactive totals by type:
  - `Button`: 1151
  - native `button`: 158
  - `Link`: 321
  - `a`: 91
  - `onClick`: 1082

Artifacts generated:

- `reports/platform-route-inventory.json`
- `reports/platform-interactive-inventory.json`
- `reports/platform-persona-matrix.json`
- `reports/platform-cta-audit-findings.json`

Validation executed:

- `node --experimental-strip-types --test tests/plan-permissions.test.ts`
- `node --experimental-strip-types --test tests/guided-onboarding.test.ts`
- `npm run build:dev`
- `npm run audit:cta`

## Findings

### 1. Contract bug: plan-permissions test had drifted from the canonical rookie nav config

- Severity: medium
- Status: fixed
- Route: n/a
- Location: `tests/plan-permissions.test.ts:95`
- Affected state: audit contract for all plan-tier validation
- Expected: the entitlement test should reflect the canonical rookie dashboard nav declared in `src/config/planPermissions.ts`
- Actual: the test still expected only `['/dashboard', '/tasks']`, while the live config includes Home, My Files, Saved Mentors, Your Tasks, and Referral Program
- Recommended fix: update the test to assert the current authoritative rookie nav list and verify the `my-files` section binding
- Source of truth: `src/config/planPermissions.ts`

### 2. Gating mismatch: `/mvp-builder` over-granted full access to logged-in Rookie and Starter users

- Severity: blocker
- Status: fixed
- Route: `/mvp-builder`
- Location: `src/pages/AppBuilderPage.tsx:12`
- Affected state: `verified_rookie`, `verified_starter`
- Expected: Rookie and Starter users should see a locked or upgrade state because `mvp_builder` is `preview_only` until Rising
- Actual: the route gave the full `<MVPBuilder />` surface to any authenticated user and only preview-gated guests
- Recommended fix: resolve `usePlanAccess('mvp_builder')` at the page level and show a locked upgrade state when `hasAccess` is false
- Source of truth: `src/config/planPermissions.ts`

### 3. Gating mismatch: `/directories` over-granted full access to logged-in Rookie and Starter users

- Severity: high
- Status: fixed
- Route: `/directories`
- Location: `src/pages/DirectoriesPage.tsx:30`
- Affected state: `verified_rookie`, `verified_starter`
- Expected: Rookie and Starter users should be blocked because `directories` is `preview_only` until Rising
- Actual: the route rendered `<DirectoriesTab />` for any authenticated user and only preview-gated guests
- Recommended fix: add `usePlanAccess('directories')` and swap in a locked upgrade state for non-entitled signed-in users
- Source of truth: `src/config/planPermissions.ts`

### 4. Gating mismatch: `/pmf-lab` over-granted full access to logged-in Rookie users

- Severity: blocker
- Status: fixed
- Route: `/pmf-lab`
- Location: `src/pages/PMFLabPage.tsx:34`
- Affected state: `verified_rookie`
- Expected: Rookie users should stay in preview or upgrade state because `pmf_lab` is only full on Starter and above
- Actual: the route rendered the full PMF intake and results flow for any authenticated user, and the hook enforced credits but not tier
- Recommended fix: add `usePlanAccess('pmf_lab')` and block non-entitled signed-in users before the full PMF workflow renders
- Source of truth: `src/config/planPermissions.ts`

### 5. Gating mismatch: `/go-to-market` over-granted full access to logged-in Rookie and Starter users

- Severity: blocker
- Status: fixed
- Route: `/go-to-market`
- Location: `src/pages/GTMStrategistPage.tsx:50`
- Affected state: `verified_rookie`, `verified_starter`
- Expected: only Rising and Pro should reach the full GTM strategist because `gtm_strategist` is `preview_only` below Rising
- Actual: the route rendered the full strategist for any authenticated user and only preview-gated guests
- Recommended fix: enforce `usePlanAccess('gtm_strategist')` at the page boundary and show a locked upgrade state otherwise
- Source of truth: `src/config/planPermissions.ts`

### 6. Gating mismatch: `/insighta/email-templates` over-granted full access to logged-in Rookie users

- Severity: high
- Status: fixed
- Route: `/insighta/email-templates`
- Location: `src/pages/EmailTemplatesPage.tsx:17`
- Affected state: `verified_rookie`
- Expected: Rookie users should not access the full template library because `email_templates` is locked until Starter
- Actual: the route rendered `<EmailTemplatesTab />` for any authenticated user and only preview-gated guests
- Recommended fix: add `usePlanAccess('email_templates')` and render a locked upgrade state for non-entitled signed-in users
- Source of truth: `src/config/planPermissions.ts`

### 7. Gating mismatch: `/insighta/pitch-deck-analyzer` over-granted full access to logged-in Rookie and Starter users

- Severity: blocker
- Status: fixed
- Route: `/insighta/pitch-deck-analyzer`
- Location: `src/pages/PitchDeckAnalyzerPage.tsx:21`
- Affected state: `verified_rookie`, `verified_starter`
- Expected: only Rising and Pro should access the analyzer because `pitch_deck_analyzer` is locked below Rising
- Actual: the route rendered the upload and analysis flow for any authenticated user and the hook only enforced credits, not tier
- Recommended fix: gate the page with `usePlanAccess('pitch_deck_analyzer')` and show a locked upgrade state when access is missing
- Source of truth: `src/config/planPermissions.ts`

### 8. Route bug: `/tech-stack` locked-state branch referenced `BlurredToolPreview` without importing it

- Severity: blocker
- Status: fixed
- Route: `/tech-stack`
- Location: `src/pages/TechStackPage.tsx:11`
- Affected state: `verified_rookie`, `verified_starter`
- Expected: lower-tier authenticated users should reach the locked-state UI without a runtime or build failure
- Actual: the page rendered `<BlurredToolPreview>` in the locked branch but did not import it
- Recommended fix: import `BlurredToolPreview` and keep the existing `usePlanAccess('tech_stack')` branch intact
- Source of truth: `src/pages/TechStackPage.tsx`

## Blocked Runtime Coverage

### 9. Spec gap: no in-repo E2E/browser harness for cross-viewport CTA execution

- Severity: medium
- Status: blocked by environment
- Route: multi-route
- Location: `package.json`
- Affected state: all personas, especially mobile and desktop parity checks
- Expected: blocker and high-value CTAs should be executable in an automated browser harness across the standard mobile and desktop viewports
- Actual: the repo has no Playwright, Cypress, or equivalent E2E layer, so runtime click/tap validation remains manual
- Recommended fix: add a minimal browser test harness for auth, upgrade, onboarding, dashboard, and plan-gated entry flows
- Source of truth: `package.json`

### 10. Spec gap: persona runtime matrix cannot be fully executed from local source alone

- Severity: medium
- Status: blocked by environment
- Route: multi-route
- Location: `src/contexts/AuthContext.tsx`
- Affected state: `unverified_account`, `verified_rookie`, `verified_starter`, `verified_rising`, `verified_pro`
- Expected: each persona in the audit matrix should have a stable runtime fixture or seeded test account for CTA verification
- Actual: the app models the unverified case through login errors rather than a first-class in-session auth state, and no seeded account fixtures are present in-repo
- Recommended fix: provision stable persona fixtures and document them alongside the audit matrix so runtime checks are reproducible
- Source of truth: `src/pages/Login.tsx`, `src/lib/authErrors.ts`, `src/contexts/AuthContext.tsx`
