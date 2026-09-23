# Responsiveness batch: rollout and verification

No route definitions, UI layout, pagination, search ranking, permissions, or article editing behavior changed.

## Changes

- Workspace header: one shared Postgres Changes channel per account; incoming message and connection changes reconcile the existing count RPC. Bursts coalesce over 75 ms, reconnects reconcile missed events, older in-flight RPCs are cancelled, and 60-second polling/focus remain fallbacks. No full inbox is loaded. Local read decrements are preserved.
- Public investor, article-list, and search requests: shared in-memory query caches with 60-second freshness, 10-minute garbage collection, in-flight deduplication, and invalidation after successful create/update/delete operations. Drafts and full article reads are not cached here.
- Article lists/search omit body_content. Detail/editor queries still fetch complete records. Existing filters, ranking and page sizes are unchanged.
- Article cards request responsive image sizes without pre-cropping. GIF/SVG and external URLs remain unchanged. Failed transforms fall back to the original image. Layout is unchanged.

## Measured public payloads

Read-only checks on 2026-09-22, with analytics writes suppressed:

| Payload | Existing | Optimized |
| --- | ---: | ---: |
| 128 published articles, decoded JSON | 1,128,560 bytes | 101,640 bytes |
| Sample large banner, negotiated WebP | 1,243,950 bytes | 36,058 bytes at 640px |

These are payload comparisons, not promises about production load times. Browser-selected image size varies with viewport/DPR.

## Verification

- Local Vite build and initial-bundle budget check passed; build used test environment values, not production deployment configuration.
- Focused tests cover realtime burst/reconnect/cleanup behavior, bootstrap snapshot races, cache freshness/deduplication/invalidation, metadata-only listing, unchanged full detail reads and aspect-ratio-preserving image URLs.
- Local Chromium with mocked APIs verified 15-card/5-card pagination, complete article content, one listing request across return visits, investor cache reuse, and transform failure fallback.
- Targeted type diagnostics compared against HEAD; existing unrelated repository/type-dependency diagnostics are not part of this patch. Full-repository typechecking is not clean. SEO integration tests also require generated prerendered artifacts absent from the local test build.

## Production rollout

1. Apply `supabase/migrations/20260922200000_workspace_header_realtime.sql` through the normal migration workflow. It only enables existing tables in the realtime publication; it is idempotent and does not modify RLS, grants, schema columns, or stored messages.
2. Build/deploy the frontend using normal production environment values. Do not deploy the local mocked-test build.
3. With two test accounts, send a DM while the recipient is on a non-messaging page. Confirm the header reconciles on arrival; read it and confirm immediate clearing. Disconnect/reconnect, then test again. Repeat with a connection request/acceptance.
4. Verify production request selectors omit body_content on listings, retain it on article detail, and use resized banner URLs. Check cold and warm visits separately.

The production migration and authenticated two-account verification have not been performed by this implementation task. Publication membership and participant-only SELECT policies are required for delivery; see [Supabase's realtime troubleshooting guidance](https://supabase.com/docs/guides/troubleshooting/realtime-postgres-changes-troubleshooting). No permission expansion is needed or included.
