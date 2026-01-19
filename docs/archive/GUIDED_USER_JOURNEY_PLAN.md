# Guided User Journey Implementation Plan

## Overview
Transform the platform into a clear, outcome-driven experience with a 4-step journey that guides users from discovery to action. Focus on new visitors (pre-signup) with BizMap AI as Step 1 (Complete Business Plan), using dashboard-style progress cards with visual completion indicators.

## Target Outcome
**Primary Goal:** Complete business plan via BizMap AI (Step 1)
**User Type:** New visitors (pre-signup focus)
**Visual Style:** Dashboard-style progress cards with visual completion

## 4-Step Journey Structure

### Step 1: PLAN - Complete Your Business Plan
- **Tool:** BizMap AI
- **Outcome:** Complete business plan with market analysis and launch roadmap
- **Location:** `/bizmap-ai`
- **Completion Criteria:** Business plan generated and saved

### Step 2: VALIDATE - Get Feedback & Market Intelligence
- **Tools:** Community + Insighta
- **Outcome:** Validate idea with peer feedback and market data
- **Locations:** `/community`, `/insighta`
- **Completion Criteria:** Posted in community OR reviewed market intelligence

### Step 3: EXECUTE - Track Your Progress
- **Tool:** Dashboard
- **Outcome:** Set goals and track daily progress
- **Location:** `/dashboard`
- **Completion Criteria:** Completed daily check-in OR set primary goal

### Step 4: LAUNCH - Secure Resources & Funding
- **Tools:** Insighta + Community Demo Days
- **Outcome:** Access funding opportunities and prepare for launch
- **Locations:** `/insighta`, `/community`
- **Completion Criteria:** Viewed funding opportunities OR joined cohort

---

## Implementation Phases

### Phase 1: Create Journey Progress Component System

#### 1.1 Create JourneyProgress Component
**File:** `src/components/JourneyProgress.tsx`
- Dashboard-style progress cards (4 cards in a grid)
- Visual completion indicators (checkmarks, progress rings, disabled states)
- Hover states and click-to-navigate functionality
- Responsive design (stack on mobile, grid on desktop)
- Shows current step highlight
- Completion percentage calculation

**Props:**
```typescript
interface JourneyProgressProps {
  currentStep?: number; // 0-3, undefined = not started
  completedSteps?: number[]; // Array of completed step indices
  showTitle?: boolean; // Show "Your Journey" title
  compact?: boolean; // Compact mode for dashboard
  onStepClick?: (stepIndex: number) => void;
}
```

**Visual Design:**
- Card-based layout with icons
- Progress ring/circle showing completion
- "Start" button on Step 1 if not started
- "Continue" button on current step
- "Completed" badge on finished steps
- Disabled state for future steps

#### 1.2 Create Journey Progress Tracking Hook
**File:** `src/hooks/useJourneyProgress.ts`
- Track user progress across journey steps
- Check completion status for each step
- Store progress in localStorage (for anonymous users)
- Store in database (for authenticated users)
- Calculate overall journey completion percentage

**Functions:**
- `getJourneyProgress()`: Returns current step and completed steps
- `markStepComplete(stepIndex: number)`: Mark a step as complete
- `getNextStep()`: Returns the next incomplete step
- `getJourneyCompletion()`: Returns 0-100% completion

**Data Storage:**
- Anonymous users: localStorage key `ct_journey_progress`
- Authenticated users: `profiles.journey_progress` JSON column
- Structure: `{ currentStep: 0, completedSteps: [0], lastUpdated: timestamp }`

---

### Phase 2: Transform Landing Page Hero

#### 2.1 Update Hero Component
**File:** `src/components/Hero.tsx`
- Replace generic CTAs with JourneyProgress component
- Add section title: "Start Your Journey in 4 Steps"
- Make Step 1 (BizMap AI) the primary CTA
- Show journey progress prominently above fold
- Add subtle animation on step cards

**Changes:**
- Import JourneyProgress component
- Replace current CTA buttons section with JourneyProgress
- Add subheading: "Turn your creative idea into a thriving business"
- Keep "Start Here" button but make it link to BizMap AI with journey context
- Add scroll indicator pointing to journey section

#### 2.2 Add Journey Context to Landing Page
**File:** `src/pages/Index.tsx`
- Insert JourneyProgress component prominently after Hero
- Or integrate directly into Hero section
- Ensure it's visible without scrolling (above fold priority)

---

### Phase 3: Enhance Dashboard with Journey Guidance

#### 3.1 Update PersonalizedDashboard
**File:** `src/components/dashboard/PersonalizedDashboard.tsx`
- Add JourneyProgress component at top of dashboard
- Show in compact mode with "Continue Your Journey" title
- Highlight current step with contextual next action
- Add "Your Next Step" card showing what to do next
- Link dashboard activities to journey steps

