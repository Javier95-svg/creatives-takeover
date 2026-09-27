# Pulse account activity and consistent task context

## Shipped behavior

The signed-in Home and widget pipeline now retrieves bounded role activity using the same authorized RPCs as each account's workspace:

| Account | Source | Evidence available | Important boundary |
| --- | --- | --- | --- |
| Mentor | `mentor_bookings(10)` | Recent booking statuses, counterpart names, deadlines and proposed slots | Proposed times are not confirmations; no founder project records or session notes |
| Marketplace | `mentor_interest(10).contacts` | Recent contact events, names and dates | These are contact signals, not message bodies, service requirements or purchase commitments |
| Investor | `investor_matches(10)` | Authorized match summaries, sectors, declared funding stage and sector-overlap score | No private PMF/traction records; no claim that geography or check size has been matched |
| Founder / Builder | Existing project outcome sources and refreshed tasks | Current venture evidence plus a bounded account task snapshot | Tasks remain account-wide, not automatically attributed to a project |

Role retrieval is gated by the verified account type and category approval. Pending/rejected accounts retain general role guidance without category reads or cards. Role reads use a separate Supabase client carrying the already-verified caller JWT and the anon project key, so the RPCs evaluate `auth.uid()` as the caller. The service-role client remains limited to the existing explicitly owner-filtered context/history operations. Missing caller client fails closed.

Only an allowlist of returned fields reaches the model. Tokens, email addresses, avatars and unrelated record fields are discarded. Empty results and failed/malformed lookups produce different source states. Source references persist with responses; the source drawer and cards use canonical workspace routes. Approved widget quick replies now expose the new workflows without changing layout.

Tasks refresh on every new signed-in turn instead of depending on English keywords. Equivalent questions and pronoun follow-ups receive fresh task statuses. An `asOf` timestamp supports date comparisons; the prompt distinguishes current records from prior chat claims and asks for timezone when a precise local deadline is needed. Tasks remain capped at ten earliest open and ten recently completed records, subject to the existing exclusion filters.

Pulse can prepare advice and drafts. This release does not accept bookings, send messages, contact investors, create tasks or change any operational record. A completed turn retry replays its saved answer rather than generating a new one; ask a new question to refresh an already-completed answer.

## Deployment

No new migration is introduced. Existing role-personalization RPCs must already be deployed, including the September 25 `investor_matches` update that enforces founder opt-in, declared funding-stage matching and ranking before the limit. Deploy `chatbot-streaming` and the frontend. Standard Supabase Edge environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are used; no new secret is required.

## Validation

The added synthetic tests cover approved/pending/rejected roles, field filtering, bounded evidence, canonical source links/cards, unavailable versus empty results, caller-client wiring, fresh tasks across follow-ups and drafting instructions. A PGlite test executes the actual booking/contact RPC definitions under caller identities with no direct table grants. The existing investor-matching database test verifies opt-in, declared funding stage and ranked limits.

```sh
node --experimental-strip-types --test tests/pulse-activity.test.ts tests/pulse-home.test.ts tests/pulse-context.test.ts tests/pulse-catalog.test.ts tests/pulse-evidence.test.ts tests/pulse-quality.test.ts
node --test tests/pulse-database.test.mjs tests/pulse-activity-database.test.mjs
node --test --test-name-pattern="investor matching applies" tests/account-onboarding-database.test.mjs
node --test --test-concurrency=1 tests/pulse-scope-ui.test.mjs tests/pulse-widget-ui.test.mjs
```

Model responses are mocked in regression tests. Live answer-quality evaluation is still required before claiming an 8/10 score. Use synthetic authorized accounts to evaluate: mentor with pending slots; provider with a contact event but no message; investor with sector/stage fit but unknown geography; pending category account; and a task completed between two follow-up turns. Penalize fabricated message content, private venture claims and claims of completed external actions.
