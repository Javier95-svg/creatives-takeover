# Phase 1: Enhanced Business Context & Progress Tracking

## Overview

Phase 1 transforms BizMap AI from a reactive chatbot into a proactive AI Co-Founder by implementing deep business context understanding and comprehensive progress tracking.

## What's New in Phase 1

### 🎯 Core Capabilities

1. **Deep Founder Profiling**
   - Persistent founder profiles with skill gaps, resources, and preferences
   - Risk tolerance and decision-making style tracking
   - Communication preferences (tone, detail level, pace)
   - Profile completeness scoring with auto-calculation

2. **Progress Tracking System**
   - Milestone management with quality scoring
   - 30-day business planning timeline tracking
   - Blocker identification and resolution tracking
   - Real-time progress metrics and velocity calculation

3. **Enhanced Business Context**
   - Aggregated user context from multiple sources
   - Market intelligence caching and retrieval
   - Decision history tracking
   - Conversation memory system

4. **Proactive Guidance**
   - Context-aware recommendations
   - Next-step suggestions based on progress
   - Blocker alerts and resolution guidance
   - Profile completion prompts

## Architecture

### Database Schema

#### New Tables

1. **`founder_profiles`** - Persistent founder information
   ```sql
   - Founder skills, experience, and preferences
   - Risk tolerance and decision-making style
   - Resource availability (time, budget, network)
   - Auto-calculated profile completeness
   ```

2. **`progress_milestones`** - Business planning milestones
   ```sql
   - 7 milestone types (business_concept, target_customer, etc.)
   - Status tracking (not_started, in_progress, completed, blocked)
   - Quality scoring and completion percentage
   - Target day in 30-day plan
   ```

3. **`progress_blockers`** - Issues preventing progress
   ```sql
   - 7 blocker types (knowledge_gap, resource_constraint, etc.)
   - Severity levels (low, medium, high, critical)
   - Resolution tracking with notes
   - Suggested actions
   ```

4. **`market_intelligence_cache`** - Market research data
   ```sql
   - Industry-specific intelligence
   - Growth rates, competition, trends
   - Opportunity scoring and benchmarks
   - Cached with 7-day expiration
   ```

#### Enhanced Tables

- **`chatbot_conversations`** - Added columns:
  - `chat_mode` - Current mode (wizard, freeform, etc.)
  - `founder_profile` - JSONB snapshot of profile
  - `market_dynamics` - JSONB market data
  - `progress_metrics` - JSONB progress state
  - `decision_history` - JSONB decision records
  - `conversation_memory` - JSONB memory state

### Database Functions

```sql
calculate_founder_profile_completeness(profile_id) -> INTEGER
calculate_progress_velocity(user_uuid, days) -> NUMERIC
get_active_blockers_count(user_uuid) -> INTEGER
get_current_plan_day(user_uuid) -> INTEGER
```

### TypeScript Architecture

#### Type System ([src/types/aiCofounder.ts](src/types/aiCofounder.ts))

- **Profile Types**: `FounderProfile`, `RiskTolerance`, `DecisionMakingStyle`
- **Progress Types**: `ProgressMilestone`, `ProgressBlocker`, `ProgressMetrics`
- **Market Types**: `MarketIntelligence`, `CompetitionIntensity`
- **Context Types**: `EnhancedBusinessContext`, `AggregatedUserContext`

#### Services

##### BusinessContextService ([src/services/businessContextService.ts](src/services/businessContextService.ts))

Main service for context aggregation and management:

```typescript
// Get complete aggregated context
getAggregatedContext(userId): Promise<AggregatedUserContext>

// Profile management
getFounderProfile(userId)
createFounderProfile(userId, data)
updateFounderProfile(userId, updates)

// Progress tracking
getMilestones(userId)
getActiveBlockers(userId)
getMarketIntelligence(userId)

// Context enrichment
enrichBusinessContext(baseContext, aggregatedContext)
formatContextForAI(context): string
```

#### React Hooks

##### useFounderProfile ([src/hooks/useFounderProfile.ts](src/hooks/useFounderProfile.ts))

```typescript
const {
  profile,              // Current founder profile
  hasProfile,           // Boolean if profile exists
  createProfile,        // Create new profile
  updateProfile,        // Update existing profile
  getOrCreateProfile,   // Get or create if missing
  isLoading,
  isCreating,
  isUpdating
} = useFounderProfile();

// Completeness tracking
const {
  completeness,         // 0-100 score
  missingFields,        // Array of missing fields
  requiredFields,
  optionalFields
} = useProfileCompleteness();

// Profile-based recommendations
const {
  recommendations       // Array of suggestions
} = useProfileRecommendations();
```