**Layout Changes:**
- JourneyProgress component at top (below welcome message)
- "Next Step" card showing current incomplete step
- Contextual recommendations based on journey progress
- Progress percentage in header

#### 3.2 Create Next Step Recommendation Component
**File:** `src/components/dashboard/NextStepCard.tsx`
- Shows the current incomplete journey step
- Contextual CTA button to continue
- Estimated time to complete
- Quick preview of what they'll accomplish

---

### Phase 4: Implement Progress Tracking

#### 4.1 Create Database Migration for Journey Progress
**File:** `supabase/migrations/XXXXXX_add_journey_progress.sql`
- Add `journey_progress` JSON column to `profiles` table
- Structure: `{ currentStep: number, completedSteps: number[], lastUpdated: timestamp }`
- Add index for querying users by journey stage

#### 4.2 Add Progress Tracking Logic
**File:** `src/hooks/useJourneyProgress.ts` (expand)

**Step 1 Completion Triggers:**
- User completes BizMap AI wizard and generates business plan
- Check: `stories_articles` table has entry with `user_id` and `status='published'`
- OR: `bizmap_sessions` table has completed session

**Step 2 Completion Triggers:**
- User posts in community OR views Insighta article
- Check: `community_posts` table has entry OR `insighta_views` exists

**Step 3 Completion Triggers:**
- User completes daily check-in OR sets KPI goal
- Check: `daily_check_ins` table OR `kpi_goals` table

**Step 4 Completion Triggers:**
- User views funding opportunities OR joins cohort
- Check: Insighta funding views OR cohort membership

**Auto-detection:**
- On page load, check if user has completed actions that mark steps complete
- Update journey progress automatically

#### 4.3 Add Progress Sync to Key Actions
**Files to update:**
- `src/pages/Dream2Plan.tsx`: Mark Step 1 complete when plan generated
- `src/components/community/CommunityFeed.tsx`: Mark Step 2 complete on first post
- `src/components/dashboard/PersonalizedDashboard.tsx`: Mark Step 3 complete on first check-in
- `src/pages/Blog.tsx` (Insighta): Mark Step 2 complete on article view

---

### Phase 5: Enhance BizMap AI as Clear Step 1

#### 5.1 Add Journey Context to BizMap AI
**File:** `src/pages/Dream2Plan.tsx`
- Add journey progress indicator at top
- Show "Step 1 of 4: Complete Your Business Plan"
- Add completion celebration when plan is generated
- Link to Step 2 after completion

**Changes:**
- Import JourneyProgress or create inline indicator
- Add step number badge/header
- On plan generation success, mark Step 1 complete
- Show "Continue to Step 2" button after completion

#### 5.2 Update Navigation to Show Journey Context
**File:** `src/components/Navigation.tsx`
- Add journey progress indicator in nav (optional, for authenticated users)
- Show current step in user menu dropdown

---

### Phase 6: Create Journey Completion Flow

#### 6.1 Add Journey Completion Modal
**File:** `src/components/JourneyCompletionModal.tsx`
- Celebrate when user completes all 4 steps
- Show summary of accomplishments
- Offer next steps (premium features, community engagement, etc.)
- Share journey completion option

#### 6.2 Add Journey Reset Option
- Allow users to restart journey
- Useful for users building multiple businesses

---

## File Structure

```
src/
├── components/
│   ├── JourneyProgress.tsx (NEW)
│   ├── JourneyProgressCard.tsx (NEW - individual card component)
│   ├── NextStepCard.tsx (NEW)
│   ├── JourneyCompletionModal.tsx (NEW)
│   ├── Hero.tsx (MODIFY)
│   └── dashboard/
│       └── PersonalizedDashboard.tsx (MODIFY)
├── hooks/
│   └── useJourneyProgress.ts (NEW)
├── pages/
│   ├── Index.tsx (MODIFY)
│   ├── Dream2Plan.tsx (MODIFY - BizMap AI)
│   └── Dashboard.tsx (MODIFY - if needed)
├── lib/
│   └── journeySteps.ts (NEW - journey step definitions)
└── supabase/
    └── migrations/
        └── XXXXXX_add_journey_progress.sql (NEW)
```

---

## Journey Step Definitions

