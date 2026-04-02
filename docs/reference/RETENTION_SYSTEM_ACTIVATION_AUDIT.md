# Creatives Takeover Retention System & Activation Audit

**Date:** 2026-04-02  
**Prepared for:** Creatives Takeover Product Team  
**Objective:** Engineer a Day 7-Day 30 retention hook and audit the current activation flow using the attached KPI reports as the primary source of truth

**Primary Sources**
- `Claude Cowork Retention Report.pdf`
- `What the Data Tells Us About Retention.pdf`

---

## Executive Summary

Creatives Takeover does not have a traffic problem. It has a **capture, activation, and re-entry problem**.

The attached reports point to the same structural failure:
- D7 retention is only **1-2%**
- D30 retention is effectively **0%**
- **88-95%** of DAU is made up of new users
- Sessions per user are only **1.2x**
- The product's strongest retained-user behavior is `/messages`
- Almost nobody reaches a meaningful completion event in the first session

The platform is attracting interest, but it is not converting that interest into a persistent user state. Users browse, click, and leave before they experience a concrete outcome that creates a reason to return.

### Direct Answers to the Key Questions

**1. What is the most likely reason users are not returning after Week 2?**  
Users do not reach a first-session "aha" moment. The data shows broad browsing but almost no commitment action, so there is no unfinished task, saved asset, or social thread pulling them back after the initial visit.

**2. What single retention hook would have the highest impact given the current data?**  
A **message / mentor-match return loop** built on top of saved mentors and first messages. `/messages` is the clearest retained-user signal in the dataset, and saves already indicate latent intent that can be turned into a follow-up trigger.

**3. What is the most urgent fix in the activation flow?**  
Compress onboarding so a new user completes **one value-bearing action in session 1**: save a mentor, send a first message, or book a discovery call.

---

## Source Signals Driving This Audit

### KPI Signals From the Reports

| Signal | Observed Data | Implication |
|---|---:|---|
| D7 retention | `1-2%` | Users are not forming a repeat habit in the first week |
| D30 retention | `~0%` | No reliable return loop exists |
| New users as % of DAU | `88-95%` | Anonymous or first-time traffic overwhelms retained usage |
| Sessions per user | `1.2x` | Most users never establish a second session pattern |
| Weekly returning users | `~12 avg`, `22 peak` | A retained core exists, but it is very small |
| `/messages` growth | `+15,400%`, peaking at `155 views/week` | Messaging is the strongest observable retained-user behavior |
| Sign in:sign out ratio | Improved from `1.8:1` to `4.3:1` | Authenticated sessions are accumulating in the retained core |
| Homepage -> signup | `385 / 6,622` or `5.8%` | Most traffic is not being captured into an addressable user state |
| Page view -> click -> form completion | `2,206 views -> 494 clicks -> 1 form start -> 1 form submit` | Users explore but do not reach meaningful completion |
| Skip Today clicks | `328` total, peaking at `62/week` | The current daily mechanic trains disengagement |

### What Is Actually Working

The reports show five positive signals worth protecting:
- Messaging behavior is growing fast and looks like real retained-user usage
- Saved items are increasing and can become a re-entry asset
- Discovery call intent is commercially strong
- Dashboard engagement is rising for the retained core
- Authenticated sessions are improving even though top-line retention is weak

This means the retention system should not invent a new core behavior. It should **amplify the behaviors that already correlate with return usage**.

---

## Deliverable 1: Retention System Design

## 1. Drop-Off Point: Homepage / View -> Signup

**Finding**  
The reports show `6,622` homepage views and only `385` visits to `/signup` (`5.8%`). At the same time, `88-95%` of DAU is new users, which means most traffic never becomes an addressable user record.

**Root Cause**  
The product allows too much anonymous browsing before account capture. This prevents lifecycle email, personalization, and persistent state from carrying over after the first visit.

**Recommendation**  
Move account capture earlier and attach it to obvious value:
- Add earlier email capture or account creation prompts on high-traffic entry pages
- Tie the ask to a concrete promise such as mentor match, reply, or availability alert
- Offer signup only after the user sees a relevant preview, not as a generic wall
- Do not send generic reminders; only send triggered messages tied to a saved mentor, message thread, or activation step

