import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { emitBusinessEvent } from "./analytics.ts";
import { triggerEmailSequenceEvent } from "./email-sequence-events.ts";

export type MVPBuilderReservationResult = {
  success: boolean;
  reservationId?: string;
  reservationStatus?: "pending" | "finalized" | "released" | "expired";
  listedCreditCost?: number;
  heldCredits?: number;
  creditsUsed?: number;
  balanceAfter?: number;
  releaseReason?: string;
  error?: string;
  errorCode?: string;
  requiredCredits?: number;
  userId?: string;
  actionFeature?: string;
  wasFinalized?: boolean;
  wasReleased?: boolean;
};

function adminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase configuration missing");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export async function reserveMVPBuilderCredits(
  userId: string,
  actionFeature: string,
  listedPrice: number,
  idempotencyKey: string,
  metadata: Record<string, unknown> = {}
): Promise<MVPBuilderReservationResult> {
  const { data, error } = await adminClient().rpc("reserve_mvp_builder_credits", {
    p_user_id: userId,
    p_action_feature: actionFeature,
    p_listed_price: listedPrice,
    p_idempotency_key: idempotencyKey,
    p_metadata: metadata,
  });
  if (error) return { success: false, error: error.message, errorCode: "RESERVATION_FAILED" };
  return data as MVPBuilderReservationResult;
}

export async function finalizeMVPBuilderCredits(
  reservationId: string,
  metadata: Record<string, unknown> = {}
): Promise<MVPBuilderReservationResult> {
  const { data, error } = await adminClient().rpc("finalize_mvp_builder_credit_reservation", {
    p_reservation_id: reservationId,
    p_metadata: metadata,
  });
  if (error) return { success: false, error: error.message, errorCode: "FINALIZE_FAILED" };
  const result = data as MVPBuilderReservationResult;
  if (result.success && result.wasFinalized && result.userId) {
    await emitBusinessEvent({
      eventName: "mvp_builder_action_completed",
      userId: result.userId,
      properties: {
        reservation_id: result.reservationId,
        listed_credit_cost: result.listedCreditCost,
        held_credits: result.heldCredits,
        finalized_credit_cost: result.creditsUsed,
        action_type: result.actionFeature,
        balance_after: result.balanceAfter,
      },
    });
    if ((result.balanceAfter ?? 0) <= 0) {
      await triggerEmailSequenceEvent("credit_exhausted", result.userId);
    } else if ((result.balanceAfter ?? 0) <= 5) {
      await triggerEmailSequenceEvent("credit_warning", result.userId);
    }
  }
  return result;
}

export async function releaseMVPBuilderCredits(
  reservationId: string,
  releaseReason: string,
  metadata: Record<string, unknown> = {}
): Promise<MVPBuilderReservationResult> {
  const { data, error } = await adminClient().rpc("release_mvp_builder_credit_reservation", {
    p_reservation_id: reservationId,
    p_release_reason: releaseReason,
    p_expired: false,
    p_metadata: metadata,
  });
  if (error) return { success: false, error: error.message, errorCode: "RELEASE_FAILED" };
  const result = data as MVPBuilderReservationResult;
  if (result.success && result.wasReleased && result.userId) {
    await emitBusinessEvent({
      eventName: "mvp_builder_action_released",
      userId: result.userId,
      properties: {
        reservation_id: result.reservationId,
        listed_credit_cost: result.listedCreditCost,
        held_credits: result.heldCredits,
        action_type: result.actionFeature,
        release_reason: result.releaseReason,
        balance_after: result.balanceAfter,
      },
    });
  }
  return result;
}
