# Test Protocol for BizMap Chatbot

## Overview

This document defines a comprehensive test protocol to measure and validate improvements to BizMap's chatbot accuracy and context retention. It includes a representative dataset, automated checks, and acceptance thresholds.

## Test Dataset

### Dataset Composition

**Total Conversations**: 100  
**Distribution**:
- Simple queries: 20 (greetings, FAQs, simple questions)
- Complex multi-turn: 30 (wizard mode, business planning)
- Context-dependent: 25 (references to earlier conversation)
- Ambiguous queries: 15 (unclear intent, missing context)
- Mode switching: 10 (wizard → freeform, etc.)

### Conversation Categories

#### Category 1: Simple Queries (20 conversations)

**Purpose**: Test basic functionality, template matching, intent routing

**Examples**:
1. **Greeting**
   - User: "Hi"
   - Expected: Friendly greeting, quick actions
   - Metrics: Response time, format compliance

2. **FAQ - Pricing**
   - User: "How much does BizMap cost?"
   - Expected: Clear pricing information, no confusion with business pricing
   - Metrics: Intent accuracy, response relevance

3. **FAQ - Features**
   - User: "What can BizMap do?"
   - Expected: Feature overview, no hallucination
   - Metrics: Accuracy, completeness

4. **Simple Business Question**
   - User: "What is an MVP?"
   - Expected: Clear definition, possibly with source
   - Metrics: Accuracy, source citation (if applicable)

#### Category 2: Complex Multi-Turn (30 conversations)

**Purpose**: Test context retention, wizard flow, business planning

**Examples**:
1. **Wizard Flow - Complete Journey**
   ```
   Step 1: User: "I want to build a SaaS for small businesses"
   Step 2: User: "Small business owners, 10-50 employees"
   Step 3: User: "They struggle with managing customer data"
   Step 4: User: "A CRM tool that integrates with their existing systems"
   Step 5: User: "LinkedIn and industry forums"
   Step 6: User: "$49/month per user"
   Step 7: User: "100 paying customers in 90 days"
   ```
   - Expected: Each step builds on previous, context maintained
   - Metrics: Context retention, step progression, answer quality

2. **Freeform Planning**
   ```
   Turn 1: "I'm thinking about starting a consulting business"
   Turn 5: "What should I charge?" (should remember consulting context)
   Turn 10: "How do I find clients?" (should remember consulting + pricing)
   ```
   - Expected: Maintains business context across turns
   - Metrics: Context retention, entity preservation

3. **Long Conversation**
   - 50+ messages
   - Mix of questions and answers
   - Expected: Summarization triggered, key context preserved
   - Metrics: Summarization coverage, context retention

#### Category 3: Context-Dependent (25 conversations)

**Purpose**: Test context retention, entity tracking, reference resolution

**Examples**:
1. **Entity Reference**
   ```
   Turn 1: "My business is called TechFlow, it's a SaaS for project management"
   Turn 10: "What should TechFlow's pricing be?"
   ```
   - Expected: Remembers business name "TechFlow"
   - Metrics: Entity retention accuracy

2. **Early Context Reference**
   ```
   Turn 1: "I'm targeting small business owners"
   Turn 20: "Who did I say my target market was?"
   ```
   - Expected: Recalls "small business owners"
   - Metrics: Long-term context retention

3. **Decision Reference**
   ```
   Turn 5: "I decided to price at $99/month"
   Turn 15: "What pricing did I choose?"
   ```
   - Expected: Recalls pricing decision
   - Metrics: Decision tracking accuracy

4. **Industry Context**
   ```
   Turn 1: "I'm in the healthcare industry"
   Turn 12: "What are the regulations for my industry?"
   ```
   - Expected: Uses healthcare context
   - Metrics: Industry context retention

#### Category 4: Ambiguous Queries (15 conversations)

**Purpose**: Test ambiguity detection, clarification requests

**Examples**:
1. **Ambiguous Product**
   - User: "What should I price my product?"
   - Expected: Asks which product or uses context
   - Metrics: Ambiguity detection, clarification rate

2. **Ambiguous Market**
   - User: "Tell me about my competitors"
   - Expected: Asks for clarification or uses business context
   - Metrics: Context usage, clarification quality

3. **Ambiguous Validation**
   - User: "How do I validate my idea?"
   - Expected: Asks what type of validation or provides general guidance
   - Metrics: Response appropriateness

#### Category 5: Mode Switching (10 conversations)

**Purpose**: Test mode transitions, state preservation

**Examples**:
1. **Wizard → Freeform**
   ```
   Wizard mode: Complete 3 steps
   Switch to freeform: "Can you help me with marketing?"
   ```
   - Expected: Maintains wizard context, answers marketing question
   - Metrics: Mode transition success, context preservation

