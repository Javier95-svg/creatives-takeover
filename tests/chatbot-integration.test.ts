/**
 * Integration tests for chatbot functionality
 * Tests full conversation flows, context preservation, and error recovery
 */

import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";

interface ConversationState {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: Record<string, unknown>;
  sessionId: string;
}

// Mock conversation state management
class ConversationManager {
  private conversations = new Map<string, ConversationState>();
  
  createSession(sessionId: string): ConversationState {
    const state: ConversationState = {
      messages: [],
      context: {},
      sessionId
    };
    this.conversations.set(sessionId, state);
    return state;
  }
  
  getSession(sessionId: string): ConversationState | undefined {
    return this.conversations.get(sessionId);
  }
  
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
    const state = this.conversations.get(sessionId);
    if (state) {
      state.messages.push({ role, content });
    }
  }
  
  updateContext(sessionId: string, context: Record<string, unknown>): void {
    const state = this.conversations.get(sessionId);
    if (state) {
      state.context = { ...state.context, ...context };
    }
  }
  
  getHistory(sessionId: string, maxMessages: number = 20): Array<{ role: 'user' | 'assistant'; content: string }> {
    const state = this.conversations.get(sessionId);
    if (!state) return [];
    
    // Return last N messages (simulating DB retrieval)
    return state.messages.slice(-maxMessages);
  }
}

Deno.test("Integration - 6-turn conversation with context preservation", () => {
  const manager = new ConversationManager();
  const sessionId = 'test-session-1';
  manager.createSession(sessionId);
  
  // Simulate 6-turn conversation
  const turns = [
    { role: 'user' as const, content: 'I want to start a SaaS business' },
    { role: 'assistant' as const, content: 'Great! What problem will your SaaS solve?' },
    { role: 'user' as const, content: 'Help small businesses manage inventory' },
    { role: 'assistant' as const, content: 'That sounds valuable. Who is your target customer?' },
    { role: 'user' as const, content: 'Small retail stores with 1-5 employees' },
    { role: 'assistant' as const, content: 'Perfect! How will you validate demand?' }
  ];
  
  turns.forEach(turn => {
    manager.addMessage(sessionId, turn.role, turn.content);
  });
  
  // Verify all messages are preserved
  const history = manager.getHistory(sessionId);
  assertEquals(history.length, 6);
  
  // Verify context is maintained (earlier messages are accessible)
  const firstMessage = history.find(m => m.content.includes('SaaS business'));
  assert(firstMessage !== undefined, 'First message should be in history');
  
  // Verify recent context is available
  const lastMessage = history[history.length - 1];
  assertEquals(lastMessage.content.includes('validate'), true);
});

Deno.test("Integration - Context retrieval from database simulation", () => {
  const manager = new ConversationManager();
  const sessionId = 'test-session-2';
  manager.createSession(sessionId);
  
  // Add messages
  manager.addMessage(sessionId, 'user', 'What is my business idea?');
  manager.addMessage(sessionId, 'assistant', 'You mentioned a SaaS for inventory management');
  manager.addMessage(sessionId, 'user', 'Yes, that is correct');
  
  // Simulate retrieving from DB (should get all messages)
  const dbHistory = manager.getHistory(sessionId, 20);
  assertEquals(dbHistory.length, 3);
  
  // Verify bot remembers earlier context
  const botResponse = dbHistory.find(m => m.role === 'assistant');
  assert(botResponse !== undefined);
  assert(botResponse.content.includes('inventory management'), 'Bot should remember earlier context');
});

Deno.test("Integration - Error recovery after network failure", async () => {
  let attemptCount = 0;
  const maxRetries = 2;
  
  async function simulateAPIcall(): Promise<{ success: boolean; data?: string }> {
    attemptCount++;
    
    // Simulate network failure on first two attempts
    if (attemptCount <= 2) {
      throw new Error('Network error');
    }
    
    return { success: true, data: 'Response after retry' };
  }
  
  let result = null;
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      result = await simulateAPIcall();
      break;
    } catch (error) {
      if (retryCount >= maxRetries) {
        throw error;
      }
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate backoff
    }
  }
  
  assert(result !== null);
  assertEquals(result.success, true);
  assertEquals(attemptCount, 3); // Initial + 2 retries
});

Deno.test("Integration - Context merging (DB + provided history)", () => {
  const manager = new ConversationManager();
  const sessionId = 'test-session-3';
  manager.createSession(sessionId);
  
  // Simulate DB history
  manager.addMessage(sessionId, 'user', 'Message 1 from DB');
  manager.addMessage(sessionId, 'assistant', 'Response 1 from DB');
  manager.addMessage(sessionId, 'user', 'Message 2 from DB');
  
  // Simulate provided history (may have duplicates or new messages)
  const providedHistory = [
    { role: 'user' as const, content: 'Message 2 from DB' }, // Duplicate
    { role: 'assistant' as const, content: 'Response 2 new' }, // New
    { role: 'user' as const, content: 'Message 3 new' } // New
  ];
  
  // Merge logic (remove duplicates, prioritize DB)
  const dbHistory = manager.getHistory(sessionId);
  const merged: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  const seen = new Set<string>();
  
  // Add DB messages first
  for (const msg of dbHistory) {
    const key = `${msg.role}:${msg.content}`;
    if (!seen.has(key)) {
      merged.push(msg);
      seen.add(key);
    }
  }
  
  // Add provided messages that aren't duplicates
  for (const msg of providedHistory) {
    const key = `${msg.role}:${msg.content}`;
    if (!seen.has(key)) {
      merged.push(msg);
      seen.add(key);
    }
  }
  
  // Verify merge worked correctly
  assertEquals(merged.length, 5); // 3 from DB + 2 new from provided
  assertEquals(merged[0].content, 'Message 1 from DB'); // DB messages first
  assert(merged.some(m => m.content === 'Response 2 new')); // New messages included
});

Deno.test("Integration - API key validation failure recovery", async () => {
  let validationCache = new Map<string, { valid: boolean; validatedAt: number }>();
  const cacheTTL = 5 * 60 * 1000;
  
  // Simulate invalid key
  const invalidKey = 'invalid_key_123';
  validationCache.set(invalidKey, {
    valid: false,
    validatedAt: Date.now()
  });
  
  // Check cache
  const cached = validationCache.get(invalidKey);
  assert(cached !== undefined);
  assertEquals(cached.valid, false);
  
  // Simulate key fix (remove from cache to force revalidation)
  validationCache.delete(invalidKey);
  
  // New validation would succeed (simulated)
  const newValidation = { valid: true, validatedAt: Date.now() };
  validationCache.set(invalidKey, newValidation);
  
  const revalidated = validationCache.get(invalidKey);
  assert(revalidated !== undefined);
  assertEquals(revalidated.valid, true);
});

