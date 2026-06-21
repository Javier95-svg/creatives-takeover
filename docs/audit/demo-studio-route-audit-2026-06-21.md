# Demo Studio Route Performance and Code Health Audit

Date: 2026-06-21

Routes audited:
- `/demo-studio`
- `/demo-studio/try`

Note: the codebase registers `/demo-studio/try`, not `/demo-studio-try`. If external campaigns use `/demo-studio-try`, that URL currently needs an explicit redirect.

## Summary

`/demo-studio/try` successfully supports the anonymous first-touch flow at a basic interaction level: upload screenshots, generate a mocked storyboard, preview the walkthrough, replay, and reset all worked in browser testing. The anonymous generator path is uncharged and rate-limited before auth/credit logic.

`/demo-studio` correctly redirects logged-out visitors to `/demo-studio/try` and loads the authenticated projects dashboard for signed-in users.

The biggest production risks are not visual rendering issues. They are route mismatch risk, unnecessary global network calls on the unauthenticated try route, and a non-transactional post-signup hydration flow that can leave partial data if saving fails.

## Performance and Load Behavior

Observed local Vite browser timings with dummy Supabase env:

| Route | Final URL | DOMContentLoaded | Load | Notes |
| --- | --- | ---: | ---: | --- |
| `/demo-studio` logged out | `/demo-studio/try` | ~698 ms | ~702 ms | Redirected to try route |
| `/demo-studio/try` | `/demo-studio/try` | ~423 ms | ~427 ms | Main try page loaded |

Production build route chunks:

| Chunk | Raw Size | Meaning |
| --- | ---: | --- |
| `TryPage.*.js` | ~13.6 kB | Anonymous try page |
| `ProjectsDashboardPage.*.js` | ~18.1 kB | Authenticated dashboard page |
| `DemoPlayer.*.js` | ~7.9 kB | Shared preview/player |
| `api.*.js` | ~20.1 kB | Demo Studio data layer |
| `react-core.*.js` | ~250.2 kB | Shared first-load dependency |
| `radix-ui.*.js` | ~130.0 kB | Shared UI dependency |
| `vendor-lucide-react.*.js` | ~90.4 kB | Shared icons |
| `analytics.*.js` | ~166.5 kB | Shared analytics |
| `index.*.css` | ~397.2 kB | Shared CSS |

Meaningful difference: the route-specific chunks are both small. First-load cost is dominated by shared app shell, CSS, analytics, icon, and UI-library chunks. `/demo-studio/try` is lighter than `/demo-studio`, but still inherits global app overhead.

## Data Flow

### `/demo-studio`

Component:
- `src/pages/demo-studio/ProjectsDashboardPage.tsx`

Flow:
1. Reads auth state via `useAuth`.
2. If logged out, redirects to `/demo-studio/try`.
3. If logged in, loads projects via `listProjects(user.id)`.
4. Loads demo counts via `getOwnerDemoCounts(user.id)`.
5. Project creation writes to `demo_studio_projects`.

Database tables involved:
- `demo_studio_projects`
- `demo_studio_demos`

### `/demo-studio/try`

Component:
- `src/pages/demo-studio/TryPage.tsx`

Flow:
1. Anonymous visitor uploads 2-3 screenshots.
2. Client calls `generateDemoStudioDraftStoryboard`.
3. API invokes Supabase Edge Function `demo-studio-generator` with `draft: true`.
4. Edge Function rate-limits by IP using `assert_rate_limit`.
5. Edge Function calls OpenAI and returns storyboard only.
6. Client renders local in-memory demo using blob URLs.
7. Anonymous save CTA serializes downscaled screenshots to `sessionStorage`.
8. After signup return, client hydrates draft into:
   - `demo_studio_projects`
   - `demo_studio_demos`
   - `demo_studio_demo_steps`
   - `demo_studio_demo_hotspots`
   - `demo-assets` storage bucket

Credit/rate-limit behavior:
- Anonymous draft generation is intentionally no-auth and no-credit.
- Anonymous generation is rate-limited to 5 per minute per IP when Supabase service env vars are present.
- Authenticated non-draft generation deducts `WAITLIST_GENERATION` credits and refunds on AI failure.

