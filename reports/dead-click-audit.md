# Dead Click Audit

Latest follow-up completed on `2026-04-24`.

## 2026-04-24 Follow-up: Fixed Missing Route Dead Clicks

Scope: verified literal internal links and CTA routes against the mounted route table in `src/App.tsx`, then reviewed remaining `cursor-pointer`, `href="#"`, and "Coming Soon" candidates for false affordances.

### Fixed Elements

| Priority | Location | Element type | What was broken | Expected behavior | Fix |
| --- | --- | --- | --- | --- | --- |
| P0 | `src/components/PricingCTA.tsx`, `src/components/StillNotSure.tsx` | Demo CTA button | Buttons navigated to `/demo-calls`, which fell through to the 404 route. | Open the demo scheduling experience. | Mounted `/demo-calls` to `src/pages/DemoCalls.tsx`. |
| P0 | `src/pages/SubscriptionSuccess.tsx`, `src/components/CommunityNavigation.tsx`, `src/components/ServicesNavigation.tsx` | FAQ/support links | Links navigated to `/faq` or `/contact`, which fell through to the 404 route. | Open the FAQ or contact support pages. | Mounted `/faq` to `src/pages/FAQPage.tsx` and `/contact` to `src/pages/Contact.tsx`. |
| P0 | `src/pages/SubscriptionSuccess.tsx`, `src/components/CommunityEvents.tsx` | Resources link | Links navigated to `/resources`, which fell through to the 404 route. | Open the resources page. | Mounted `/resources` to `src/pages/Resources.tsx`. |
| P1 | `src/components/FeatureHighlights.tsx`, `src/components/GuidesSection.tsx`, `src/components/ResourcesNavigation.tsx` | Services CTA/link | Links navigated to `/services`, which fell through to the 404 route. | Open the services page. | Mounted `/services` to `src/pages/Services.tsx`. |
| P1 | `src/components/CreditStatus.tsx`, `src/pages/SubscriptionSuccess.tsx` | Credits link/button | Links navigated to `/credits`, but no dedicated credits page exists. | Show the existing credit-pack purchase section. | Retargeted links to `/pricing#credit-packs`. |
| P1 | `src/components/dashboard/ActiveProjects.tsx` | Dashboard "View All" button | Button navigated to `/projects-dashboard`, which fell through to the 404 route. | Open the projects dashboard. | Mounted `/projects-dashboard` to `src/components/dashboard/ProjectsDashboard.tsx`. |
| P1 | `src/components/pmf/PMFReadinessReport.tsx` | "Go to MVP Scope" CTA | CTA navigated to `/mvp-scope`, which fell through to the 404 route. | Open the MVP scope page. | Mounted `/mvp-scope` to `src/pages/MVPBuilderBetaPage.tsx`. |
| P2 | `src/pages/IPPolicy.tsx`, `src/pages/Software.tsx` | Canonical/self route targets | Pages existed in source but direct URLs were unreachable. | Direct visits should resolve. | Mounted `/ip-policy` and `/software`. |

Additional route mounts:

- `/resources`, `/services`, `/contact`, `/faq`, `/demo-calls`, `/mvp-scope`, `/projects-dashboard`, `/ip-policy`, and `/software` were added before the catch-all route.

Reviewed with no code change:

- `href="#"` pagination links in `src/pages/Stories.tsx` and `src/pages/community/MentorMarketplaceHub.tsx` have explicit `onClick` handlers that call `preventDefault()` and update pagination.
- "Coming Soon" surfaces in collaboration, investor matching, revenue, and pitch-deck builder areas are disabled buttons or plain status copy, not live CTAs that silently do nothing.
- Remaining `cursor-pointer` hits reviewed in the follow-up are tied to labels, links, buttons, tooltip triggers, selection controls, expandable rows, or copy/open handlers.

Verification:

- Static literal internal route comparison returned: `No missing literal internal routes found.`
- Confirmed no remaining `/credits` route references in source.

## 2026-04-19 Baseline Audit

Audit completed on `2026-04-19`.

## Fixed Elements

### `src/components/PricingFAQ.tsx`
- Lines: `99`, `132`, `175-176`
- What was broken: related-question pills looked clickable through `cursor-pointer` styling but had no action.

Broken:
```tsx
<Badge
  key={relatedIndex}
  variant="secondary"
  className="cursor-pointer rounded-full bg-background/70 border border-border/60 hover:bg-primary/10"
>
  {faqs[relatedIndex].question}
</Badge>
```

Fixed:
```tsx
const handleRelatedQuestionClick = (relatedIndex: number) => {
  setOpenItem(`item-${relatedIndex}`);
  document
    .getElementById(`pricing-faq-item-${relatedIndex}`)
    ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
};

<button
  type="button"
  onClick={() => handleRelatedQuestionClick(relatedIndex)}
  className="inline-flex items-center rounded-full bg-background/70 border border-border/60 px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
>
  {faqs[relatedIndex].question}
</button>
```

### `src/components/Community.tsx`
- Lines: `89-92`
- What was broken: channel rows advertised clickability with `cursor-pointer` and hover styling, but they were inert text.