2. **Freeform → Wizard**
   ```
   Freeform: Discuss business idea
   Switch to wizard: Should resume or start fresh?
   ```
   - Expected: Uses freeform context in wizard
   - Metrics: Context transfer accuracy

## Automated Checks

### 1. Context Retention Tests

#### Test: Entity Recall
```typescript
async function testEntityRecall(conversationId: string, entityType: string, expectedValue: string): Promise<boolean> {
  // Ask about entity mentioned earlier
  const query = `What ${entityType} did I mention?`;
  const response = await sendMessage(conversationId, query);
  
  // Check if response contains expected value
  return response.toLowerCase().includes(expectedValue.toLowerCase());
}
```

**Test Cases**:
- Business name recall (after 10+ messages)
- Industry recall (after 15+ messages)
- Target market recall (after 20+ messages)
- Pricing decision recall (after 25+ messages)

**Acceptance**: >85% accuracy

#### Test: Early Context Reference
```typescript
async function testEarlyContext(conversationId: string, messageIndex: number, question: string): Promise<boolean> {
  // Reference information from message N
  const response = await sendMessage(conversationId, question);
  
  // Validate response contains correct information
  return validateResponse(response, expectedAnswer);
}
```

**Acceptance**: >70% accuracy for messages >20 turns ago

### 2. Accuracy Tests

#### Test: Factual Correctness
```typescript
async function testFactualAccuracy(query: string, expectedAnswer: string, sources: string[]): Promise<AccuracyResult> {
  const response = await sendMessage(conversationId, query);
  
  return {
    factualCorrect: checkFactualAccuracy(response, expectedAnswer),
    hasSources: checkSources(response, sources),
    noHallucination: checkHallucination(response)
  };
}
```

**Test Cases**:
- Statistics with sources
- Company/product information
- Industry benchmarks
- Market data

**Acceptance**: >90% factual accuracy for RAG-sourced information

#### Test: Source Citation Accuracy
```typescript
async function testCitationAccuracy(response: string, retrievedSources: Source[]): Promise<CitationResult> {
  const citations = extractCitations(response); // [Source 1], [Source 2]
  
  return {
    validCitations: citations.every(c => {
      const num = parseInt(c.match(/\d+/)?.[0] || '0');
      return num >= 1 && num <= retrievedSources.length;
    }),
    citedInfoExists: citations.every(c => {
      // Verify cited information exists in source
      return verifyCitation(c, retrievedSources);
    }),
    noFabricatedCitations: citations.length <= retrievedSources.length
  };
}
```

**Acceptance**: 100% citation validity

### 3. Format Compliance Tests

#### Test: Response Structure
```typescript
function testResponseStructure(response: string, requiredFormat: 'wizard' | 'freeform'): boolean {
  if (requiredFormat === 'wizard') {
    // Check for emoji headers, proper formatting
    return hasEmojiHeaders(response) && 
           hasProperParagraphs(response) &&
           hasBulletPoints(response);
  } else {
    // Check for Problem/Insight/Recommendation/Next Actions
    return hasProblemSection(response) &&
           hasInsightSection(response) &&
           hasRecommendationSection(response) &&
           hasNextActionsSection(response);
  }
}
```

**Acceptance**: >95% format compliance

#### Test: No Markdown Violations
```typescript
function testNoMarkdown(response: string): boolean {
  return !response.includes('**') && // No bold
         !response.includes('###') && // No headings
         !response.includes('*text*'); // No italics
}
```

**Acceptance**: 100% (zero violations)

### 4. Source Citation Tests

#### Test: Citation Format
```typescript
function testCitationFormat(response: string): boolean {
  const citations = extractCitations(response);
  return citations.every(c => /\[Source \d+\]/.test(c));
}
```

**Acceptance**: 100% correct format

#### Test: Citation Validity
```typescript
function testCitationValidity(response: string, retrievedSources: Source[]): boolean {
  const citations = extractCitations(response);
  const sourceNumbers = citations.map(c => parseInt(c.match(/\d+/)?.[0] || '0'));
  
  return sourceNumbers.every(num => 
    num >= 1 && num <= retrievedSources.length
  );
}
```

**Acceptance**: 100% valid citations

### 5. Response Coherence Tests

#### Test: Conversation Coherence
```typescript
async function testCoherence(conversationId: string, turnNumber: number): Promise<boolean> {
  const response = await getResponse(conversationId, turnNumber);
  const previousContext = await getContext(conversationId, turnNumber - 1);
  
  // Check if response makes sense in context
  return checkCoherence(response, previousContext);
}
```

