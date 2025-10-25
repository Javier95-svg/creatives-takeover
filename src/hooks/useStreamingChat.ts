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
  chatMode: 'wizard' | 'freeform',
  onChunk?: (chunk: string) => void,
  onComplete?: (fullMessage: string) => void,
  onError?: (error: Error) => void
): Promise<string> => {
  const STREAM_URL = `https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/chatbot-streaming`;

  console.log('🚀 Starting SSE streaming chat:', { 
    sessionId, 
    messageLength: message.length,
    wizardMode: wizardMode?.enabled,
    currentStep,
    url: STREAM_URL 
  });

  let fullMessage = '';
  let eventSource: EventSource | null = null;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  const cleanup = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };

  const connectWithRetry = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // EventSource doesn't support POST, so we'll use fetch with manual SSE parsing
        fetch(STREAM_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          if (!response.body) {
            throw new Error('No response body');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          console.log('📡 SSE connection established');

          const processStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                  console.log('✅ Stream complete. Message length:', fullMessage.length);
                  onComplete?.(fullMessage);
                  resolve(fullMessage);
                  break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (!line.trim() || line.startsWith(':')) continue;
                  if (!line.startsWith('data: ')) continue;

                  const data = line.slice(6).trim();
                  if (data === '[DONE]') {
                    console.log('✅ Received [DONE] signal');
                    onComplete?.(fullMessage);
                    resolve(fullMessage);
                    return;
                  }

                  try {
                    const parsed = JSON.parse(data);

                    if (parsed.type === 'delta' && parsed.content) {
                      fullMessage += parsed.content;
                      onChunk?.(parsed.content);
                    } else if (parsed.type === 'error') {
                      console.error('❌ Stream error:', parsed.error);
                      throw new Error(parsed.error);
                    }
                  } catch (parseError) {
                    console.error('⚠️ Parse error:', parseError, 'Data:', data.substring(0, 100));
                  }
                }
              }
            } catch (streamError) {
              console.error('❌ Stream processing error:', streamError);
              
              // If we got partial content, return it
              if (fullMessage.length > 0) {
                console.log('⚠️ Returning partial message after error:', fullMessage.length, 'chars');
                onComplete?.(fullMessage);
                resolve(fullMessage);
              } else if (retryCount < MAX_RETRIES) {
                // Retry with exponential backoff
                retryCount++;
                const delay = Math.pow(2, retryCount) * 1000;
                console.log(`🔄 Retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);
                
                setTimeout(() => {
                  connectWithRetry().then(resolve).catch(reject);
                }, delay);
              } else {
                const error = new Error('Stream interrupted. Please try again.');
                onError?.(error);
                reject(error);
              }
            }
          };

          processStream();
        }).catch((fetchError) => {
          console.error('❌ Fetch error:', fetchError);
          
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`🔄 Retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);
            
            setTimeout(() => {
              connectWithRetry().then(resolve).catch(reject);
            }, delay);
          } else {
            const error = new Error('Failed to connect to chat service. Please try again.');
            onError?.(error);
            reject(error);
          }
        });

      } catch (error) {
        console.error('❌ Connection error:', error);
        const err = error instanceof Error ? error : new Error('Unknown error');
        onError?.(err);
        reject(err);
      }
    });
  };

  try {
    const result = await connectWithRetry();
    cleanup();
    return result;
  } catch (error) {
    cleanup();
    throw error;
  }
};

// Cancel function for stopping streaming
export const cancelStream = () => {
  console.log('🛑 Cancelling stream');
  // Cleanup will happen automatically when component unmounts
};
