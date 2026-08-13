# Platform performance audit — 2026-08-12

## Outcome

This pass focused on delivery speed, low-end-device behavior, the shared application shell, and the reported `/podcast` video regression. The production build, TypeScript, ESLint, targeted regression tests, and a production-browser podcast smoke test pass.

The main measurable delivery improvement is a reduction in the initial HTML JavaScript graph from 32 requests to 6. Initial compressed JS + CSS fell from 402,426 bytes to 378,500 bytes, and the raw entry module fell from approximately 225.5 KiB to 164.3 KiB.

## Measurements

| Metric | Before | After | Change |
|---|---:|---:|---:|
| Initial JavaScript requests | 32 | 6 | -81% |
| Initial JS + CSS requests | 33 | 7 | -79% |
| Initial raw JS + CSS | 1,554,431 B | 1,487,578 B | -4.3% |
| Initial gzip JS + CSS | 402,426 B | 378,500 B | -5.9% |
| Entry module raw size | ~225.5 KiB | 164.3 KiB | ~-27% |
| YouTube embeds requested before Play | 1 | 0 | eliminated |
| Anonymous authenticated-only chunks | loaded in entry graph | 0 | deferred |

The live `/podcast` reproduction took about 8.5 seconds to reach DOM-ready in a fresh headless browser. It then showed two different YouTube document requests: an automatic `autoplay=0` prefetch and a second `autoplay=1` request after Play. The patched production preview makes no embed request before Play. The real YouTube iframe loaded successfully in approximately 2.36 seconds in the same browser environment.

Absolute live timings depend on the client, CDN, Supabase, YouTube, and deployment. The request-count and bundle-byte measurements are deterministic production-build comparisons.

## Changes shipped in this pass

### Podcast

- Removed the automatic full YouTube document prefetch. Its URL did not match the playback URL, so it competed with page loading without reliable reuse.
- Kept lightweight connection warming on intent (hover, focus, or touch).
- Removed the credentialless iframe partition from `/podcast` by limiting cross-origin isolation to `/mvp-builder`, the only route that uses `SharedArrayBuffer`/WebContainer.
- Added intrinsic thumbnail dimensions and a prioritized modal poster.
- Paused podcast wallpaper animations while the player is open, reduced equalizer bars from 52 to 28, and removed the live backdrop blur so GPU composition does not compete with video decoding.
- Added a regression test covering speculative YouTube work, iframe isolation, route-specific COEP, and paused playback effects.

### Shared application shell

- Deferred activation focus, activation resume, retention attribution, and the authenticated home banner until their URL/auth conditions are true.
- Consolidated the initial vendor graph into `react-core`, `ui-foundation`, `radix-ui`, `data-clients`, and `motion` groups. This retains route splitting while avoiding dozens of tiny initial network requests.
- Removed `console.log` and `console.debug` calls from production bundles while retaining warnings and errors.

### Regression protection

- Added `npm run test:bundle:performance`.
- The build now fails the budget if initial JavaScript exceeds 10 requests, initial gzip JS + CSS exceeds 390 KiB, or the raw entry exceeds 180 KiB.

## Validation

- Production build: passed; 5,999 modules transformed.
- TypeScript: passed.
- Full ESLint (`--quiet`): passed with zero errors.
- Targeted performance regressions: 5/5 passed.
- Bundle budget: passed at 6 initial JS requests, 378,500 gzip bytes, and a 168,207-byte entry.
- Production-browser `/podcast` smoke: passed; 0 embed requests before click, player loaded, no page errors, no COEP on `/podcast`, COEP retained on `/mvp-builder`.
- Full unit suite: 580/582 passed. The two failures predate and are outside this performance diff: the frozen Hero checksum is stale, and the current MentorCard no longer contains the test's expected `Request Discovery Call` text. Those files were not changed in this pass.

## Remaining work, ranked

1. **Deploy and remeasure live.** Confirm the Vercel header match on `/mvp-builder`, then rerun `/podcast` and the main routes in a clean browser on mobile throttling. Local production verifies behavior, but CDN/server timing is only measurable after deployment.
2. **Split the global stylesheet.** The global CSS remains 403,359 raw bytes (59,706 gzip). Route-owned styles and visual-regression coverage are the next safest material transfer reduction.
3. **Unify authenticated profile reads.** Auth, user preferences, progress, and activation resume can issue separate `profiles` reads after sign-in. A shared profile cache/query would reduce authenticated startup latency and duplicated state.
4. **Profile route-level request fragmentation.** The initial graph is fixed, but the full build still emits 422 JavaScript files and several empty vendor chunks. Measure the heaviest authenticated routes and merge only packages that are always fetched together.
5. **Clean public fallback media.** The deploy contains several multi-megabyte PNG originals alongside WebP versions. They are not on the audited initial path, but an ownership/reference audit can reduce deployment size and accidental future regressions.
6. **Self-host critical fonts.** Google Fonts are asynchronous, but local WOFF2 subsets would remove an external handshake and make text rendering more predictable on weak connections.

## Known build-health warnings

- `caniuse-lite` and `baseline-browser-mapping` data are stale.
- `pdfjs-dist` contains an upstream `eval` warning.
- Five dependency-generated vendor chunks are empty. They are not initial requests, but are evidence that the remaining generic package chunk policy can be simplified in a future route-by-route pass.