**Success Metric**
- Homepage -> signup conversion rate from `5.8%` to `10%+`
- Share of new users in DAU down from `88-95%` toward a materially lower mix
- % of signups with at least one retained asset attached in session 1

---

## 2. Drop-Off Point: Page View -> Meaningful Interaction

**Finding**  
The Amplitude report shows `2,206` users viewed a page, `494` clicked an element, but only `1` user started a form and `1` submitted a form. Users are interactive, but they are not progressing into commitment actions.

**Root Cause**  
The path to value is too long and too abstract. Users can browse widely, but the experience does not make the next meaningful action obvious or urgent.

**Recommendation**  
Reduce the path from landing to first meaningful action to under one minute:
- Route first-time users into a single high-value action path
- Use intent-driven entry points instead of open-ended browsing
- Present contextual empty states that point to one next action: save, message, or book
- Remove or demote low-value browsing paths until the user reaches first value

**Success Metric**
- % of new users who complete one value-bearing action in session 1
- Page view -> activation_started conversion rate
- Reduction in browse-heavy, zero-outcome sessions

---

## 3. Drop-Off Point: Interaction -> First Value

**Finding**  
Sessions per user are only `1.2x`, D7 retention is `1-2%`, and the reports explicitly conclude that almost no one experiences core value in the first session.

**Root Cause**  
The product does not force a first-session outcome. Users can explore without ever creating a saved object, sending a message, or booking a discovery call.

**Recommendation**  
Redesign onboarding so first value is mandatory and concrete:
- Immediately after signup, route the user to one guided action
- Allow only three activation outcomes in v1:
  - `save a mentor`
  - `send a first message`
  - `book a discovery call`
- Show the onboarding checklist only after the first action is completed
- Store that first action as the user's first persistent return anchor

**Success Metric**
- Activation completion rate within the first session
- % of new signups completing one value-bearing action within `24h`
- D1 -> D7 retention lift among users who complete the first action

---

## 4. Drop-Off Point: Day 7 -> Day 30

**Finding**  
D30 retention is `~0%` across cohorts. The largest cohorts such as Jan 15 (`N=71`) and Feb 3 (`N=159`) show near-zero D7 and `0%` D30. The reports also note that returning usage exists, but it is concentrated in a tiny retained core.

**Root Cause**  
There is no repeatable re-entry mechanism tied to a user's prior action. Users who save or browse do not receive a relevant follow-up, and users are not being pulled back by ongoing social or mentor updates.

**Recommendation**  
Build the retention system around one primary loop:

### Primary Retention Hook
`saved mentor or first message -> follow-up match/update -> return to /messages or /dashboard`

Why this loop:
- `/messages` is the strongest retained-user behavior in the data
- Saves indicate intent but currently have no re-entry mechanism
- Authenticated session growth suggests the retained cohort already behaves this way

### Supporting Re-Engagement Loops
- `saved mentor -> availability update email -> return to mentor + messages`
- `first message sent -> reply/update trigger -> return to messages`
- `partial activation -> weekly digest with relevant matches -> return to dashboard`

**Success Metric**
- Day 6/7 email click-to-return rate
- Weekly unique users on `/messages`
- D7, D14, and D30 retention for users who saved or messaged

---

## Retention Hook Blueprint

## Primary System

### Behavioral Trigger

**Finding**  
The reports show that `/messages` is the leading retention indicator, while save behavior and discovery call intent also spike during stronger engagement weeks.

**Root Cause**  
The current product loop is disconnected: users can browse, skip, and leave without creating a social or outcome-based reason to come back.

**Recommendation**  
Use the first value-bearing action as the state that powers all re-entry:
- If the user saves a mentor, generate a follow-up asset around that mentor
- If the user sends a message, make replies and updates the default return reason
- If the user books a discovery call, use pre-call preparation and follow-up as the return path

**Success Metric**
- % of activated users with at least one live return trigger
- Return rate by first action type: save vs message vs book

---

## Channel and Timing Plan

### Day 0 Trigger

**Finding**  
Users are failing before habit formation even begins. Session depth is weak, so Day 0 must reinforce the first completed action.

**Root Cause**  
The system does not currently close the first-session loop with a persistent reminder or next step.

