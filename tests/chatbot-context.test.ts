/**
 * Unit tests for context management
 */

import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Mock the selectImportantMessages function
function selectImportantMessages(messages: ChatMessage[], maxMessages: number): ChatMessage[] {
  if (messages.length <= maxMessages) {
    return messages;
  }

  // Score each message by importance
  const scoredMessages = messages.map((msg, index) => {
    let score = 0;
    const isRecent = index >= messages.length - 5;
    const isSystem = msg.role === 'system';
    const isUser = msg.role === 'user';
    const contentLength = msg.content.length;
    
    if (isSystem) score += 1000;
    if (isRecent) score += 100 - (messages.length - index) * 10;
    if (isUser) {
      score += 50;
      if (msg.content.includes('?')) score += 30;
    }
    if (contentLength > 100) score += 20;
    if (contentLength > 300) score += 30;
    if (msg.role === 'assistant' && contentLength > 150) {
      score += 25;
    }
    
    return { message: msg, score, index };
  });

  scoredMessages.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.index - a.index;
  });

  const selected = scoredMessages
    .slice(0, maxMessages)
    .sort((a, b) => a.index - b.index)
    .map(item => item.message);

  return selected;
}

Deno.test("Context selection - preserves all messages when under limit", () => {
  const messages: ChatMessage[] = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
    { role: 'user', content: 'How are you?' }
  ];
  
  const selected = selectImportantMessages(messages, 10);
  assertEquals(selected.length, 3);
  assertEquals(selected, messages);
});

Deno.test("Context selection - prioritizes system messages", () => {
  const messages: ChatMessage[] = [
    { role: 'user', content: 'Message 1' },
    { role: 'system', content: 'System instruction' },
    { role: 'user', content: 'Message 2' },
    { role: 'assistant', content: 'Response 1' },
    { role: 'user', content: 'Message 3' },
    { role: 'assistant', content: 'Response 2' },
    { role: 'user', content: 'Message 4' },
    { role: 'assistant', content: 'Response 3' },
    { role: 'user', content: 'Message 5' },
    { role: 'assistant', content: 'Response 4' },
    { role: 'user', content: 'Message 6' },
    { role: 'assistant', content: 'Response 5' }
  ];
  
  const selected = selectImportantMessages(messages, 5);
  
  // System message should always be included
  const hasSystem = selected.some(msg => msg.role === 'system');
  assertEquals(hasSystem, true);
});

Deno.test("Context selection - prioritizes recent messages", () => {
  const messages: ChatMessage[] = Array.from({ length: 30 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
    content: `Message ${i}`
  }));
  
  const selected = selectImportantMessages(messages, 10);
  
  // Should include recent messages
  const lastOriginalMessage = messages[messages.length - 1];
  const hasLastMessage = selected.some(msg => msg.content === lastOriginalMessage.content);
  assertEquals(hasLastMessage, true);
});

Deno.test("Context selection - prioritizes user questions", () => {
  const messages: ChatMessage[] = [
    { role: 'user', content: 'Simple statement' },
    { role: 'assistant', content: 'Response' },
    { role: 'user', content: 'What is the answer?' },
    { role: 'assistant', content: 'Another response' },
    { role: 'user', content: 'Another statement' }
  ];
  
  const selected = selectImportantMessages(messages, 3);
  
  // Question should be prioritized
  const hasQuestion = selected.some(msg => msg.content.includes('?'));
  assertEquals(hasQuestion, true);
});

Deno.test("Context selection - maintains chronological order", () => {
  const messages: ChatMessage[] = Array.from({ length: 25 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
    content: `Message ${i}`
  }));
  
  const selected = selectImportantMessages(messages, 10);
  
  // Check that order is maintained
  for (let i = 1; i < selected.length; i++) {
    const prevIndex = messages.findIndex(m => m.content === selected[i - 1].content);
    const currIndex = messages.findIndex(m => m.content === selected[i].content);
    assert(prevIndex < currIndex, 'Messages should be in chronological order');
  }
});

