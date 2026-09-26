# Pulse shared context and evidence release

## Behavior

Signed-in Home and widget turns now use `handlePulseHome` in `chatbot-streaming`. Both read the verified account, quiz, selected project, six current outcomes and published catalogs. The widget sends its pathname; the server maps recognized tool paths to the fixed tool catalog. A client path is navigation context, never evidence that the user completed or can access a tool.

The widget stores its own conversation under the existing protected `pulse_home` purpose, with `pulseScope.channel = widget`. Home restores only missing/home channels. The server checks channel before history/replay. The existing immutable-scope database trigger protects the channel as part of `pulseScope`. Project/account changes and closing the widget abort pending work. A failed turn retries with the same turn ID.

Anonymous widget questions retain the existing public guidance path and receive no saved account/project context. The old account-wide generated summaries and founder-specific proactive claims have been removed from the widget. Signed-in quick replies reflect the account role.

## Evidence adapters

`pulse-evidence.ts` selects meaningful fields from stored CT formats before compaction. Each field gets a budget, so a long diagnosis cannot hide a decision or provisional flag.

- ICP v3-v5: buyer, pain, trigger, alternatives, pricing, risks, experiment and explicit section provenance. Legacy records retain selected legacy findings without synthesizing evidence.
- PMF: saved decision, score, evidence grade, provisional flag, readiness, signal counts, diagnosis, gaps and next action. False and zero remain meaningful values.
- MVP: intended product setup and recorded deployment status. Intended features are not asserted to be delivered.
- GTM v2: buyer, thesis, positioning, play offers/channels/targets/kill rules, assumptions and claim attributions; legacy channel/summary fields remain supported. Targets are not measured results.
- Demo: saved publication state is not demand proof.
- Traction: currently retrieved sprint recommendation/status does not imply measured metrics or a measurement window.

The response prompt tells Pulse to distinguish planned, reported and recorded facts and flag apparent cross-stage contradictions as questions. This is model guidance, not a deterministic contradiction detector. Question-specific deep retrieval and measured traction connectors remain future work.

## Visible context

Both interfaces show the selected project/account and expandable `Context provided to Pulse` references, including saved dates, evidence limitations, missing results and failed lookups. These describe what was supplied to the model, not a claim that every source supports every sentence. References persist with the answer and restore on reload/replay.

PMF references open the exact outcome via its existing `outcome` parameter. Other stage references open the relevant tool; those pages do not yet provide a uniform exact-record deep-link contract. Panel widths, Home column widths and the two-column/four-row CTA grid are unchanged.

## Release and verification

No new SQL is needed; the two September 26 Pulse migrations and earlier Pulse Home migrations must already be installed. Deploy `chatbot-streaming` before releasing the new widget frontend. Home clients remain compatible. Old signed-in widget clients use their legacy flow until refreshed; new widget clients require the updated dispatcher.

```sh
node --experimental-strip-types --test tests/pulse-home.test.ts tests/pulse-context.test.ts tests/pulse-catalog.test.ts tests/pulse-evidence.test.ts tests/pulse-database.test.mjs
node --test --test-concurrency=1 tests/pulse-scope-ui.test.mjs tests/pulse-widget-ui.test.mjs
```

Tests use synthetic accounts and mocked model responses. Coverage includes channel/project ownership, source replay, bounded evidence, false/zero preservation, provisional PMF decisions, active-project switching, stream aborts, stale callbacks, logout, restore failure, retry identity and safe visible source links. They do not establish live model answer quality.

Before extending retrieval, evaluate real model answers against a fixed synthetic scenario set: a provisional PMF decision with a high score; an ICP/GTM buyer mismatch; an MVP setup containing undelivered features; a missing versus failed stage lookup; each non-founder role; an article request on both surfaces. Track unsupported claims, correct source attribution, role fit, relevance and latency separately. No private user conversations need to be logged for this evaluation.
