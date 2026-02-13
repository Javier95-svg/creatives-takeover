# Ranked Improvement Backlog

## Overview

This document provides a prioritized backlog of improvements to address low accuracy and poor context retention in BizMap's chatbot. Items are ranked by impact/effort ratio and include specific implementation details.

## Ranking Methodology

**Impact Scale**: 
- HIGH: Directly addresses critical accuracy/context issues, affects >50% of conversations
- MEDIUM: Addresses moderate issues, affects 20-50% of conversations
- LOW: Addresses minor issues, affects <20% of conversations

**Effort Scale**:
- S (Small): 1-3 days
- M (Medium): 1-2 weeks
- L (Large): 2-4 weeks

**Priority**: Calculated as Impact × (1/Effort), higher is better

## Top Priority Items (Week 1-2)

### 1. Implement Accurate Token Counting
**Priority**: 🔴 CRITICAL  
**Impact**: HIGH | **Effort**: S (2 days)

**Problem Statement**:  
Current token counting uses rough approximation (1 token ≈ 4 chars), leading to inaccurate context window management. System prompts not counted, causing unexpected truncation.

**Root Cause**:  
No integration with actual tokenizers. Using character-based estimation which varies significantly by language and content type.

**Proposed Solution**:
1. Integrate `tiktoken` library for OpenAI models
2. Use model-specific tokenizers for Gemini/DeepSeek
3. Count system prompt tokens separately
4. Add token budget tracking and alerts
5. Validate against actual API responses

**Implementation Steps**:
```typescript
// Add to chatbot-streaming/index.ts
import { encoding_for_model } from 'tiktoken';

function accurateTokenCount(messages: ChatMessage[], model: string): number {
  const encoding = encoding_for_model(model);
  return messages.reduce((sum, msg) => {
    return sum + encoding.encode(msg.content).length;
  }, 0);
}
```

**Impact Estimate**:
- +15% context window utilization accuracy
- Prevents truncation issues
- Enables proper token budgeting

**Success Metrics**:
- Token count accuracy: >95% (vs actual API usage)
- Context window violations: 0
- System prompt size tracked: 100%

**Dependencies**: None

---

### 2. Add Entity Extraction and Preservation
**Priority**: 🔴 CRITICAL  
**Impact**: HIGH | **Effort**: M (1 week)

**Problem Statement**:  
Important entities (business name, industry, key decisions) are lost when messages are discarded. No structured entity tracking means context retention fails for critical information.

**Root Cause**:  
Entities stored in unstructured `conversationMemory` but not actively extracted or preserved. No entity extraction pipeline.

**Proposed Solution**:
1. Implement entity extraction using LLM (structured output)
2. Create `conversation_entities` table
3. Extract entities from each message
4. Always include entities in context window (even when messages discarded)
5. Update entities as conversation progresses

**Implementation Steps**:
```sql
CREATE TABLE conversation_entities (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES chatbot_conversations(id),
  entity_type TEXT, -- 'business_name', 'industry', 'target_market', etc.
  entity_value TEXT,
  confidence FLOAT,
  first_mentioned_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ
);
```

```typescript
async function extractEntities(message: string, businessContext: BusinessContext): Promise<Entity[]> {
  // Use structured output to extract entities
  const response = await callLLM({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: 'Extract business entities from this message. Return JSON with: business_name, industry, target_market, key_decisions'
    }, {
      role: 'user',
      content: message
    }],
    response_format: { type: 'json_object' }
  });
  return JSON.parse(response);
}
```

**Impact Estimate**:
- +30% context retention for entity-related queries
- Prevents loss of critical business information
- Enables entity-based context retrieval

**Success Metrics**:
- Entity extraction accuracy: >90%
- Entity preservation rate: 100% for critical entities
- Context retention for entities: >85%

**Dependencies**: None

---

### 3. Implement Relevance-Based Context Selection
**Priority**: 🔴 CRITICAL  
**Impact**: HIGH | **Effort**: M (1.5 weeks)

**Problem Statement**:  
Current system only uses recency (last 5 messages), losing important early context. No semantic search for relevant past messages.

**Root Cause**:  
`optimizeMessageHistory()` only keeps recent messages. No semantic search or relevance scoring.

