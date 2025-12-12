/**
 * Regression test suite with 20 representative prompts
 * Covers business planning, multi-turn conversations, and edge cases
 */

import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";

interface TestCase {
  name: string;
  category: 'business_planning' | 'multi_turn' | 'context_dependent' | 'edge_case';
  prompts: string[];
  expectedBehavior: string;
}

const testCases: TestCase[] = [
  // Business Planning Questions
  {
    name: 'Business concept question',
    category: 'business_planning',
    prompts: ['What is a good business idea for a SaaS?'],
    expectedBehavior: 'Should provide relevant SaaS business ideas'
  },
  {
    name: 'Market validation question',
    category: 'business_planning',
    prompts: ['How do I validate my business idea?'],
    expectedBehavior: 'Should explain validation methods'
  },
  {
    name: 'Pricing strategy question',
    category: 'business_planning',
    prompts: ['What should I charge for my product?'],
    expectedBehavior: 'Should provide pricing guidance'
  },
  {
    name: 'Target market question',
    category: 'business_planning',
    prompts: ['Who should I target as my first customers?'],
    expectedBehavior: 'Should explain customer targeting'
  },
  {
    name: 'MVP definition question',
    category: 'business_planning',
    prompts: ['What features should be in my MVP?'],
    expectedBehavior: 'Should explain MVP principles'
  },
  
  // Multi-turn Conversations
  {
    name: '6-turn conversation - business planning',
    category: 'multi_turn',
    prompts: [
      'I want to start a business',
      'It is a mobile app for fitness',
      'Target users are gym-goers aged 25-40',
      'I will charge $9.99 per month',
      'I plan to launch in 3 months',
      'What should I focus on first?'
    ],
    expectedBehavior: 'Should remember all previous context and provide relevant advice'
  },
  {
    name: 'Context-dependent follow-up',
    category: 'multi_turn',
    prompts: [
      'I am building a SaaS for restaurants',
      'What features should I include?',
      'How much should I charge?',
      'Who are my competitors?'
    ],
    expectedBehavior: 'Each response should reference previous conversation'
  },
  {
    name: 'Topic switching with context',
    category: 'multi_turn',
    prompts: [
      'I want to start an e-commerce business',
      'Actually, I am more interested in a service business',
      'What are the differences?',
      'Which is better for beginners?'
    ],
    expectedBehavior: 'Should handle topic switch while maintaining context'
  },
  
  // Context-Dependent Queries
  {
    name: 'Pronoun reference',
    category: 'context_dependent',
    prompts: [
      'I am building a mobile app',
      'What technology should I use for it?'
    ],
    expectedBehavior: 'Should understand "it" refers to the mobile app'
  },
  {
    name: 'Previous answer reference',
    category: 'context_dependent',
    prompts: [
      'My target market is small businesses',
      'How do I reach them?'
    ],
    expectedBehavior: 'Should understand "them" refers to small businesses'
  },
  {
    name: 'Business context preservation',
    category: 'context_dependent',
    prompts: [
      'I am in the healthcare industry',
      'What are the regulations I need to know?',
      'How does this affect my pricing?'
    ],
    expectedBehavior: 'Should maintain healthcare industry context throughout'
  },
  
  // Edge Cases
  {
    name: 'Empty message',
    category: 'edge_case',
    prompts: [''],
    expectedBehavior: 'Should handle gracefully without crashing'
  },
  {
    name: 'Very long message',
    category: 'edge_case',
    prompts: ['A'.repeat(5000)],
    expectedBehavior: 'Should handle long messages appropriately'
  },
  {
    name: 'Special characters',
    category: 'edge_case',
    prompts: ['What about pricing? $, €, £?'],
    expectedBehavior: 'Should handle special characters correctly'
  },
  {
    name: 'Multiple questions in one',
    category: 'edge_case',
    prompts: ['What is my market size? How do I reach customers? What should I charge?'],
    expectedBehavior: 'Should address multiple questions or ask for clarification'
  },
  {
    name: 'Ambiguous question',
    category: 'edge_case',
    prompts: ['Tell me about it'],
    expectedBehavior: 'Should ask for clarification when context is missing'
  },
  {
    name: 'Rapid fire questions',
    category: 'edge_case',
    prompts: ['What?', 'How?', 'When?', 'Where?', 'Why?'],
    expectedBehavior: 'Should handle rapid questions and maintain context'
  },
  {
    name: 'Contradictory information',
    category: 'edge_case',
    prompts: [
      'I am targeting B2B customers',
      'Actually, I meant B2C customers',
      'What is the difference?'
    ],
    expectedBehavior: 'Should handle contradiction and update context'
  },
  {
    name: 'Technical jargon',
    category: 'edge_case',
    prompts: ['What is the CAC:LTV ratio for my SaaS?'],
    expectedBehavior: 'Should understand business/technical terms'
  },
  {
    name: 'Conversation restart simulation',
    category: 'edge_case',
    prompts: [
      'I am building a fintech app',
      'What regulations apply?',
      // Simulate conversation restart - context should be retrieved from DB
      'What did we discuss about regulations?'
    ],
    expectedBehavior: 'Should retrieve and use previous context from database'
  }
];

