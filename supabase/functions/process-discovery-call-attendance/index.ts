import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  discoveryCallCorsHeaders, encryptDiscoveryCallToken, env, generateDiscoveryCallToken,
  hashDiscoveryCallToken, isAuthorizedWorker, json,
} from "../_shared/discovery-call-v2.ts";
import { meetingCodeFromUrl, summarizeMeetSessions, type MeetSession } from "../_shared/google-meet-attendance.ts";

type AttendanceJob = { id: string; discovery_call_id: string; attempt_count: number };
type ConferenceRecord = { name?: string; startTime?: string; endTime?: string; space?: { meetingCode?: string } };
type Participant = { name?: string };
type ParticipantSession = { startTime?: string; endTime?: string };

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

async function refreshAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env("GOOGLE_CALENDAR_CLIENT_ID"), client_secret: env("GOOGLE_CALENDAR_CLIENT_SECRET"), refresh_token: env("GOOGLE_CALENDAR_REFRESH_TOKEN"), grant_type: "refresh_token" }),
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || typeof body.access_token !== "string") throw new Error(typeof body.error_description === "string" ? body.error_description : `Google OAuth returned HTTP ${response.status}`);
  return body.access_token;
}

async function meetRequest<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`https://meet.googleapis.com/v2${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Google Meet API HTTP ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  return body as T;
}

async function listAll<T>(path: string, itemKey: string, accessToken: string): Promise<T[]> {
  const values: T[] = [];
  let pageToken = "";
  do {
    const separator = path.includes("?") ? "&" : "?";
    const page = await meetRequest<Record<string, unknown>>(`${path}${pageToken ? `${separator}pageToken=${encodeURIComponent(pageToken)}` : ""}&pageSize=100`, accessToken);
    values.push(...(Array.isArray(page[itemKey]) ? page[itemKey] as T[] : []));
    pageToken = typeof page.nextPageToken === "string" ? page.nextPageToken : "";
  } while (pageToken);
  return values;
}

async function observeMeeting(meetingUrl: string, accessToken: string) {
  const code = meetingCodeFromUrl(meetingUrl);
  if (!code) throw new Error("The Discovery Call has no valid Google Meet code");
  const filter = encodeURIComponent(`space.meeting_code = "${code}"`);
  const conferences = await listAll<ConferenceRecord>(`/conferenceRecords?filter=${filter}`, "conferenceRecords", accessToken);
  const conference = conferences.find((item) => item.endTime) ?? conferences[0] ?? null;
  if (!conference?.name) return null;
  const participants = await listAll<Participant>(`/${conference.name}/participants`, "participants", accessToken);
  const sessions: MeetSession[] = [];
  for (const participant of participants) {
    if (!participant.name) continue;
    const rows = await listAll<ParticipantSession>(`/${participant.name}/participantSessions`, "participantSessions", accessToken);
    for (const session of rows) {
      if (session.startTime) sessions.push({ participant: participant.name, startTime: session.startTime, endTime: session.endTime ?? null });
    }
  }
  return summarizeMeetSessions(conference, sessions);
}

async function openConfirmation(callId: string) {
  const founderToken = generateDiscoveryCallToken();
  const mentorToken = generateDiscoveryCallToken();
  const { data, error } = await admin.rpc("open_discovery_call_attendance_confirmation_v5", {
    p_call_id: callId,
    p_founder_hash: await hashDiscoveryCallToken(founderToken),
    p_mentor_hash: await hashDiscoveryCallToken(mentorToken),
    p_founder_ciphertext: await encryptDiscoveryCallToken(founderToken),
    p_mentor_ciphertext: await encryptDiscoveryCallToken(mentorToken),
  });
  if (error || !data?.success) throw new Error(error?.message || data?.errorCode || "Unable to open attendance confirmation");
}

async function sendConfirmationReminders() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data: evidence } = await admin.from("discovery_call_attendance_evidence")
    .select("discovery_call_id")
    .eq("verification_status", "confirmation_required")
    .lte("confirmation_requested_at", cutoff)
    .is("confirmation_reminder_sent_at", null)
    .limit(50);
  for (const row of evidence ?? []) {
    try {
      await openConfirmation(row.discovery_call_id);
      await admin.from("discovery_call_attendance_evidence").update({ confirmation_reminder_sent_at: new Date().toISOString() })
        .eq("discovery_call_id", row.discovery_call_id).is("confirmation_reminder_sent_at", null);
    } catch {
      // The next cron run retries; no participant or provider details are logged.
    }
  }
  return (evidence ?? []).length;
}

async function wakeNotifications() {
  await admin.functions.invoke("process-discovery-call-notifications", { body: { limit: 50 }, headers: { Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}` } }).catch(() => undefined);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: discoveryCallCorsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);
  if (!isAuthorizedWorker(req)) return json({ success: false, error: "Unauthorized" }, 401);
  if (env("DISCOVERY_CALL_ATTENDANCE_TRACKING_ENABLED").toLowerCase() !== "true") return json({ success: true, enabled: false });
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const limit = Math.max(1, Math.min(Number(body.limit ?? 20), 100));
  const autoCompleteEnabled = env("DISCOVERY_CALL_ATTENDANCE_AUTO_COMPLETE_ENABLED").toLowerCase() === "true";
  const { data: reminders } = await admin.rpc("queue_discovery_call_attendance_reminders_v5");
  const confirmationReminders = await sendConfirmationReminders();
  const { data: jobs, error } = await admin.rpc("claim_discovery_call_attendance_jobs_v5", { p_limit: limit });
  if (error) return json({ success: false, error: error.message }, 500);
  const claimed = (jobs ?? []) as AttendanceJob[];
  let accessToken = "";
  let completed = 0;
  let confirmationRequired = 0;
  let failed = 0;
  for (const job of claimed) {
    try {
      if (!accessToken) accessToken = await refreshAccessToken();
      const { data: call, error: callError } = await admin.from("discovery_calls").select("id, meeting_url, status").eq("id", job.discovery_call_id).maybeSingle();
      if (callError || !call || call.status !== "awaiting_outcome") throw new Error(callError?.message || "Discovery Call is no longer awaiting an outcome");
      const observation = await observeMeeting(String(call.meeting_url ?? ""), accessToken);
      if (!observation && job.attempt_count < 3) {
        await admin.rpc("fail_discovery_call_attendance_job_v5", { p_job_id: job.id, p_error: "No Google Meet conference record is available yet" });
        continue;
      }
      const overlap = observation?.qualifyingOverlapSeconds ?? 0;
      const verified = Boolean(observation && observation.distinctParticipantCount >= 2 && overlap >= 600);
      const { data: result, error: completeError } = await admin.rpc("complete_discovery_call_attendance_job_v5", {
        p_job_id: job.id,
        p_conference_record_name: observation?.conferenceRecordName ?? null,
        p_started_at: observation?.startedAt ?? null,
        p_ended_at: observation?.endedAt ?? null,
        p_participant_count: observation?.distinctParticipantCount ?? 0,
        p_max_concurrent: observation?.maxConcurrentParticipants ?? 0,
        p_overlap_seconds: overlap,
        p_verified_completed: verified,
        p_shadow_mode: !autoCompleteEnabled,
      });
      if (completeError || !result?.success) throw new Error(completeError?.message || result?.errorCode || "Unable to save attendance evidence");
      if (verified && autoCompleteEnabled) completed += 1;
      else if (verified) continue;
      else { await openConfirmation(job.discovery_call_id); confirmationRequired += 1; }
    } catch (attendanceError) {
      const message = attendanceError instanceof Error ? attendanceError.message : String(attendanceError);
      const { data: result } = await admin.rpc("fail_discovery_call_attendance_job_v5", { p_job_id: job.id, p_error: message });
      if (result?.terminal) {
        await openConfirmation(job.discovery_call_id).catch(() => undefined);
        confirmationRequired += 1;
      }
      failed += 1;
    }
  }
  const { data: escalations } = await admin.rpc("escalate_discovery_call_attendance_reviews_v5");
  if (claimed.length || Number(escalations?.escalated ?? 0) || Number(reminders?.queued ?? 0) || confirmationReminders) void wakeNotifications();
  return json({ success: true, claimed: claimed.length, completed, confirmationRequired, failed, escalated: Number(escalations?.escalated ?? 0), remindersQueued: Number(reminders?.queued ?? 0), confirmationReminders });
});
