# Demo Studio as a demand test

**Status:** direction proposal — nothing built
**Date:** 2026-08-22
**Decision taken:** a demo is *the instrument a founder puts in front of the buyer Idea mode validated, to find out whether they want it*. Not marketing collateral, not a product tour.

---

## 1. Why the current output is not a demo

Running `/demo-studio/try` against Formbricks — real screenshots, real URL — produced three captions: "Introduction to Formbricks", "Walk through the key action", "Advanced Analytics", closing with *"This screen makes the result clear and gives the viewer a reason to keep going."*

That last sentence is verbatim from `buildTryFallbackStoryboard` in `src/lib/demoStudio/tryPreview.ts`. It is an instruction **to a demo author** about what a closing step should accomplish. We printed our own stage directions to the founder as if they were narration about their product.

Three defects produce this, and they share one root cause: **we generate the narrative without ever looking at the artifact.**

| # | Defect | Where |
|---|---|---|
| 1 | The model never sees the screenshots. `generateDemoStudioDraftStoryboard` sends `{ project, brief }` — text only. | `src/lib/demoStudio/api.ts` |
| 2 | Captions are matched to images **by array index**. Upload order *is* narrative order; nothing checks that caption 3 describes image 3. | `tryPreview.ts` → `buildTryPreviewSteps` |
| 3 | Every hotspot is the same rectangle: `DEMO_STUDIO_TRY_HOTSPOT = { x: 0.35, y: 0.78, w: 0.3, h: 0.12 }`, on every step of every demo. | `tryPreview.ts` |

Defect 2 is what put "Advanced Analytics" on top of a marketing homepage. Defect 3 means the pointer — the one thing that makes a walkthrough feel interactive — is not pointing at anything.

**A second root cause, separate and much cheaper to fix.** On the anonymous path the founder's entire description is written into `brief.product_promise` and nothing else. `audience`, `problem` and `aha_moment` come from `getDefaultBrief()`:

> **audience:** "Early adopters and prospective customers evaluating Your product."
> **problem:** "They are not yet convinced Your product solves their problem or how it works in practice."

That "problem" is about the demo, not the customer. We ask the generator to write a targeted narrative while telling it the audience is "people evaluating this" and the problem is "they are not convinced yet". Generic input, generic output.

## 2. What we already have and throw away

`src/lib/icpToDemoBrief.ts` already maps a finished ICP draft into a complete demo brief:

```
icpArtifactToDemoBrief(artifact) -> {
  patch: { audience, problem, product_promise, aha_moment, primary_cta_label },
  project: { name, tagline },
  tryDescription,
  personaName,
}
```

`DemoBriefPage.tsx:64` uses `.patch` properly. **`TryPage.tsx:232` takes only `.tryDescription`** — a flattened 300-character string — and hands it over as `product_promise`, while `getDefaultBrief()` supplies the boilerplate above.

So the real segment, the real ranked pain and the real aha moment are computed and then discarded, on exactly the funnel where they would matter most. This is the highest-leverage gap in the pipeline and it needs no new capability.

## 3. What a demo is

Arcade, Storylane, Supademo and Navattic all work by **capturing** a real click path: the hotspot *is* the button because an extension recorded it. Three properties make those valuable:

1. **One job, end to end** — not "here is our product" but "here is how you get X done in four clicks"
2. **The pointer is on the real element**
3. **Everything irrelevant is cut**

We do not capture; we receive uploaded stills. Competing on their terms is a losing frame, and a founder who wants slides will correctly choose Canva.

### The definition we are committing to

> A demo is the artifact a founder puts in front of a specific, validated buyer to test whether that buyer wants the product — before building it.

Not a pitch. A **test**. This follows from what the platform already produces one step upstream: Idea mode ends with an experiment and a written pass bar ("30+ practices express interest"). The demo is what you send to those 30 people. Its job is to produce a signal, not an impression.

### Why this is defensible

Two things we have that Arcade structurally cannot:

- **We know who is watching.** The ICP draft carries segment, ranked pain, buying trigger, current alternative and the non-fit segment. A walkthrough written for *"practice managers losing 15% of appointments to no-shows"* opens on the no-show queue, not on a logo. Arcade records a flow beautifully and has no idea who the viewer is.
- **The demo is scored, not just shipped.** Views, completion rate and CTA conversion already exist in `DemoAnalyticsPage`. What is missing is tying them back to the experiment the ICP draft defined.

Canva cannot do either. Neither can a general-purpose AI tool, because neither knows the founder's ICP.

## 4. What changes

Ordered by leverage per unit of work.

### 4.1 Feed the demo the ICP it already has
Pass `icpArtifactToDemoBrief(...).patch` into `generateDemoStudioDraftStoryboard` instead of `getDefaultBrief()` plus a flattened string. Where no ICP exists, ask for the buyer and the pain directly rather than defaulting to "people evaluating this product".

*No new capability. Removes the generic-input cause of generic output.*

### 4.2 Look at the screenshots
Send the uploaded images to a vision-capable model and have it identify what each screen is, **order** them into a coherent flow, write captions grounded in what is visible, and name the element to point at with coordinates.

This is the one change that fixes defects 1–3 together, because all three descend from writing narrative blind. It also lets us reject a marketing homepage as a demo frame — it is not product UI and should not be step three.

*Cost and latency need measuring first: 2–3 images per run on a currently free, unauthenticated path is a real spend and rate-limit question, not a footnote.*

### 4.3 Never ship stage directions
If the model cannot produce a real caption for a screen, say the screen was not legible. Printing `buildTryFallbackStoryboard` text as product narration is worse than printing nothing, because the founder cannot tell it apart from a finding.

The ICP draft already solves exactly this with its "Open question" treatment — `fieldIsReal()` in `src/lib/icpFieldProvenance.ts` is the pattern to copy.

### 4.4 Give the demo a pass bar
Carry the experiment's success signal from the ICP draft onto the demo and show progress against it in `DemoAnalyticsPage`. This converts "I made a demo" into "I ran a test", and it is the reason a founder comes back.

## 5. What this means for the funnel

The try page stays a prototype that hands off to Demo Studio — that framing already shipped. What changes is *why* someone finishes it: not "publish a share link" but "send this to the people your experiment named, and see whether they bite".

The honest sequencing question is whether `/demo-studio/try` should keep accepting founders who arrive with no ICP at all. Today it does, and that is the path producing the weakest output.

## 6. Open questions

1. **Vision cost on an anonymous path.** What is the per-run spend, and does the existing IP rate limit hold?
2. **Founders with nothing to screenshot.** Pre-build founders have no product UI. Does the demand test become a mockup path, or do we send them back to Idea mode?
3. **Ordering authority.** If vision reorders a founder's uploads, can they override it? A wrong auto-order is worse than upload order, because it looks deliberate.
4. **Does `/demo-studio/try` require an ICP?** See section 5.

## 7. Not doing yet

No code has been written against this document. Section 4.1 is small, self-contained, and independent of the rest — the natural first move once direction is confirmed.
