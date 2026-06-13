# Creatives Takeover — Design System

This is the source of truth for tokens and styling rules. The short version:

> **Never hardcode a color, spacing, or font size in a component.** Reach for a token.
> A lint rule (`ct/no-hardcoded-design-values`) enforces this; decorative wallpapers are the only exemption.

Tokens are defined as HSL CSS variables in [`src/index.css`](src/index.css) and exposed to Tailwind in [`tailwind.config.ts`](tailwind.config.ts). [`Button`](src/components/ui/button.tsx) is the reference for a fully token-driven component.

---

## Color model (three layers)

Components only ever use **Layer 2** and **Layer 3**. Layer 1 is raw source values, never referenced directly.

### Layer 1 — Primitives (defined, never used in components)
The raw HSL ramps in `src/index.css`: `--blue-*`, `--red-*`, `--green-*`, neutral grays. These feed the semantic tokens; don't reference them from JSX.

### Layer 2 — Semantic tokens (the everyday vocabulary)
Use these for almost everything. All flip correctly between light and dark mode.

| Purpose | Token (Tailwind class) |
|---------|------------------------|
| Page / surface | `bg-background`, `bg-card`, `bg-popover`, `bg-muted` |
| Deep chrome (MVP builder) | `bg-surface-deep` (within `.mvp-surface`) |
| Text | `text-foreground` (primary), `text-muted-foreground` (secondary/subtle) |
| Lines | `border-border`, `border-input`, focus `ring-ring` |
| Primary action / brand | `bg-primary` / `text-primary(-foreground)` |
| Secondary action | `bg-secondary` / `text-secondary-foreground` |
| Brand teal (onboarding / ICP / mentor) | `bg-accent-teal`, `accent-teal-hover`, `accent-teal-deep` |

**Status family** — for state/feedback. Each has a solid color, a `-foreground`, and a `-subtle` background tint (the latter replaces the `bg-amber-50` / `bg-green-50` pattern):

| State | Solid | On-color text | Subtle background |
|-------|-------|---------------|-------------------|
| Success | `bg-success` | `text-success-foreground` | `bg-success-subtle` |
| Warning / caution / pending | `bg-warning` | `text-warning-foreground` | `bg-warning-subtle` |
| Error / destructive | `bg-destructive` | `text-destructive-foreground` | `bg-destructive-subtle` |
| Info | `bg-info` | `text-info-foreground` | `bg-info-subtle` |

> `warning` and `info` are new — previously amber/yellow (457 raw uses) had **no token** and info-blue was conflated with `primary`.

### Layer 3 — Categorical palette ("RGB" system)
`planning` (blue), `action` (red), `growth` (green) and the `gradient-*` / `bg-gradient-*` utilities exist for **categorical / illustrative** use — the three-pillar brand motif, data viz, decorative gradients.

**Do not use the categorical palette for status.** "Action" is red but does not mean "error"; "growth" is green but does not mean "success." Status always uses the Layer-2 status family above.

### `--accent` is deprecated
`--accent` is a near-duplicate of `--primary` (both blue). **Prefer `primary` in new code.** `accent` is kept only for existing usages and may be removed later.

---

## "Which color when" — quick decision

- Communicating **state** (ok / caution / error / info)? → status family (`success` / `warning` / `destructive` / `info`).
- A **primary CTA or brand emphasis**? → `primary` (not `accent`).
- An **onboarding / ICP / mentor** surface? → `accent-teal`.
- **Neutral** text, surfaces, dividers? → `foreground` / `muted-foreground` / `muted` / `border`.
- A **category label, chart series, or decorative gradient**? → categorical `planning`/`action`/`growth` or a `gradient-*` utility.
- None of the above and you reached for `text-gray-500` / `bg-blue-600`? → it maps to a semantic token above. The lint rule will tell you.

---

## Spacing

Tailwind's default scale is already a 4px grid — **use it**. Custom named steps: `section-desktop` (80px), `section-mobile` (60px), `header-offset` (96px, top padding under the fixed nav), `13` (52px).

Do **not** use arbitrary values like `w-[280px]` or `gap-[18px]`. Pick the nearest scale step (`w-72`, `gap-4`/`gap-5`). Add a named token only if a value recurs and has no near step.

---

## Typography

Font families: `font-sans` (Inter, default), `font-space-grotesk` (display headings).

| Use | Class |
|-----|-------|
| Hero / page headlines | `text-headline-xl` (64px), `text-headline-lg` (48px) |
| Section headings | `text-subheading-xl` (32px), `text-subheading-lg` (24px) |
| Body | `text-body-lg` (18px), `text-body` (16px) |
| Buttons | `text-button` (16px), `text-button-sm` (15px) |
| Small UI labels (only approved sub-12px) | `text-label` (11px), `text-caption` (10px) |
| General UI text | Tailwind defaults `text-sm` / `text-base` etc. are fine |

Headings should adopt `text-headline-*` / `text-subheading-*` rather than hand-rolling size + weight + line-height. Never use arbitrary `text-[14px]` / `leading-[..]`.

---

## Radius ladder

`sm` (6px), `md`/`lg`/`card` (8px), `button` (12px), `large` (16px), `2.5xl` (20px), `4xl` (28px), `5xl` (32px).

> Note: `md`, `lg`, and `card` all resolve to 8px. Prefer **`rounded-card`** for cards and **`rounded-button`** for buttons (intent-named); the duplicates are kept for compatibility.

---

## Reference component

[`src/components/ui/button.tsx`](src/components/ui/button.tsx) is fully token-driven — `cva` variants over semantic tokens, intent-named radii (`rounded-button`), the type token (`text-button`), focus-visible ring, disabled state, and a 44px min touch target. Model new components on it. Compose classes with `cn()` from [`src/lib/utils.ts`](src/lib/utils.ts).

---

## Contribution rule

1. No raw palette utilities (`*-gray-500`, `*-blue-600`…), no hex-in-className (`bg-[#…]`), no arbitrary spacing/type (`w-[280px]`, `text-[14px]`).
2. The `ct/no-hardcoded-design-values` ESLint rule enforces this (currently `warn`; will move to `error`). Run `npm run lint`.
3. **Exemptions:** decorative wallpapers/backgrounds (`src/components/wallpapers/**`, `*Background.tsx`) and the vendored shadcn primitives (`src/components/ui/**`).
4. Need a value no token covers? Add the token (Layer 1 var + Tailwind wiring) and document it here — don't inline it.