**Recommendation**  
Send a Day 0 confirmation email and matching in-app state:
- Reference the exact mentor saved, message sent, or discovery action completed
- Show one immediate next step, not a multi-option menu
- Link back to the exact destination page

**Success Metric**
- Day 0 email open rate
- Day 0 click-through to destination page
- Same-week return rate after Day 0 email

### Day 2 Trigger

**Finding**  
The reports show weak progression after first interaction and almost no meaningful follow-through.

**Root Cause**  
Users do not see momentum building after their first action.

**Recommendation**  
Send a Day 2 follow-up with social proof and unfinished context:
- "You saved X, here is the next best match"
- "You started a thread, here is why continuing matters"
- Keep the message asset-specific and outcome-specific

**Success Metric**
- Day 2 click-through rate
- % of users taking a second value-bearing action after Day 2

### Day 6/7 Trigger

**Finding**  
The biggest retention collapse happens between the first week and Week 2. One report explicitly identifies Day 6-Day 14 as the critical loss window.

**Root Cause**  
No system currently intervenes with a relevant return reason at the point where habit formation should start.

**Recommendation**  
Ship a Day 6/7 re-entry trigger that references a real user asset:
- New mentor match
- Availability update on a saved mentor
- Message reply or prompt to continue a thread
- Weekly matches summary for partially activated users

**Success Metric**
- Reactivation rate from Day 6/7 email
- D7 retention lift for users who receive and click the trigger

### Weekly Digest

**Finding**  
The retained cohort shows growing dashboard and messaging usage, but top-line retention remains near zero.

**Root Cause**  
The product lacks a consistent weekly ritual for users who have already shown intent.

**Recommendation**  
Send a weekly digest only to users with a retained asset:
- At least one saved mentor
- At least one message thread
- At least one incomplete activation step

The digest should highlight:
- new matches
- new availability
- replies
- one recommended next step

**Success Metric**
- Weekly digest open rate
- Weekly digest click-to-return rate
- Weekly active returning users

---

## In-App Trigger System

## Replace "Skip Today" With Contextual Activity

**Finding**  
`Skip Today` generated `328` clicks over `90 days` and peaked at `62/week`. The reports explicitly conclude that this mechanic conditions disengagement.

**Root Cause**  
The current daily prompt asks the user whether to opt out rather than presenting a relevant reason to engage.

**Recommendation**  
Deprecate `Skip Today` and replace it with contextual activity cards:
- "Your saved mentor has availability this week"
- "You have 2 new mentor matches"
- "You have a pending reply in Messages"
- "Your discovery call prep is ready"

These states must only appear if backed by real user data.

**Success Metric**
- `skip_today_clicked` trends to `0`
- CTR on contextual activity cards
- Return rate from contextual activity cards

---

## Deliverable 2: Activation Audit

## 1. Friction: Too Much Anonymous Browsing Before Capture

**Finding**  
`88-95%` of DAU is new-user traffic, and homepage -> signup is only `5.8%`.

**Root Cause**  
The current experience delays account capture until after users have already spent their curiosity.

**Recommendation**  
Capture email or account state earlier on high-traffic entry points and bind it to a concrete value promise.

**Success Metric**
- Signup conversion from homepage
- % of new users entering activation_started

---

## 2. Friction: No Fast Path From Community Discovery to Product Value

**Finding**  
The report notes a gap between community traffic and dashboard/product usage. Users discover the community, but there is no guided handoff into the product's core value.

**Root Cause**  
The user journey from community browsing to mentor value is implicit, not directed.

**Recommendation**  
Create a direct path from community intent to one action:
- save a mentor
- send a message
- book a discovery call

Do not ask users to self-navigate to value.

**Success Metric**
- Community -> activation_started conversion
- Community -> signup conversion

---

## 3. Friction: Missing First-Value Milestone in Onboarding

**Finding**  
The reports repeatedly show broad exploration but almost no commitment or completion behavior.

**Root Cause**  
The onboarding flow does not define an explicit first-value milestone and does not enforce one.

**Recommendation**  
Set a hard activation definition:
- onboarding starts when account is created
- onboarding completes only when one value-bearing action is finished

Until then:
- surface only the most relevant next action
- suppress low-priority navigation and generic browsing prompts

**Success Metric**
- `activation_started`
- `activation_completed`
- time from signup to activation_completed