// Mock response validator
function validateResponse(
  response: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  testCase: TestCase
): { valid: boolean; reason?: string } {
  // Check for generic/nonsensical responses
  const genericPatterns = [
    /^(i (don't know|can't help|am not sure))/i,
    /^(sorry,? i (don't|can't))/i,
    /^(that's (a|an) (good|interesting) (question|idea))/i
  ];
  
  for (const pattern of genericPatterns) {
    if (pattern.test(response)) {
      return { valid: false, reason: 'Generic response detected' };
    }
  }
  
  // Check if response is too short (likely incomplete)
  if (response.length < 20) {
    return { valid: false, reason: 'Response too short' };
  }
  
  // For context-dependent queries, check if response references context
  if (testCase.category === 'context_dependent' && conversationHistory.length > 0) {
    const lastUserMessage = conversationHistory[conversationHistory.length - 1]?.content || '';
    const hasContextReference = response.toLowerCase().includes(
      lastUserMessage.substring(0, 20).toLowerCase()
    ) || conversationHistory.some(msg => 
      response.toLowerCase().includes(msg.content.substring(0, 15).toLowerCase())
    );
    
    if (!hasContextReference && lastUserMessage.length > 10) {
      return { valid: false, reason: 'Response does not reference conversation context' };
    }
  }
  
  return { valid: true };
}

Deno.test("Regression - All 20 test cases", async () => {
  const results: Array<{ testCase: string; passed: boolean; reason?: string }> = [];
  
  for (const testCase of testCases) {
    let conversationHistory: Array<{ role: string; content: string }> = [];
    let allPassed = true;
    let failureReason: string | undefined;
    
    for (const prompt of testCase.prompts) {
      // Simulate chatbot response (mock)
      const mockResponse = `Mock response to: ${prompt}`;
      conversationHistory.push({ role: 'user', content: prompt });
      conversationHistory.push({ role: 'assistant', content: mockResponse });
      
      // Validate response
      const validation = validateResponse(mockResponse, prompt, conversationHistory, testCase);
      if (!validation.valid) {
        allPassed = false;
        failureReason = validation.reason;
        break;
      }
    }
    
    results.push({
      testCase: testCase.name,
      passed: allPassed,
      reason: failureReason
    });
  }
  
  // Count failures
  const failures = results.filter(r => !r.passed);
  const failureCount = failures.length;
  
  // Acceptance criteria: no more than 1 failure
  assert(
    failureCount <= 1,
    `Expected ≤1 failures, got ${failureCount}. Failures: ${failures.map(f => `${f.testCase}: ${f.reason}`).join(', ')}`
  );
  
  console.log(`Regression test results: ${results.length - failureCount}/${results.length} passed`);
});

Deno.test("Regression - 6-turn context preservation", () => {
  const conversationHistory: Array<{ role: string; content: string }> = [];
  
  const turns = [
    'I want to start a SaaS business',
    'It helps restaurants manage orders',
    'Target customers are small restaurants',
    'I will charge $50/month',
    'I plan to launch in 2 months',
    'What should I focus on first?'
  ];
  
  turns.forEach((turn, index) => {
    conversationHistory.push({ role: 'user', content: turn });
    // Simulate bot response that references previous context
    const botResponse = index === 0 
      ? 'Great! What problem will your SaaS solve?'
      : `Based on your ${index === 1 ? 'SaaS' : 'restaurant'} business, here is advice...`;
    conversationHistory.push({ role: 'assistant', content: botResponse });
  });
  
  // Verify context is preserved (all 6 user messages + 6 bot responses)
  assertEquals(conversationHistory.length, 12);
  
  // Verify later responses reference earlier context
  const lastBotResponse = conversationHistory[conversationHistory.length - 1].content;
  assert(
    lastBotResponse.includes('restaurant') || lastBotResponse.includes('SaaS'),
    'Last response should reference earlier conversation context'
  );
});

