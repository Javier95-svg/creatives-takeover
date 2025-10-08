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
      if (parsed.type === 'delta' && parsed.content) {
        fullMessage += parsed.content;
      }
    } catch (e) {
      console.error('Final buffer parse error:', e);
    }
  }

  console.log('✅ Streaming complete:', { messageLength: fullMessage.length });

  return fullMessage;
};