##### useProgressTracker ([src/hooks/useProgressTracker.ts](src/hooks/useProgressTracker.ts))

```typescript
// Milestone management
const {
  milestones,           // All milestones
  createMilestone,      // Create new milestone
  updateMilestone,      // Update milestone
  startMilestone,       // Mark as in_progress
  completeMilestone,    // Mark as completed
  deleteMilestone,
  isLoading
} = useProgressMilestones(userId);

// Blocker management
const {
  blockers,             // Active blockers
  createBlocker,        // Create new blocker
  resolveBlocker,       // Mark as resolved
  updateBlockerStatus,  // Update status
  deleteBlocker,
  isLoading
} = useProgressBlockers(userId);

// Progress metrics
const {
  metrics,              // ProgressMetrics object
  isLoading
} = useProgressMetrics(userId);

// Derived insights
const {
  criticalBlockers,
  activeMilestones,
  completedMilestones,
  nextMilestone,
  progressPercentage,
  isOnTrack,
  daysRemaining,
  recommendations
} = useProgressInsights(userId);
```

##### useEnhancedContext ([src/hooks/useEnhancedContext.ts](src/hooks/useEnhancedContext.ts))

```typescript
// Aggregated context
const {
  context,              // Complete AggregatedUserContext
  isLoading,
  refetch,
  userId
} = useAggregatedContext();

// Formatted for AI
const {
  formattedContext,     // String formatted for system prompt
  context,
  isLoading
} = useContextForAI();

// Context health check
const {
  isHealthy,            // Boolean
  warnings,             // Array of warnings
  criticalIssues,       // Array of critical issues
  recommendations       // Array of recommendations
} = useContextHealth();

// Proactive suggestions
const {
  suggestions           // Array of actionable suggestions
} = useProactiveSuggestions();
```

## Integration Guide

### Step 1: Run Database Migration

```bash
# Apply the migration
supabase db push

# Or if using migrations folder
supabase migration up
```

### Step 2: Update Chatbot to Use Enhanced Context

```typescript
import { useAggregatedContext, useContextForAI } from '@/hooks/useEnhancedContext';
import { useProgressInsights } from '@/hooks/useProgressTracker';

function YourChatComponent() {
  // Get enhanced context
  const { context, isLoading } = useAggregatedContext();
  const { formattedContext } = useContextForAI();
  const insights = useProgressInsights(userId);

  // Include in system prompt
  const systemPrompt = `
    You are an AI Co-Founder helping this founder build their business.

    ${formattedContext}

    Based on this context, provide personalized, proactive guidance.
  `;

  // Show proactive suggestions in UI
  if (insights.recommendations.length > 0) {
    return (
      <div>
        <h3>Recommendations</h3>
        {insights.recommendations.map(rec => (
          <div key={rec}>{rec}</div>
        ))}
      </div>
    );
  }
}
```

### Step 3: Implement Founder Profile Onboarding

```typescript
import { useFounderProfile, useProfileCompleteness } from '@/hooks/useFounderProfile';

function ProfileOnboarding() {
  const { profile, createProfile, updateProfile } = useFounderProfile();
  const { completeness, missingFields } = useProfileCompleteness();

  const handleSubmit = async (data) => {
    if (!profile) {
      await createProfile(data);
    } else {
      await updateProfile(data);
    }
  };

  return (
    <div>
      <h2>Founder Profile ({completeness}% complete)</h2>
      <ProfileForm
        initialData={profile}
        missingFields={missingFields}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

### Step 4: Add Progress Tracking UI

```typescript
import { useProgressMilestones, useProgressBlockers } from '@/hooks/useProgressTracker';

function ProgressDashboard() {
  const { milestones, completeMilestone } = useProgressMilestones(userId);
  const { blockers, resolveBlocker } = useProgressBlockers(userId);

  return (
    <div>
      <MilestoneList
        milestones={milestones}
        onComplete={(id, score) => completeMilestone(id, score)}
      />
      <BlockerList
        blockers={blockers}
        onResolve={(id, notes) => resolveBlocker({ blockerId: id, resolution: { status: 'resolved', resolution_notes: notes }})}
      />
    </div>
  );
}
```

## Data Flow

```
User Interaction
    ↓
Frontend Hooks (useFounderProfile, useProgressTracker, etc.)
    ↓
BusinessContextService
    ↓
Supabase Client (with RLS)
    ↓
PostgreSQL Database (Tables + Functions)
    ↓
Aggregated Context
    ↓
AI System Prompt (formatContextForAI)
    ↓
