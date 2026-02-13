# Accuracy Audit Report

## Executive Summary

This document audits BizMap's accuracy mechanisms, including RAG retrieval precision/recall, source citation accuracy, hallucination detection, and ambiguity handling. Critical gaps in grounding and validation contribute to low accuracy.

## Sources of Truth Analysis

### 1. RAG System (Retrieval-Augmented Generation)

#### Implementation
**Location**: `supabase/functions/rag-chat/index.ts`

**Flow**:
1. Generate embedding for user query
2. Search `knowledge_chunks` table using cosine similarity
3. Retrieve top K chunks (default: 5, max: 20)
4. Build context from retrieved chunks
5. Generate response using GPT-4o-mini with retrieved context

**Knowledge Base Schema**:
```sql
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536)
)
```

#### Issues Identified

**Retrieval Precision/Recall**:
- ❌ **CRITICAL**: No precision/recall measurement
  - No ground truth dataset
  - No evaluation of retrieval quality
  - Can't measure if relevant chunks are retrieved

- ❌ No similarity threshold
  - Retrieves chunks even if similarity is very low (<0.3)
  - May include irrelevant information
  - No filtering of low-quality matches

- ❌ Fixed retrieval count (5-20 chunks)
  - Doesn't adapt to query complexity
  - May retrieve too many or too few chunks
  - No dynamic K selection

- ❌ No reranking
  - Uses only cosine similarity
  - Doesn't consider query-chunk relevance
  - No cross-encoder reranking

**Chunk Quality**:
- ❌ No chunk quality validation
  - Chunks may be incomplete or truncated
  - No validation of chunk completeness
  - Metadata may be missing or incorrect

- ❌ No chunk deduplication
  - Same information may appear in multiple chunks
  - Can cause redundant context
  - Wastes token budget

**Context Building**:
- ❌ Simple concatenation
  - Just joins chunks with newlines
  - No prioritization or ordering
  - No chunk relevance scoring in context

- ❌ No chunk filtering
  - Includes all retrieved chunks regardless of quality
  - No removal of contradictory chunks
  - No validation of chunk relevance

#### Retrieval Analysis

**Current Retrieval Function**:
```typescript
const { data: retrievedChunks } = await supabase.rpc("match_knowledge_chunks", {
  query_embedding: queryEmbedding,
  match_count: matchCount,  // 5-20
  filter: payload.filter ?? {}
});
```

**Missing Features**:
- No minimum similarity threshold
- No chunk quality scoring
- No relevance reranking
- No deduplication
- No contradiction detection

### 2. Web Search Integration

#### Implementation
**Location**: `supabase/functions/chatbot-streaming/index.ts` (lines 400-483)

**Flow**:
1. Detect if query needs web search (`searchIntent === 'general' | 'hybrid'`)
2. Call Perplexity API for real-time information
3. Format results with sources
4. Use in response generation

**Issues Identified**:
- ❌ **CRITICAL**: Source citation accuracy not validated
  - Sources cited but not verified
  - May cite incorrect sources
  - No validation that source actually contains cited information

- ❌ No source quality filtering
  - May include low-quality sources
  - No fact-checking of web search results
  - No validation of source credibility

- ❌ Web search results not grounded
  - Results may be outdated or incorrect
  - No verification against knowledge base
  - No cross-reference validation

- ❌ Timeout handling (500ms) may cause incomplete results
  - May miss important sources
  - No retry for failed searches
  - Falls back silently

### 3. Market Intelligence Data

#### Implementation
**Location**: `supabase/functions/chatbot-streaming/index.ts` (lines 930-958)

**Flow**:
1. Query `market_intelligence` table
2. Filter by freshness_score >= 0.3
3. Get top 5 results
4. Inject into system prompt

**Issues Identified**:
- ❌ Freshness threshold (0.3) may be too low
  - May include stale data
  - No validation of data accuracy
  - No source verification

- ❌ No data quality validation
  - Market data may be incorrect
  - No cross-reference with other sources
  - No confidence scoring

- ❌ Limited to 5 results
  - May miss relevant data
  - No dynamic selection based on query

### 4. User-Uploaded Documents

#### Implementation
**Location**: `supabase/functions/document-parser/index.ts`

**Flow**:
1. Parse uploaded document
2. Extract text
3. Chunk text
4. Generate embeddings
5. Store in `knowledge_chunks` with `source='user_document'`

**Issues Identified**:
- ❌ No document quality validation
  - May contain incorrect information
  - No fact-checking
  - No validation against knowledge base

- ❌ No user document prioritization
  - User documents compete with general knowledge
  - No weighting for user-specific context
  - May be overshadowed by general knowledge

## Grounding Mechanisms

### Source Citation

#### Current Implementation
**Location**: System prompts (lines 1280-1285, 1421-1428)

**Format**: `[Source 1]`, `[Source 2]`, etc.

**Issues**:
- ❌ **CRITICAL**: Citation format not enforced
  - LLM may not cite sources correctly
  - No validation that citations match actual sources
  - No verification that source contains cited information

