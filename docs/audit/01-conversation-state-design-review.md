# Conversation State Design Review

## Executive Summary

This document reviews BizMap's conversation state architecture, identifying critical gaps in state persistence, summarization, and lifecycle management that contribute to poor context retention.

## Current Architecture

### Storage Schema

#### 1. `chatbot_conversations` Table
**Location**: `supabase/migrations/20250929161957_a6c92ee7-a659-4449-8caa-09747a5077fe.sql`

**Schema**:
```sql
CREATE TABLE public.chatbot_conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  business_context JSONB DEFAULT '{}',
  conversation_stage TEXT DEFAULT 'welcome',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Issues Identified**:
- ❌ No `chat_mode` field in schema (but code references it)
- ❌ `business_context` is a flat JSONB with no versioning
- ❌ No explicit state versioning or migration support
- ❌ `conversation_stage` is a simple string with no enum constraints
- ❌ No TTL or archival policy

#### 2. `chatbot_messages` Table
**Schema**:
```sql
CREATE TABLE public.chatbot_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ
)
```

**Issues Identified**:
- ❌ No message ordering index (relies on `created_at` only)
- ❌ No message type classification (wizard step, freeform, etc.)
- ❌ Metadata is unstructured - no schema validation
- ❌ No message importance scoring
- ❌ No relationship to wizard steps or business context updates

#### 3. `project_memory` Table
**Location**: `supabase/migrations/20251016004748_ba013cde-4094-4d3b-a15b-0c71a0ac8bc5.sql`

**Schema**:
```sql
CREATE TABLE public.project_memory (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES chat_sessions(id),
  conversation_id UUID REFERENCES chatbot_conversations(id),
  kind TEXT CHECK (kind IN ('short_term', 'long_term')),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Issues Identified**:
- ⚠️ `project_id` references `chat_sessions` but conversations use `session_id` (inconsistency)
- ❌ No automatic archival triggers
- ❌ No similarity threshold for retrieval
- ❌ No metadata schema for structured entity tracking

### Frontend State Management

#### `useChatbot.ts` State Structure
**Location**: `src/hooks/useChatbot.ts` (lines 85-98, 343-359)

**State Components**:
```typescript
interface ConversationState {
  context: ConversationContext;           // Enum: WELCOME, DISCOVERY, etc.
  businessContext: BusinessContext;        // {industry, businessType, stage, location, budget, goals}
  currentTopic?: string;
  sessionDuration: number;
  messageCount: number;
  userSatisfaction?: number;
  conversationFlow?: ConversationFlow;
  errorCount: number;
  lastError?: string;
  retryCount: number;
  isProcessing: boolean;
  conversationMemory: ConversationMemory;   // {userPreferences, previousTopics, importantDetails, userGoals, painPoints}
}
```

**Issues Identified**:
- ❌ State is split between frontend (React state) and backend (database)
- ❌ No synchronization mechanism between frontend and backend state
- ❌ Mode-specific state stored separately (`messagesByMode`) but not persisted
- ❌ Business context extraction happens in backend but frontend maintains its own copy
- ❌ No conflict resolution for concurrent updates

### State Lifecycle Analysis

#### Creation
**Flow**:
1. User sends first message → `sessionId` generated (frontend)
2. Backend checks `chatbot_conversations` by `session_id`
3. If not found, creates new conversation with `business_context: {}`
4. Frontend initializes `ConversationState` with defaults

**Issues**:
- ❌ No atomic transaction - race conditions possible
- ❌ Initial `business_context` is empty, extracted later
- ❌ No validation of `session_id` format or uniqueness

#### Update
**Flow**:
1. User message triggers backend processing
2. Business context extracted via `extractBusinessContext()` (not found in current codebase)
3. `chatbot_conversations.business_context` updated
4. Frontend state updated via reducer

**Issues**:
- ❌ Business context extraction logic not found - may be missing
- ❌ Updates are not transactional - partial updates possible
- ❌ No versioning - can't rollback or track changes
- ❌ Frontend and backend can desync

#### Summarization
**Location**: `supabase/functions/memory-manager/index.ts` (lines 174-279)

**Current Implementation**:
- Manual/on-demand summarization via `handleSummarize()`
- Triggered by calling memory-manager with `action=summarize`
- Summarizes conversations older than 7 days (default)
- Uses GPT-4o-mini to create 500-token summaries
- Stores as `long_term` memory, archives `short_term` memories

**Issues**:
- ❌ **CRITICAL**: No automatic summarization - only manual
- ❌ No scheduled job or trigger for summarization
- ❌ Summarization only happens if explicitly called
- ❌ No incremental summarization (only full conversation)
- ❌ No summarization quality validation
- ❌ 7-day threshold may be too long for active conversations

#### Archival & Deletion
**Current Implementation**:
- `archive_old_memories()` function exists but not called automatically
- No automatic deletion policy
- Messages stored indefinitely
- Only `project_memory` has archival flag (`is_archived`)

**Issues**:
- ❌ **CRITICAL**: No automatic archival
- ❌ No TTL for old conversations
- ❌ No cleanup jobs
- ❌ Database will grow unbounded
- ❌ No retention policy

### State Synchronization Issues

#### Frontend-Backend Sync
**Problems**:
1. Frontend maintains `conversationState` in React state
2. Backend maintains `business_context` in database
3. No real-time sync mechanism
4. State can diverge if:
   - User has multiple tabs open
   - Network issues cause failed updates
   - Backend updates but frontend doesn't refresh

#### Mode-Specific State
**Location**: `src/hooks/useChatbot.ts` (lines 320-330)

**Implementation**:
```typescript
const [messagesByMode, setMessagesByMode] = useState<{
  'wizard': ChatMessage[];
  'freeform': ChatMessage[];
  'tour-guide': ChatMessage[];
  'bizmap-structured': ChatMessage[];
}>({...});
```

**Issues**:
- ❌ Mode-specific messages stored only in frontend
- ❌ Not persisted to database
- ❌ Lost on page refresh
- ❌ No way to resume conversation in different mode

### Business Context Extraction

**Current Status**: 
- Code references `extractBusinessContext()` function but implementation not found
- Business context manually set in some places
- No structured extraction pipeline

**Issues**:
- ❌ **CRITICAL**: Business context extraction may be missing or incomplete
- ❌ No entity recognition (business name, industry, etc.)
- ❌ No validation of extracted context
- ❌ No confidence scoring for extracted entities

## Key Findings

### Critical Issues

1. **No Automatic Summarization**
   - Impact: Context window fills up, older messages lost
   - Severity: HIGH
   - Affects: All long conversations

2. **No State Synchronization**
   - Impact: Frontend and backend state can diverge
   - Severity: HIGH
   - Affects: Multi-tab usage, network issues

3. **Missing Business Context Extraction**
   - Impact: Business context may not be properly extracted/updated
   - Severity: HIGH
   - Affects: Context-aware responses

4. **No Automatic Archival**
   - Impact: Database growth, performance degradation
   - Severity: MEDIUM
   - Affects: Long-term scalability

5. **Mode-Specific State Not Persisted**
   - Impact: Can't resume conversations in different modes
   - Severity: MEDIUM
   - Affects: User experience

### Moderate Issues

6. **No State Versioning**
   - Impact: Can't rollback or track changes
   - Severity: MEDIUM

7. **Unstructured Metadata**
   - Impact: Hard to query or analyze
   - Severity: LOW

8. **No Message Importance Scoring**
   - Impact: Can't prioritize which messages to keep
   - Severity: LOW

## Recommendations

### Immediate Actions (Week 1)

1. **Implement Automatic Summarization**
   - Add scheduled job (cron) to call `memory-manager` summarize endpoint
   - Trigger when conversation has >20 messages or >7 days old
   - Store summaries as `long_term` memory

2. **Fix Business Context Extraction**
   - Implement or locate `extractBusinessContext()` function
   - Add entity recognition for business name, industry, stage
   - Validate extracted context before storing

3. **Add State Synchronization**
   - Implement periodic sync between frontend and backend
   - Add conflict resolution strategy
   - Use optimistic updates with rollback

### Short-term Improvements (Weeks 2-4)

4. **Persist Mode-Specific State**
   - Add `chat_mode` to `chatbot_messages` table
   - Store mode-specific messages in database
   - Enable mode switching with history

5. **Implement Automatic Archival**
   - Add scheduled job to archive old conversations
   - Archive conversations >30 days old
   - Keep summaries, archive full messages

6. **Add State Versioning**
   - Add `version` field to `chatbot_conversations`
   - Track state changes in audit log
   - Enable rollback capability

### Long-term Enhancements (Months 2-3)

7. **Structured Entity Tracking**
   - Create `conversation_entities` table
   - Track business name, industry, key decisions
   - Use for context retrieval and summarization

8. **Message Importance Scoring**
   - Add importance score to messages
   - Prioritize important messages in context window
   - Use for summarization weighting

9. **Real-time State Sync**
   - Implement WebSocket or Server-Sent Events
   - Sync state changes in real-time
   - Handle conflicts gracefully

## Architecture Diagram

```
┌─────────────────┐
│  Frontend State │
│  (React Hook)    │
│                 │
│ - conversationState│
│ - messagesByMode │
│ - businessContext│
└────────┬─────────┘
         │
         │ HTTP Request
         │
         ▼
┌─────────────────┐
│  Backend API    │
│  (Edge Function)│
│                 │
│ - Extract Context│
│ - Route Intent  │
│ - Generate Response│
└────────┬─────────┘
         │
         │
         ▼
┌─────────────────┐
│   Database      │
│                 │
│ - conversations │
│ - messages      │
│ - project_memory │
└─────────────────┘
         │
         │ (Manual/On-demand)
         ▼
┌─────────────────┐
│ Memory Manager  │
│                 │
│ - Summarize     │
│ - Archive       │
│ - Retrieve      │
└─────────────────┘
```

**Issues in Current Flow**:
- ❌ No automatic summarization trigger
- ❌ No state sync mechanism
- ❌ Business context extraction unclear
- ❌ Mode-specific state not persisted

## Success Metrics

To measure improvement in state management:

1. **Context Retention Rate**: % of referenced information correctly recalled after 10+ messages
2. **State Sync Accuracy**: % of state updates successfully synced between frontend/backend
3. **Summarization Coverage**: % of conversations >20 messages that are summarized
4. **Business Context Accuracy**: % of extracted business context that is correct
5. **Mode Switch Success**: % of mode switches that preserve conversation history

## Next Steps

1. Review this document with engineering team
2. Prioritize critical issues
3. Create implementation tickets
4. Set up monitoring for state management metrics
5. Implement fixes in priority order
