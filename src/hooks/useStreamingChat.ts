import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface BusinessContext {
  industry?: string;
  businessType?: string;
  stage?: string;
  location?: string;
  budget?: string;
  goals?: string[];
}

interface WizardMode {
  enabled: boolean;
  currentStep: number;
  steps: any[];
  answers: Record<string, string>;
}

export const streamChat = async (
  message: string,
  sessionId: string,
  conversationHistory: Message[],
  businessContext: BusinessContext,
  userId: string | null,
  wizardMode: WizardMode | null,
  currentStep: number | null,
  chatMode: 'wizard' | 'freeform'
): Promise<string> => {
  const CHAT_URL = `https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/chatbot-streaming`;
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjamxheWJqbm96cWJzb3h6Ym9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDM4MzQsImV4cCI6MjA3MTExOTgzNH0.mDo9bIJKgEYqEKkVzHawTw9eefIq3BzrywmwztBhzng";

  console.log('🚀 Starting streaming chat request:', { 
    sessionId, 
    messageLength: message.length,
    wizardMode: wizardMode?.enabled,
    currentStep,
    url: CHAT_URL 
  });

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
      wizardMode,
      currentStep,
      chatMode
    }),
  });

  console.log('📡 Streaming response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Streaming request failed:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error('⏰ Rate limit exceeded. Please wait a moment and try again.');
    }
    if (response.status === 402) {
      throw new Error('💳 Payment required. Please add credits to continue.');
    }
    if (response.status === 500) {
      throw new Error('🔧 Server error. Our team has been notified. Please try again.');
    }
    throw new Error(`❌ Connection failed (${response.status}). Please refresh and try again.`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullMessage = '';
  let chunkCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('✅ Stream complete. Total chunks:', chunkCount, 'Message length:', fullMessage.length);
        break;
      }

      chunkCount++;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim() === '' || line.startsWith(':')) continue;
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'delta' && parsed.content) {
            fullMessage += parsed.content;
          }
        } catch (e) {
          console.error('⚠️ JSON parse error for chunk:', data.substring(0, 50), 'Error:', e);
          // Continue processing - don't fail the entire stream
        }
      }
    }

    // Process final buffer
    if (buffer.trim() && buffer.startsWith('data: ')) {
      const data = buffer.slice(6).trim();
      if (data !== '[DONE]') {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'delta' && parsed.content) {
            fullMessage += parsed.content;
          }
        } catch (e) {
          console.error('⚠️ Final buffer parse error:', e);
        }
      }
    }
  } catch (streamError) {
    console.error('❌ Stream reading error:', streamError);
    if (fullMessage.length === 0) {
      throw new Error('Stream interrupted. Please try sending your message again.');
    }
    // If we got partial content, return it
    console.log('⚠️ Returning partial message after error:', fullMessage.length, 'chars');
  }

  console.log('✅ Streaming complete:', { messageLength: fullMessage.length });

  return fullMessage;
};
