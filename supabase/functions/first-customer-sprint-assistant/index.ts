import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Sprint = {
  id: string;
  offer: string;
  target_segment: string;
  problem_hypothesis: string;
  message_generation_count: number;
};

function fallback(sprint: Sprint) {
  return [
    { key: 'discovery', label: 'Discovery-led', body: `Hi {{first_name}}, I am researching how ${sprint.target_segment} handle ${sprint.problem_hypothesis}. Would you be open to a 20-minute conversation? I am looking to learn, not pitch.` },
    { key: 'problem', label: 'Problem-led', body: `Hi {{first_name}}, I help ${sprint.target_segment} address ${sprint.problem_hypothesis}. Is this a priority for you right now? I would value 20 minutes to compare notes.` },
    { key: 'offer', label: 'Offer-led', body: `Hi {{first_name}}, I am testing ${sprint.offer} for ${sprint.target_segment}. Would a short conversation be useful to see whether it fits how you work today?` },
  ];
}

function validVariants(value: unknown): value is Array<{ key: string; label: string; body: string }> {
  if (!Array.isArray(value) || value.length !== 3) return false;
  return ['discovery', 'problem', 'offer'].every((key) => {
    const item = value.find((candidate) => candidate?.key === key);
    return item && typeof item.label === 'string' && typeof item.body === 'string' && item.body.length >= 20 && item.body.length <= 900;
  });
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  try {
    const auth = request.headers.get('Authorization');
    if (!auth) return json({ error: 'Authentication required' }, 401);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: auth } }, auth: { persistSession: false } },
    );
    const { action, sprintId } = await request.json();
    if (action !== 'generate_messages' || typeof sprintId !== 'string') return json({ error: 'Invalid request' }, 400);
    const { data: sprint, error } = await supabase.from('first_customer_sprints')
      .select('id,offer,target_segment,problem_hypothesis,message_generation_count')
      .eq('id', sprintId).in('status', ['draft', 'active', 'paused']).maybeSingle();
    if (error || !sprint) return json({ error: 'Sprint not found' }, 404);
    if (sprint.message_generation_count >= 2) return json({ error: 'The one permitted regeneration has already been used' }, 409);

    // Reserve this generation before calling the provider. The row-locked RPC
    // makes concurrent retries fail before they can create duplicate AI cost.
    const nextCount = Number(sprint.message_generation_count) + 1;
    const { error: reserveError } = await supabase.rpc('update_first_customer_sprint_v1', {
      p_sprint_id: sprintId,
      p_patch: { messageGenerationCount: nextCount },
    });
    if (reserveError) return json({ error: reserveError.message }, 409);

    let variants = fallback(sprint as Sprint);
    let usedFallback = true;
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (apiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: Deno.env.get('GTM_OPENAI_MODEL') ?? 'gpt-4o-mini',
            temperature: 0.45,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'Write concise, respectful B2B founder outreach. Return JSON {"variants":[{"key":"discovery|problem|offer","label":"...","body":"..."}]}. Exactly three items in that order. Use only the supplied facts. Keep {{first_name}} as the only personalization token. Never claim research, results, or familiarity not supplied. Each message under 120 words.' },
              { role: 'user', content: JSON.stringify({ offer: sprint.offer, targetSegment: sprint.target_segment, problemHypothesis: sprint.problem_hypothesis }) },
            ],
          }),
        });
        if (response.ok) {
          const payload = await response.json();
          const parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? '{}');
          if (validVariants(parsed.variants)) {
            variants = parsed.variants;
            usedFallback = false;
          }
        }
      } catch (generationError) {
        console.warn('First customer message generation fell back to templates', generationError);
      }
    }
    const { error: updateError } = await supabase.rpc('update_first_customer_sprint_v1', {
      p_sprint_id: sprintId,
      p_patch: { messageVariants: variants },
    });
    if (updateError) return json({ error: updateError.message }, 400);
    return json({ variants, fallback: usedFallback, generationCount: nextCount });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});
