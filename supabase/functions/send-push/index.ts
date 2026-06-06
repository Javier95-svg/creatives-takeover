import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const VAPID_PUBLIC_KEY = (Deno.env.get("VAPID_PUBLIC_KEY") ?? "").trim();
const VAPID_PRIVATE_KEY = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").trim();
const VAPID_SUBJECT = (Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@creatives-takeover.com").trim();

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushRequest {
  userId?: string;
  userIds?: string[];
  title?: string;
  message?: string;
  body?: string;
  url?: string;
  tag?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return json({ ok: false, error: "VAPID keys not configured" }, 500);
  }

  let payload: PushRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const userIds = (payload.userIds ?? (payload.userId ? [payload.userId] : []))
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (userIds.length === 0) return json({ ok: false, error: "userId or userIds required" }, 400);

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (error) return json({ ok: false, error: error.message }, 500);
  if (!subs || subs.length === 0) return json({ ok: true, sent: 0, reason: "no_subscriptions" });

  const notificationBody = (payload.message ?? payload.body ?? "").toString().slice(0, 400);
  const data = JSON.stringify({
    title: (payload.title ?? "Creatives Takeover").toString().slice(0, 120),
    body: notificationBody,
    url: payload.url ?? "/dashboard",
    tag: payload.tag ?? "ct-notification",
  });

  let sent = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
        );
        sent += 1;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // 404/410 mean the subscription is gone — prune it.
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id);
        } else {
          console.error("send-push: delivery failed", { id: sub.id, statusCode, err: String(err) });
        }
      }
    }),
  );

  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return json({ ok: true, sent, pruned: expiredIds.length });
});
