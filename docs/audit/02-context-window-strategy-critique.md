# Context Window Strategy Critique

## Executive Summary

This document analyzes BizMap's context window management strategy, identifying critical issues in token budgeting, summarization, and context selection that contribute to poor context retention and accuracy problems.

## Current Implementation Analysis

### Token Budgeting

#### Current Approach
**Location**: `supabase/functions/chatbot-streaming/index.ts` (lines 2377-2381)

```typescript
function estimateTokenCount(messages: ChatMessage[]): number {
  const totalChars = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
  return Math.ceil(totalChars / 4); // Rough estimate: 1 token ≈ 4 characters
}
```

**Issues Identified**:
- ❌ **CRITICAL**: Extremely inaccurate token counting
  - Actual ratio varies: 1 token ≈ 3-5 characters (English), 1-2 characters (non-English)
  - Doesn't account for special tokens (system prompts, formatting)
  - Doesn't account for model-specific tokenization differences
  - No validation against actual model tokenizers

- ❌ No per-model token limits enforced
  - Gemini 2.5 Flash: ~1M context window (but practical limit ~32K tokens)
  - DeepSeek Reasoner: ~64K context window
  - No checks to prevent exceeding limits

- ❌ System prompt size not included in budget
  - System prompts can be 2000-3000 tokens
  - Not subtracted from available context window
  - Can cause truncation of important messages

#### Token Budget Breakdown

**Current Budget Allocation** (estimated):
```
Total Context Window: ~32,000 tokens (Gemini 2.5 Flash practical limit)
├── System Prompt: ~2,500 tokens (not counted)
├── RAG Context: ~1,500 tokens (variable)
├── Market Data: ~500 tokens (variable)
├── Conversation History: ~27,500 tokens (unlimited)
└── User Message: ~200 tokens
```

**Problems**:
- No explicit budget allocation
- System prompt not counted
- No reserve for response generation
- History can grow unbounded

### History Optimization

#### Current Implementation
**Location**: `supabase/functions/chatbot-streaming/index.ts` (lines 2359-2375)

```typescript
function optimizeMessageHistory(history: ChatMessage[], businessContext: BusinessContext): ChatMessage[] {
  if (history.length <= 10) {
    return history; // No optimization needed
  }
  
  // Keep most recent 5 messages
  const recentMessages = history.slice(-5);
  
  // Summarize older messages if needed (for very long conversations)
  if (history.length > 15) {
    // For now, just keep recent messages - can add summarization later
    return recentMessages;
  }
  
  return history;
}
```

**Issues Identified**:
- ❌ **CRITICAL**: Only recency-based, no relevance scoring
  - Important early context (business name, industry) can be lost
  - No semantic search for relevant past messages
  - No entity tracking to preserve key information

- ❌ Hard-coded thresholds (10, 15 messages)
  - Not based on actual token counts
  - Doesn't account for message length variation
  - Ignores system prompt size

- ❌ Summarization "can add later" - not implemented
  - Comment says "can add summarization later" but it's been deferred
  - No fallback when history exceeds limits

- ❌ No consideration of business context importance
  - Business name, industry, key decisions not preserved
  - No priority scoring for messages

#### Context Selection Strategy

**Current Flow**:
1. Get conversation history from database
2. If >10 messages, keep last 5
3. If >15 messages, keep last 5 (discard rest)
4. No summarization of discarded messages
5. No retrieval of relevant past messages

**Problems**:
- ❌ **CRITICAL**: Important context lost after 5 messages
- ❌ No way to reference earlier conversation
- ❌ Business context established early can be forgotten
- ❌ Wizard step answers can be lost

### Summarization Strategy

#### Current Status
**Location**: `supabase/functions/memory-manager/index.ts` (lines 174-279)

**Implementation**:
- Manual/on-demand summarization only
- Summarizes conversations >7 days old
- Creates 500-token summaries using GPT-4o-mini
- Stores as `long_term` memory

**Issues**:
- ❌ **CRITICAL**: Not integrated into main conversation flow
- ❌ Only called manually, not automatically
- ❌ 7-day threshold too long for active conversations
- ❌ No incremental summarization (only full conversation)
- ❌ Summaries not used in context window (only for retrieval)

#### Summarization Quality

**Current Prompt**:
```
"Summarize the following business planning conversation into key insights, 
decisions, and action items. Focus on what matters for future context retrieval:"
```

**Issues**:
- ❌ No structured format for summaries
- ❌ No entity extraction (business name, industry, etc.)
- ❌ No validation of summary quality
- ❌ Fixed 500-token limit may be too short for complex conversations

