# Platform-Wide Preview Mode UI Design Specification

**Status:** ✅ Implemented & Live  
**Version:** 1.0  
**Date:** April 4, 2026  
**Scope:** All 12 locked tools on Creatives Takeover platform

---

## Executive Summary

All premium tools on Creatives Takeover now feature a consistent, visual preview mode that shows unauthenticated visitors a blurred version of the actual tool UI overlaid with a centered sign-in CTA box. This design pattern replaces generic preview boxes with a more aspirational, feature-forward preview that demonstrates real value without requiring login.

---

## Current State vs. New State

### Previous Approach (Generic Preview Box)
- **Visual:** Plain white/dark card with text description, bullet points, and CTA buttons
- **Content:** Generic feature list with abstract benefits
- **UX Issue:** No visual indication of what the tool actually looks like
- **Conversion Risk:** Visitors can't assess tool quality before signing up

### New Approach (Blurred Content + Overlay)
- **Visual:** Actual tool UI rendered blurred, with centered premium CTA box
- **Content:** Live preview of real functionality with value prop in overlay
- **UX Benefit:** Visitors see exactly what they'll get after signing up
- **Conversion Benefit:** Higher intent to sign up when tool looks powerful

---

## Design Pattern: Blurred Content Preview

### Component Architecture

```
PreviewModeWrapper (NEW)
├── Blurred Content Layer
│   └── Actual Tool UI (blur-[6px], pointer-events-none, select-none)
├── Gradient Overlay
│   └── Radial gradient (dark vignette: transparent → dark)
└── Centered CTA Box
    ├── Lock Badge ("Preview Mode")
    ├── Headline ("Sign in to unlock")
    ├── Value Prop (1-line description)
    ├── CTA Buttons
    │   ├── Sign Up (Primary)
    │   ├── See Pricing (Optional, based on tool config)
    │   └── Sign In Link (Helper text)
```

### Visual Specifications

#### Blur Effect
- **CSS Class:** `blur-[6px]`
- **GPU Optimization:** `will-change: filter` applied to blurred content
- **Effect:** Makes UI recognizable but illegible; shows layout/structure
- **Accessibility:** `aria-hidden="true"` + `pointer-events-none` on blurred layer

#### Gradient Overlay
- **Type:** Radial gradient from center
- **Colors:**
  - Center (0%): `rgba(0,0,0,0.3)` — Transparent with slight darkening
  - Mid (50%): `rgba(0,0,0,0.6)` — Medium opacity
  - Edges (100%): `rgba(0,0,0,0.8)` — Dark vignette effect
- **Purpose:** Creates light-to-dark vignette; centers attention on overlay box
- **Effect:** Readable but darkened content; overlay box stands out

#### Centered CTA Box
- **Container:** Fixed center positioning (flexbox: `flex items-center justify-center`)
- **Styling:**
  - **Background:** `bg-card/95` with `backdrop-blur-md` — Frosted glass effect
  - **Border:** `border border-border/60` — Subtle separation
  - **Padding:** `p-6 sm:p-8` — Breathing room
  - **Shadow:** `shadow-2xl` — Depth perception
  - **Border Radius:** `rounded-2xl` — Modern, soft corners
  - **Max Width:** `max-w-md` — Prevents stretching on ultra-wide screens

#### Lock Badge
- **Icon:** Lock icon from lucide-react
- **Styling:** 
  - Background: `bg-primary/10` with border `border-primary/20`
  - Color: `text-primary`
  - Layout: Inline flex with gap
  - Text: "Preview Mode" — uppercase, tracking-wider
  - Size: Small (`text-xs`)

#### Headline
- **Text:** "Sign in to unlock"
- **Styling:**
  - **Font Size:** `text-xl sm:text-2xl` — Responsive
  - **Font Weight:** `font-bold`
  - **Color:** `text-foreground` — Matches theme
  - **Margin:** `mb-2`

#### Value Prop
- **Source:** Single line from `publicTabVisibility.ts` config (`description` field)
- **Styling:**
  - **Font Size:** `text-sm` — Readable but secondary
  - **Color:** `text-muted-foreground`
  - **Line Height:** `leading-relaxed`
  - **Max Width:** `max-w-xs` — Prevents overflow
  - **Margin:** `mb-6` — Space before buttons

