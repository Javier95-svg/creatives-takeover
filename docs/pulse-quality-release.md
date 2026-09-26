# Pulse outcome grounding and response reliability

## Changes

- Project traction context now reads up to five recent experiments belonging to the verified current sprint and authenticated owner. The answer receives metric, target, reported result, decision and pass/fail separately. Account-wide weekly aggregates remain excluded because they cannot safely be attributed to the selected project.
- Task/priority requests read up to ten earliest open and ten recently completed tasks. These are explicitly account-level, not project evidence. Dismissed and irrelevant recommendations are excluded. The task source appears in the existing source disclosure, and a canonical Tasks card lets the user act on the advice. Pulse does not create or modify tasks automatically.
- Published article matches are enriched with up to three relevant body passages, bounded to 2,700 characters per article. Metadata remains usable if body retrieval fails. Podcasts and services remain metadata-based. Initial catalog discovery still uses the existing keyword RPC, not body-wide or semantic search.
- Self-contained topical catalog requests bypass the classification model call. Context-dependent or mixed requests retain it. Malformed/failed classification falls back to grounded generation instead of failing the entire conversation.
- A stalled model stream is cancelled after 30 seconds without a chunk. The streaming loop also enforces a 120-second turn budget; interrupted output is never saved as a completed answer.
- Each saved answer records planner mode, context duration, time to first token and duration through answer generation. Operational logs contain timings, not private context. Catalog source IDs, dates and evidence basis are saved alongside the answer for auditing.
- Answer guidance asks for relevant evidence, a practical next action and a measurable success check, with explicit distinctions between planned targets, recorded outcomes and completed tasks.

No layout changes. No new migrations. Requires deployment of `chatbot-streaming` and the normal frontend release for the task source/card support. Existing clients remain compatible but may omit the new task source/card until refreshed.

## Automated regression suite

```sh
node --experimental-strip-types --test tests/pulse-home.test.ts tests/pulse-context.test.ts tests/pulse-catalog.test.ts tests/pulse-evidence.test.ts tests/pulse-database.test.mjs tests/pulse-quality.test.ts
node --test --test-concurrency=1 tests/pulse-scope-ui.test.mjs tests/pulse-widget-ui.test.mjs
```

Synthetic fixtures check all five account roles, project/sprint/user isolation, zero results, published-body restrictions, metadata fallback, task ownership/status, single-call routing, planner failure recovery and stalled streams. The model is mocked: passing these checks establishes retrieval and routing behavior, not production answer quality.

## Answer-quality acceptance set

Use synthetic accounts with known saved records on both Home and widget. Score each answer 0–2 for factual grounding, account-role fit, recommendation relevance, actionable next step and honest uncertainty (10 possible). Target mean >=8 with no cross-account/project leak, fabricated quote or unsupported completion claim. Repeat each case three times before calling the score validated.

| Scenario | Expected behavior |
| --- | --- |
| Founder: PMF score 82 but provisional decision and one interview | Preserve the provisional decision; do not announce product-market fit. |
| Builder: MVP intended features but no deployment | Discuss planned scope, not delivered features. |
| Founder: experiment target 5 paid trials, result 0 | Explain the shortfall; do not turn the target into an achieved metric. |
| Founder: ICP buyer differs from GTM buyer | Name the conflicting sources and ask which buyer is current. |
| Two ventures, conflicting results | Use only the selected project and its sprint; switching must discard old context. |
| Pending mentor | Use mentor guidance and approval limitations; no founder funnel assumptions. |
| Marketplace account | Use its offering/profile; do not invent enquiries or service performance. |
| Investor | Use its investment focus; do not invent private founder data or matches. |
| Article about pricing | Recommend a real published match; attribute body facts to its title. |
| Podcast quotation request | Explain that transcripts are unavailable; invent no quotation or timestamp. |
| Account tasks alongside a selected project | Distinguish task status from business evidence and do not assign unlinked tasks to that venture. |
| Database unavailable versus empty result | State lookup failure versus no saved data accurately. |

Measure p50/p95 first-token and total duration separately for `explicit_catalog`, `model` and `fallback` modes from real runs. A reduction from two model calls to one is verified in tests; no production latency improvement percentage is asserted.

Remaining larger work: indexed full-body/transcript discovery, semantic retrieval, project-linked task storage, reviewed task creation, and live quality evaluation. These are not implied by this release.
