# Enhanced Chatbot Hook Documentation

## Overview

The `useChatbot` hook provides a comprehensive, AI-powered business planning assistant with advanced state management, conversation memory, analytics tracking, and error handling capabilities.

## Features

### Core Functionality
- **AI-Powered Conversations**: Intelligent responses based on business context and user intent
- **Multi-Step Flows**: Support for complex conversational workflows
- **Contextual Memory**: Remembers user preferences, business details, and conversation history
- **Real-time Analytics**: Tracks user interactions, satisfaction, and business insights
- **Error Handling**: Robust error recovery with retry mechanisms
- **Session Management**: Persistent conversation state and export capabilities

### Business Intelligence
- **Industry-Specific Guidance**: Tailored advice based on business industry
- **Market Research Tools**: Integrated market analysis and competitor research
- **Financial Planning**: Revenue projections, cost analysis, and financial modeling
- **Conversation Analytics**: Track user engagement, popular topics, and conversion metrics

## API Reference

### Hook Return Values

```typescript
const {
  // Core ChatbotWidget compatibility
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: ChatMessage[];
  isTyping: boolean;
  sendMessage: (content: string) => Promise<void>;
  handleQuickAction: (action: string, href?: string) => Promise<void>;
  clearChat: () => void;
  toggleChat: () => void;
  
  // Enhanced business planning features
  conversationState: ConversationState;
  businessContext: BusinessContext;
  currentContext: ConversationContext;
  sessionDuration: number;
  messageCount: number;
  
  // New enhanced features
  analytics: ChatAnalytics;
  conversationMemory: ConversationMemory;
  conversationFlow: ConversationFlow;
  isProcessing: boolean;
  errorCount: number;
  lastError?: string;
  retryCount: number;
  
  // Action handlers
  clearConversation: () => void;
  exportConversation: () => void;
  rateSatisfaction: (score: number) => void;
  getConversationInsights: () => ConversationInsights;
  saveConversation: () => Promise<{success: boolean; error?: string}>;
  clearError: () => void;
  
  // Utility functions
  updateConversationState: (updates: Partial<ConversationState>) => void;
  businessPlanSections: string[];
  trackUserInteraction: (interaction: UserInteraction) => void;
  
  // Quick access to business insights
  getBusinessInsight: (industry: string) => BusinessInsight | undefined;
  
  // Session management
  sessionId: string;
  sessionStartTime: number;
  
  // Error handling
  hasErrors: boolean;
  canRetry: boolean;
} = useChatbot();
```

### Types

#### ChatMessage
```typescript
interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  quickActions?: QuickAction[];
  messageType?: 'text' | 'business_plan' | 'financial' | 'market_analysis' | 'recommendation';
  businessContext?: string;
  confidence?: number;
  sources?: string[];
  attachments?: Attachment[];
}
```

#### ConversationState
```typescript
interface ConversationState {
  context: ConversationContext;
  businessContext: BusinessContext;
  currentTopic?: string;
  sessionDuration: number;
  messageCount: number;
  userSatisfaction?: number;
  conversationFlow?: ConversationFlow;
  errorCount: number;
  lastError?: string;
  retryCount: number;
  isProcessing: boolean;
  conversationMemory: ConversationMemory;
}
```

#### ChatAnalytics
```typescript
interface ChatAnalytics {
  totalMessages: number;
  averageResponseTime: number;
  userSatisfactionScore: number;
  mostAskedQuestions: string[];
  conversationCompletionRate: number;
  errorRate: number;
  popularTopics: string[];
  sessionDuration: number;
}
```

## Usage Examples

### Basic Usage
```typescript
import { useChatbot } from '@/hooks/useChatbot';

function ChatbotComponent() {
  const {
    isOpen,
    messages,
    sendMessage,
    toggleChat,
    isTyping
  } = useChatbot();

  return (
    <div>
      <button onClick={toggleChat}>
        {isOpen ? 'Close Chat' : 'Open Chat'}
      </button>
      
      {isOpen && (
        <div className="chat-container">
          {messages.map(message => (
            <div key={message.id} className={message.isBot ? 'bot-message' : 'user-message'}>
              {message.content}
            </div>
          ))}
          
          {isTyping && <div>Bot is typing...</div>}
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const input = e.target.message;
            sendMessage(input.value);
            input.value = '';
          }}>
            <input name="message" placeholder="Ask about business planning..." />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}
```