#### CTA Buttons
- **Primary Button ("Sign Up")**
  - **Style:** Gradient background (`from-blue-600 to-purple-600`)
  - **Hover:** Darker gradient (`from-blue-700 to-purple-700`)
  - **Icon:** ArrowRight (lucide-react)
  - **Action:** Link to `/signup?return={currentPath}`
  - **Size:** `lg`

- **Secondary Button ("See Pricing")** — Conditional
  - **Shown When:** `showPricingCta: true` in config
  - **Style:** Outline variant
  - **Icon:** Crown (lucide-react)
  - **Action:** Link to `/pricing`
  - **Size:** `lg`

- **Layout:** 
  - Mobile: Stacked vertically (`flex-col`)
  - Desktop: Side-by-side (`sm:flex-row sm:justify-center`)
  - Spacing: `gap-3` between buttons

#### Helper Text
- **Text:** "Already have an account? [Sign in link]"
- **Styling:**
  - **Font Size:** `text-xs`
  - **Color:** `text-muted-foreground`
  - **Link:** `text-primary` with `hover:underline`
  - **Margin:** `mt-4` — Subtle separation
  - **Action:** Link to `/login?return={currentPath}`

### Container Dimensions
- **Wrapper:** Full width, `relative` positioning for overlay
- **Min Height:** `min-h-[600px]` — Sufficient room for blurred content
- **Blurred Content:** Full width/height of wrapper
- **Gradient Overlay:** `inset-0` — Covers entire wrapper
- **CTA Box:** `w-full max-w-md px-4` — Responsive padding, capped width

---

## Tools Using New Pattern

### All 12 Locked Tools (✅ Live)
1. **MVP Builder** (`/mvp-builder`)
2. **Waitlist Maker** (`/waitlist`)
3. **PMF Lab** (`/pmf-lab`)
4. **Tech Stack Builder** (`/tech-stack`)
5. **GTM Strategist** (`/go-to-market`)
6. **Directories** (`/directories`)
7. **VC Search** (`/insighta/vc-search`)
8. **Accelerator Hunt** (`/insighta/accelerator-hunt`)
9. **Email Templates** (`/insighta/email-templates`)
10. **Pitch Deck Analyzer** (`/insighta/pitch-deck-analyzer`)
11. **Insighta Test** (`/insighta/test`)
12. **Find your Angel** (Community: `/community/angels`) — First implementation

### Configuration
**File:** `src/config/publicTabVisibility.ts`

Each locked tool has:
```typescript
'/tool-path': {
  state: 'locked',
  featureName: 'Tool Name',
  description: '1-line value prop for overlay',  // NEW: single-line for overlay
  previewItems?: [...],  // Legacy; no longer used in preview
  showPricingCta?: boolean,  // Optional: show "See Pricing" button
}
```

---

## Implementation Details

### Core Component: PreviewModeWrapper
**File:** `src/components/ui/PreviewModeWrapper.tsx`

**Props:**
```typescript
interface PreviewModeWrapperProps {
  children: ReactNode;              // Tool component to blur
  featureName: string;              // Header: "Sign in to unlock"
  description: string;              // 1-line value prop
  showPricingCta?: boolean;          // Show pricing CTA? (default: false)
  isLoading?: boolean;              // Reserved for future loading state
}
```

**Usage Example:**
```tsx
{!user ? (
  <PreviewModeWrapper
    featureName={publicTab.featureName}
    description={publicTab.description || ''}
    showPricingCta={publicTab.showPricingCta}
  >
    <YourToolComponent />          {/* Will be blurred */}
  </PreviewModeWrapper>
) : (
  <YourToolComponent />              {/* Full access when authenticated */}
)}
```

### CSS & Tailwind Classes Used
- **Blur:** `blur-[6px]` — Tailwind's arbitrary blur scale
- **Will-change:** `style={{ willChange: 'filter' }}` — GPU acceleration
- **Flexbox:** `flex items-center justify-center` — Center overlay box
- **Responsive:** `sm:flex-row sm:w-auto` — Adapt layout at breakpoint
- **Gradient:** Inline `style={{ background: 'radial-gradient(...)' }}` — Custom radial gradient

---

## Behavior Specifications

### States

#### Unauthenticated Visitor
- **View:** Blurred tool UI with overlay
- **Interaction:** Cannot interact with blurred content
- **CTA Flow:** Click → Sign Up → Redirects to tool after login

