import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VIEW_DEDUPE_WINDOW_MINUTES = 30;
const SIGNUP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const SIGNUP_RATE_LIMIT_COUNT = 10;

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface WaitlistPublicPayload {
  action: "track_view" | "signup";
  slug?: string;
  sessionId?: string;
  variant?: "A" | "B" | string;
  referrer?: string;
  userAgent?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  email?: string;
  firstName?: string;
  consent?: boolean;
  honeypot?: string;
  captchaToken?: string;
  referralSource?: string;
  customFields?: Array<{
    id?: string;
    label?: string;
    value?: string;
  }>;
}

interface WaitlistPageRow {
  id: string;
  user_id: string;
  product_name: string | null;
  status: string;
  ai_content: Record<string, unknown> | null;
  webhook_url: string | null;
  integration_provider: string | null;
  integration_list_id: string | null;
  confirmation_email_enabled: boolean | null;
  referral_message: string | null;
}

interface NormalizedCustomField {
  id: string;
  label: string;
  value: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function sanitizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(email: string): string {
  return sanitizeText(email).toLowerCase();
}

function extractDomainFromEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const parts = normalized.split("@");
  return parts.length === 2 ? sanitizeText(parts[1]) : "";
}

function sanitizeCustomFields(input: unknown): NormalizedCustomField[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((raw, index) => {
      const row = raw as Record<string, unknown>;
      const label = sanitizeText(row?.label, `Field ${index + 1}`);
      const value = sanitizeText(row?.value);
      if (!value) return null;
      return {
        id: sanitizeText(row?.id, `field_${index + 1}`),
        label,
        value: value.slice(0, 1000),
      };
    })
    .filter(Boolean)
    .slice(0, 12) as NormalizedCustomField[];
}

function getVariant(value: unknown): "A" | "B" | null {
  if (value === "A" || value === "B") return value;
  return null;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + SIGNUP_RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (current.count >= SIGNUP_RATE_LIMIT_COUNT) {
    return true;
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return false;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getPublishedPage(slug: string): Promise<WaitlistPageRow | null> {
  const { data, error } = await supabaseAdmin
    .from("waitlist_pages")
    .select("id, user_id, product_name, status, ai_content, webhook_url, integration_provider, integration_list_id, confirmation_email_enabled, referral_message")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;
  return data as WaitlistPageRow;
}

async function verifyTurnstileToken(token: string | undefined, clientIp: string): Promise<boolean> {
  const secret = Deno.env.get("WAITLIST_TURNSTILE_SECRET");
  if (!secret) return true;

  if (!token) return false;

  const body = new URLSearchParams();
  body.append("secret", secret);
  body.append("response", token);
  body.append("remoteip", clientIp);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data?.success);
  } catch {
    return false;
  }
}

async function sendWebhook(page: WaitlistPageRow, payload: Record<string, unknown>): Promise<void> {
  const url = sanitizeText(page.webhook_url);
  if (!url) return;

  if (!/^https?:\/\//i.test(url)) {
    console.warn("[waitlist-public-api] Skipping webhook with invalid URL", { url });
    return;
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("[waitlist-public-api] Webhook request failed", error);
  }
}