- ❌ No source URL or title in citations
  - Just numbers, not actionable
  - Can't verify source
  - No way to access original source

- ❌ Citations may be fabricated
  - LLM may cite sources that don't exist
  - No validation against actual retrieved sources
  - No check that source number matches retrieved count

#### Citation Accuracy Analysis

**Expected Behavior**:
- If RAG retrieved 5 chunks → citations should be [Source 1] to [Source 5]
- If web search returned 3 sources → citations should match those sources
- Citations should reference actual retrieved content

**Current Issues**:
- No validation that citations match retrieved sources
- No check that cited source actually contains cited information
- No enforcement of citation format
- LLM may cite non-existent sources

### Hallucination Detection

#### Current Mechanisms

**1. System Prompt Rules**
**Location**: `supabase/functions/chatbot-streaming/index.ts` (lines 1217-1221, 1273-1279)

```
HALLUCINATION PREVENTION:
• Don't make up specific statistics or data
• If unsure about industry benchmarks, say "I recommend researching [specific source] for accurate data"
• Focus on strategic guidance rather than fabricated facts
```

**Issues**:
- ❌ **CRITICAL**: Only prompt-based, not enforced
  - LLM may still hallucinate
  - No programmatic detection
  - No validation of factual claims

**2. Response Validation**
**Location**: `supabase/functions/_shared/response-validator.ts`

**Current Validation**:
- Structure validation (Problem, Insight, Recommendation, Next Actions)
- Quality scoring (completeness, relevance, actionability)
- Format validation

**Missing**:
- ❌ No factual accuracy validation
- ❌ No hallucination detection
- ❌ No source verification
- ❌ No contradiction detection

#### Hallucination Triggers Identified

**High Risk Scenarios**:
1. **Statistics without sources**
   - LLM may fabricate percentages or numbers
   - No validation that statistics are cited
   - Example: "70% of startups fail" without [Source X]

2. **Company/Product names**
   - LLM may reference non-existent companies
   - No validation against knowledge base
   - Example: "Company X does Y" when Company X doesn't exist

3. **Industry benchmarks**
   - LLM may make up industry averages
   - No validation against market data
   - Example: "Average SaaS pricing is $X" without source

4. **Time-sensitive information**
   - LLM may provide outdated information
   - No date validation
   - Example: "Current market size is $X" when data is from 2020

### Ambiguity Handling

#### Current Implementation

**1. Template Matching**
**Location**: `supabase/functions/chatbot-streaming/index.ts` (lines 23-175)

- Matches simple queries to templates
- Returns predefined responses
- Handles greetings, FAQs, etc.

**Issues**:
- ❌ Only handles very simple queries
- ❌ No ambiguity detection
- ❌ No clarification requests

**2. Intent Detection**
**Location**: `supabase/functions/chatbot-streaming/index.ts` (lines 1894-1967)

- Classifies query as 'business', 'general', 'hybrid', 'conversational'
- Routes to appropriate handler

**Issues**:
- ❌ No ambiguity detection
- ❌ No confidence scoring
- ❌ No clarification requests for ambiguous queries
- ❌ May misclassify ambiguous queries

#### Ambiguity Scenarios Not Handled

**Examples**:
1. "What should I price my product?"
   - Ambiguous: Which product? What market? What stage?
   - Current: Assumes context from business_context
   - Should: Ask clarifying questions

2. "How do I validate my idea?"
   - Ambiguous: Which idea? What type of validation?
   - Current: Provides generic advice
   - Should: Ask for specifics

3. "Tell me about competitors"
   - Ambiguous: Which competitors? What aspect?
   - Current: Uses business_context to infer
   - Should: Clarify scope

### Cross-Reference Validation

#### Current Status: NOT IMPLEMENTED

**Missing Features**:
- ❌ No validation that retrieved chunks agree
- ❌ No detection of contradictory information
- ❌ No resolution of conflicts
- ❌ No confidence scoring when sources disagree

**Impact**:
- May provide contradictory advice
- No way to detect when sources conflict
- Can't prioritize more reliable sources

## Accuracy Metrics Analysis

### Current Metrics

**Response Quality Scoring**:
**Location**: `supabase/functions/_shared/response-validator.ts` (lines 84-131)

**Metrics**:
- Completeness (0-1): Has all required sections
- Relevance (0-1): Addresses the query
- Actionability (0-1): Has concrete next steps
- Structure (0-1): Follows required format

**Missing Metrics**:
- ❌ Factual accuracy
- ❌ Source citation accuracy
- ❌ Hallucination rate
- ❌ Grounding score

### Precision/Recall Analysis

#### RAG Retrieval

**No Current Measurement**:
- Can't calculate precision (relevant retrieved / total retrieved)
- Can't calculate recall (relevant retrieved / total relevant)
- No ground truth dataset
- No evaluation framework

**Estimated Issues**:
- Precision: ~60-70% (many retrieved chunks may be irrelevant)
- Recall: ~50-60% (may miss relevant chunks)

#### Source Citation