#### Authenticated (Free Tier)
- **View:** Blurred tool UI with overlay (on locked tools)
- **Interaction:** Cannot interact yet
- **CTA Flow:** Click "Upgrade to Professional" → /pricing

#### Authenticated (Pro/Rising Tier)
- **View:** Full, unblurred tool UI
- **Interaction:** Fully functional
- **No Overlay:** No preview mode shown

---

## Responsive Design

### Breakpoints
- **Mobile (< 640px):**
  - CTA box uses full `w-full` minus padding
  - Buttons stack vertically
  - Font sizes: `text-xl` for headline
  - Padding: `p-6` (smaller)

- **Tablet (640px-1024px):**
  - CTA box `max-w-md` applied
  - Buttons side-by-side
  - Font sizes: `text-xl sm:text-2xl`

- **Desktop (> 1024px):**
  - Full space available
  - Centered layout with max-width constraint
  - Font sizes: `text-2xl`

### Mobile Considerations
- **Touch Targets:** Buttons sized `lg` (44px+ minimum)
- **Viewport:** Overlay box stays within safe area (px-4 padding)
- **Blur Rendering:** GPU-accelerated (`will-change: filter`)
- **Performance:** Minimal repaints; static overlay

---

## Accessibility (A11y)

### ARIA Attributes
- **Blurred Content:** `aria-hidden="true"` — Announcement will skip blurred content
- **Overlay Box:** Implicit role from semantic HTML (div with content)
- **Links:** Standard `<Link>` component handles screen reader announcements

### Keyboard Navigation
- **Tab Order:** CTA box buttons receive focus
- **Focus Ring:** Default browser focus indicator (or custom via global styles)
- **Links:** Sign In/Sign Up links keyboard-accessible

### Color Contrast
- **Text on Card:** Black text on light card background — ✅ WCAG AA
- **Gradient Overlay:** Not read by screen readers (decorative); text on card bg matters
- **Links:** Primary color with underline on hover — ✅ Meets standards

### Screen Readers
- VoiceOver/NVDA: Card content announced (headline, description, buttons)
- Blurred content: Skipped via `aria-hidden`
- Button labels: Clear ("Sign up to unlock", "See Pricing")

---

## Performance Considerations

### Rendering Optimization
- **GPU Acceleration:** `will-change: filter` on blurred parent
- **Static Overlay:** Box position never animates; no reflow on blur
- **CSS Blur:** Native browser filter; faster than JavaScript blur

### Bundle Size Impact
- **New Component:** `PreviewModeWrapper.tsx` (~800 bytes)
- **Lucide Icons:** Already imported (Lock, ArrowRight, Crown)
- **Total:** Negligible (~1KB gzipped)

### Runtime Performance
- **Blur Filter:** One-time application; no per-frame recomputation
- **Layout:** Flexbox centering; no complex calculations
- **Re-renders:** Only on user/theme changes (not on scroll or interaction)

---

## Migration Guide for New Tools

When adding a new locked tool:

1. **Update Config** (`src/config/publicTabVisibility.ts`):
```typescript
'/your-tool-path': {
  state: 'locked',
  featureName: 'Your Tool Name',
  description: 'One-line value prop that fits in the overlay',
  showPricingCta: false,  // true if tool is tier-gated, not sign-up gated
}
```

2. **Update Page Component**:
```tsx
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';

export default function YourToolPage() {
  const { user } = useAuth();
  const publicTab = getPublicTabConfig('/your-tool-path');

  return (
    <div>
      <Navigation />
      <main>
        {/* Hero/Header */}
        
        {!user && publicTab ? (
          <PreviewModeWrapper
            featureName={publicTab.featureName}
            description={publicTab.description || ''}
            showPricingCta={publicTab.showPricingCta}
          >
            <YourToolComponent />
          </PreviewModeWrapper>
        ) : (
          <YourToolComponent />
        )}
      </main>
    </div>
  );
}
```

---

## Design Rationale

### Why Blurred Content?
- **Shows Value:** Visitors see the actual tool, not abstract benefits
- **Increases Intent:** "I can see exactly what I'll get" → Higher signup conversion
- **Saves Time:** No need to read feature descriptions; UI is self-explanatory
- **Trust:** Transparency about tool capabilities before signup

