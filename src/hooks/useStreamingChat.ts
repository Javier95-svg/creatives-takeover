import { useState, useCallback, useRef } from 'react';

interface StreamMessage {
  content: string;
  isComplete: boolean;
  businessContext?: any;
  stage?: string;
  quickActions?: string[];
  conversationId?: string;
}

interface UseStreamingChatProps {
  onMessageComplete?: (message: StreamMessage) => void;
  onError?: (error: string) => void;
}

export const useStreamingChat = ({ onMessageComplete, onError }: UseStreamingChatProps = {}) => {
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamChat = useCallback(async (
    message: string,
    sessionId: string,
    conversationHistory: any[] = [],
    businessContext: any = {},
    userId: string | null = null
  ) => {
    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setStreamingMessage('');
    setIsStreaming(true);

    try {
      const CHAT_URL = `https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/chatbot-streaming`;
      const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjamxheWJqbm96cWJzb3h6Ym9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDM4MzQsImV4cCI6MjA3MTExOTgzNH0.mDo9bIJKgEYqEKkVzHawTw9eefIq3BzrywmwztBhzng";

      console.log('🚀 Starting streaming chat request:', { sessionId, messageLength: message.length });

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          message,
          sessionId,
          conversationHistory,
          businessContext,
          userId,
        }),
        signal: abortControllerRef.current.signal,
      });

      console.log('📡 Streaming response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Streaming request failed:', response.status, errorText);
        
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 402) {
          throw new Error('Payment required. Please add credits.');
        }
        throw new Error(`Failed to start stream: ${response.status} ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullMessage = '';
      let metadata: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'delta' && parsed.content) {
              fullMessage += parsed.content;
              setStreamingMessage(fullMessage);
            } else if (parsed.type === 'complete') {
              metadata = {
                businessContext: parsed.businessContext,
                stage: parsed.stage,
                quickActions: parsed.quickActions,
                conversationId: parsed.conversationId,
              };
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }

      // Process final buffer
      if (buffer.trim() && buffer.startsWith('data: ')) {
        const data = buffer.slice(6).trim();
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'complete') {
            metadata = {
              businessContext: parsed.businessContext,
              stage: parsed.stage,
              quickActions: parsed.quickActions,
              conversationId: parsed.conversationId,
            };
          }
        } catch (e) {
          console.error('Final buffer parse error:', e);
        }
      }

      setIsStreaming(false);
      console.log('✅ Streaming complete:', { messageLength: fullMessage.length, metadata });

      if (onMessageComplete) {
        onMessageComplete({
          content: fullMessage,
          isComplete: true,
          ...metadata,
        });
      }

      return {
        content: fullMessage,
        ...metadata,
      };

    } catch (error: any) {
      setIsStreaming(false);
      setStreamingMessage('');
      
      if (error.name === 'AbortError') {
        console.log('Stream cancelled');
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Streaming error:', errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }

      throw error;
    }
  }, [onMessageComplete, onError]);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMessage('');
  }, []);

  return {
    streamingMessage,
    isStreaming,
    streamChat,
    cancelStream,
  };
};