**Acceptance**: >90% coherence score

#### Test: Consistency
```typescript
async function testConsistency(query: string, conversationId1: string, conversationId2: string): Promise<boolean> {
  const response1 = await sendMessage(conversationId1, query);
  const response2 = await sendMessage(conversationId2, query);
  
  // Responses should be similar (not identical, but consistent)
  return calculateSimilarity(response1, response2) > 0.7;
}
```

**Acceptance**: >70% similarity for same query

## Acceptance Thresholds

### Context Retention Metrics

| Metric | Threshold | Measurement Method |
|--------|-----------|-------------------|
| Entity recall (within 10 messages) | >90% | Ask about entity mentioned earlier |
| Entity recall (10-20 messages ago) | >85% | Ask about entity from mid-conversation |
| Entity recall (>20 messages ago) | >70% | Ask about entity from early conversation |
| Early context reference | >70% | Reference information from >20 messages ago |
| Decision tracking | >85% | Recall decisions made earlier |
| Industry context retention | >90% | Use industry context correctly |

### Accuracy Metrics

| Metric | Threshold | Measurement Method |
|--------|-----------|-------------------|
| Factual accuracy (RAG-sourced) | >90% | Validate against knowledge base |
| Factual accuracy (web-sourced) | >85% | Validate against web sources |
| Hallucination rate | <5% | Detect unsubstantiated claims |
| Source citation accuracy | >95% | Validate citations match sources |
| Citation format compliance | 100% | Check [Source X] format |
| No fabricated citations | 100% | Verify all citations exist |

### Format Compliance Metrics

| Metric | Threshold | Measurement Method |
|--------|-----------|-------------------|
| Structure compliance (wizard) | >95% | Check emoji headers, paragraphs |
| Structure compliance (freeform) | >95% | Check 4-part format |
| No markdown violations | 100% | Check for **, ###, *text* |
| Bullet point usage | >90% | Check for dash format, not numbers |

### Response Quality Metrics

| Metric | Threshold | Measurement Method |
|--------|-----------|-------------------|
| Relevance score | >0.8 | Semantic similarity to query |
| Completeness score | >0.8 | Has all required sections |
| Actionability score | >0.7 | Has concrete next steps |
| Coherence score | >0.9 | Makes sense in context |

### System Performance Metrics

| Metric | Threshold | Measurement Method |
|--------|-----------|-------------------|
| Response time (p50) | <2s | Time to first token |
| Response time (p95) | <5s | Time to first token |
| Token budget utilization | 70-85% | Track actual token usage |
| Summarization coverage | 100% | Conversations >15 messages |
| Context window violations | 0 | No truncation errors |

## Test Execution Protocol

### Phase 1: Baseline Measurement (Week 1)

1. **Run Full Test Suite**
   - Execute all 100 test conversations
   - Measure all metrics
   - Document baseline performance

2. **Identify Failure Patterns**
   - Group failures by category
   - Identify root causes
   - Prioritize fixes

3. **Establish Baseline Metrics**
   - Context retention: Current %
   - Accuracy: Current %
   - Format compliance: Current %
   - Response quality: Current scores

### Phase 2: Incremental Testing (Weeks 2-4)

1. **After Each Improvement**
   - Re-run relevant test cases
   - Measure improvement
   - Validate acceptance thresholds

2. **Regression Testing**
   - Ensure fixes don't break existing functionality
   - Run full suite weekly

3. **Continuous Monitoring**
   - Track metrics in production
   - Alert on threshold violations

### Phase 3: Validation (Week 4)

1. **Final Test Run**
   - Execute complete test suite
   - Measure all metrics
   - Compare to baseline

2. **Acceptance Review**
   - Verify all thresholds met
   - Document improvements
   - Identify remaining issues

## Test Automation Framework

### Implementation Structure

```typescript
// test-framework.ts
interface TestCase {
  id: string;
  category: string;
  conversation: Message[];
  expectedOutcomes: ExpectedOutcome[];
  metrics: Metric[];
}

interface ExpectedOutcome {
  type: 'context_retention' | 'accuracy' | 'format' | 'citation';
  condition: (response: string, context: any) => boolean;
  threshold: number;
}

class ChatbotTestRunner {
  async runTestSuite(testCases: TestCase[]): Promise<TestResults> {
    const results = [];
    
    for (const testCase of testCases) {
      const result = await this.runTestCase(testCase);
      results.push(result);
    }
    
    return this.aggregateResults(results);
  }
  
  async runTestCase(testCase: TestCase): Promise<TestCaseResult> {
    // Execute conversation
    const conversation = await this.executeConversation(testCase.conversation);
    
    // Run checks
    const checks = await Promise.all(
      testCase.expectedOutcomes.map(outcome => 
        this.checkOutcome(conversation, outcome)
      )
    );
    
    // Calculate metrics
    const metrics = await this.calculateMetrics(conversation, testCase.metrics);
    
    return { checks, metrics, passed: checks.every(c => c.passed) };
  }
}
```