### Why Centered CTA Box?
- **No Scrolling:** Overlay box visible without scrolling on 600px+ viewports
- **Peak Attention:** Center of screen is most likely to capture eye
- **Professional:** Similar to modern SaaS (Notion, Figma, Slack)

### Why Radial Gradient?
- **Natural Vignette:** Draws eye to center without dark borders
- **Readable Text:** Center content (CTA box) highest opacity can read on
- **Stylish:** More premium than linear gradients or solid overlays

### Why Single-Line Description?
- **Clarity:** Fits on overlay box; no text overflow issues
- **Retention:** Visitors read 1 line vs. skipping 3-5 bullet points
- **Action:** Reduces cognitive load → More likely to sign up

---

## Testing Checklist

### Visual Testing
- [ ] Blur renders on all browsers (Chrome, Firefox, Safari, Edge)
- [ ] Overlay box centered on mobile, tablet, desktop
- [ ] Text contrast meets WCAG AA on all themes (light/dark)
- [ ] Gradient vignette renders smoothly (no banding)
- [ ] Icons render correctly (Lock, Arrow, Crown)

### Interaction Testing
- [ ] Sign Up button links to correct return URL
- [ ] Sign In link works and returns to tool after login
- [ ] Pricing button navigates to /pricing
- [ ] Buttons are clickable and have hover states
- [ ] No dead clicks on blurred content

### Performance Testing
- [ ] Blur filter applies within <100ms
- [ ] No layout shift or reflow on page load
- [ ] Smooth scrolling not affected by blur
- [ ] Mobile performance acceptable (60fps on lower-end devices)

### Accessibility Testing
- [ ] Screen reader skips blurred content (aria-hidden working)
- [ ] Tab order: Navigation → CTA buttons → Skip links
- [ ] Link text is descriptive ("Sign up" vs. generic "Click here")
- [ ] Focus ring visible on all buttons
- [ ] High contrast mode renders correctly

### Responsive Testing
- [ ] iPhone SE (375px): Box fits with padding
- [ ] iPad (768px): Buttons side-by-side
- [ ] Desktop (1440px): Max-width respected
- [ ] Landscape orientation: Layout reflow correct

---

## Future Enhancements

### Potential Improvements
1. **Animated Entry:** Fade-in blur effect on page load
2. **A/B Testing:** Compare blurred vs. static preview CT rates
3. **Tool-Specific Preview Content:** Show first 1-3 rows of actual data in blur
4. **Video Teaser:** Muted video showing tool in action behind blur
5. **Feature Highlights:** Interactive dots pointing to key features while blurred
6. **Regional CTAs:** Detect locale and show region-specific sign-up option

---

## Code References

### Files Modified
- `src/components/ui/PreviewModeWrapper.tsx` — NEW
- `src/pages/AppBuilderPage.tsx` — MVP Builder updated
- `src/pages/WaitlistMakerPage.tsx` — Waitlist Maker updated
- `src/pages/PMFLabPage.tsx` — PMF Lab updated
- `src/pages/TechStackPage.tsx` — Tech Stack updated
- `src/pages/GTMStrategistPage.tsx` — GTM Strategist updated
- `src/pages/DirectoriesPage.tsx` — Directories updated
- `src/pages/VCSearchPage.tsx` — VC Search updated
- `src/pages/AcceleratorHuntPage.tsx` — Accelerator Hunt updated
- `src/pages/EmailTemplatesPage.tsx` — Email Templates updated
- `src/pages/PitchDeckAnalyzerPage.tsx` — Pitch Deck Analyzer updated
- `src/pages/InsightaTestPage.tsx` — Insighta Test updated
- `src/pages/community/FindYourAngel.tsx` — Angel Investors (first impl.)
- `src/config/publicTabVisibility.ts` — Configuration reference

### Related Components (Unchanged)
- `src/components/ui/SignedOutFeaturePreview.tsx` — Legacy (kept for reference)
- `src/components/ui/BlurredToolPreview.tsx` — Alternative pattern (kept for reference)

---

## Support & Questions

For questions about this design pattern:
1. Review the `PreviewModeWrapper` component source
2. Check `publicTabVisibility.ts` for tool configuration
3. Reference any updated tool page (e.g., `AppBuilderPage.tsx`)
4. Test on staging before production rollout

---

**End of Design Specification**
