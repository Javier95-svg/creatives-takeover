import { Webhook } from "npm:svix@2.9.1";

type VerifiedPayload =
  | { ok: true; payload: unknown }
  | { ok: false; response: Response };

/** Verify the raw bytes and Svix headers before trusting a Resend event. */
export async function verifyResendWebhook(req: Request, secret: string): Promise<VerifiedPayload> {
  if (!secret || !secret.startsWith("whsec_")) {
    console.error("Resend webhook signing secret is missing or invalid");
    return { ok: false, response: new Response("Webhook unavailable", { status: 503 }) };
  }

  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signature = req.headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return { ok: false, response: new Response("Invalid webhook signature", { status: 401 }) };
  }

  try {
    const rawBody = await req.text();
    const payload = new Webhook(secret).verify(rawBody, {
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    });
    return { ok: true, payload };
  } catch {
    return { ok: false, response: new Response("Invalid webhook signature", { status: 401 }) };
  }
}