### Advanced Usage with Analytics
```typescript
function AdvancedChatbotComponent() {
  const {
    sendMessage,
    analytics,
    conversationMemory,
    getConversationInsights,
    rateSatisfaction,
    exportConversation
  } = useChatbot();

  const handleSatisfactionRating = (score: number) => {
    rateSatisfaction(score);
    console.log('User satisfaction rated:', score);
  };

  const handleExport = () => {
    exportConversation();
    console.log('Conversation exported');
  };

  const insights = getConversationInsights();
  
  return (
    <div>
      {/* Chat UI */}
      
      {/* Analytics Dashboard */}
      <div className="analytics">
        <h3>Conversation Analytics</h3>
        <p>Messages: {analytics.totalMessages}</p>
        <p>Session Duration: {Math.round(analytics.sessionDuration / 1000)}s</p>
        <p>Average Response Time: {Math.round(analytics.averageResponseTime)}ms</p>
        <p>Error Rate: {analytics.errorRate.toFixed(1)}%</p>
        
        <div>
          <h4>Rate this conversation:</h4>
          {[1, 2, 3, 4, 5].map(score => (
            <button key={score} onClick={() => handleSatisfactionRating(score)}>
              {score}
            </button>
          ))}
        </div>
        
        <button onClick={handleExport}>Export Conversation</button>
      </div>
    </div>
  );
}
```

### Error Handling
```typescript
function ErrorHandlingExample() {
  const {
    sendMessage,
    hasErrors,
    lastError,
    canRetry,
    clearError
  } = useChatbot();

  return (
    <div>
      {hasErrors && (
        <div className="error-banner">
          <p>Error: {lastError}</p>
          {canRetry && (
            <button onClick={() => sendMessage('retry')}>
              Retry
            </button>
          )}
          <button onClick={clearError}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
```

## Best Practices

### 1. Error Handling
- Always check `hasErrors` before showing error states
- Use `canRetry` to determine if retry options should be shown
- Clear errors with `clearError()` when appropriate

### 2. Performance
- The hook uses `useCallback` and `useMemo` for optimal performance
- Avoid calling `sendMessage` multiple times rapidly
- Use `isProcessing` to prevent concurrent message processing

### 3. Analytics
- Track user interactions with `trackUserInteraction`
- Use `getConversationInsights()` for real-time analytics
- Export conversation data regularly for analysis

### 4. Memory Management
- The hook automatically manages conversation memory
- Business context is preserved across the session
- Use `exportConversation()` to save important conversations

### 5. State Management
- Use the reducer pattern for complex state updates
- Access state through the returned object, not directly
- Update state using provided utility functions

## Testing

The hook includes comprehensive test coverage:

```bash
npm test -- --testPathPattern=useChatbot
```

### Test Categories
- **Initialization**: Default state and welcome message
- **Message Handling**: Send/receive messages and error handling
- **Analytics**: User interaction tracking and insights
- **Memory**: Conversation context and business details
- **Quick Actions**: Action handling and navigation
- **Session Management**: Clear, export, and reset functionality
- **Performance**: Concurrent message handling

## Migration Guide

### From Basic Chatbot
If migrating from a basic chatbot implementation:

1. Replace direct state management with the hook
2. Update message handling to use `sendMessage`
3. Add error handling for better UX
4. Implement analytics tracking
5. Use conversation memory for context

### Breaking Changes
- `setMessages` is no longer directly exposed
- State updates must go through the reducer
- Error handling is now built-in
- Analytics are automatically tracked

## Troubleshooting

### Common Issues

1. **Messages not sending**
   - Check if `isProcessing` is true
   - Ensure message content is not empty
   - Verify error state with `hasErrors`

2. **Analytics not updating**
   - Ensure `trackUserInteraction` is called
   - Check if analytics object is properly initialized
   - Verify user interaction types

3. **Memory not persisting**
   - Check if `conversationMemory` is being updated
   - Ensure business context is properly set
   - Verify session persistence

4. **Performance issues**
   - Avoid rapid consecutive `sendMessage` calls
   - Use `isProcessing` to prevent concurrent processing
   - Check for memory leaks in cleanup functions

### Debug Mode
Enable debug logging by setting:
```typescript
localStorage.setItem('chatbot-debug', 'true');
```

This will log detailed information about:
- Message processing
- State updates
- Analytics tracking
- Error handling
- Memory updates
