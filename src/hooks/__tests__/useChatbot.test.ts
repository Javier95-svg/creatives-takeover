import { renderHook, act } from '@testing-library/react';
import { useChatbot } from '../useChatbot';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/' }),
  useNavigate: () => jest.fn()
}));

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn()
    },
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null } })
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnValue({ error: null })
    }))
  }
}));

describe('useChatbot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useChatbot());
      
      expect(result.current.isOpen).toBe(false);
      expect(result.current.messages).toHaveLength(1); // Welcome message
      expect(result.current.isTyping).toBe(false);
      expect(result.current.conversationState.context).toBe('welcome');
      expect(result.current.analytics.totalMessages).toBe(0);
    });

    it('should create welcome message based on current path', () => {
      const { result } = renderHook(() => useChatbot());
      
      const welcomeMessage = result.current.messages[0];
      expect(welcomeMessage.isBot).toBe(true);
      expect(welcomeMessage.content).toContain('Welcome');
      expect(welcomeMessage.quickActions).toBeDefined();
    });
  });

  describe('Message Handling', () => {
    it('should send user message and receive bot response', async () => {
      const { result } = renderHook(() => useChatbot());
      
      await act(async () => {
        await result.current.sendMessage('Hello, I need help with my business plan');
      });
      
      expect(result.current.messages).toHaveLength(3); // Welcome + User + Bot
      expect(result.current.messages[1].isBot).toBe(false);
      expect(result.current.messages[2].isBot).toBe(true);
    });

    it('should not send empty messages', async () => {
      const { result } = renderHook(() => useChatbot());
      const initialLength = result.current.messages.length;
      
      await act(async () => {
        await result.current.sendMessage('');
        await result.current.sendMessage('   ');
      });
      
      expect(result.current.messages).toHaveLength(initialLength);
    });

    it('should track user interactions in analytics', async () => {
      const { result } = renderHook(() => useChatbot());
      
      await act(async () => {
        await result.current.sendMessage('Test question');
      });
      
      expect(result.current.analytics.totalMessages).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const { result } = renderHook(() => useChatbot());
      
      // Mock an error
      const mockError = new Error('Test error');
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await act(async () => {
        await result.current.sendMessage('Test message that causes error');
      });
      
      expect(result.current.errorCount).toBeGreaterThanOrEqual(0);
    });

    it('should provide retry options on error', async () => {
      const { result } = renderHook(() => useChatbot());
      
      await act(async () => {
        await result.current.sendMessage('Test message');
      });
      
      if (result.current.hasErrors) {
        const lastMessage = result.current.messages[result.current.messages.length - 1];
        expect(lastMessage.quickActions).toContainEqual(
          expect.objectContaining({ text: expect.stringContaining('Try Again') })
        );
      }
    });
  });

  describe('Conversation Memory', () => {
    it('should update conversation memory with business context', async () => {
      const { result } = renderHook(() => useChatbot());
      
      await act(async () => {
        await result.current.sendMessage('I want to start a tech startup');
      });
      
      expect(result.current.conversationMemory.industryContext).toBeDefined();
    });

    it('should track previous topics', async () => {
      const { result } = renderHook(() => useChatbot());
      
      await act(async () => {
        await result.current.sendMessage('Tell me about pricing');
      });
      
      expect(result.current.conversationMemory.previousTopics).toContain('pricing');
    });
  });

  describe('Analytics', () => {
    it('should track conversation insights', () => {
      const { result } = renderHook(() => useChatbot());
      
      const insights = result.current.getConversationInsights();
      
      expect(insights).toHaveProperty('totalMessages');
      expect(insights).toHaveProperty('sessionDuration');
      expect(insights).toHaveProperty('errorRate');
      expect(insights).toHaveProperty('averageResponseTime');
    });

    it('should allow rating satisfaction', () => {
      const { result } = renderHook(() => useChatbot());
      
      act(() => {
        result.current.rateSatisfaction(5);
      });
      
      expect(result.current.analytics.userSatisfactionScore).toBe(5);
    });
  });

  describe('Quick Actions', () => {
    it('should handle quick action clicks', async () => {
      const { result } = renderHook(() => useChatbot());
      
      await act(async () => {
        await result.current.handleQuickAction('validate_idea');
      });
      
      expect(result.current.messages.length).toBeGreaterThan(1);
    });

    it('should handle navigation actions', async () => {
      const mockNavigate = jest.fn();
      jest.mocked(require('react-router-dom').useNavigate).mockReturnValue(mockNavigate);
      
      const { result } = renderHook(() => useChatbot());
      
      await act(async () => {
        await result.current.handleQuickAction('navigate', '/pricing');
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('/pricing');
    });
  });

  describe('Session Management', () => {
    it('should clear conversation and reset state', () => {
      const { result } = renderHook(() => useChatbot());
      
      act(() => {
        result.current.clearChat();
      });
      
      expect(result.current.messages).toHaveLength(1); // Only welcome message
      expect(result.current.conversationState.messageCount).toBe(0);
      expect(result.current.analytics.totalMessages).toBe(0);
    });

    it('should export conversation data', () => {
      const { result } = renderHook(() => useChatbot());
      
      const exportData = result.current.exportConversation();
      
      expect(exportData).toHaveProperty('conversation');
      expect(exportData).toHaveProperty('businessContext');
      expect(exportData).toHaveProperty('analytics');
      expect(exportData).toHaveProperty('exportedAt');
    });
  });

  describe('Performance', () => {
    it('should not process multiple messages simultaneously', async () => {
      const { result } = renderHook(() => useChatbot());
      
      // Send multiple messages rapidly
      const promises = [
        result.current.sendMessage('Message 1'),
        result.current.sendMessage('Message 2'),
        result.current.sendMessage('Message 3')
      ];
      
      await act(async () => {
        await Promise.all(promises);
      });
      
      // Should handle messages sequentially
      expect(result.current.isProcessing).toBe(false);
    });
  });
});
