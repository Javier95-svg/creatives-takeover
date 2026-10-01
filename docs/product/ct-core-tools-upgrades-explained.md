# Creatives Takeover: Core Tool Upgrades Explained

## What changed overall

The upgrade connects three recurring founder decisions:

**PMF Lab: “What evidence supports this offer?” → GTM Strategist: “What should I try to acquire customers?” → Traction Engine: “What happened, and what should I change?”**

The largest improvements are more trustworthy measurements, less repeated data entry, and better continuity between those decisions.

**Implementation reference:** [Commit 43080c71](https://github.com/Javier95-svg/creatives-takeover/commit/43080c718795d87bad731d28e9b41c027bbff442), based on `d6abedbe929630a080d3a54aac4e0f632fe4618e`.

**Deployment status at the time of this explanation:** the founder reported completing the migrations and Edge Function deployments, and the code was pushed to `main`. The frontend deployment, feature flags, provider credentials, and live integration behavior still need verification. Some capabilities described below remain hidden until those settings are enabled.

CT is a SaaS platform. Reviewer matching and validation sessions are capabilities within that platform.

---

## 1. PMF Lab: a stronger customer-validation workflow

**Stage 3 — BizMap**

### What already existed

PMF Lab already supported interviews, pasted-note extraction, hosted surveys, scoring, recommendations, history, reports, and customer discovery. Those were existing capabilities.

The upgrades improve **how evidence enters the tool, who qualifies as a useful respondent, and how founders act on the results.**

### A. A clearer starting point

The evidence hub now highlights:

- The current assumption being tested.
- The strongest objection from the saved assessment.
- The recommended next test.
- The evidence collected so far.

It also explains that CT’s evidence-confidence thresholds are product guidance.

**Why this matters:** founders can see what to investigate next without interpreting every score first.

### B. Product-use screening for the PMF survey

The hosted survey now asks whether the respondent has actually used the product.

| Respondent | How their response is handled |
|---|---|
| Has used the product | Can answer the Sean Ellis question and contribute to its percentage. |
| Has only seen the concept | Can provide feedback, which is displayed separately. |
| Historical response with unknown usage | Remains stored but is excluded from the new eligible percentage. |

**Practical benefit:** a positive reaction to a pitch no longer contributes to the same measure as feedback from someone who has used the product.

**Limitation:** usage is self-declared. This does not independently verify that the respondent used the product.

### C. Imported feedback with an explicit review step

Through the shared Connections workspace, founders can bring in spreadsheet and supported survey data.

Before adding feedback to a validation context, they can inspect:

- Original feedback.
- Respondent information.
- Date and segment.
- Source.
- Product-use declaration.
- Recorded incentive status.

They then decide whether the respondent fits the target customer and explain that fit.

General reviewer feedback can help assess clarity and usability. Screened target-customer feedback can enter the demand assessment.

Repeated source records are deduplicated, and matched respondent identities are deduplicated within a context.

**Important distinction:** imported feedback currently enters as interview-style evidence after review. It does not automatically become an eligible hosted Sean Ellis response.

### D. Comparison between validation rounds

Founders can compare the latest two saved assessments, including:

- Decision and score.
- Common objections.
- Buying signals.
- Represented segments.
- Recommended next experiment.
- A saved explanation of a decision change, when available.

There is also a direct route to review updated evidence and re-score.

**Example:** after revising an offer, a founder can compare whether the earlier pricing objection still appears and whether the new interviews show stronger buying behavior.

**Current scope:** this is a side-by-side comparison of saved assessments. It is not yet a comprehensive trend-analysis dashboard.

### E. Structured one-to-one validation sessions

This is the largest new PMF capability.

#### Finding a reviewer

Opt-in reviewer profiles capture role, industry, problems experienced, languages, time zone, and availability.

Matching filters availability and language, then considers problem experience, buyer/user fit, and industry relevance. It explains the reasons for a match and excludes self-matches, blocked accounts, and declared collaborators.

Founders can also invite a target customer using a private booking link. The invitee does not need a CT account.

#### Running the session

The implemented flow supports:

- A 25-minute appointment.
- Google Calendar and Meet.
- Booking, cancellation, and rescheduling.
- Calendar downloads.
- Pre-pitch questions about recent behavior and current workarounds.
- Post-session feedback about clarity, objections, willingness to try/pay, and suggested changes.

Calendar reminders depend on the connected calendar’s delivery behavior.

#### Bringing the feedback back into PMF

Session feedback becomes an attributed evidence record. The founder reviews customer fit before using it for demand assessment.

A general founder’s opinion is therefore distinguishable from evidence supplied by a relevant prospective customer.

#### Rewarding reviewers

The pilot implements **20 bonus credits** for eligible CT reviewers, subject to:

- Verified email and an account at least seven days old.
- At least 15 minutes of verified overlap between the booked identities.
- Completed pre- and post-session feedback.
- A 24-hour hold.
- Two rewarded sessions per week and four per month.
- One rewarded pairing per 30 days, including reversed pairings.
- No overlapping rewarded sessions.
- A pilot ceiling of 100 rewards, totaling 2,000 credits.

Duplicate feedback and suspicious patterns can enter review. Negative feedback is eligible; rewards do not depend on positivity.

**Current limitation:** this needs Google configuration and a real attendance-verification pilot. Reviewer availability and match quality remain unproven.

### How a founder would use PMF Lab now

**Choose a validation context → collect or import feedback → check respondent relevance → run an assessment → conduct the next test → compare the next round.**

---

## 2. GTM Strategist: more focused weekly decisions

**Stage 5 — BizMap**

### What already existed

The tool already generated positioning, channel recommendations, six-week plans, campaign assets, tasks, pipeline entries, and weekly reviews. It also already handed work into Traction Engine.

The upgrade focuses on **making those plans easier to execute and making adaptations more dependable.**

### A. A “This week” overview

The overview now brings together:

- Intended outcome.
- Primary channel.
- Three next actions.
- Recorded customer result against the target.
- Review date.

Detailed research and secondary information remain available behind expandable views.

**Practical benefit:** founders have a more direct answer to “What should I work on today?”

Task completion and customer results also have separate labels. Completing outreach tasks does not imply that the outreach generated customers.

### B. Reviews scoped to one channel play

A founder explicitly selects the active play to review.

The review examines that play’s linked Traction experiments using:

- The matching metric.
- Completed observation periods.
- Recorded sample size.
- Results against targets.
- Decisions recorded with those experiments.

It can recommend collecting more evidence when the required sample or observation window is incomplete.

**Example:** an email campaign’s results should not drive a recommendation for a separate search campaign merely because both are active.

**Limitation:** the review still depends on founders using consistent metric names and recording meaningful samples. It does not independently establish statistical significance.

### C. Preview before changing the plan

Weekly adaptations now follow a controlled sequence:

1. Review the evidence.
2. Generate a proposed adaptation.
3. Inspect the recommendation and proposed changes.
4. Explicitly apply the proposal.

Applying a proposal records a revision and preserves completed tasks and original experiment records. An outdated proposal is rejected if the underlying plan has changed.

**Practical benefit:** the founder retains control over strategy changes, and the reasoning remains reviewable.

### D. PMF objections can inform messaging

Where the relevant product/context links exist, screened customer objections from PMF can be supplied to the GTM review with source references.

**Example:** if PMF interviews repeatedly reveal “I don’t understand how this saves me time,” the GTM review has that evidence available when suggesting messaging changes.

This strengthens continuity between validation and acquisition.

### E. Connected acquisition results

With the relevant connectors enabled, the workspace can display:

- GA4 visits and key events.
- HubSpot contacts and opportunities.
- Stripe payment outcomes.
- Subscription snapshots.
- Recorded campaign attribution.

Additional functionality includes:

- Campaign tracking-link generation.
- Explicit mapping of CRM opportunities into CT plays and pipeline stages.
- Conservative matching between CRM contacts and payment records.
- Separate cash-spend and founder-hours inputs.
- An acquisition-cost estimate only after the founder confirms cost coverage and customer attribution.

Unknown attribution stays visible. Different currencies are kept separate.

**Current limits:**

- CRM opportunities require explicit mapping.
- The funnel is incomplete when identities or campaign identifiers are missing.
- Acquisition cost is a founder-confirmed estimate.
- This does not automate campaign sending or provide comprehensive multi-touch attribution.

### How a founder would use GTM Strategist now

**Review “This week” → execute one channel play → record results in Traction → select that play for review → inspect the proposed adaptation → apply the accepted change.**

---

## 3. Traction Engine: more trustworthy measurements and saves

**Stage 6 — Insighta**

### What already existed

Traction Engine already supported channel sprints, experiments, weekly logging, decisions, history, reports, and GTM handoffs.

This tool received the most consequential measurement corrections.

### A. Routine tracking is free

The previous two-credit weekly-save charge was removed.

Founders can record, save, correct, and review routine weekly work without spending generation credits.

**Practical benefit:** keeping the platform’s evidence current no longer competes with the founder’s credit budget.

### B. Retention now uses a defined cohort

The old active-users/new-users relationship did not measure whether the same people returned.

The new workflow specifies:

- The starting group.
- A starting event.
- A returning event.
- An observation window.
- How many people in that original group returned.

**Example:**

> Of 40 customers in a defined starting cohort, 12 performed the chosen return event during the specified window: 30% retention.

The tool distinguishes:

- **Complete:** the window is finished and the measurement is available.
- **Pending:** the observation window has not finished.
- **Unknown:** required data is missing.

New-user and active-user counts remain useful activity inputs, with clearer labels.

### C. Execution discipline and customer outcomes are separated

The main execution-discipline score combines:

- Weekly logging consistency.
- Experiment documentation.

Customer outcomes are displayed separately through progress against each experiment’s target and measured cohort retention.

The system no longer uses arbitrary results-per-hour comparisons to treat different outcomes as equivalent.

**Example:** 100 clicks and five paying customers have different business meanings. Each experiment is assessed against its own stated target.

**Limitation:** target attainment is still influenced by how demanding the founder’s target is. It is not a standardized measure of business quality.

### D. Product-specific records

Weekly records, sprints, and connected evidence can be assigned to a particular product.

This addresses the earlier risk of combining activity from multiple products under one owner.

Historical unassigned weeks can be assigned explicitly. Legacy calculations remain labeled and are excluded from new-version score comparisons.

### E. Weekly saves are atomic

The weekly record, experiments, and revision are now saved together through one database operation.

**Practical benefit:** if saving an experiment fails, the tool avoids leaving a partially updated week.

Experiment identities are preserved across corrections, and revisions retain the earlier state.

This is an important reliability improvement even though it is less visible than a new screen.

### F. Assisted weekly review and experiment reuse

Connected results can reduce reporting work:

- A compatible imported cohort can populate retention fields.
- Founders can inspect source dates and freshness.
- A selected metric can be copied into an experiment result.
- Earlier experiments are surfaced before repeating a test.
- A previous hypothesis and target can be carried into another round.

**Current scope:** the review is assisted. Founders still confirm metric meaning, observation periods, missing context, and their decision. It is not a fully automatic weekly analyst.

### G. More transparent reports and comparisons

Reports now include calculation versions, cohort definitions, source information, and revision history.

Category comparisons require at least **20 founders** and use the newer calculation version.

Those comparisons concern execution scores; they do not establish comparable customer economics or fundraising readiness.

### How a founder would use Traction Engine now

**Select a product → start or continue an experiment → inspect imported results → add missing context → record a decision → save the week → feed the evidence into the GTM review.**

---

## 4. Shared connectors: what each brings into CT

All three tools use the same connection and product-assignment foundation.

| Connector | Implemented data access | Main benefit |
|---|---|---|
| Google Sheets | Selected spreadsheet rows | Flexible feedback and metric imports |
| Tally | Completed form responses | PMF evidence collection |
| Stripe | Charges, refunds, subscriptions, cancellations | Payment outcomes and subscription snapshots |
| PostHog | Configured activation and retention measurements | Behavioral evidence and cohort results |
| GA4 | Traffic and key events with campaign information | Acquisition reporting |
| HubSpot | Contacts, deals, stages, available source fields | Pipeline and customer-outcome connections |
| Typeform | Form responses | Additional survey imports |
| Shopify | Orders, refunds, customer identifiers | Commerce outcomes |
| Mailchimp | Campaign engagement and audience growth | Audience-business reporting |

The common workflow is:

**Choose a product → connect a source → select data → preview and map → accept the import → monitor freshness and errors.**

The implementation also adds encrypted credential storage, repeated-import deduplication, daily refresh, disconnection, and signed-event refresh triggers for supported providers.

### Important boundaries

- **Nine adapters exist in code; all nine are not automatically enabled.** The default provider selection starts with Sheets and Tally.
- Several providers require API credentials and manual setup. This is not uniformly a one-click connection experience.
- Imports are currently bounded to 1,000 selected records; CSV uploads are limited to 1 MB.
- Spreadsheet data remains user-supplied evidence.
- Stripe net payments are not an accounting ledger or a full subscription-finance dashboard.
- GitHub/Supabase release-to-outcome analysis remains a later extension.

---

## 5. Ratings: uniqueness and usability

These are **provisional expert assessments of the implemented workflows**, assuming correct configuration. Measured usability still requires observing founders completing real tasks.

| Tool | Uniqueness | Usability | Assessment |
|---|---:|---:|---|
| **PMF Lab** | **7/10** | **6/10** | Strong combination of evidence, assessments, reviewer sessions, and downstream decisions. Setup, respondent screening, and several evidence surfaces still create friction. |
| **GTM Strategist** | **7/10** | **7/10** | Per-play execution reviews and explicit adaptation approval are useful. “This week” improves focus, although the broader workspace remains dense. |
| **Traction Engine** | **6/10** | **7/10** | Free tracking, reliable saves, and clearer measurements improve everyday use. Experiment tracking and cohort analysis are established categories, so differentiation comes mainly from the CT workflow. |

### Why these uniqueness scores

Customer research and message testing already have strong alternatives such as [Sprig](https://www.sprig.com/solutions/strategic-foundational-research) and [Wynter](https://wynter.com/). Campaign execution and CRM are established strengths of [HubSpot](https://www.hubspot.com/products). Defined-event retention is available in [PostHog](https://posthog.com/docs/product-analytics/retention).

**CT’s strongest differentiation is the continuity between these jobs for an early-stage founder:** customer evidence informs an acquisition experiment, its results are recorded, and the next decision retains the supporting evidence.

### What would raise the scores

- **PMF Lab:** easier reviewer onboarding, demonstrated match quality, and a simpler evidence-review flow.
- **GTM Strategist:** clearer visual comparisons between proposed and current plans, plus less manual CRM mapping.
- **Traction Engine:** a guided cohort setup and more automatic matching of imported metrics to the correct experiment.
- **Across CT:** successful live connector pilots and observed improvements in weekly completion and return use.

## 6. Was the work worthwhile?

**The strongest value is in correcting measurement and reliability problems while creating the shared data foundation.** Free weekly tracking, valid retention definitions, atomic saves, screened evidence, and controlled plan revisions make the platform more dependable.

The broader integrations and pitch service now have an implemented foundation, but their commercial value still depends on activation, live verification, and founder adoption. This release is a substantial functional upgrade. Further onboarding and usability work is needed to make the experience consistently straightforward.

---

## Supporting documentation

- [Implementation and deployment guide](./ct-core-tools-upgrade.md)
- [Combined migration installer](./ct-core-tools-migrations.sql)
- [Read-only migration lock diagnostics](./ct-core-tools-lock-diagnostics.sql)
