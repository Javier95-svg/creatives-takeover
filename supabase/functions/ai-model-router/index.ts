import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModelRequest {
  provider: 'openai' | 'anthropic';
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  user_id?: string;
  function_name?: string;
  cache_key?: string;
}

interface ModelResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cached: boolean;
  provider: string;
  model: string;
}

class ModelRouter {
  private supabase: any;
  private openaiKey: string;
  private anthropicKey: string;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    this.openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
    this.anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
  }

  async route(request: ModelRequest): Promise<ModelResponse> {
    const startTime = Date.now();
    let success = true;
    let errorMessage = '';
    
    try {
      // Check cache first
      if (request.cache_key) {
        const cached = await this.getFromCache(request.cache_key);
        if (cached) {
          await this.logRequest(request, {
            ...cached,
            cached: true
          }, Date.now() - startTime, true, null);
          return {
            ...cached,
            cached: true
          };
        }
      }

      let response: ModelResponse;
      
      if (request.provider === 'anthropic') {
        response = await this.callAnthropic(request);
      } else {
        response = await this.callOpenAI(request);
      }

      response.cached = false;

      // Cache the response
      if (request.cache_key) {
        await this.saveToCache(request.cache_key, request, response);
      }

      await this.logRequest(request, response, Date.now() - startTime, success, errorMessage);
      return response;

    } catch (error) {
      success = false;
      errorMessage = error.message;
      console.error('Model router error:', error);
      
      await this.logRequest(request, null, Date.now() - startTime, success, errorMessage);
      
      // Try fallback provider
      if (request.provider === 'anthropic' && this.openaiKey) {
        console.log('Falling back to OpenAI...');
        try {
          const fallbackResponse = await this.callOpenAI({
            ...request,
            provider: 'openai',
            model: 'gpt-4o-mini' // Safe fallback model
          });
          return {
            ...fallbackResponse,
            cached: false
          };
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
      
      throw error;
    }
  }

  private async callOpenAI(request: ModelRequest): Promise<ModelResponse> {
    const isNewerModel = request.model.includes('gpt-5') || 
                        request.model.includes('gpt-4.1') || 
                        request.model.includes('o3') || 
                        request.model.includes('o4');

    const body: any = {
      model: request.model,
      messages: request.messages,
    };

    // Handle parameter differences between model generations
    if (isNewerModel) {
      if (request.max_tokens) {
        body.max_completion_tokens = request.max_tokens;
      }
      // Don't include temperature for newer models
    } else {
      if (request.max_tokens) {
        body.max_tokens = request.max_tokens;
      }
      if (request.temperature !== undefined) {
        body.temperature = request.temperature;
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
      cached: false,
      provider: 'openai',
      model: request.model
    };
  }

  private async callAnthropic(request: ModelRequest): Promise<ModelResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.anthropicKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.max_tokens || 4096,
        temperature: request.temperature,
        messages: request.messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    return {
      content: data.content[0].text,
      usage: data.usage ? {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.input_tokens + data.usage.output_tokens
      } : undefined,
      cached: false,
      provider: 'anthropic',
      model: request.model
    };
  }

  private async getFromCache(cacheKey: string): Promise<ModelResponse | null> {
    try {
      const { data, error } = await this.supabase
        .from('ai_cache')
        .select('response_data')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return data.response_data as ModelResponse;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  private async saveToCache(cacheKey: string, request: ModelRequest, response: ModelResponse): Promise<void> {
    try {
      const inputHash = await this.hashInput(JSON.stringify({
        provider: request.provider,
        model: request.model,
        messages: request.messages
      }));

      await this.supabase
        .from('ai_cache')
        .upsert({
          cache_key: cacheKey,
          provider: request.provider,
          model: request.model,
          input_hash: inputHash,
          response_data: response,
          cost_estimate: this.estimateCost(response),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
    } catch (error) {
      console.error('Cache save error:', error);
    }
  }

  private async logRequest(
    request: ModelRequest, 
    response: ModelResponse | null, 
    latencyMs: number, 
    success: boolean, 
    errorMessage: string | null
  ): Promise<void> {
    try {
      await this.supabase
        .from('ai_request_logs')
        .insert({
          user_id: request.user_id,
          function_name: request.function_name || 'ai-model-router',
          provider: request.provider,
          model: request.model,
          tokens_used: response?.usage?.total_tokens,
          cost_estimate: response ? this.estimateCost(response) : null,
          latency_ms: latencyMs,
          success,
          error_message: errorMessage,
          metadata: {
            cached: response?.cached || false,
            message_count: request.messages.length
          }
        });
    } catch (error) {
      console.error('Logging error:', error);
    }
  }

  private estimateCost(response: ModelResponse): number {
    if (!response.usage) return 0;

    // Rough cost estimates (per 1K tokens)
    const costs: Record<string, { input: number; output: number }> = {
      'gpt-5-2025-08-07': { input: 0.01, output: 0.03 },
      'gpt-5-mini-2025-08-07': { input: 0.002, output: 0.008 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
      'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 }
    };

    const modelCost = costs[response.model] || costs['gpt-4o-mini'];
    const inputCost = (response.usage.prompt_tokens / 1000) * modelCost.input;
    const outputCost = (response.usage.completion_tokens / 1000) * modelCost.output;
    
    return inputCost + outputCost;
  }

  private async hashInput(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const router = new ModelRouter();
    const request: ModelRequest = await req.json();
    
    const response = await router.route(request);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Router error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        cached: false,
        provider: 'error',
        model: 'error'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});