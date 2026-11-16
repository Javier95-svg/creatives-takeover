import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireMemberOrWorker } from '../_shared/guards.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Every call spends our AI or API quota: our own jobs, or a signed-in member
  // within a per-minute limit.
  const caller = await requireMemberOrWorker(req, 'speech-to-text', 10);
  if (caller.error) return caller.error;

  try {
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log('Processing audio transcription request');

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });

    // OpenAI Whisper first, Groq's Whisper as the free backup (2026-11-16:
    // OpenAI had no credit from Nov 12 and voice notes failed). Same form.
    const providers = [
      { name: 'openai', url: 'https://api.openai.com/v1/audio/transcriptions', key: Deno.env.get('OPENAI_API_KEY')?.trim(), model: 'whisper-1' },
      { name: 'groq', url: 'https://api.groq.com/openai/v1/audio/transcriptions', key: Deno.env.get('GROQ_API_KEY')?.trim(), model: 'whisper-large-v3' },
    ].filter((provider) => provider.key);

    let text: string | null = null;
    let lastError = 'No transcription provider is configured';
    for (const provider of providers) {
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');
      formData.append('model', provider.model);
      formData.append('language', 'en');
      formData.append('prompt', 'This is a business-related conversation about startup ideas, market analysis, and entrepreneurship.');
      formData.append('response_format', 'json');
      try {
        const response = await fetch(provider.url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${provider.key}` },
          body: formData,
          signal: AbortSignal.timeout(45_000),
        });
        if (!response.ok) {
          lastError = `${provider.name} ${response.status}: ${(await response.text()).slice(0, 200)}`;
          console.error('Transcription failed:', lastError);
          continue;
        }
        const result = await response.json();
        if (typeof result?.text === 'string') {
          text = result.text as string;
          console.log(`Transcription successful via ${provider.name} (${result.text.length} characters)`);
          break;
        }
        lastError = `${provider.name} returned no text`;
      } catch (error) {
        lastError = `${provider.name}: ${error instanceof Error ? error.message : String(error)}`;
        console.error('Transcription failed:', lastError);
      }
    }
    if (text === null) throw new Error(`Transcription unavailable (${lastError})`);

    return new Response(
      JSON.stringify({ text }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Speech-to-text error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});