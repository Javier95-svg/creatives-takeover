# Account Page Enhancement - Testing Guide

## Overview
This document provides comprehensive testing procedures for the enhanced Account page with onboarding functionality.

---

## Prerequisites

### 1. Database Migration
Before testing, ensure the database migration has been applied:

```sql
-- Run in Supabase SQL Editor
-- File: supabase/migrations/20260101_add_onboarding_columns.sql
```

**Verify Migration Success:**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('onboarding_completed', 'first_login_at');
```

Expected result: 2 rows showing both columns exist.

### 2. Required Dependencies
Ensure `canvas-confetti` is installed:
```bash
npm install canvas-confetti
npm install --save-dev @types/canvas-confetti
```

---

## Test Scenarios

## Phase 1: Visual Design Tests

### Test 1.1: Account Wallpaper Animation
**Steps:**
1. Navigate to `/account`
2. Observe background

**Expected Results:**
- ✅ Three gradient orbs visible (blue, purple, cyan)
- ✅ Orbs animate smoothly (floating effect)
- ✅ Subtle grid overlay visible
- ✅ Radial vignette from center
- ✅ Smooth fade-in on page load (1s duration)

**Browser Testing:**
- Chrome ✓
- Firefox ✓
- Safari ✓
- Edge ✓

---

### Test 1.2: Centered Hero Section
**Steps:**
1. Navigate to `/account`
2. Check heading alignment
3. Test on different screen sizes

**Expected Results:**
- ✅ "My Account" perfectly centered horizontally
- ✅ Gradient text effect (white → blue → purple)
- ✅ Description text centered below heading
- ✅ Responsive font sizes:
  - Mobile: 2.5rem (40px)
  - Tablet: 3rem (48px)
  - Desktop: 3.75rem (60px)

**Responsive Testing:**
- Mobile (320px-640px) ✓
- Tablet (640px-1024px) ✓
- Desktop (1024px+) ✓

---

### Test 1.3: Glass-Morphism Cards
**Steps:**
1. Navigate to `/account`
2. Hover over each card
3. Check visual effects

**Expected Results:**
- ✅ Backdrop blur effect on all cards
- ✅ Semi-transparent background (80% opacity)
- ✅ Border color shifts to primary on hover
- ✅ Shadow glow appears on hover (300ms transition)
- ✅ Smooth transitions for all effects

**Cards to Test:**
- [ ] Profile Picture card
- [ ] Personal Information card
- [ ] Social Media Links card
- [ ] Save Button card
- [ ] Social Stats card
- [ ] Account Information card

---

### Test 1.4: Profile Completion Tracker
**Steps:**
1. Create account with minimal data
2. Navigate to `/account`
3. Add profile data incrementally

**Expected Results:**
- ✅ Progress bar animates smoothly
- ✅ Percentage updates in real-time
- ✅ Green checkmarks appear for completed items
- ✅ Tracker hides when 100% complete
- ✅ Items tracked:
  - Full Name (25%)
  - Profile Picture (25%)
  - Bio (25%)
  - Social Link (25%)

**Test Cases:**
- [ ] 0% complete → All items show circle icon
- [ ] 25% complete → One checkmark
- [ ] 50% complete → Two checkmarks
- [ ] 75% complete → Three checkmarks
- [ ] 100% complete → Tracker disappears

---

## Phase 2: Onboarding Flow Tests

### Test 2.1: New User Sign-Up Flow
**Steps:**
1. Create new account (fresh email)
2. Complete sign-up form
3. Observe redirect behavior

**Expected Results:**
- ✅ User signs up successfully
- ✅ Auto-redirect to `/account` after 1.5 seconds
- ✅ OnboardingChecklist appears
- ✅ Shows "Welcome to Creatives Takeover! 🎉"
- ✅ Progress shows 0/5 or X/5 depending on signup data

**Database Verification:**
```sql
SELECT id, email, onboarding_completed, first_login_at
FROM profiles
WHERE email = 'test@example.com';
```
Expected: `onboarding_completed = false`, `first_login_at` populated

---

### Test 2.2: Onboarding Checklist Functionality
**Steps:**
1. Login as new user (onboarding incomplete)
2. Navigate to `/account`
3. Complete each checklist item

**Expected Results:**
- ✅ Checklist visible with 5 items
- ✅ Progress indicator shows X/5
- ✅ Items update in real-time:
  - Upload photo → Check turns green
  - Add name → Check turns green
  - Write bio → Check turns green
  - Add social link → Check turns green
  - Click "Explore Dashboard" → Check turns green

**Visual Elements:**
- ✅ Sparkles icon animates (pulse)
- ✅ Dismiss button (X) in top-right
- ✅ Gradient background with orbs
- ✅ Green checkmarks for completed items
- ✅ Gray circles for incomplete items

---

### Test 2.3: Confetti Celebration
**Steps:**
1. Complete 4/5 onboarding items
2. Complete the final item
3. Observe celebration

**Expected Results:**
- ✅ Confetti animation triggers
- ✅ Success toast: "🎉 Onboarding Complete! Welcome to Creatives Takeover!"
- ✅ Text appears: "✨ Congratulations! You're all set up! ✨"
- ✅ Text pulses/animates
- ✅ Checklist auto-hides after 3 seconds

**Database Verification:**
```sql
SELECT onboarding_completed
FROM profiles
WHERE id = 'user-id';
```
Expected: `onboarding_completed = true`

---

### Test 2.4: Dashboard Visit Tracking
**Steps:**
1. Start onboarding (4/5 complete)
2. Click "Explore Your Dashboard"
3. Navigate to `/dashboard`
4. Return to `/account`

**Expected Results:**
- ✅ Button redirects to `/dashboard`
- ✅ localStorage saves: `dashboard_visited_{userId} = 'true'`
- ✅ Dashboard visit item shows green checkmark
- ✅ Progress updates to 5/5
- ✅ Confetti triggers

**LocalStorage Verification:**
```javascript
localStorage.getItem('dashboard_visited_{userId}');
// Expected: 'true'
```

---

### Test 2.5: Dismiss Functionality
**Steps:**
1. Login as new user
2. OnboardingChecklist appears
3. Click X button (top-right)
4. Confirm dismissal

**Expected Results:**
- ✅ Checklist disappears immediately
- ✅ Toast: "You can always complete your profile later from Account settings"
- ✅ Database updated: `onboarding_completed = true`
- ✅ Checklist doesn't reappear on refresh
- ✅ ProfileCompletionTracker appears instead

---

### Test 2.6: Redirect Prevention (No Loops)
**Steps:**
1. Login as new user (onboarding incomplete)
2. Get redirected to `/account`
3. Manually navigate to `/dashboard`
4. Navigate back to another page

**Expected Results:**
- ✅ First redirect to `/account` happens
- ✅ SessionStorage sets: `onboarding_redirect_{userId} = 'true'`
- ✅ No additional redirects occur
- ✅ User can freely navigate site
- ✅ No infinite redirect loops

**SessionStorage Verification:**
```javascript
sessionStorage.getItem('onboarding_redirect_{userId}');
// Expected: 'true' after first redirect
```

---

### Test 2.7: Returning User Flow
**Steps:**
1. Login as existing user (`onboarding_completed = true`)
2. Observe behavior

**Expected Results:**
- ✅ No redirect to `/account` on login
- ✅ User lands on intended page (e.g., homepage)
- ✅ When visiting `/account`:
  - OnboardingChecklist does NOT appear
  - ProfileCompletionTracker appears (if <100%)
  - Normal account page layout

---

## Phase 3: Edge Cases & Error Handling

### Test 3.1: Database Connection Failure
**Steps:**
1. Simulate network error
2. Attempt to complete onboarding

**Expected Results:**
- ✅ Error logged to console
- ✅ User sees error toast
- ✅ Onboarding state preserved
- ✅ Can retry after connection restored

---

### Test 3.2: Partial Profile Data
**Steps:**
1. Create user with some fields populated
2. Check initial state

**Expected Results:**
- ✅ Progress shows accurate percentage
- ✅ Completed items show checkmarks
- ✅ Incomplete items show circles
- ✅ No errors in console

---

### Test 3.3: Concurrent Tab Behavior
**Steps:**
1. Open `/account` in two tabs
2. Complete onboarding in Tab 1
3. Check Tab 2

**Expected Results:**
- ✅ Tab 1 completes successfully
- ✅ Tab 2 state may be stale (acceptable)
- ✅ Refreshing Tab 2 shows updated state
- ✅ No database conflicts

---

### Test 3.4: Browser Back Button
**Steps:**
1. Get redirected to `/account`
2. Click browser back button
3. Try to navigate away

**Expected Results:**
- ✅ Can navigate back if onboarding dismissed
- ✅ Redirect only happens once (sessionStorage)
- ✅ No infinite redirect loop

---

## Phase 4: Performance Tests

### Test 4.1: Page Load Performance
**Metrics to Check:**
- Initial page load: < 2 seconds
- Time to Interactive (TTI): < 3 seconds
- Largest Contentful Paint (LCP): < 2.5 seconds

**Tools:**
- Chrome DevTools Lighthouse
- WebPageTest
- GTmetrix

---

### Test 4.2: Animation Performance
**Steps:**
1. Open `/account`
2. Check DevTools Performance tab
3. Monitor FPS during animations

**Expected Results:**
- ✅ Gradient orb animations: 60 FPS
- ✅ Card hover transitions: smooth
- ✅ Progress bar animation: smooth
- ✅ No layout shifts (CLS < 0.1)

---

## Accessibility Tests

### Test 5.1: Keyboard Navigation
**Steps:**
1. Navigate `/account` using only keyboard
2. Tab through all interactive elements

**Expected Results:**
- ✅ All buttons focusable
- ✅ Focus indicators visible
- ✅ Tab order logical
- ✅ Can dismiss modal with Escape key

---

### Test 5.2: Screen Reader Compatibility
**Tools:** NVDA, JAWS, VoiceOver

**Expected Results:**
- ✅ Heading announced correctly
- ✅ Checklist items readable
- ✅ Progress percentage announced
- ✅ Button labels descriptive
- ✅ Form labels associated correctly

---

### Test 5.3: Color Contrast
**Tools:** Chrome DevTools, WAVE

**Expected Results:**
- ✅ All text meets WCAG AA (4.5:1 for body, 3:1 for headings)
- ✅ Gradient text readable
- ✅ Button text high contrast
- ✅ Focus indicators visible

---

## Cross-Browser Compatibility

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)
- [ ] Samsung Internet
- [ ] Firefox Mobile

### Responsive Breakpoints
- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone 12)
- [ ] 390px (iPhone 14)
- [ ] 768px (iPad)
- [ ] 1024px (Desktop)
- [ ] 1440px (Large Desktop)

---

## Security Tests

### Test 6.1: Authentication Required
**Steps:**
1. Logout
2. Try to access `/account`

**Expected Results:**
- ✅ Access denied message
- ✅ No sensitive data exposed
- ✅ Redirect prompt or login suggestion

---

### Test 6.2: User Data Isolation
**Steps:**
1. Login as User A
2. Complete onboarding
3. Login as User B
4. Check state

**Expected Results:**
- ✅ User B sees their own onboarding state
- ✅ No data leakage between users
- ✅ Correct userId in all database queries

---

## Regression Tests

### Test 7.1: Existing Users Not Affected
**Steps:**
1. Login as user created before migration
2. Check behavior

**Expected Results:**
- ✅ No unexpected redirects
- ✅ `onboarding_completed` auto-set to true (migration)
- ✅ Normal account page functionality
- ✅ No broken features

---

### Test 7.2: Profile Update Still Works
**Steps:**
1. Update profile picture
2. Update bio
3. Update social links
4. Save changes

**Expected Results:**
- ✅ All updates save successfully
- ✅ No errors in console
- ✅ Changes persist after refresh
- ✅ Onboarding state unaffected

---

## Monitoring & Analytics

### Metrics to Track
1. **Onboarding Completion Rate**
   ```sql
   SELECT
     COUNT(CASE WHEN onboarding_completed = true THEN 1 END) * 100.0 / COUNT(*) as completion_rate
   FROM profiles
   WHERE first_login_at >= '2026-01-01';
   ```

2. **Average Time to Complete**
   ```sql
   SELECT AVG(EXTRACT(EPOCH FROM (updated_at - first_login_at)) / 60) as avg_minutes
   FROM profiles
   WHERE onboarding_completed = true
     AND first_login_at IS NOT NULL;
   ```

3. **Step Abandonment**
   - Track which step users abandon most
   - Monitor confetti trigger rate
   - Dashboard visit conversion

---

## Known Issues & Workarounds

### Issue 1: Confetti on Mobile
**Status:** Works but may lag on low-end devices
**Workaround:** Consider disabling on mobile or using lighter animation

### Issue 2: SessionStorage Cleared
**Status:** User might get redirected again
**Workaround:** Check database `onboarding_completed` as source of truth

---

## Test Checklist Summary

### Critical Tests (Must Pass)
- [ ] New user auto-redirect works
- [ ] Onboarding checklist appears
- [ ] Progress updates correctly
- [ ] Confetti triggers on completion
- [ ] Database updates correctly
- [ ] No redirect loops
- [ ] Existing users unaffected

### Important Tests (Should Pass)
- [ ] Gradient animations smooth
- [ ] Cards have glass effect
- [ ] Hero section centered
- [ ] Mobile responsive
- [ ] Dismiss functionality works
- [ ] Dashboard visit tracking works

### Nice to Have (Optional)
- [ ] Confetti on all devices
- [ ] 60 FPS animations
- [ ] Sub-2s page load
- [ ] Perfect accessibility score

---

## Rollback Procedure

If critical issues found:

1. **Disable Onboarding Redirect:**
   ```typescript
   // In AuthContext.tsx, comment out lines 203-240
   ```

2. **Hide OnboardingChecklist:**
   ```typescript
   // In Account.tsx, set: const [showOnboarding] = useState(false);
   ```

3. **Revert Database:**
   ```sql
   ALTER TABLE profiles DROP COLUMN onboarding_completed;
   ALTER TABLE profiles DROP COLUMN first_login_at;
   ```

---

## Success Criteria

Account page enhancement is considered successful when:
- ✅ 80%+ new users complete onboarding
- ✅ No increase in support tickets
- ✅ No performance degradation
- ✅ Lighthouse score > 90
- ✅ Zero critical bugs in production

---

## Contact for Issues

If you encounter issues during testing:
- Create GitHub issue with label `account-page`
- Include browser, OS, and reproduction steps
- Attach console errors and screenshots
