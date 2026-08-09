import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  decryptDiscoveryCallToken,
  discoveryCallCorsHeaders,
  encryptDiscoveryCallToken,
  env,
  isAuthorizedWorker,
  json,
} from "../_shared/discovery-call-v2.ts";

interface CalendarJob {
  id: string;
  discovery_call_id: string;
  operation: "create" | "update" | "cancel";
  external_event_id: string | null;
  payload: Record<string, unknown>;
}

interface GoogleEvent {
  id?: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    createRequest?: { status?: { statusCode?: string } };
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
  };
}

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CALENDAR_CLIENT_ID"),
      client_secret: env("GOOGLE_CALENDAR_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || typeof body.access_token !== "string") {
    throw new Error(typeof body.error_description === "string" ? body.error_description : `Google OAuth returned HTTP ${response.status}`);
  }
  return { accessToken: body.access_token, expiresIn: Number(body.expires_in ?? 3600) };
}

async function googleRequest(path: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof (body as Record<string, unknown>).error === "object"
      ? JSON.stringify((body as Record<string, unknown>).error)
      : `Google Calendar returned HTTP ${response.status}`;
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return body as GoogleEvent;
}

async function stableGoogleEventId(callId: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(callId));
  const hex = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `ct${hex}`;
}

function eventTimes(payload: Record<string, unknown>) {
  const start = new Date(String(payload.scheduledFor));
  if (!Number.isFinite(start.getTime())) throw new Error("Calendar job has an invalid scheduled time");
  const duration = Math.max(1, Number(payload.durationMinutes ?? 30));
  return { start: start.toISOString(), end: new Date(start.getTime() + duration * 60_000).toISOString() };
}

function attendees(payload: Record<string, unknown>) {
  return [payload.founderEmail, payload.mentorEmail, payload.adminEmail]
    .filter((email): email is string => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    .filter((email, index, all) => all.indexOf(email) === index)
    .map((email) => ({ email }));
}

async function createOrReadEvent(job: CalendarJob, accessToken: string, calendarId: string) {
  const eventId = job.external_event_id || await stableGoogleEventId(job.discovery_call_id);
  if (job.external_event_id) {
    return googleRequest(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`, accessToken);
  }
  const times = eventTimes(job.payload);
  const requestId = `${job.discovery_call_id.replaceAll("-", "")}-${Number(job.payload.calendarSequence ?? 0)}`;
  try {
    return await googleRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          id: eventId,
          summary: String(job.payload.summary ?? "Creatives Takeover Discovery Call"),
          description: [
            "A tracked 30-minute Discovery Call arranged through Creatives Takeover.",
            job.payload.topic ? `Topic: ${String(job.payload.topic)}` : "",
            `Booking ID: ${job.discovery_call_id}`,
          ].filter(Boolean).join("\n\n"),
          start: { dateTime: times.start, timeZone: "UTC" },
          end: { dateTime: times.end, timeZone: "UTC" },
          attendees: attendees(job.payload),
          visibility: "private",
          guestsCanInviteOthers: false,
          guestsCanModify: false,
          conferenceData: { createRequest: { requestId, conferenceSolutionKey: { type: "hangoutsMeet" } } },
          extendedProperties: { private: { discoveryCallId: job.discovery_call_id, workflowVersion: "4" } },
        }),
      },
    );
  } catch (error) {
    if ((error as Error & { status?: number }).status === 409) {
      return googleRequest(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`, accessToken);
    }
    throw error;
  }
}

function meetUrl(event: GoogleEvent) {
  return event.hangoutLink
    || event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri
    || null;
}

