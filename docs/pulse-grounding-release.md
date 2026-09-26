# Pulse grounding: first priority release

## Implemented

- Pulse Home resolves account type, approval state, sanitized role preferences and quiz answers on the server. Browser-supplied business summaries are not trusted as saved evidence.
- Founder/Builder turns load the selected, owned, unarchived project's current ICP, PMF, MVP, GTM, Demo and Traction outputs. Each source has its own excerpt budget and availability state. Missing outputs and failed queries remain distinct.
- Home conversations are scoped to account type and project. Switching either remounts the conversation and aborts the previous stream. Server validation precedes history reads and idempotent replay. Existing unscoped history is retained but is not imported into new scoped conversations.
- Founder, Builder, Mentor, Marketplace and Investor accounts receive distinct guidance. Non-founder accounts do not inherit founder project advice or founder tool cards. Category approval is checked before mentor recommendations.
- Published `stories_articles`, published `podcast_episodes`, and active `services` are searched via `search_pulse_catalog`. Queries use weighted PostgreSQL full-text search over existing metadata, with recent items for an empty query. Publication changes are reflected on the next request; there is no stale external index.
- Resource cards contain database identifiers and canonical internal routes. Podcast links open the selected published episode. Existing page dimensions, CTA grid and search widths are unchanged.
- New catalog results distinguish no match from lookup failure. Search fallback links let users browse the relevant section.

## Deployment order

1. Apply `20260926120000_pulse_project_scope.sql` and `20260926121000_pulse_content_search.sql` after the existing Pulse Home migrations.
2. Deploy `chatbot-streaming`, including its shared modules and referenced `src` modules.
3. Release the frontend in the same deployment window. Old clients sending unscoped conversations will receive a refresh error from the new handler. Do not migrate unknown historical conversations into a guessed project.
4. Smoke-test signed-in Founder and non-founder accounts: switch between two projects with distinct ICP findings; ask for an article and an episode; open the cards; verify a pending role does not receive restricted mentor actions.

No production migration or function deployment is performed by this code change. No credentials, real conversations or model calls are required by the local automated tests.

## Validation commands

```sh
node --experimental-strip-types --test tests/pulse-home.test.ts tests/pulse-context.test.ts tests/pulse-catalog.test.ts tests/pulse-database.test.mjs
node --test tests/pulse-scope-ui.test.mjs
```

The database tests execute the actual new SQL in PGlite. Service tests use synthetic data and mocked model responses; they verify data flow and access boundaries, not the quality of live model prose.

## Remaining priorities

1. Share this resolver and catalog service with the floating Pulse widget, which still uses its older path. Verify both surfaces against the same role/project evaluation set before retiring the older path.
2. Add full Newspaper body ingestion and podcast transcript ingestion with publication-aware versioning, source citations and passage retrieval. The current release knows metadata only and explicitly forbids inventing quotations or transcript details.
3. Add structured stage-specific summaries and references to older output versions when a user asks about changes over time. This release reads current outcomes, not every historical version.
4. Improve relevance using measured test cases for each role/stage, then add semantic retrieval if lexical search misses relevant content. Add matching full-text indexes as catalog size and measured query latency warrant.
5. Extend private role context with authorized mentor bookings, provider enquiries and investor workflows. Current role preferences are available; private role activity is not claimed as known.

Previously saved cards represent historical recommendations and are not revalidated during replay. Fresh searches enforce current publication/active state; destination pages retain their own access checks.
