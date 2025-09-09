import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModelRequest {
  provider: 'openai' | 'anthropic' | 'auto';
  model?: string; // optional when provider is 'auto'
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number; // ignored for newer OpenAI models (gpt-5, 4.1, o3, o4)
  max_tokens?: number; // mapped to max_completion_tokens for newer models
  stream?: boolean;
  user_id?: string;
  function_name?: string;
  cache_key?: string;
  strategy?: 'quality' | 'speed' | 'economy' | 'balanced';
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
          }, Date.now() - startTime, true, null, { cache_hit: true });
          return {
            ...cached,
            cached: true
          };
        }
      }

      let response: ModelResponse;

      // Select provider/model when in auto mode or when model not provided
      let selectedProvider = request.provider;
      let selectedModel = request.model;
      let selectionReason: string | undefined;

      if (request.provider === 'auto' || !request.model) {
        const selection = this.selectProviderAndModel(request);
        selectedProvider = selection.provider;
        selectedModel = selection.model;
        selectionReason = selection.reason;
      }

      const effectiveRequest: ModelRequest = {
        ...request,
        provider: selectedProvider as 'openai' | 'anthropic' | 'auto',
        model: selectedModel,
      };
      
      if (effectiveRequest.provider === 'anthropic') {
        response = await this.callAnthropic(effectiveRequest);
      } else {
        response = await this.callOpenAI(effectiveRequest);
      }

      response.cached = false;

      // Cache the response
      if (request.cache_key) {
        await this.saveToCache(request.cache_key, effectiveRequest, response);
      }

      await this.logRequest(effectiveRequest, response, Date.now() - startTime, success, errorMessage, {
        strategy: request.strategy || 'balanced',
        selection_reason: selectionReason,
        original_provider: request.provider,
        original_model: request.model,
      });
      return response;

    } catch (error) {
      success = false;
      errorMessage = error.message;
      console.error('Model router error:', error);
      
      await this.logRequest(request, null, Date.now() - startTime, success, errorMessage, { stage: 'pre-fallback' });
      
      // Try fallback provider
      if (this.openaiKey && (request.provider === 'anthropic' || request.provider === 'auto')) {
        console.log('Falling back to OpenAI...');
        try {
          const fallbackResponse = await this.callOpenAI({
            ...request,
            provider: 'openai',
            model: 'gpt-5-mini-2025-08-07' // Fast, reliable fallback
          });
          await this.logRequest({ ...request, provider: 'openai', model: 'gpt-5-mini-2025-08-07' }, fallbackResponse, Date.now() - startTime, true, null, { fallback: 'from anthropic/error' });
          return { ...fallbackResponse, cached: false };
        } catch (fallbackError) {
          console.error('OpenAI fallback failed:', fallbackError);
        }
      }

      if (this.anthropicKey && (request.provider === 'openai' || request.provider === 'auto')) {
        console.log('Falling back to Anthropic...');
        try {
          const fallbackResponse = await this.callAnthropic({
            ...request,
            provider: 'anthropic',
            model: 'claude-3-5-haiku-20241022' // Fast, reliable fallback
          });
          await this.logRequest({ ...request, provider: 'anthropic', model: 'claude-3-5-haiku-20241022' }, fallbackResponse, Date.now() - startTime, true, null, { fallback: 'from openai/error' });
          return { ...fallbackResponse, cached: false };
        } catch (fallbackError) {
          console.error('Anthropic fallback failed:', fallbackError);
        }
      }
      
      throw error;
    }
  }

  private selectProviderAndModel(request: ModelRequest): { provider: 'openai' | 'anthropic'; model: string; reason: string } {
    const strategy = request.strategy || 'balanced';
    const openaiAvailable = Boolean(this.openaiKey);
    const anthropicAvailable = Boolean(this.anthropicKey);

    // Combine message text for lightweight heuristics
    const text = (request.messages || []).map(m => m.content || '').join(' ').toLowerCase();
    const complexity = text.length; // rough proxy for task size
    const needsReasoning = /(reason|step[- ]?by[- ]?step|chain of thought|analy[zs]e|proof|derive|strategy|architecture|debug|optimi[sz]e|design)/.test(text);

    // Helper to choose first available provider from a preference list
    const pickProvider = (preferred: Array<'openai'|'anthropic'>): 'openai'|'anthropic' => {
      for (const p of preferred) {
        if (p === 'openai' && openaiAvailable) return 'openai';
        if (p === 'anthropic' && anthropicAvailable) return 'anthropic';
      }
      // Fallback to any available
      if (openaiAvailable) return 'openai';
      if (anthropicAvailable) return 'anthropic';
      // Default to openai (will error clearly later if key missing)
      return 'openai';
    };

    let provider: 'openai' | 'anthropic' = openaiAvailable ? 'openai' : 'anthropic';
    let model = '';
    let reason = '';

    if (strategy === 'quality') {
      if (needsReasoning && openaiAvailable) {
        provider = 'openai';
        model = 'o3-2025-04-16';
        reason = 'quality strategy + deep reasoning detected → OpenAI o3';
      } else if (openaiAvailable) {
        provider = 'openai';
        model = 'gpt-5-2025-08-07';
        reason = 'quality strategy → OpenAI GPT-5';
      } else {
        provider = 'anthropic';
        model = 'claude-sonnet-4-20250514';
        reason = 'quality strategy with OpenAI unavailable → Claude Sonnet 4';
      }
    } else if (strategy === 'speed') {
      const preferred = pickProvider(['openai', 'anthropic']);
      provider = preferred;
      if (preferred === 'openai') {
        model = 'gpt-5-mini-2025-08-07';
      } else {
        model = 'claude-3-5-haiku-20241022';
      }
      reason = 'speed strategy → compact fast model';
    } else if (strategy === 'economy') {
      const preferred = pickProvider(['openai', 'anthropic']);
      provider = preferred;
      if (preferred === 'openai') {
        model = 'gpt-5-nano-2025-08-07';
      } else {
        model = 'claude-3-5-haiku-20241022';
      }
      reason = 'economy strategy → cheapest capable model';
    } else { // balanced (default)
      if (needsReasoning && openaiAvailable) {
        provider = 'openai';
        model = 'o3-2025-04-16';
        reason = 'balanced + reasoning detected → OpenAI o3';
      } else if (complexity > 4000) {
        // Heavier tasks → robust models
        const preferred = pickProvider(['openai', 'anthropic']);
        provider = preferred;
        model = preferred === 'openai' ? 'gpt-4.1-2025-04-14' : 'claude-sonnet-4-20250514';
        reason = 'balanced + high complexity → robust model';
      } else {
        const preferred = pickProvider(['openai', 'anthropic']);
        provider = preferred;
        model = preferred === 'openai' ? 'gpt-5-mini-2025-08-07' : 'claude-3-5-haiku-20241022';
        reason = 'balanced + moderate complexity → mid-tier fast model';
      }
    }

    return { provider, model, reason };
  }

  private async callOpenAI(request: ModelRequest): Promise<ModelResponse> {
    const modelName = request.model || 'gpt-4o-mini';
    const isNewerModel = modelName.includes('gpt-5') || 
                        modelName.includes('gpt-4.1') || 
                        modelName.includes('o3') || 
                        modelName.includes('o4');

    const body: any = {
      model: modelName,
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
        model: request.model || 'claude-3-5-haiku-20241022',
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
    errorMessage: string | null,
    extraMetadata?: Record<string, any>
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
            message_count: request.messages.length,
            ...(extraMetadata || {})
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
      'gpt-5-nano-2025-08-07': { input: 0.0005, output: 0.002 },
      'gpt-4.1-2025-04-14': { input: 0.005, output: 0.015 },
      'o3-2025-04-16': { input: 0.01, output: 0.03 },
      'o4-mini-2025-04-16': { input: 0.003, output: 0.01 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'claude-sonnet-4-20250514': { input: 0.006, output: 0.015 },
      'claude-opus-4-20250514': { input: 0.015, output: 0.075 },
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