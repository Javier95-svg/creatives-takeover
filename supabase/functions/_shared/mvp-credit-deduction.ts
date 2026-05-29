import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getUserFromAuth } from "./credit-deduction.ts";
import { MVP_CREDIT_COSTS, type MVPCreditFeature } from "./mvp-credit-constants.ts";

export { getUserFromAuth };

export interface MVPCreditDeductionResult {
  success: boolean;
  newBalance?: number;
  usedFromBalance?: number;
  error?: string;
  errorCode?: "INSUFFICIENT_MVP_CREDITS" | "USER_NOT_FOUND" | "DEDUCTION_FAILED";
  requiredCredits?: number;
}

function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export async function getMVPCreditBalance(userId: string): Promise<number> {
  const supabase = getAdminClient();
  if (!supabase) return 0;
  const { data } = await supabase
    .from("mvp_credit_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  return Number(data?.balance ?? 0);
}

export async function checkAndDeductMVPCredits(
  userId: string,
  amount: number,
  feature: MVPCreditFeature,
  metadata: Record<string, unknown> = {}
): Promise<MVPCreditDeductionResult> {
  const supabase = getAdminClient();
  if (!supabase) {
    return { success: false, error: "Supabase configuration missing", errorCode: "DEDUCTION_FAILED" };
  }

  if (!Number.isFinite(amount) || amount < 0) {
    return { success: false, error: "Invalid MVP credit amount", errorCode: "DEDUCTION_FAILED" };
  }

  const { data, error } = await supabase.rpc("deduct_mvp_credits_atomic", {
    p_user_id: userId,
    p_amount: Math.floor(amount),
    p_feature: feature,
    p_reason: feature,
    p_metadata: metadata,
  });

  if (error || !data) {
    console.error("[mvp-credit] deduction failed", error);
    return { success: false, error: "MVP credit deduction failed", errorCode: "DEDUCTION_FAILED" };
  }

  const result = data as {
    success?: boolean;
    newBalance?: number;
    usedFromBalance?: number;
    error?: string;
    errorCode?: MVPCreditDeductionResult["errorCode"];
    requiredCredits?: number;
  };

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? "Not enough MVP Builder credits",
      errorCode: result.errorCode ?? "DEDUCTION_FAILED",
      requiredCredits: result.requiredCredits ?? MVP_CREDIT_COSTS[feature],
      newBalance: result.newBalance,
    };
  }

  return {
    success: true,
    newBalance: Number(result.newBalance ?? 0),
    usedFromBalance: Number(result.usedFromBalance ?? amount),
  };
}

export async function refundMVPCredits(
  userId: string,
  amount: number,
  feature: MVPCreditFeature,
  reason: string,
  metadata: Record<string, unknown> = {}
) {
  const supabase = getAdminClient();
  if (!supabase || amount <= 0) return;
  const { error } = await supabase.rpc("refund_mvp_credits", {
    p_user_id: userId,
    p_amount: Math.floor(amount),
    p_feature: feature,
    p_reason: reason,
    p_metadata: metadata,
  });
  if (error) {
    console.error("[mvp-credit] refund failed", error);
  }
}