async function syncMailchimp(page: WaitlistPageRow, email: string, firstName: string): Promise<void> {
  const apiKey = Deno.env.get("MAILCHIMP_API_KEY") || "";
  if (!apiKey) return;

  const listId = sanitizeText(page.integration_list_id) || sanitizeText(Deno.env.get("MAILCHIMP_DEFAULT_LIST_ID"));
  if (!listId) return;

  const dataCenter = sanitizeText(Deno.env.get("MAILCHIMP_SERVER_PREFIX")) || apiKey.split("-")[1] || "";
  if (!dataCenter) return;

  const endpoint = `https://${dataCenter}.api.mailchimp.com/3.0/lists/${listId}/members`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `apikey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        status: "subscribed",
        merge_fields: {
          FNAME: firstName || "",
        },
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      const title = sanitizeText((errorPayload as Record<string, unknown> | null)?.title);
      if (title.toLowerCase() !== "member exists") {
        console.error("[waitlist-public-api] Mailchimp sync failed", errorPayload || response.statusText);
      }
    }
  } catch (error) {
    console.error("[waitlist-public-api] Mailchimp request failed", error);
  }
}

async function syncConvertKit(page: WaitlistPageRow, email: string, firstName: string): Promise<void> {
  const apiSecret = Deno.env.get("CONVERTKIT_API_SECRET") || "";
  if (!apiSecret) return;

  const formId = sanitizeText(page.integration_list_id) || sanitizeText(Deno.env.get("CONVERTKIT_DEFAULT_FORM_ID"));
  if (!formId) return;

  const endpoint = `https://api.convertkit.com/v3/forms/${formId}/subscribe`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_secret: apiSecret,
        email,
        first_name: firstName || undefined,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      console.error("[waitlist-public-api] ConvertKit sync failed", payload || response.statusText);
    }
  } catch (error) {
    console.error("[waitlist-public-api] ConvertKit request failed", error);
  }
}