### Recency vs Relevance Trade-off

#### Current Approach: 100% Recency
- Always keeps most recent N messages
- No relevance scoring
- No semantic search

**Problems**:
- ❌ **CRITICAL**: Loses important early context
- ❌ Can't answer "what did I say about my business name?"
- ❌ Can't reference earlier decisions
- ❌ Business context established early is forgotten

#### What Should Be Preserved

**High Priority** (Always keep):
1. Business name (if mentioned)
2. Industry
3. Business type
4. Current wizard step
5. Key decisions made

**Medium Priority** (Summarize if needed):
1. Previous wizard step answers
2. User preferences
3. Pain points identified
4. Goals mentioned

**Low Priority** (Can discard):
1. Greetings
2. Simple acknowledgments
3. Off-topic discussions

**Current System**: Treats all messages equally, only preserves recency

### Entity Tracking

#### Current Status
**Location**: `src/hooks/useChatbot.ts` (lines 109-118)

```typescript
interface ConversationMemory {
  userPreferences: Record<string, any>;
  previousTopics: string[];
  importantDetails: Record<string, string>;
  userGoals: string[];
  painPoints: string[];
  industryContext?: string;
  businessStage?: string;
  lastInteractionTime: Date;
}
```

**Issues**:
- ❌ **CRITICAL**: Entity tracking exists but not actively used
- ❌ `importantDetails` is unstructured (key-value pairs)
- ❌ No automatic entity extraction from messages
- ❌ Entities not preserved when messages are discarded
- ❌ No entity-based context retrieval

#### Missing Entity Types

Should track but don't:
- Business name
- Product/service name
- Target market specifics
- Pricing decisions
- Launch timeline
- Key metrics/goals
- Competitor names
- Partnership mentions

### System Prompt Size Management

#### Current System Prompts
**Location**: `supabase/functions/chatbot-streaming/index.ts` (lines 1095-1433)

**Size Analysis**:
- Tour-guide mode: ~150 tokens
- Wizard mode: ~2,000-2,500 tokens
- Freeform mode: ~2,500-3,000 tokens

**Issues**:
- ❌ System prompts are very large (especially freeform)
- ❌ Not counted in token budget
- ❌ Can cause truncation of conversation history
- ❌ No optimization or compression

**System Prompt Components**:
1. Role definition: ~50 tokens
2. Business context: ~100-200 tokens
3. Mode-specific instructions: ~500-800 tokens
4. Format requirements: ~800-1,200 tokens
5. Examples: ~500-1,000 tokens
6. Hallucination prevention: ~200-300 tokens

**Optimization Opportunities**:
- Compress examples
- Remove redundant instructions
- Use shorter format descriptions
- Dynamic prompt building based on context

### Context Window Utilization

#### Typical Conversation Flow

**Message 1-5** (Wizard Step 1):
- System prompt: ~2,500 tokens
- Messages: ~1,000 tokens
- RAG context: ~500 tokens
- **Total**: ~4,000 tokens (12.5% of 32K limit)
- ✅ Well within limits

**Message 10-15** (Wizard Step 3):
- System prompt: ~2,500 tokens
- Recent messages (last 5): ~1,500 tokens
- RAG context: ~1,000 tokens
- **Total**: ~5,000 tokens (15.6% of limit)
- ✅ Still within limits

**Message 20+** (Wizard Step 5):
- System prompt: ~2,500 tokens
- Recent messages (last 5): ~2,000 tokens
- RAG context: ~1,500 tokens
- **Total**: ~6,000 tokens (18.8% of limit)
- ⚠️ Early context (steps 1-4) lost
- ❌ Can't reference earlier answers

**Message 50+** (Freeform mode):
- System prompt: ~3,000 tokens
- Recent messages (last 5): ~3,000 tokens
- RAG context: ~2,000 tokens
- **Total**: ~8,000 tokens (25% of limit)
- ❌ All early context lost
- ❌ Business context may be forgotten

## Key Findings

### Critical Issues

1. **Inaccurate Token Counting**
   - Impact: Can't accurately budget context window
   - Severity: HIGH
   - Current accuracy: ~60-70% (very rough estimate)

2. **No Relevance-Based Context Selection**
   - Impact: Important early context lost
   - Severity: HIGH
   - Affects: All conversations >5 messages

3. **Summarization Not Integrated**
   - Impact: Can't preserve long conversation history
   - Severity: HIGH
   - Affects: Conversations >15 messages