Broken:
```tsx
<div className="p-2 rounded hover:bg-muted/50 cursor-pointer"># showcase</div>
<div className="p-2 rounded hover:bg-muted/50 cursor-pointer"># tips-tricks</div>
<div className="p-2 rounded hover:bg-muted/50 cursor-pointer"># feedback</div>
<div className="p-2 rounded hover:bg-muted/50 cursor-pointer"># announcements</div>
```

Fixed:
```tsx
<div className="p-2 rounded text-muted-foreground"># showcase</div>
<div className="p-2 rounded text-muted-foreground"># tips-tricks</div>
<div className="p-2 rounded text-muted-foreground"># feedback</div>
<div className="p-2 rounded text-muted-foreground"># announcements</div>
```

### `src/components/ClientLogos.tsx`
- Line: `36`
- What was broken: logo cards used `cursor-pointer` without any click target.

Broken:
```tsx
className="glass-card p-4 h-20 flex flex-col items-center justify-center hover-scale transition-all duration-300 hover:shadow-lg animate-fade-in group cursor-pointer"
```

Fixed:
```tsx
className="glass-card p-4 h-20 flex flex-col items-center justify-center transition-all duration-300 animate-fade-in group"
```

### `src/components/TutorialsSection.tsx`
- Lines: `151`, `171`
- What was broken: tutorial category cards and featured tutorial wrappers looked like full-card click targets but only the inner CTA was actionable.

Broken:
```tsx
className="glass border-border hover:shadow-lg transition-all duration-300 hover-lift cursor-pointer group text-center"
className="glass border-border hover:shadow-xl transition-all duration-500 hover-lift group cursor-pointer relative"
```

Fixed:
```tsx
className="glass border-border transition-all duration-300 group text-center"
className="glass border-border hover:shadow-xl transition-all duration-500 group relative"
```

### `src/components/DownloadsSection.tsx`
- Lines: `154`, `187`, `262`
- What was broken: category cards, featured download wrappers, and popular-download rows implied full-surface click behavior without any wrapper interaction.

Broken:
```tsx
className="glass border-border hover:shadow-lg transition-all duration-300 hover-lift cursor-pointer group"
className={`glass border-border hover:shadow-xl transition-all duration-500 hover-lift group cursor-pointer ${...}`}
<div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
```

Fixed:
```tsx
className="glass border-border transition-all duration-300 group"
className={`glass border-border hover:shadow-xl transition-all duration-500 group ${...}`}
<div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 transition-colors">
```

### `src/components/GuidesSection.tsx`
- Lines: `152`, `177`
- What was broken: guide category cards and featured guide wrappers looked clickable even though there was no wrapper-level action.

Broken:
```tsx
className="glass border-border hover:shadow-lg transition-all duration-300 hover-lift cursor-pointer group"
className={`glass border-border hover:shadow-xl transition-all duration-500 hover-lift group cursor-pointer ${...}`}
```

Fixed:
```tsx
className="glass border-border transition-all duration-300 group"
className={`glass border-border hover:shadow-xl transition-all duration-500 group ${...}`}
```

### `src/components/FreeResources.tsx`
- Lines: `83`, `134`
- What was broken: resource cards and bonus-tool rows used `cursor-pointer` even though only nested CTAs had any behavior.

Broken:
```tsx
className="glass-card hover-lift relative overflow-hidden group cursor-pointer"
className="flex items-center gap-4 p-6 rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors group cursor-pointer"
```

Fixed:
```tsx
className="glass-card relative overflow-hidden group"
className="flex items-center gap-4 p-6 rounded-xl bg-muted/5 transition-colors"
```

### `src/components/ProblemSolution.tsx`
- Line: `201`
- What was broken: the decorative transformation arrow used `cursor-pointer` and hover-only interaction cues despite having no function.

Broken:
```tsx
<div className="w-20 h-20 rounded-full glass border-2 border-primary/30 flex items-center justify-center hover:border-primary/60 hover:scale-110 transition-all duration-500 animate-pulse-glow group cursor-pointer">
  <ArrowRight className={`w-10 h-10 text-primary transition-transform duration-300 group-hover:scale-125 ${...}`} />
</div>
```

Fixed:
```tsx
<div className="w-20 h-20 rounded-full glass border-2 border-primary/30 flex items-center justify-center transition-all duration-500 animate-pulse-glow">
  <ArrowRight className={`w-10 h-10 text-primary ${...}`} />
</div>
```

### `src/pages/CreativesTakeover.tsx`
- Lines: `50`, `62`, `74`, `86`
- What was broken: the four “Creative Arsenal” cards used `cursor-pointer` and lift styling with no card-level interaction.

Broken:
```tsx
<Card className="card glass-card hover-lift group cursor-pointer">
```

Fixed:
```tsx
<Card className="card glass-card group">
```

## Verification

- Re-ran `rg -n --glob "*.tsx" "cursor-pointer" src`.
- Remaining matches in the audited pass correspond to valid `onClick` handlers, links/routing props, form-label semantics, or trigger components.
- Checked for native `<button>` elements that combine `disabled` with `cursor-pointer`; no broken instances were found.