async function processJob(job: CalendarJob, accessToken: string, calendarId: string) {
  if (job.operation === "create") {
    const event = await createOrReadEvent(job, accessToken, calendarId);
    const url = meetUrl(event);
    if (!event.id) throw new Error("Google created the event without an event ID");
    if (!url || event.conferenceData?.createRequest?.status?.statusCode === "pending") {
      throw Object.assign(new Error("Google Meet conference generation is still pending"), { externalEventId: event.id });
    }
    const { data, error } = await admin.rpc("complete_discovery_call_calendar_job_v4", {
      p_job_id: job.id,
      p_external_event_id: event.id,
      p_meeting_url: url,
      p_calendar_html_url: event.htmlLink ?? null,
    });
    if (error || !data?.success) throw new Error(error?.message || data?.error || data?.errorCode || "Unable to finalize Discovery Call");
    return;
  }

  const eventId = job.external_event_id;
  if (!eventId) throw new Error("Calendar synchronization job is missing its Google event ID");
  if (job.operation === "update") {
    const times = eventTimes(job.payload);
    await googleRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1&sendUpdates=all`,
      accessToken,
      {
        method: "PATCH",
        body: JSON.stringify({
          start: { dateTime: times.start, timeZone: "UTC" },
          end: { dateTime: times.end, timeZone: "UTC" },
          attendees: attendees(job.payload),
        }),
      },
    );
  } else {
    try {
      await googleRequest(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
        accessToken,
        { method: "DELETE" },
      );
    } catch (error) {
      if (![404, 410].includes((error as Error & { status?: number }).status ?? 0)) throw error;
    }
  }
  const { data, error } = await admin.rpc("complete_discovery_call_calendar_job_v4", {
    p_job_id: job.id,
    p_external_event_id: eventId,
    p_meeting_url: null,
    p_calendar_html_url: null,
  });
  if (error || !data?.success) throw new Error(error?.message || data?.errorCode || "Unable to complete calendar synchronization");
}

async function syncMentorBusyCalendars() {
  const { data: connections } = await admin.from("mentor_calendar_connections")
    .select("id, mentor_id, google_calendar_id, encrypted_refresh_token")
    .eq("status", "active").lte("next_sync_at", new Date().toISOString()).limit(10);
  let synced = 0;
  for (const connection of connections ?? []) {
    try {
      if (!connection.encrypted_refresh_token) throw new Error("Google refresh token is missing");
      const refreshToken = await decryptDiscoveryCallToken(connection.encrypted_refresh_token);
      const token = await refreshGoogleAccessToken(refreshToken);
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60_000).toISOString();
      const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
        method: "POST",
        headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ timeMin, timeMax, items: [{ id: connection.google_calendar_id || "primary" }] }),
      });
      const body = await response.json().catch(() => ({})) as { calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>; error?: unknown };
      if (!response.ok) throw new Error(JSON.stringify(body.error ?? `Google freeBusy returned HTTP ${response.status}`));
      const calendarResult = body.calendars?.[connection.google_calendar_id || "primary"];
      if (calendarResult && "errors" in calendarResult && Array.isArray((calendarResult as { errors?: unknown[] }).errors)
        && (calendarResult as { errors?: unknown[] }).errors!.length) {
        throw new Error(`Google freeBusy calendar error: ${JSON.stringify((calendarResult as { errors?: unknown[] }).errors)}`);
      }
      const busy = calendarResult?.busy ?? [];
      await admin.from("mentor_calendar_busy_periods").delete().eq("connection_id", connection.id);
      if (busy.length) {
        await admin.from("mentor_calendar_busy_periods").insert(busy.map((period) => ({
          connection_id: connection.id,
          mentor_id: connection.mentor_id,
          starts_at: period.start,
          ends_at: period.end,
          source_fingerprint: `${period.start}:${period.end}`,
        })));
      }
      await admin.from("mentor_calendar_connections").update({
        encrypted_access_token: await encryptDiscoveryCallToken(token.accessToken),
        access_token_expires_at: new Date(Date.now() + token.expiresIn * 1000).toISOString(),
        last_synced_at: new Date().toISOString(),
        next_sync_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        last_error: null,
      }).eq("id", connection.id);
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const reauthorizationRequired = /invalid_grant|revoked|expired/i.test(message);
      await admin.from("mentor_calendar_connections").update({
        status: reauthorizationRequired ? "reauthorization_required" : "active",
        next_sync_at: new Date(Date.now() + 15 * 60_000).toISOString(),
        last_error: message.slice(0, 2000),
      }).eq("id", connection.id);
    }
  }
  return synced;
}

async function wakeNotificationWorker() {
  await admin.functions.invoke("process-discovery-call-notifications", {
    body: { limit: 50 },
    headers: { Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).catch(() => undefined);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: discoveryCallCorsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);
  if (!isAuthorizedWorker(req)) return json({ success: false, error: "Unauthorized" }, 401);
  if (!env("GOOGLE_CALENDAR_CLIENT_ID") || !env("GOOGLE_CALENDAR_CLIENT_SECRET") || !env("GOOGLE_CALENDAR_REFRESH_TOKEN") || !env("GOOGLE_CALENDAR_ID")) {
    return json({ success: false, errorCode: "CALENDAR_NOT_CONFIGURED", error: "Platform Google Calendar credentials are incomplete" }, 503);
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const limit = Math.max(1, Math.min(Number(body.limit ?? 20), 100));
  const { data, error } = await admin.rpc("claim_discovery_call_calendar_jobs_v4", { p_limit: limit });
  if (error) return json({ success: false, error: error.message }, 500);
  let platformToken: Awaited<ReturnType<typeof refreshGoogleAccessToken>> | null = null;
  if ((data ?? []).length) {
    try {
      platformToken = await refreshGoogleAccessToken(env("GOOGLE_CALENDAR_REFRESH_TOKEN"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const job of (data ?? []) as CalendarJob[]) {
        await admin.rpc("fail_discovery_call_calendar_job_v4", {
          p_job_id: job.id,
          p_error: `Platform Google OAuth failed: ${message}`,
          p_external_event_id: job.external_event_id ?? null,
        });
      }
      const busyCalendarsSynced = await syncMentorBusyCalendars();
      return json({ success: false, errorCode: "GOOGLE_OAUTH_FAILED", claimed: data?.length ?? 0, failed: data?.length ?? 0, busyCalendarsSynced }, 503);
    }
  }

  let succeeded = 0;
  let failed = 0;
  for (const job of (data ?? []) as CalendarJob[]) {
    try {
      await processJob(job, platformToken!.accessToken, env("GOOGLE_CALENDAR_ID"));
      succeeded += 1;
    } catch (error) {
      const externalEventId = (error as Error & { externalEventId?: string }).externalEventId ?? job.external_event_id ?? null;
      await admin.rpc("fail_discovery_call_calendar_job_v4", {
        p_job_id: job.id,
        p_error: error instanceof Error ? error.message : String(error),
        p_external_event_id: externalEventId,
      });
      failed += 1;
    }
  }
  const busyCalendarsSynced = await syncMentorBusyCalendars();
  if (succeeded) void wakeNotificationWorker();
  return json({ success: true, claimed: (data ?? []).length, succeeded, failed, busyCalendarsSynced });
});