---

## 4. Friction: The Daily Mechanic Rewards Avoidance

**Finding**  
During the same period that `/messages` peaked, `Skip Today` also climbed, which means even engaged users are being given a structured way to disengage.

**Root Cause**  
The product presents a generic daily task rather than a contextual next best action.

**Recommendation**  
Replace the daily mechanic with stateful recommendations driven by saved mentors, messages, or booked calls.

**Success Metric**
- reduction in skip behavior
- increase in action completion from the daily module

---

## 5. Friction: Tracking Is Too Shallow to Explain Retained Behavior

**Finding**  
One report explicitly states that event tracking is mostly auto-captured clicks and page views. That is not enough to compare retained vs churned users.

**Root Cause**  
The current measurement layer does not encode business-critical actions.

**Recommendation**  
Instrument a minimum event taxonomy immediately before or alongside the retention experiments.

**Success Metric**
- % of activation funnel covered by custom events
- ability to segment retained vs churned users by first action

---

## Revised Activation Flow

## Proposed Flow

### Step 1: Early Capture

**Finding**  
Anonymous traffic dominates retained-user analysis.

**Root Cause**  
No persistent identity is captured early enough.

**Recommendation**  
Ask for email or account creation as soon as the user requests a value preview.

**Success Metric**
- visitor -> identified user conversion

### Step 2: Intent-Based Routing

**Finding**  
Users browse `6-14` pages per user per week but fail to complete meaningful actions.

**Root Cause**  
The product makes users search for relevance instead of asking their intent.

**Recommendation**  
Route new signups into one of three tracks:
- find a mentor
- start a conversation
- book support

**Success Metric**
- signup -> activation_started rate by intent path

### Step 3: First Value Action

**Finding**  
Without a value-bearing action, no return loop can be built.

**Root Cause**  
The current onboarding allows passive completion without a strong user commitment.

**Recommendation**  
Require one action:
- `mentor_saved`
- `first_message_sent`
- `discovery_call_booked`

**Success Metric**
- signup -> first value action completion rate

### Step 4: Post-Action Checklist

**Finding**  
The reports suggest users who do return get more engaged, not less.

**Root Cause**  
The product does not expand momentum immediately after the first good action.

**Recommendation**  
Show the activation checklist only after the first action:
- complete profile
- save another mentor
- send a message
- book a discovery call
- join a relevant thread

**Success Metric**
- % of activated users completing 2+ activation steps

### Step 5: Persistent Return Anchor

**Finding**  
Messaging and saved assets are the strongest evidence of retained-user behavior.

**Root Cause**  
The product does not currently treat those states as the user's home base.

**Recommendation**  
Use `/messages` and saved-mentor state as the first persistent anchors in the dashboard and lifecycle messages.

**Success Metric**
- weekly unique users on `/messages`
- repeat visits from saved-mentor users

---

## Measurement Layer Needed to Run the System

## Event Taxonomy

| Event | Purpose |
|---|---|
| `activation_started` | User entered the guided onboarding flow |
| `activation_completed` | User completed one value-bearing action |
| `mentor_saved` | User saved a mentor/profile |
| `first_message_sent` | User sent their first outbound message |
| `message_reply_received` | User received a reply or qualifying update |
| `discovery_call_booked` | User booked a discovery call |
| `weekly_digest_opened` | User opened a weekly digest email |
| `reengagement_email_clicked` | User clicked a Day 0, Day 2, or Day 6/7 email |
| `returned_after_trigger` | User returned within the chosen attribution window after a trigger |
| `skip_today_clicked` | Existing event retained only until the module is removed |

## Core Metrics

**Finding**  
Top-line retention hides the behavior of the small retained core.

**Root Cause**  
The current metric layer is too broad and too anonymous-heavy.

**Recommendation**  
Track the following as the primary operating metrics:
- D7 retention
- D14 retention
- D30 retention
- signup conversion from homepage
- activation completion rate within first session
- weekly unique users on `/messages`
- % of new signups completing one value-bearing action within `24h`
- reactivation rate from Day 6/7 email

**Success Metric**
- the metrics above become visible in a weekly operating dashboard

---

## Prioritized Experiment Backlog

