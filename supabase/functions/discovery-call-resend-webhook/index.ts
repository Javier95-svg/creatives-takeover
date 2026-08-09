import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { env, json } from "../_shared/discovery-call-v2.ts";

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const acceptedEventTypes = new Set([
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.complained",
  "email.failed",
  "email.suppressed",
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function tagValue(data: Record<string, unknown>, name: string): string | null {
  if (Array.isArray(data.tags)) {
    const match = data.tags.find((item) => {
      const tag = asRecord(item);
      return asString(tag.name) === name;
    });
    return asString(asRecord(match).value);
  }
  return asString(asRecord(data.tags)[name]);
}

function decodeBase64(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function verifySvixSignature(req: Request, rawPayload: string): Promise<boolean> {
  const webhookSecret = env("DISCOVERY_CALL_RESEND_WEBHOOK_SECRET");
  const webhookId = req.headers.get("svix-id")?.trim() ?? "";
  const timestamp = req.headers.get("svix-timestamp")?.trim() ?? "";
  const signatureHeader = req.headers.get("svix-signature")?.trim() ?? "";
  if (!webhookSecret || !webhookId || !timestamp || !signatureHeader) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(Date.now() - timestampSeconds * 1000) > 5 * 60_000) return false;

  try {
    const encodedSecret = webhookSecret.startsWith("whsec_")
      ? webhookSecret.slice("whsec_".length)
      : webhookSecret;
    const key = await crypto.subtle.importKey(
      "raw",
      decodeBase64(encodedSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signedContent = `${webhookId}.${timestamp}.${rawPayload}`;
    const expected = new Uint8Array(await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signedContent),
    ));

    return signatureHeader.split(" ").some((candidate) => {
      const [version, encodedSignature] = candidate.split(",", 2);
      if (version !== "v1" || !encodedSignature) return false;
      try {
        return constantTimeEqual(expected, decodeBase64(encodedSignature));
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405, { "Cache-Control": "no-store" });

  const rawPayload = await req.text();
  if (!await verifySvixSignature(req, rawPayload)) {
    return json({ success: false, error: "Invalid webhook signature" }, 401, { "Cache-Control": "no-store" });
  }

  const webhookId = req.headers.get("svix-id")?.trim() ?? "";
  let payload: Record<string, unknown>;
  try {
    payload = asRecord(JSON.parse(rawPayload));
  } catch {
    return json({ success: false, error: "Invalid webhook payload" }, 400, { "Cache-Control": "no-store" });
  }

  const data = asRecord(payload.data);
  const eventType = asString(payload.type);
  const providerMessageId = asString(data.email_id);
  const category = tagValue(data, "category");
  const outboxId = tagValue(data, "outbox_id");
  const sendGenerationValue = tagValue(data, "send_generation");
  const sendGeneration = sendGenerationValue === null ? null : Number(sendGenerationValue);
  const validOutboxId = outboxId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(outboxId);
  const createdAtValue = asString(payload.created_at);
  const createdAt = createdAtValue ? new Date(createdAtValue) : null;
  if (category !== "discovery_call") {
    return json({ success: true, ignored: true }, 200, { "Cache-Control": "no-store" });
  }
  if (!eventType || !acceptedEventTypes.has(eventType) || !providerMessageId || !validOutboxId
      || sendGeneration === null || !Number.isInteger(sendGeneration) || sendGeneration < 0
      || !createdAt || Number.isNaN(createdAt.getTime())) {
    return json({ success: true, ignored: true }, 200, { "Cache-Control": "no-store" });
  }

  const { data: result, error } = await admin.rpc("record_discovery_call_resend_event_v3", {
    p_provider_event_id: webhookId,
    p_event_type: eventType,
    p_event_created_at: createdAt.toISOString(),
    p_provider_message_id: providerMessageId,
    p_outbox_id: outboxId,
    p_send_generation: sendGeneration,
    p_payload: payload,
  });
  if (error) return json({ success: false, error: "Unable to record webhook event" }, 500, { "Cache-Control": "no-store" });

  return json(result ?? { success: true }, 200, { "Cache-Control": "no-store" });
});