4. **System Prompt Not Counted**
   - Impact: Actual context window smaller than expected
   - Severity: MEDIUM
   - Reduces available tokens by ~2,500

5. **No Entity Preservation**
   - Impact: Key information (business name, industry) lost
   - Severity: HIGH
   - Affects: Context retention accuracy

### Moderate Issues

6. **Hard-coded Message Limits**
   - Impact: Not adaptive to message length
   - Severity: MEDIUM

7. **No Incremental Summarization**
   - Impact: Can't summarize on-the-fly
   - Severity: MEDIUM

8. **Large System Prompts**
   - Impact: Reduces available context
   - Severity: LOW (can optimize)

## Recommendations

### Immediate Actions (Week 1)

1. **Implement Accurate Token Counting**
   - Use `tiktoken` or model-specific tokenizers
   - Count system prompt tokens
   - Validate against actual API responses
   - Add token budget tracking

2. **Add Entity Extraction and Preservation**
   - Extract business name, industry, key decisions
   - Store in structured format
   - Always include in context window
   - Preserve even when messages are discarded

3. **Implement Relevance-Based Context Selection**
   - Use semantic search to find relevant past messages
   - Score messages by importance
   - Preserve high-importance messages
   - Combine recency + relevance

### Short-term Improvements (Weeks 2-4)

4. **Integrate Summarization into Main Flow**
   - Summarize when history >15 messages
   - Use summaries in context window
   - Incremental summarization (summarize in chunks)

5. **Optimize System Prompts**
   - Compress examples
   - Remove redundancy
   - Dynamic prompt building
   - Reduce to ~1,500 tokens

6. **Implement Token Budget Management**
   - Allocate budget: System (10%), RAG (20%), History (60%), Reserve (10%)
   - Enforce limits per model
   - Track utilization
   - Alert when approaching limits

### Long-term Enhancements (Months 2-3)

7. **Advanced Context Selection**
   - Machine learning model for message importance
   - User feedback on context relevance
   - Adaptive thresholds based on conversation type

8. **Hierarchical Summarization**
   - Multi-level summaries (conversation → session → project)
   - Entity-aware summarization
   - Query-specific summarization

9. **Context Compression**
   - Use compression techniques for old messages
   - Semantic compression (extract key points)
   - Maintain retrieval capability

## Token Budget Proposal

### Recommended Allocation (32K token limit)

```
Total Budget: 32,000 tokens
├── System Prompt: 2,000 tokens (6.25%) [optimized from 2,500]
├── RAG Context: 3,000 tokens (9.4%) [variable, max]
├── Market Data: 1,000 tokens (3.1%) [variable, max]
├── Entity Summary: 500 tokens (1.6%) [always included]
├── Conversation History: 24,000 tokens (75%) [managed]
│   ├── Recent Messages: 8,000 tokens (25%) [last 10-15 messages]
│   ├── Relevant Past: 8,000 tokens (25%) [semantic search]
│   └── Summaries: 8,000 tokens (25%) [compressed history]
└── Reserve: 1,500 tokens (4.7%) [safety margin]
```

### Context Selection Algorithm

**Proposed Flow**:
1. Extract and preserve entities (always include)
2. Keep last 10-15 messages (recent context)
3. Semantic search for relevant past messages (based on current query)
4. Include summaries of older conversations
5. Prioritize by: recency (40%) + relevance (40%) + importance (20%)

## Success Metrics

1. **Context Retention Accuracy**: % of referenced information correctly recalled
   - Target: >85% for information within last 20 messages
   - Target: >70% for information from earlier in conversation

2. **Token Budget Utilization**: % of available tokens used
   - Target: 70-85% utilization
   - Alert if >90%

3. **Entity Preservation Rate**: % of extracted entities preserved in context
   - Target: 100% for critical entities (business name, industry)

4. **Summarization Coverage**: % of conversations >15 messages that are summarized
   - Target: 100%

5. **Context Selection Quality**: Relevance score of selected messages
   - Target: Average similarity >0.7 for retrieved messages

## Implementation Priority

### Phase 1 (Week 1-2): Critical Fixes
1. Accurate token counting
2. Entity extraction and preservation
3. Basic relevance-based selection

### Phase 2 (Week 3-4): Integration
4. Summarization integration
5. System prompt optimization
6. Token budget management

### Phase 3 (Month 2): Enhancement
7. Advanced context selection
8. Hierarchical summarization
9. Context compression

## Next Steps

1. Implement accurate token counting
2. Add entity extraction pipeline
3. Build semantic search for message retrieval
4. Integrate summarization into main flow
5. Set up monitoring for context window metrics