**File:** `src/lib/journeySteps.ts`
```typescript
export const JOURNEY_STEPS = [
  {
    id: 1,
    title: "PLAN",
    subtitle: "Complete Your Business Plan",
    description: "Use BizMap AI to analyze your idea and create a comprehensive launch roadmap",
    icon: "Brain",
    route: "/bizmap-ai",
    completionCriteria: {
      type: "bizmap_plan_generated",
      check: async (userId: string) => {
        // Check if user has generated a BizMap plan
      }
    }
  },
  {
    id: 2,
    title: "VALIDATE",
    subtitle: "Get Feedback & Market Intelligence",
    description: "Share your idea in the community and explore market trends",
    icon: "Users",
    route: "/community",
    completionCriteria: {
      type: "community_engagement",
      check: async (userId: string) => {
        // Check if user posted or viewed insights
      }
    }
  },
  {
    id: 3,
    title: "EXECUTE",
    subtitle: "Track Your Progress",
    description: "Set goals and track your daily progress in the dashboard",
    icon: "LayoutDashboard",
    route: "/dashboard",
    completionCriteria: {
      type: "dashboard_engagement",
      check: async (userId: string) => {
        // Check if user has check-in or goals
      }
    }
  },
  {
    id: 4,
    title: "LAUNCH",
    subtitle: "Secure Resources & Funding",
    description: "Explore funding opportunities and prepare for launch",
    icon: "Rocket",
    route: "/insighta",
    completionCriteria: {
      type: "funding_exploration",
      check: async (userId: string) => {
        // Check if user viewed funding or joined cohort
      }
    }
  }
];
```

---

## Visual Design Specifications

### Progress Cards
- **Size:** 280px width (desktop), full width (mobile)
- **Padding:** 24px
- **Border:** 2px solid, color changes based on status
- **Status Colors:**
  - Not Started: Muted gray border, disabled state
  - Current Step: Primary color border, glow effect
  - Completed: Success green border, checkmark badge
  - Future Step: Muted border, "Coming Soon" or locked

### Progress Indicators
- **Completion Ring:** Circular progress indicator (0-100%)
- **Checkmark:** Appears when step complete
- **Step Number:** Large badge in top-left corner
- **Status Badge:** "Start", "Continue", or "Completed"

### Typography
- **Title:** 18px, font-semibold
- **Subtitle:** 14px, text-muted-foreground
- **Description:** 13px, line-height relaxed

---

## Implementation Checklist

### Core Components
- [ ] Create `JourneyProgress.tsx` component with 4 progress cards
- [ ] Create `JourneyProgressCard.tsx` individual card component
- [ ] Create `useJourneyProgress.ts` hook for progress tracking
- [ ] Create `journeySteps.ts` with step definitions

### Landing Page Integration
- [ ] Update `Hero.tsx` to include JourneyProgress component
- [ ] Make BizMap AI the primary CTA in Hero
- [ ] Add journey context to landing page messaging
- [ ] Update `Index.tsx` to position journey prominently

### Dashboard Integration
- [ ] Add JourneyProgress to PersonalizedDashboard (compact mode)
- [ ] Create NextStepCard component
- [ ] Add contextual recommendations based on current step
- [ ] Link dashboard activities to journey progress

### Progress Tracking
- [ ] Create database migration for journey_progress column
- [ ] Implement progress detection for Step 1 (BizMap completion)
- [ ] Implement progress detection for Step 2 (Community/Insighta)
- [ ] Implement progress detection for Step 3 (Dashboard engagement)
- [ ] Implement progress detection for Step 4 (Funding exploration)
- [ ] Add localStorage fallback for anonymous users

### BizMap AI Enhancement
- [ ] Add journey step indicator to Dream2Plan page
- [ ] Mark Step 1 complete on plan generation
- [ ] Add "Continue to Step 2" flow after completion
- [ ] Show journey progress in BizMap interface

### Polish & Testing
- [ ] Add hover animations to progress cards
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test anonymous user journey tracking
- [ ] Test authenticated user journey sync
- [ ] Add journey completion celebration
- [ ] Test all step completion triggers

---

## Success Metrics

### User Activation
- % of visitors who start Step 1 (BizMap AI)
- % of visitors who complete Step 1
- % of users who progress to Step 2

### Engagement
- Time to first action (clicking Step 1)
- Journey completion rate (% who complete all 4 steps)
- Return rate after starting journey

### Clarity
- Reduced bounce rate on landing page
- Increased click-through to BizMap AI
- Reduced support tickets asking "where do I start?"

---

## Technical Considerations

### Performance
- Lazy load JourneyProgress component if below fold
- Cache journey progress in localStorage to avoid repeated queries
- Optimize database queries for progress checks

### Accessibility
- Ensure progress cards are keyboard navigable
- Add ARIA labels for screen readers
- Ensure color contrast meets WCAG standards
- Add focus states for all interactive elements

### Analytics
- Track journey step clicks
- Track step completions
- Track journey abandonment points
- Track time spent on each step

---

## Future Enhancements (Out of Scope)

- Personalized journey paths based on user type
- Journey milestones and rewards
- Journey sharing/social proof
- Advanced progress analytics dashboard
- Journey templates for different business types

