import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

import {
  CREDIT_COSTS,
  getCreditCostForPlan,
  resolveModelAdjustedCreditCost,
  resolveMVPActionDefaultModelForPlan,
  type CreditFeature,
  type CreditPlan,
} from '../_shared/credit-constants.ts';
import { getUserFromAuth } from '../_shared/credit-deduction.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GIFT_FEATURES = new Set<CreditFeature>([
  'PITCH_DECK_ANALYZER',
  'TECH_STACK_GENERATION',
  'FUNDRAISING_READINESS_ANALYSIS',
]);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const user = await getUserFromAuth(req);
  if (!user) return json({ error: 'Authentication required' }, 401);

  const body = await req.json().catch(() => ({})) as {
    feature?: string;
    model?: string | null;
    forecastFeatures?: string[];
  };
  const feature = body.feature?.trim().toUpperCase() as CreditFeature | undefined;
  if (!feature || !(feature in CREDIT_COSTS)) return json({ error: 'Unknown credit feature' }, 400);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
  const [{ data: wallet, error: walletError }, { data: gifts }] = await Promise.all([
    admin.from('user_credits').select('balance, monthly_quota, subscription_tier').eq('user_id', user.id).maybeSingle(),
    admin.from('feature_gifts').select('feature').eq('user_id', user.id),
  ]);
  if (walletError || !wallet) return json({ error: 'Credit wallet unavailable' }, 503);

  const plan = (['rookie', 'starter', 'rising', 'pro'].includes(wallet.subscription_tier)
    ? wallet.subscription_tier
    : 'rookie') as CreditPlan;
  const claimedGifts = new Set((gifts ?? []).map((gift) => String(gift.feature)));
  const giftEligible = GIFT_FEATURES.has(feature) && !claimedGifts.has(feature);
  const baseCost = getCreditCostForPlan(feature, plan) ?? 0;
  const adjustedCost = feature.startsWith('APP_BUILDER_')
    ? resolveModelAdjustedCreditCost(
        baseCost,
        body.model,
        resolveMVPActionDefaultModelForPlan(feature, plan),
      )
    : baseCost;
  const cost = giftEligible ? 0 : adjustedCost;
  const available = Math.max(0, Number(wallet.balance ?? 0) + Number(wallet.monthly_quota ?? 0));

  const forecastFeatures = (body.forecastFeatures ?? [])
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is CreditFeature => value in CREDIT_COSTS)
    .slice(0, 5);
  const forecastCosts = forecastFeatures.map((value) => getCreditCostForPlan(value, plan) ?? 0);
  let remaining = Math.max(0, available - cost);
  let coveredNextActions = 0;
  for (const forecastCost of forecastCosts) {
    if (remaining < forecastCost) break;
    remaining -= forecastCost;
    coveredNextActions += 1;
  }

  return json({
    schemaVersion: 1,
    feature,
    plan,
    cost,
    baseCost,
    available,
    balanceAfter: Math.max(0, available - cost),
    affordable: available >= cost,
    giftEligible,
    giftApplied: giftEligible,
    recommendedPurchase: available >= cost ? 'none' : cost - available <= 60 ? 'top_up' : 'plan',
    coveredNextActions,
  });
});