async function sendConfirmationEmail(page: WaitlistPageRow, email: string, firstName: string): Promise<void> {
  if (!page.confirmation_email_enabled || !resendClient) return;

  const aiContent = (page.ai_content || {}) as Record<string, unknown>;
  const emailSetup = (aiContent.emailSetup || {}) as Record<string, unknown>;
  const domainSetup = (aiContent.domainSetup || {}) as Record<string, unknown>;

  const defaultFromEmail = sanitizeText(Deno.env.get("WAITLIST_FROM_EMAIL")) || "onboarding@resend.dev";
  const defaultFromName = sanitizeText(Deno.env.get("WAITLIST_FROM_NAME")) || "Creatives Takeover";

  const configuredSenderEmail = normalizeEmail(String(emailSetup.senderEmail || ""));
  const configuredSenderName = sanitizeText(emailSetup.senderName, "");
  const configuredReplyTo = normalizeEmail(String(emailSetup.replyToEmail || ""));
  const configuredDomain = sanitizeText(domainSetup.domain, "").toLowerCase();
  const domainStatus = sanitizeText(domainSetup.status, "");
  const senderDomain = extractDomainFromEmail(configuredSenderEmail);

  const canUseCustomSender =
    domainStatus === "verified" &&
    configuredSenderEmail &&
    configuredDomain &&
    senderDomain &&
    (senderDomain === configuredDomain || senderDomain.endsWith(`.${configuredDomain}`));

  const fromEmail = canUseCustomSender ? configuredSenderEmail : defaultFromEmail;
  const fromName = configuredSenderName || defaultFromName;
  const replyTo = configuredReplyTo || fromEmail;
  const productName = sanitizeText(page.product_name) || "our product";
  const name = firstName || "there";

  const subject = `You are on the ${productName} waitlist`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 560px; margin: 0 auto; line-height: 1.6;">
      <h1 style="font-size: 24px; margin: 0 0 12px;">Thanks for joining, ${name}.</h1>
      <p style="margin: 0 0 12px;">You are now on the <strong>${productName}</strong> waitlist.</p>
      <p style="margin: 0 0 12px;">We will send updates as we move toward launch.</p>
      <p style="margin: 18px 0 0; color: #334155;">- The Creatives Takeover Team</p>
    </div>
  `;

  try {
    await resendClient.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject,
      html,
      reply_to: replyTo,
    } as any);
  } catch (error) {
    console.error("[waitlist-public-api] Confirmation email failed", error);
  }
}

function pickReferralMessage(page: WaitlistPageRow): string {
  const pageMessage = sanitizeText(page.referral_message);
  if (pageMessage) return pageMessage;

  const aiContent = (page.ai_content || {}) as Record<string, unknown>;
  const aiMessage = sanitizeText(aiContent.referralMessage);
  if (aiMessage) return aiMessage;

  return "Share this page with one founder friend who might need this.";
}

async function handleTrackView(payload: WaitlistPublicPayload, req: Request): Promise<Response> {
  const slug = sanitizeText(payload.slug);
  if (!slug) {
    return jsonResponse({ ok: false, code: "SLUG_REQUIRED", error: "Missing slug" }, 400);
  }

  const page = await getPublishedPage(slug);
  if (!page) {
    return jsonResponse({ ok: false, code: "NOT_FOUND", error: "Waitlist page not found" }, 404);
  }

  const sessionId = sanitizeText(payload.sessionId) || crypto.randomUUID();
  const variant = getVariant(payload.variant);
  const customFields = sanitizeCustomFields(payload.customFields);
  const referrer = sanitizeText(payload.referrer) || sanitizeText(req.headers.get("referer"));
  const userAgent = sanitizeText(payload.userAgent) || sanitizeText(req.headers.get("user-agent"));
  const ipRaw = getClientIp(req);
  const ipSalt = Deno.env.get("WAITLIST_IP_HASH_SALT") || "waitlist_default_salt";
  const ipHash = await sha256Hex(`${ipSalt}:${ipRaw}`);

  const thresholdDate = new Date(Date.now() - VIEW_DEDUPE_WINDOW_MINUTES * 60 * 1000).toISOString();

  const { data: existingView } = await supabaseAdmin
    .from("waitlist_events")
    .select("id")
    .eq("waitlist_page_id", page.id)
    .eq("event_type", "VIEW")
    .eq("session_id", sessionId)
    .gte("occurred_at", thresholdDate)
    .limit(1)
    .maybeSingle();

  if (existingView) {
    return jsonResponse({ ok: true, deduped: true, sessionId });
  }

  await supabaseAdmin.from("waitlist_events").insert({
    waitlist_page_id: page.id,
    event_type: "VIEW",
    variant,
    session_id: sessionId,
    utm_source: sanitizeText(payload.utm?.source) || null,
    utm_medium: sanitizeText(payload.utm?.medium) || null,
    utm_campaign: sanitizeText(payload.utm?.campaign) || null,
    utm_term: sanitizeText(payload.utm?.term) || null,
    utm_content: sanitizeText(payload.utm?.content) || null,
    referrer: referrer || null,
    user_agent: userAgent || null,
    ip_hash: ipHash,
    metadata: {
      route: `/w/${slug}`,
    },
  });

  await supabaseAdmin.rpc("increment_waitlist_view", { page_id: page.id });

  return jsonResponse({ ok: true, sessionId });
}

async function handleSignup(payload: WaitlistPublicPayload, req: Request): Promise<Response> {
  const slug = sanitizeText(payload.slug);
  if (!slug) {
    return jsonResponse({ ok: false, code: "SLUG_REQUIRED", error: "Missing slug" }, 400);
  }

  const page = await getPublishedPage(slug);
  if (!page) {
    return jsonResponse({ ok: false, code: "NOT_FOUND", error: "Waitlist page not found" }, 404);
  }

  if (sanitizeText(payload.honeypot)) {
    return jsonResponse({ ok: true, filtered: true });
  }

  const email = normalizeEmail(payload.email || "");
  if (!email || !EMAIL_REGEX.test(email)) {
    return jsonResponse({ ok: false, code: "INVALID_EMAIL", error: "Please provide a valid email." }, 400);
  }

  const firstName = sanitizeText(payload.firstName);
  const consent = Boolean(payload.consent);
  const aiContent = (page.ai_content || {}) as Record<string, unknown>;
  const consentRequired = Boolean(aiContent.consentRequired);

  if (consentRequired && !consent) {
    return jsonResponse({ ok: false, code: "CONSENT_REQUIRED", error: "Consent is required to join this waitlist." }, 400);
  }

  const clientIp = getClientIp(req);
  if (isRateLimited(`signup:${page.id}:${clientIp}`)) {
    return jsonResponse({ ok: false, code: "RATE_LIMITED", error: "Too many requests. Please try again shortly." }, 429);
  }

  const captchaValid = await verifyTurnstileToken(payload.captchaToken, clientIp);
  if (!captchaValid) {
    return jsonResponse({ ok: false, code: "CAPTCHA_FAILED", error: "Captcha verification failed." }, 400);
  }

  const sessionId = sanitizeText(payload.sessionId) || crypto.randomUUID();
  const variant = getVariant(payload.variant);
  const referrer = sanitizeText(payload.referrer) || sanitizeText(req.headers.get("referer"));
  const userAgent = sanitizeText(payload.userAgent) || sanitizeText(req.headers.get("user-agent"));
  const ipSalt = Deno.env.get("WAITLIST_IP_HASH_SALT") || "waitlist_default_salt";
  const ipHash = await sha256Hex(`${ipSalt}:${clientIp}`);

  const insertPayload = {
    waitlist_page_id: page.id,
    email,
    email_normalized: email,
    first_name: firstName || null,
    consent,
    variant,
    referral_source: sanitizeText(payload.referralSource) || null,
    utm_source: sanitizeText(payload.utm?.source) || null,
    utm_medium: sanitizeText(payload.utm?.medium) || null,
    utm_campaign: sanitizeText(payload.utm?.campaign) || null,
    utm_term: sanitizeText(payload.utm?.term) || null,
    utm_content: sanitizeText(payload.utm?.content) || null,
    referrer: referrer || null,
    user_agent: userAgent || null,
    ip_hash: ipHash,
    custom_fields: customFields.length ? customFields : null,
  };

  const { error: signupError } = await supabaseAdmin.from("waitlist_signups").insert(insertPayload);

  if (signupError) {
    if (signupError.code === "23505") {
      return jsonResponse({ ok: true, duplicate: true, referralMessage: pickReferralMessage(page) });
    }

    console.error("[waitlist-public-api] Signup insert failed", signupError);
    return jsonResponse({ ok: false, code: "SIGNUP_FAILED", error: "Unable to save signup." }, 500);
  }

  await supabaseAdmin.from("waitlist_events").insert({
    waitlist_page_id: page.id,
    event_type: "SIGNUP",
    variant,
    session_id: sessionId,
    utm_source: sanitizeText(payload.utm?.source) || null,
    utm_medium: sanitizeText(payload.utm?.medium) || null,
    utm_campaign: sanitizeText(payload.utm?.campaign) || null,
    utm_term: sanitizeText(payload.utm?.term) || null,
    utm_content: sanitizeText(payload.utm?.content) || null,
    referrer: referrer || null,
    user_agent: userAgent || null,
    ip_hash: ipHash,
    metadata: {
      route: `/w/${slug}`,
    },
  });

  const provider = sanitizeText(page.integration_provider).toLowerCase();

  const integrationPayload = {
    type: "waitlist.signup",
    slug,
    pageId: page.id,
    productName: page.product_name || "",
    email,
    firstName,
    consent,
    variant,
    customFields,
    utm: payload.utm || {},
    referralSource: sanitizeText(payload.referralSource),
    occurredAt: new Date().toISOString(),
  };

  await Promise.allSettled([
    sendWebhook(page, integrationPayload),
    provider === "mailchimp" ? syncMailchimp(page, email, firstName) : Promise.resolve(),
    provider === "convertkit" ? syncConvertKit(page, email, firstName) : Promise.resolve(),
    sendConfirmationEmail(page, email, firstName),
  ]);

  return jsonResponse({ ok: true, referralMessage: pickReferralMessage(page) });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Server configuration missing" }, 500);
  }

  let payload: WaitlistPublicPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload" }, 400);
  }

  if (payload.action === "track_view") {
    return handleTrackView(payload, req);
  }

  if (payload.action === "signup") {
    return handleSignup(payload, req);
  }

  return jsonResponse({ ok: false, error: "Unsupported action" }, 400);
});