### Automated Checks Implementation

```typescript
// checks/context-retention.ts
export async function checkEntityRecall(
  conversationId: string,
  entityType: string,
  expectedValue: string
): Promise<CheckResult> {
  const query = `What ${entityType} did I mention earlier?`;
  const response = await sendMessage(conversationId, query);
  
  const containsEntity = response.toLowerCase().includes(expectedValue.toLowerCase());
  const confidence = calculateSimilarity(response, expectedValue);
  
  return {
    passed: containsEntity && confidence > 0.7,
    score: confidence,
    details: { entityType, expectedValue, actualResponse: response }
  };
}

// checks/accuracy.ts
export async function checkFactualAccuracy(
  response: string,
  expectedFacts: Fact[],
  sources: Source[]
): Promise<CheckResult> {
  const factChecks = expectedFacts.map(fact => {
    const mentioned = response.includes(fact.value);
    const hasSource = fact.requiresSource ? 
      checkHasSource(response, sources) : true;
    
    return { fact, passed: mentioned && hasSource };
  });
  
  const accuracy = factChecks.filter(c => c.passed).length / factChecks.length;
  
  return {
    passed: accuracy >= 0.9,
    score: accuracy,
    details: { factChecks }
  };
}

// checks/citations.ts
export function checkCitationFormat(response: string): CheckResult {
  const citations = extractCitations(response);
  const validFormat = citations.every(c => /\[Source \d+\]/.test(c));
  
  return {
    passed: validFormat,
    score: validFormat ? 1.0 : 0.0,
    details: { citations, validFormat }
  };
}

export function checkCitationValidity(
  response: string,
  retrievedSources: Source[]
): CheckResult {
  const citations = extractCitations(response);
  const sourceNumbers = citations.map(c => 
    parseInt(c.match(/\d+/)?.[0] || '0')
  );
  
  const validNumbers = sourceNumbers.every(num => 
    num >= 1 && num <= retrievedSources.length
  );
  
  const noFabricated = sourceNumbers.length <= retrievedSources.length;
  
  return {
    passed: validNumbers && noFabricated,
    score: validNumbers && noFabricated ? 1.0 : 0.0,
    details: { citations, sourceNumbers, retrievedCount: retrievedSources.length }
  };
}
```

## Test Data Management

### Test Conversation Storage

**Structure**:
```typescript
interface TestConversation {
  id: string;
  category: string;
  messages: TestMessage[];
  expectedEntities: Entity[];
  expectedFacts: Fact[];
  expectedFormat: 'wizard' | 'freeform';
  metadata: {
    createdAt: Date;
    lastRun: Date;
    passRate: number;
  };
}

interface TestMessage {
  role: 'user' | 'assistant';
  content: string;
  turnNumber: number;
  expectedResponse?: {
    contains?: string[];
    format?: string;
    sources?: number;
  };
}
```

### Ground Truth Dataset

**Location**: `tests/data/ground-truth.json`

**Structure**:
- 100 test conversations
- Expected outcomes for each
- Entity tracking requirements
- Fact validation requirements

## Reporting

### Test Report Format

```typescript
interface TestReport {
  timestamp: Date;
  testSuite: string;
  totalTests: number;
  passed: number;
  failed: number;
  metrics: {
    contextRetention: number;
    accuracy: number;
    formatCompliance: number;
    citationAccuracy: number;
  };
  failures: TestFailure[];
  improvements: Improvement[];
  recommendations: string[];
}
```

### Dashboard Metrics

**Real-time Monitoring**:
- Context retention rate (last 24h)
- Accuracy rate (last 24h)
- Format compliance (last 24h)
- Average response time
- Error rate

**Weekly Reports**:
- Test suite results
- Metric trends
- Failure analysis
- Improvement tracking

## Continuous Improvement

### Test Suite Evolution

1. **Add New Test Cases**
   - Based on production issues
   - User feedback
   - Edge cases discovered

2. **Update Thresholds**
   - As system improves
   - Based on user expectations
   - Industry benchmarks

3. **Expand Coverage**
   - New conversation types
   - New modes
   - New features

## Next Steps

1. Create test dataset (100 conversations)
2. Implement test automation framework
3. Run baseline measurements
4. Set up continuous testing
5. Integrate with CI/CD pipeline
6. Create monitoring dashboard