Enhanced AI Responses
```

## Key Features & Benefits

### For Founders

✅ **Personalized Guidance** - AI adapts to your experience level, risk tolerance, and goals
✅ **Progress Visibility** - Clear view of where you are in the 30-day plan
✅ **Blocker Resolution** - Identify and resolve issues preventing progress
✅ **Proactive Support** - AI suggests next steps before you ask
✅ **Quality Tracking** - Monitor the quality of your business plan components

### For the AI System

✅ **Deep Context** - Rich understanding of founder's situation
✅ **Historical Data** - Decision history and patterns
✅ **Progress Awareness** - Know what's been completed and what's next
✅ **Adaptive Responses** - Tailor communication style and detail level
✅ **Proactive Capability** - Suggest actions based on context, not just queries

## Performance Considerations

### Caching Strategy

- **Founder Profile**: Cached in React Query, stale time 1 minute
- **Progress Metrics**: Refetched every 30 seconds
- **Aggregated Context**: Cached for 1 minute, background refetch every 2 minutes
- **Market Intelligence**: Database-level caching with 7-day TTL

### Database Optimization

- Indexes on all foreign keys
- Composite indexes for common queries
- Row Level Security (RLS) for data isolation
- Database functions for complex calculations

### Query Optimization

```typescript
// ✅ GOOD: Fetch all data in parallel
const [profile, milestones, blockers] = await Promise.all([
  getFounderProfile(userId),
  getMilestones(userId),
  getActiveBlockers(userId),
]);

// ❌ BAD: Sequential fetches
const profile = await getFounderProfile(userId);
const milestones = await getMilestones(userId);
const blockers = await getActiveBlockers(userId);
```

## Testing Phase 1

### Manual Testing Checklist

- [ ] Create founder profile
- [ ] Update founder profile fields
- [ ] Verify profile completeness calculation
- [ ] Create milestones for all 7 types
- [ ] Update milestone status (start, complete, block)
- [ ] Create blockers with different severity levels
- [ ] Resolve blockers
- [ ] Check progress metrics calculation
- [ ] Verify current plan day calculation
- [ ] Test velocity calculation
- [ ] Verify context aggregation
- [ ] Test formatted context for AI
- [ ] Check proactive suggestions
- [ ] Verify context health checks

### Integration Testing

```typescript
// Test context aggregation
const context = await BusinessContextService.getAggregatedContext(userId);
expect(context.success).toBe(true);
expect(context.data?.founderProfile).toBeDefined();
expect(context.data?.progressMetrics).toBeDefined();

// Test progress tracking
const milestone = await createMilestone({
  milestone_type: 'business_concept',
  milestone_name: 'Define Problem',
});
expect(milestone).toBeDefined();

// Test blocker creation
const blocker = await createBlocker({
  blocker_type: 'knowledge_gap',
  blocker_title: 'Need market research',
  blocker_description: 'Don\'t know how to conduct market research',
  severity: 'high',
});
expect(blocker).toBeDefined();
```

## Troubleshooting

### Common Issues

**Issue: Profile completeness not updating**
- Check if trigger is properly installed: `trigger_update_founder_profile_completeness`
- Verify the calculation function exists: `calculate_founder_profile_completeness`

**Issue: Progress metrics not calculating**
- Ensure database functions are created: `get_current_plan_day`, `calculate_progress_velocity`
- Check that milestones have proper `created_at` timestamps

**Issue: Context not refreshing**
- Invalidate React Query cache: `queryClient.invalidateQueries(['aggregated-context'])`
- Check staleTime and refetchInterval settings

**Issue: RLS blocking queries**
- Verify user is authenticated
- Check RLS policies allow the operation
- Ensure user_id matches auth.uid()

## Next Steps (Phase 2)

Phase 1 provides the foundation. Phase 2 will add:

- 🎯 Proactive Guidance Orchestrator
- 🤔 Strategic Decision Support Framework
- 💡 Adaptive Conversation Orchestrator
- 📊 Real-Time Market Intelligence
- 🎓 Learning & Iteration Engine
- 🚀 Execution & Accountability System

## Support & Documentation

- **Type Definitions**: [src/types/aiCofounder.ts](src/types/aiCofounder.ts)
- **Service Layer**: [src/services/businessContextService.ts](src/services/businessContextService.ts)
- **React Hooks**: [src/hooks/](src/hooks/)
- **Database Schema**: [supabase/migrations/20251226000000_phase1_enhanced_context_tracking.sql](supabase/migrations/20251226000000_phase1_enhanced_context_tracking.sql)

## Questions?

For questions or issues with Phase 1 implementation, check:
1. This documentation
2. Inline code comments
3. TypeScript type definitions
4. Database migration file

---

**Phase 1 Status**: ✅ Complete and Ready for Integration
**Next Phase**: Phase 2 - Proactive Guidance Orchestrator
