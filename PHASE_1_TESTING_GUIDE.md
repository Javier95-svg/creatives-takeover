# Phase 1 Testing Guide

## How to Test Phase 1 Features

### Step 1: Apply the Database Migration

You need to run the migration first to create the new tables. Choose one option:

#### Option A: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard at https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the entire contents of `supabase/migrations/20251226000000_phase1_enhanced_context_tracking.sql`
5. Paste and run it
6. You should see: "Phase 1 Enhanced Context & Progress Tracking migration completed successfully"

#### Option B: Using Supabase CLI

```bash
cd creatives-takeover-19

# Link your project (first time only)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
npx supabase db push
```

### Step 2: Verify Tables Were Created

1. Go to **Database → Tables** in Supabase Dashboard
2. You should see these NEW tables:
   - ✅ `founder_profiles`
   - ✅ `progress_milestones`
   - ✅ `progress_blockers`
   - ✅ `market_intelligence_cache`

3. Check `chatbot_conversations` table
   - It should have 6 NEW columns:
     - `chat_mode`
     - `founder_profile`
     - `market_dynamics`
     - `progress_metrics`
     - `decision_history`
     - `conversation_memory`

### Step 3: Start Your Development Server

```bash
npm run dev
```

### Step 4: Access the Test Page

1. Open your browser
2. Go to: **http://localhost:5173/test-phase1** (or your dev port)
3. **Sign in** if you're not already logged in

### Step 5: Run the Tests

Once on the test page, you'll see:

#### 🧪 Interactive Testing Interface

**Profile Tab:**
- Click "Create Profile" to create a founder profile
- Click "Update Profile" to add more data
- See profile completeness percentage update automatically

**Progress Tab:**
- Click "Create Milestone" to add a business planning milestone
- Click "Complete First" to mark it as done with a quality score
- Click "Create Blocker" to add an issue/blocker
- Click "Resolve First" to mark a blocker as resolved
- View real-time progress metrics (velocity, quality score, on-track status)

**Context Tab:**
- Click "Test Context Aggregation" to verify all data is combined correctly
- Click "Test Formatted Context" to see how it's sent to the AI
- Open browser console (F12) to see detailed output

**Tests Tab:**
- Shows results of all tests
- Green ✅ for success
- Red ❌ for errors

**Suggestions Tab:**
- See AI-generated proactive suggestions
- Based on your profile, progress, and blockers

#### 🚀 Quick Test Button

Click **"Run All Tests"** at the top to automatically:
1. Create a founder profile
2. Update the profile
3. Create a milestone
4. Create a blocker
5. Test context aggregation
6. Test formatted context
7. Show results

### Step 6: Check the Browser Console

Press **F12** to open Developer Tools, then:

1. Go to the **Console** tab
2. After running tests, you'll see:
   - `Aggregated Context:` - Full context object
   - `Formatted Context for AI:` - Text formatted for AI system prompts

### Step 7: Verify in Database

Go back to Supabase Dashboard → **Table Editor**:

1. Check `founder_profiles` - Should have your test profile
2. Check `progress_milestones` - Should have test milestones
3. Check `progress_blockers` - Should have test blockers
4. Check `chatbot_conversations` - New columns should have data

---

## Expected Results

### ✅ What Should Work

1. **Founder Profile Creation**
   - Profile saves to database
   - Completeness auto-calculates (should be ~50% for basic profile)
   - Updates work smoothly

2. **Milestone Management**
   - Milestones create with status "not_started"
   - Can mark as completed
   - Quality scores save correctly
   - Progress metrics update in real-time

3. **Blocker Tracking**
   - Blockers create with severity levels
   - Can resolve with notes
   - Active blocker count updates

4. **Progress Metrics**
   - Current day calculation works
   - Velocity calculates correctly
   - Quality score averages completed milestones
   - On-track status shows correctly

5. **Context Aggregation**
   - All data from different sources combines
   - No null/undefined errors
   - Context formatted properly for AI

6. **Proactive Suggestions**
   - Suggestions appear based on context
   - Priority levels work
   - Types categorize correctly

### ❌ Common Issues

**Issue: "Cannot read property of undefined"**
- Solution: Make sure migration ran successfully
- Check that all tables exist in database

**Issue: "RLS policy violation"**
- Solution: Make sure you're signed in
- RLS policies require authentication

**Issue: "Profile completeness is 0"**
- Solution: Fill in more profile fields
- Trigger updates automatically on save

**Issue: No suggestions appearing**
- Solution: Add more data (profile, milestones, blockers)
- Suggestions require minimum context

---

## Manual Testing Checklist

Use this to test each feature manually:

### Founder Profile
- [ ] Create profile with risk tolerance
- [ ] Update profile with skill gaps
- [ ] Add primary goals
- [ ] Verify completeness percentage updates
- [ ] Check missing fields list

### Progress Milestones
- [ ] Create milestone for "business_concept"
- [ ] Mark as "in_progress"
- [ ] Complete with quality score
- [ ] Verify dates update correctly
- [ ] Check milestone appears in database

### Blockers
- [ ] Create blocker with "knowledge_gap" type
- [ ] Set severity to "high"
- [ ] Resolve with notes
- [ ] Verify resolved_at timestamp
- [ ] Check active blocker count decreases

### Progress Metrics
- [ ] Verify current day calculates
- [ ] Check velocity after completing milestone
- [ ] Verify quality score averages
- [ ] Confirm on-track status accurate

### Context Aggregation
- [ ] All founder profile data included
- [ ] Milestones array populated
- [ ] Blockers array populated
- [ ] Insights object complete
- [ ] No errors in console

### Proactive Suggestions
- [ ] Suggestions generate from context
- [ ] Priority levels appropriate
- [ ] Descriptions clear and actionable
- [ ] Types categorize correctly

---

## Next Steps After Testing

Once Phase 1 is tested and working:

1. **Integrate into Chatbot** - Use formatted context in AI prompts
2. **Add UI Components** - Build profile forms, progress dashboard
3. **Enable Auto-Detection** - Auto-create milestones/blockers from conversation
4. **Add Notifications** - Alert users about blockers and suggestions
5. **Plan Phase 2** - Implement Proactive Guidance Orchestrator

---

## Need Help?

- Check [PHASE_1_IMPLEMENTATION.md](./PHASE_1_IMPLEMENTATION.md) for technical details
- See [INTEGRATION_EXAMPLE.md](./INTEGRATION_EXAMPLE.md) for code examples
- Review database migration file for schema details
- Check browser console for error messages