## 1. Replace `Skip Today` With Contextual Activity Feed

**Finding**  
`Skip Today` is the strongest explicit disengagement signal in the reports.

**Root Cause**  
The daily mechanic is generic and trains avoidance.

**Recommendation**  
Ship contextual activity cards backed by real user data.

**Success Metric**
- `skip_today_clicked` -> `0`
- CTR on activity cards

---

## 2. Make First Value Action Mandatory in Onboarding

**Finding**  
Activation fails before meaningful commitment happens.

**Root Cause**  
Onboarding does not require a value outcome.

**Recommendation**  
Gate completion on one value-bearing action.

**Success Metric**
- first-session activation completion rate

---

## 3. Day 0 / Day 2 / Day 6 Re-Engagement Sequence

**Finding**  
Week-2 churn is the dominant failure window.

**Root Cause**  
There is no triggered re-entry communication tied to real assets.

**Recommendation**  
Launch a lifecycle email sequence tied to saves, messages, or booked calls.

**Success Metric**
- reengagement_email_clicked
- returned_after_trigger

---

## 4. Earlier Account / Email Capture on High-Traffic Pages

**Finding**  
Only `5.8%` of homepage visitors reach signup.

**Root Cause**  
High-intent users are allowed to leave before identity capture.

**Recommendation**  
Move capture earlier and tie it to a relevant payoff.

**Success Metric**
- homepage -> signup conversion

---

## 5. Weekly Match / Reply / Availability Digest

**Finding**  
The retained cohort needs a recurring ritual, not one-off reminders.

**Root Cause**  
No weekly structure exists for users with a retained asset.

**Recommendation**  
Send a weekly digest only to users with saved mentors, messages, or incomplete activation.

**Success Metric**
- weekly digest opens
- weekly digest return rate

---

## 6. Intent-Based Onboarding Routing

**Finding**  
Users browse broadly instead of moving directly into their use case.

**Root Cause**  
The product does not ask intent early enough.

**Recommendation**  
Route users into a single intent track immediately after signup.

**Success Metric**
- activation completion by intent track

---

## 7. Investigate and Replicate the Feb 9 Pattern

**Finding**  
The Feb 9 week produced the strongest commercial-intent combination in the dataset: `103` discovery call clicks, `39` saves, and relatively healthy skip behavior.

**Root Cause**  
Some acquisition or content context drove better-fit traffic, but it is not yet identified.

**Recommendation**  
Audit acquisition, content, and referral context around the Feb 9 spike and reproduce the source if possible.

**Success Metric**
- % of traffic with attributable source
- retention and activation quality by source

---

## Acceptance Targets

The source reports propose near-term targets that are aggressive but still grounded in the observed baseline. Use these as the default sprint-to-quarter targets:

| Metric | Current Baseline | Target |
|---|---:|---:|
| D7 retention | `1-2%` | `5%+` |
| D30 retention | `~0%` | `2%+` |
| Homepage -> signup | `5.8%` | `10%+` |
| Weekly returning users | `~12 avg` | `60+` |
| `/messages` weekly uniques/views | strongest leading signal | make it the primary weekly retention KPI |

---

## Assumptions and Data Gaps

### Assumptions Used
- The platform is primarily web, not mobile-first
- The next sprint can ship `email + in-app`, but not mobile push
- `/messages`, saved profiles, and discovery calls are the strongest usable retention anchors
- The team can instrument custom events in Amplitude or an equivalent analytics layer

### Data Gaps That Should Be Closed Next
- Which acquisition source caused the Feb 9 anomaly
- Which exact user actions precede `/messages` usage
- Whether saved mentors or discovery calls produce stronger long-term retention by cohort
- Whether the activation funnel differs materially by landing page or audience segment

---

## Recommended First Sprint Scope

If the team can only ship one sprint before re-evaluating, the highest-leverage scope is:
1. Instrument the event taxonomy above
2. Remove `Skip Today` and replace it with contextual activity states
3. Make one value-bearing action mandatory in onboarding
4. Launch Day 0 / Day 2 / Day 6 lifecycle email tied to real user assets
5. Track weekly unique users on `/messages` as the operating retention KPI

This sequence addresses the two biggest failures in the attached reports:
- users do not reach first value
- users do not receive a relevant reason to return
