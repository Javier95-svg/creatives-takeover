/**
 * claim-mvp-gift
 *
 * One-time "first MVP generation on us" gift: claims the APP_BUILDER_GENERATE
 * feature gift and, on first claim, grants the generation's credit cost to the
 * user's spendable balance. The MVP Builder's reservation/charge flow then runs
 * completely unchanged — no zero-cost special cases in the money path.
 *
 * Race-safe via the feature_gifts primary key; if the grant fails after the
 * claim, the gift row is released so the user can retry.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getUserFromAuth, refundCredits } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS } from "../_shared/credit-constants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GIFT_FEATURE = "APP_BUILDER_GENERATE";

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromAuth(req);
    if (!user) return json({ success: false, error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ success: false, error: "Missing environment configuration" }, 500);
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: gift, error: giftError } = await admin
      .from("feature_gifts")
      .insert({ user_id: user.id, feature: GIFT_FEATURE })
      .select("user_id")
      .maybeSingle();

    if (giftError || !gift) {
      // Already claimed (conflict) or transient failure — either way, no grant.
      return json({ success: true, granted: false });
    }

    const amount = CREDIT_COSTS.APP_BUILDER_GENERATE;
    // Reuses the atomic balance-increment + ledger path (refund_platform_credits_atomic);
    // the explicit reason marks it as a gift grant in the transaction history.
    const grantOk = await refundCredits(
      user.id,
      amount,
      GIFT_FEATURE,
      "First MVP generation gift",
      { gift: true },
    );

    if (!grantOk) {
      // Release the claim so the user can retry later.
      await admin
        .from("feature_gifts")
        .delete()
        .eq("user_id", user.id)
        .eq("feature", GIFT_FEATURE);
      return json({ success: false, error: "Could not grant the gift. Try again." }, 500);
    }

    return json({ success: true, granted: true, amount });
  } catch (error) {
    console.error("claim-mvp-gift failed", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }, 500);
  }
});