**Proposed Solution**:
1. Implement semantic search for past messages using embeddings
2. Score messages by relevance to current query
3. Combine recency (40%) + relevance (40%) + importance (20%)
4. Always preserve entities and business context
5. Use summaries for older conversations

**Implementation Steps**:
```typescript
async function selectRelevantContext(
  currentQuery: string,
  conversationHistory: ChatMessage[],
  businessContext: BusinessContext
): Promise<ChatMessage[]> {
  // 1. Always include entities
  const entities = await getEntities(conversationId);
  
  // 2. Keep recent messages (last 10)
  const recent = conversationHistory.slice(-10);
  
  // 3. Semantic search for relevant past messages
  const queryEmbedding = await generateEmbedding(currentQuery);
  const relevant = await semanticSearch(queryEmbedding, conversationHistory.slice(0, -10), topK: 10);
  
  // 4. Combine and deduplicate
  return [...entities, ...recent, ...relevant];
}
```

**Impact Estimate**:
- +40% context retention for queries referencing past conversation
- Enables answering "what did I say about X?" questions
- Preserves important early context

**Success Metrics**:
- Context retention accuracy: >85% for past references
- Relevance score of selected messages: >0.7 average
- User satisfaction with context awareness: >80%

**Dependencies**: Entity extraction (#2)

---

### 4. Integrate Summarization into Main Flow
**Priority**: 🔴 CRITICAL  
**Impact**: HIGH | **Effort**: M (1 week)

**Problem Statement**:  
Summarization exists but not integrated. Conversations >15 messages lose context. Summaries not used in context window.

**Root Cause**:  
Summarization only in separate `memory-manager` function, called manually. Not triggered automatically or used in main conversation flow.

**Proposed Solution**:
1. Trigger summarization when history >15 messages
2. Use summaries in context window instead of full messages
3. Incremental summarization (summarize in chunks)
4. Store summaries in `project_memory` as `long_term`
5. Include summaries when building context

**Implementation Steps**:
```typescript
async function buildContextWithSummaries(
  conversationHistory: ChatMessage[],
  conversationId: string
): Promise<ChatMessage[]> {
  if (conversationHistory.length > 15) {
    // Get or create summaries
    const summaries = await getSummaries(conversationId);
    
    // Use summaries for old messages, full messages for recent
    const recentMessages = conversationHistory.slice(-10);
    const summaryMessages = summaries.map(s => ({
      role: 'system' as const,
      content: `[Summary of earlier conversation]: ${s.content}`
    }));
    
    return [...summaryMessages, ...recentMessages];
  }
  return conversationHistory;
}
```

**Impact Estimate**:
- Enables conversations >50 messages without context loss
- Reduces token usage by ~60% for old messages
- Preserves key information in compressed form

**Success Metrics**:
- Summarization coverage: 100% for conversations >15 messages
- Summary quality: >80% information retention
- Token reduction: >50% for summarized sections

**Dependencies**: Accurate token counting (#1)

---

### 5. Implement Source Citation Validation
**Priority**: 🔴 CRITICAL  
**Impact**: HIGH | **Effort**: S (2 days)

**Problem Statement**:  
Citations may be incorrect or fabricated. No validation that citations match retrieved sources or that sources contain cited information.

**Root Cause**:  
Only prompt-based citation requirements. No programmatic validation. LLM may cite non-existent sources.

**Proposed Solution**:
1. Track retrieved sources in response metadata
2. Validate citations against actual retrieved sources
3. Reject responses with invalid citations
4. Add source URLs/titles to citations
5. Verify cited information exists in source

**Implementation Steps**:
```typescript
function validateCitations(response: string, retrievedSources: Source[]): ValidationResult {
  const citations = extractCitations(response); // [Source 1], [Source 2], etc.
  
  for (const citation of citations) {
    const sourceNum = parseInt(citation.match(/\d+/)?.[0] || '0');
    
    // Check if source number is valid
    if (sourceNum < 1 || sourceNum > retrievedSources.length) {
      return { valid: false, error: `Invalid citation: ${citation}` };
    }
    
    // Verify cited information exists in source
    const source = retrievedSources[sourceNum - 1];
    const citedText = extractCitedText(response, citation);
    if (!source.content.includes(citedText)) {
      return { valid: false, error: `Cited information not found in source ${sourceNum}` };
    }
  }
  
  return { valid: true };
}
```

**Impact Estimate**:
- +20% citation accuracy
- Prevents fabricated citations
- Improves user trust

**Success Metrics**:
- Citation accuracy: >95%
- Fabricated citation rate: <2%
- Source verification rate: 100%

**Dependencies**: None

---

## High Priority Items (Weeks 3-4)

### 6. Add Hallucination Detection
**Priority**: 🟠 HIGH  
**Impact**: HIGH | **Effort**: M (1.5 weeks)

**Problem Statement**:  
LLM may provide false information, especially statistics, company names, or industry benchmarks. No programmatic detection.

**Root Cause**:  
Only prompt-based prevention. No validation of factual claims. No fact-checking against knowledge base.

**Proposed Solution**:
1. Detect unsubstantiated factual claims (statistics, numbers, company names)
2. Validate against knowledge base
3. Flag responses with unsubstantiated claims
4. Request source or admit uncertainty
5. Use fact-checking for high-risk claims

**Impact Estimate**: +25% factual accuracy  
**Effort**: M (1.5 weeks)  
**Dependencies**: Source citation validation (#5)

---

### 7. Implement Similarity Threshold for RAG
**Priority**: 🟠 HIGH  
**Impact**: MEDIUM | **Effort**: S (1 day)

**Problem Statement**:  
RAG retrieves chunks even with low similarity (<0.3), including irrelevant information that reduces accuracy.

**Root Cause**:  
No minimum similarity threshold in `match_knowledge_chunks` function.

**Proposed Solution**:
1. Add `min_similarity` parameter (default: 0.6)
2. Filter chunks below threshold
3. Return empty if no chunks meet threshold
4. Log low-similarity retrievals for analysis

**Impact Estimate**: +15% RAG precision  
**Effort**: S (1 day)  
**Dependencies**: None

---

### 8. Fix Business Context Extraction
**Priority**: 🟠 HIGH  
**Impact**: HIGH | **Effort**: M (1 week)

**Problem Statement**:  
Business context extraction function referenced but not found. Context may not be properly extracted or updated.

**Root Cause**:  
`extractBusinessContext()` function missing or incomplete.

**Proposed Solution**:
1. Implement or locate business context extraction
2. Use structured output to extract: industry, businessType, stage, location, budget, goals
3. Validate extracted context
4. Update `business_context` in database
5. Sync with frontend state

**Impact Estimate**: +20% context-aware response accuracy  
**Effort**: M (1 week)  
**Dependencies**: None

---

### 9. Add Automatic Summarization Trigger
**Priority**: 🟠 HIGH  
**Impact**: MEDIUM | **Effort**: S (2 days)

**Problem Statement**:  
Summarization only called manually. No automatic trigger when conversations exceed thresholds.

**Root Cause**:  
No scheduled job or automatic trigger for summarization.

**Proposed Solution**:
1. Add scheduled job (cron) to check for conversations needing summarization
2. Trigger when: >20 messages OR >7 days old
3. Call `memory-manager` summarize endpoint
4. Store summaries automatically

**Impact Estimate**: 100% summarization coverage for eligible conversations  
**Effort**: S (2 days)  
**Dependencies**: Summarization integration (#4)

---

### 10. Optimize System Prompts
**Priority**: 🟠 HIGH  
**Impact**: MEDIUM | **Effort**: S (2 days)

**Problem Statement**:  
System prompts are very large (2,500-3,000 tokens), reducing available context window.

**Root Cause**:  
Verbose instructions, redundant examples, no compression.

**Proposed Solution**:
1. Compress examples
2. Remove redundancy
3. Use shorter format descriptions
4. Dynamic prompt building based on context
5. Target: <1,500 tokens

**Impact Estimate**: +1,000 tokens available for conversation history  
**Effort**: S (2 days)  
**Dependencies**: Accurate token counting (#1)

---

## Medium Priority Items (Month 2)

### 11. Implement Cross-Reference Validation
**Priority**: 🟡 MEDIUM  
**Impact**: MEDIUM | **Effort**: M (1 week)

**Problem Statement**:  
Retrieved chunks may contradict each other. No validation or conflict resolution.

**Proposed Solution**:  
Detect contradictions, resolve conflicts, prioritize reliable sources.

**Impact Estimate**: +10% response consistency  
**Effort**: M (1 week)

---

### 12. Add Ambiguity Detection
**Priority**: 🟡 MEDIUM  
**Impact**: MEDIUM | **Effort**: M (1 week)

**Problem Statement**:  
Ambiguous queries answered without clarification, leading to incorrect responses.

**Proposed Solution**:  
Detect ambiguity, ask clarifying questions, don't assume context.

**Impact Estimate**: +15% accuracy for ambiguous queries  
**Effort**: M (1 week)

---

### 13. Build Precision/Recall Evaluation Framework
**Priority**: 🟡 MEDIUM  
**Impact**: MEDIUM | **Effort**: M (1.5 weeks)

**Problem Statement**:  
Can't measure RAG retrieval quality. No way to improve retrieval.

**Proposed Solution**:  
Create ground truth dataset, measure precision/recall, optimize retrieval.

**Impact Estimate**: Enables data-driven retrieval improvements  
**Effort**: M (1.5 weeks)

---

### 14. Persist Mode-Specific State
**Priority**: 🟡 MEDIUM  
**Impact**: MEDIUM | **Effort**: M (1 week)

**Problem Statement**:  
Mode-specific messages not persisted. Lost on page refresh.

**Proposed Solution**:  
Store mode in messages table, enable mode switching with history.

**Impact Estimate**: Better user experience  
**Effort**: M (1 week)

---

### 15. Implement State Synchronization
**Priority**: 🟡 MEDIUM  
**Impact**: MEDIUM | **Effort**: M (1.5 weeks)

**Problem Statement**:  
Frontend and backend state can diverge, causing inconsistencies.

**Proposed Solution**:  
Periodic sync, conflict resolution, optimistic updates.

**Impact Estimate**: Eliminates state sync issues  
**Effort**: M (1.5 weeks)

---

## Low Priority Items (Month 3+)

### 16. Add Message Importance Scoring
**Priority**: 🟢 LOW  
**Impact**: LOW | **Effort**: M (1 week)

**Problem Statement**:  
All messages treated equally. Can't prioritize important messages.

**Proposed Solution**:  
Score messages by importance, prioritize in context selection.

---

### 17. Implement Reranking System
**Priority**: 🟢 LOW  
**Impact**: MEDIUM | **Effort**: L (2 weeks)

**Problem Statement**:  
RAG uses only cosine similarity. No reranking for better relevance.

**Proposed Solution**:  
Add cross-encoder reranking, improve retrieval precision.

---

### 18. Add Source Quality Scoring
**Priority**: 🟢 LOW  
**Impact**: LOW | **Effort**: M (1 week)

**Problem Statement**:  
All sources treated equally. No quality filtering.

**Proposed Solution**:  
Score sources by credibility, prioritize high-quality sources.

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Weeks 1-2)
- ✅ Accurate token counting (#1)
- ✅ Entity extraction (#2)
- ✅ Relevance-based context (#3)
- ✅ Summarization integration (#4)
- ✅ Source citation validation (#5)

**Expected Impact**: +40% context retention, +25% accuracy

### Phase 2: High Priority (Weeks 3-4)
- ✅ Hallucination detection (#6)
- ✅ Similarity threshold (#7)
- ✅ Business context extraction (#8)
- ✅ Automatic summarization (#9)
- ✅ System prompt optimization (#10)

**Expected Impact**: +15% accuracy, +20% efficiency

### Phase 3: Medium Priority (Month 2)
- Cross-reference validation (#11)
- Ambiguity detection (#12)
- Evaluation framework (#13)
- Mode-specific state (#14)
- State synchronization (#15)

**Expected Impact**: +10% accuracy, better UX

### Phase 4: Enhancements (Month 3+)
- Message importance (#16)
- Reranking (#17)
- Source quality (#18)

## Success Metrics Summary

**Overall Targets**:
- Context retention: >85% (from ~50%)
- Factual accuracy: >90% (from ~70%)
- Citation accuracy: >95% (from ~75%)
- User satisfaction: >80% (from ~60%)

**Measurement**: Use test protocol (see document #5)
