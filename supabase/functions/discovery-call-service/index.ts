import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logError, logInfo } from "../_shared/logger.ts";
import { processDiscoveryCallProviderEvent } from "../_shared/discovery-call-provider-events.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: "User not authenticated" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";
    const isAdmin = user.email?.toLowerCase() === "admin@creatives-takeover.com";

    logInfo("discovery-call-service:start", { action, userId: user.id });

    if (action === "getQuotaStatus") {
      const { data, error } = await supabaseAdmin.rpc("get_discovery_call_quota_status", {
        p_user_id: user.id,
      });

      if (error) {
        throw error;
      }

      return jsonResponse(data ?? { success: false, error: "Unable to load quota status" });
    }

    if (action === "createIntent") {
      const mentorId = typeof body.mentorId === "string" ? body.mentorId : "";
      const source = typeof body.source === "string" ? body.source : null;
      const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : null;
      const metadata = typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {};

      const { data, error } = await supabaseAdmin.rpc("create_discovery_call_intent", {
        p_founder_id: user.id,
        p_mentor_id: mentorId,
        p_source: source,
        p_idempotency_key: idempotencyKey,
        p_metadata: metadata,
      });

      if (error) {
        throw error;
      }

      // Notify admin + mentor the moment a booking is made. This is the reliable
      // signal we control (mentors book on their own external calendars, so
      // provider confirmation webhooks never arrive). Deduped per call by the
      // notifier, so repeat invocations for the same call won't double-send.
      if (data?.success && data?.callId) {
        await supabaseAdmin.functions.invoke("notify-discovery-call-event", {
          body: { discoveryCallId: data.callId, eventType: "booked" },
        }).catch((notificationError) => {
          logInfo("discovery-call-service:notification-after-intent-failed", {
            callId: data.callId,
            error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          });
        });
      }

      const status = data?.success ? 200 : data?.errorCode === "MENTOR_UNAVAILABLE" ? 404 : 409;
      return jsonResponse(data, status);
    }

    if (action === "confirmBooking") {
      const callId = typeof body.callId === "string" ? body.callId : "";
      if (!callId) {
        return jsonResponse({ success: false, error: "callId is required" }, 400);
      }

      const { data, error } = await supabaseAdmin.rpc("confirm_discovery_call_by_founder", {
        p_call_id: callId,
        p_founder_id: user.id,
        p_metadata: typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {},
      });

      if (error) {
        throw error;
      }

      const status = data?.success
        ? 200
        : data?.errorCode === "INSUFFICIENT_CREDITS"
          ? 402
          : data?.errorCode === "FORBIDDEN"
            ? 403
            : data?.errorCode === "NOT_FOUND"
              ? 404
              : 409;
      return jsonResponse(data, status);
    }

    if (action === "listMine") {
      const { data, error } = await supabaseAdmin
        .from("discovery_calls")
        .select(
          "id, mentor_id, mentor_name_snapshot, status, scheduled_for, duration_minutes, meeting_url, provider_booking_url, credit_charge_amount, consumption_mode, created_at, updated_at, cancelled_at, cancelled_reason"
        )
        .eq("founder_id", user.id)
        .order("scheduled_for", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const mentorIds = Array.from(new Set((data ?? []).map((row: any) => row.mentor_id).filter(Boolean)));
      const mentorPictures = new Map<string, string | null>();

      if (mentorIds.length > 0) {
        const { data: mentorRows, error: mentorError } = await supabaseAdmin
          .from("mentors")
          .select("id, picture")
          .in("id", mentorIds);

        if (mentorError) {
          throw mentorError;
        }

        for (const mentorRow of mentorRows ?? []) {
          mentorPictures.set(mentorRow.id, mentorRow.picture ?? null);
        }
      }

      const bookings = (data ?? []).map((row: any) => ({
        id: row.id,
        mentorId: row.mentor_id,
        mentorName: row.mentor_name_snapshot,
        mentorPicture: mentorPictures.get(row.mentor_id) ?? null,
        status: row.status,
        scheduledFor: row.scheduled_for,
        durationMinutes: row.duration_minutes,
        meetingUrl: row.meeting_url,
        providerBookingUrl: row.provider_booking_url,
        creditChargeAmount: row.credit_charge_amount,
        consumptionMode: row.consumption_mode,
        cancelledAt: row.cancelled_at,
        cancelledReason: row.cancelled_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return jsonResponse({ success: true, bookings });
    }

    if (action === "finalizeBooking") {
      if (!isAdmin) {
        return jsonResponse({ error: "Admin access required" }, 403);
      }

      const { data, error } = await supabaseAdmin.rpc("finalize_discovery_call_booking", {
        p_call_id: body.callId,
        p_scheduled_for: body.scheduledFor,
        p_duration_minutes: body.durationMinutes ?? 30,
        p_provider_name: body.providerName ?? "calendly",
        p_provider_event_id: body.providerEventId ?? null,
        p_provider_invitee_id: body.providerInviteeId ?? null,
        p_meeting_url: body.meetingUrl ?? null,
        p_metadata: typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {},
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        await supabaseAdmin.functions.invoke("notify-discovery-call-event", {
          body: {
            discoveryCallId: body.callId,
            eventType: "scheduled",
          },
        }).catch((notificationError) => {
          logInfo("discovery-call-service:notification-after-finalize-failed", {
            callId: body.callId,
            error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          });
        });
      }

      return jsonResponse(data, data?.success ? 200 : 409);
    }

    if (action === "manualConfirmBooking") {
      if (!isAdmin) {
        return jsonResponse({ error: "Admin access required" }, 403);
      }

      const result = await processDiscoveryCallProviderEvent(supabaseAdmin, {
        providerName: "manual",
        eventType: "booking_created",
        providerEventId: body.providerEventId ?? `manual:${body.callId}:${body.scheduledFor}`,
        providerInviteeId: body.providerInviteeId ?? null,
        discoveryCallId: body.callId,
        inviteeEmail: body.inviteeEmail ?? null,
        inviteeName: body.inviteeName ?? null,
        scheduledFor: body.scheduledFor,
        scheduledUntil: body.scheduledUntil ?? null,
        meetingUrl: body.meetingUrl ?? null,
        rawPayload: body,
        metadata: {
          confirmedByAdminUserId: user.id,
          confirmationSource: "discovery-call-service",
          ...(typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {}),
        },
      });

      return jsonResponse(result, result.ok === false ? 409 : 200);
    }

    if (action === "listProviderEvents") {
      if (!isAdmin) {
        return jsonResponse({ error: "Admin access required" }, 403);
      }

      const status = typeof body.status === "string" ? body.status : "pending_review";
      const { data, error } = await supabaseAdmin
        .from("discovery_call_provider_events")
        .select("*")
        .eq("match_status", status)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return jsonResponse({ success: true, events: data ?? [] });
    }

    if (action === "updateStatus") {
      if (!isAdmin) {
        return jsonResponse({ error: "Admin access required" }, 403);
      }

      const { data, error } = await supabaseAdmin.rpc("update_discovery_call_status", {
        p_call_id: body.callId,
        p_new_status: body.status,
        p_actor_user_id: user.id,
        p_reason: body.reason ?? null,
        p_metadata: typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {},
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        await supabaseAdmin.functions.invoke("notify-discovery-call-event", {
          body: {
            discoveryCallId: body.callId,
            eventType: body.status,
          },
        }).catch((notificationError) => {
          logInfo("discovery-call-service:notification-after-status-failed", {
            callId: body.callId,
            status: body.status,
            error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          });
        });
      }

      return jsonResponse(data, data?.success ? 200 : 409);
    }

    return jsonResponse({ error: "Unsupported action" }, 400);
  } catch (error) {
    logError("discovery-call-service:error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