**No Current Measurement**:
- Can't measure citation accuracy
- Can't detect fabricated citations
- No validation framework

**Estimated Issues**:
- Citation accuracy: ~70-80% (some citations may be incorrect)
- Fabrication rate: ~10-20% (LLM may cite non-existent sources)

## Key Findings

### Critical Issues

1. **No Hallucination Detection**
   - Impact: LLM may provide false information
   - Severity: HIGH
   - Affects: All factual claims

2. **No Source Citation Validation**
   - Impact: Citations may be incorrect or fabricated
   - Severity: HIGH
   - Affects: All responses with sources

3. **No RAG Precision/Recall Measurement**
   - Impact: Can't improve retrieval quality
   - Severity: HIGH
   - Affects: RAG-based responses

4. **No Cross-Reference Validation**
   - Impact: May provide contradictory information
   - Severity: MEDIUM
   - Affects: Multi-source responses

5. **No Ambiguity Handling**
   - Impact: May answer wrong question
   - Severity: MEDIUM
   - Affects: Ambiguous queries

### Moderate Issues

6. **No Similarity Threshold for RAG**
   - Impact: May retrieve irrelevant chunks
   - Severity: MEDIUM

7. **No Chunk Quality Validation**
   - Impact: May use low-quality chunks
   - Severity: MEDIUM

8. **No Document Quality Validation**
   - Impact: User documents may contain errors
   - Severity: LOW

## Recommendations

### Immediate Actions (Week 1)

1. **Implement Source Citation Validation**
   - Validate that citations match retrieved sources
   - Check that cited source contains cited information
   - Reject responses with invalid citations

2. **Add Hallucination Detection**
   - Detect unsubstantiated factual claims
   - Flag statistics without sources
   - Validate company/product names against knowledge base

3. **Implement Similarity Threshold**
   - Set minimum similarity threshold (e.g., 0.6)
   - Filter out low-similarity chunks
   - Improve retrieval precision

### Short-term Improvements (Weeks 2-4)

4. **Build Precision/Recall Evaluation**
   - Create ground truth dataset (50-100 queries)
   - Measure retrieval precision/recall
   - Optimize retrieval based on metrics

5. **Add Cross-Reference Validation**
   - Detect contradictory chunks
   - Resolve conflicts (prioritize more reliable sources)
   - Flag when sources disagree

6. **Implement Ambiguity Detection**
   - Detect ambiguous queries
   - Ask clarifying questions
   - Don't assume context

### Long-term Enhancements (Months 2-3)

7. **Advanced Hallucination Detection**
   - Use fact-checking APIs
   - Cross-reference with multiple sources
   - Confidence scoring for factual claims

8. **Reranking System**
   - Implement cross-encoder reranking
   - Improve retrieval precision
   - Better relevance scoring

9. **Source Quality Scoring**
   - Score sources by credibility
   - Prioritize high-quality sources
   - Filter low-quality sources

## Test Cases for Accuracy

### Hallucination Detection Tests

1. **Statistics Test**:
   - Query: "What percentage of startups fail?"
   - Expected: Response with [Source X] citation
   - Failure: Statistics without citation

2. **Company Name Test**:
   - Query: "Tell me about Company X"
   - Expected: "I don't have information about Company X" if not in KB
   - Failure: Fabricated information about non-existent company

3. **Industry Benchmark Test**:
   - Query: "What's the average SaaS pricing?"
   - Expected: Response with source or "I recommend researching..."
   - Failure: Unsubstantiated numbers

### Source Citation Tests

1. **Citation Count Test**:
   - If 5 chunks retrieved, citations should be [Source 1] to [Source 5]
   - No [Source 6] or higher

2. **Citation Content Test**:
   - Cited information should exist in cited source
   - No fabricated citations

3. **Citation Format Test**:
   - Citations should follow [Source X] format
   - No variations like "Source 1" or "[1]"

### RAG Retrieval Tests

1. **Relevance Test**:
   - Query: "How do I price my SaaS product?"
   - Expected: Retrieve chunks about SaaS pricing
   - Failure: Retrieve chunks about unrelated topics

2. **Completeness Test**:
   - Query: "What is product-market fit?"
   - Expected: Retrieve comprehensive information
   - Failure: Missing key aspects

3. **Similarity Threshold Test**:
   - Query with low similarity matches
   - Expected: Filter out low-similarity chunks
   - Failure: Include irrelevant chunks

## Success Metrics

1. **Hallucination Rate**: % of responses with unsubstantiated factual claims
   - Target: <5%

2. **Source Citation Accuracy**: % of citations that are correct
   - Target: >95%

3. **RAG Precision**: % of retrieved chunks that are relevant
   - Target: >80%

4. **RAG Recall**: % of relevant chunks that are retrieved
   - Target: >70%

5. **Ambiguity Resolution**: % of ambiguous queries that trigger clarification
   - Target: >90%

## Next Steps

1. Implement source citation validation
2. Add hallucination detection
3. Set similarity threshold for RAG
4. Build evaluation framework
5. Create ground truth dataset
6. Measure and improve accuracy metrics