## Browser Flow Verification

Verified with Playwright against local Vite:

`/demo-studio/try` mocked generator flow:
- Screenshot upload: worked.
- Generate button enabled after two screenshots: worked.
- Generator request fired once: worked.
- Demo preview rendered: worked.
- Next controls advanced through steps: worked.
- Completion screen rendered: worked.
- Replay button reset completion state: worked.
- Try different screenshots reset the flow: worked.

Console/network observations with dummy Supabase:
- React Router future flag warnings appeared.
- `subscription_tiers` fetch failed because dummy Supabase was unreachable.
- `page_analytics` and `demo_studio_events` inserts failed because dummy Supabase was unreachable.

The dummy Supabase failures are expected locally, but they revealed unnecessary global calls on the unauthenticated first-touch route.

## Issues Found

### 1. Possible live-route mismatch

Severity: blocker if external links use `/demo-studio-try`

File:
- `src/App.tsx:302`

Issue:
The router registers `/demo-studio/try`, but the request context names `/demo-studio-try`. If prospects land on `/demo-studio-try`, they will not reach the aha flow.

Fix:
Add a redirect route:

```tsx
<Route path="/demo-studio-try" element={<Navigate to="/demo-studio/try" replace />} />
```

Place it beside the existing `/demo-studio/try` route.

### 2. Post-signup hydration is non-transactional

Severity: major

File:
- `src/pages/demo-studio/TryPage.tsx:231`

Issue:
The hydration flow creates the project, demo, uploads assets, creates steps, and creates hotspots through independent client-side operations. If any upload or insert fails mid-save, partial projects/demos can remain in the database.

Fix:
Move hydration into a single Supabase Edge Function or RPC that:
- validates the draft,
- creates project/demo/steps/hotspots transactionally,
- handles asset persistence predictably,
- rolls back or cleans up on failure,
- returns the project ID for navigation.

### 3. Generation and persistence are not cancel-safe

Severity: major

File:
- `src/pages/demo-studio/TryPage.tsx:160`

Issue:
Generation and draft persistence can continue after the user starts over or navigates away. There is no `AbortController` or stale-response token to ignore late responses.

Fix:
Add a generation run ID or `AbortController`. On start-over/unmount, cancel or mark the run stale. Only apply results when the active run ID still matches.

### 4. Unauthenticated try route still performs subscription-tier boot calls

Severity: major

File:
- `src/hooks/useSubscription.ts:156`

Issue:
The global app shell can fetch `subscription_tiers` for logged-out visitors. On `/demo-studio/try`, this is unnecessary and creates avoidable network work and console noise on the first-touch route.

Fix:
Disable tier fetching when `!user` unless the mounted component explicitly needs public pricing tier data. For `/demo-studio/try`, avoid mounting subscription-dependent UI or gate the query with `enabled: Boolean(user)`.

### 5. Dashboard project counts use redundant database round trips

Severity: minor

Files:
- `src/pages/demo-studio/ProjectsDashboardPage.tsx:70`
- `src/lib/demoStudio/api.ts:376`

Issue:
The dashboard loads projects and owner demo counts in parallel, but counts are two additional database requests.

Fix:
Create one owner-dashboard RPC or API function returning:
- project rows,
- total demo count,
- published demo count.

### 6. Anonymous rate limit can fail open if function env is incomplete

Severity: minor

File:
- `supabase/functions/demo-studio-generator/index.ts:265`

Issue:
The draft rate limit is only enforced when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present. If either is missing, the function proceeds without the IP cap.

Fix:
Fail closed in production when rate-limit dependencies are missing, or explicitly assert required env vars at function startup.

## Production Verdict

No, this is not production ready right now.

Smallest required fix list:

1. Add `/demo-studio-try` redirect to `/demo-studio/try` if that URL is used externally.
2. Remove unauthenticated subscription-tier boot calls from `/demo-studio/try`.
3. Make try-demo hydration transactional and cleanup-safe.
4. Add stale-response/cancel protection around anonymous generation and draft persistence.

