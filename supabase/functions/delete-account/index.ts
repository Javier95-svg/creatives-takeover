import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type OwnedStorageObject = {
  bucket_id: string;
  object_name: string;
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const chunks = <T,>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const buildDeletionEmail = (email: string) => `
  <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px; margin: 0 auto;">
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700;">Your account was deleted</h1>
    <p style="margin: 0 0 12px; color: #334155;">The Creatives Takeover account registered to <strong>${escapeHtml(email)}</strong> was permanently deleted.</p>
    <p style="margin: 0 0 20px; color: #334155;">Any active Creatives Takeover subscription was canceled before deletion.</p>
    <p style="margin: 0; color: #64748b; font-size: 13px;">— The Creatives Takeover Team</p>
  </div>
`;

async function cancelSubscriptions(stripe: Stripe, customerIds: string[]) {
  const terminalStatuses = new Set(["canceled", "incomplete_expired"]);

  for (const customerId of customerIds) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });

    for (const subscription of subscriptions.data) {
      if (!terminalStatuses.has(subscription.status)) {
        await stripe.subscriptions.cancel(subscription.id);
      }
    }
  }
}

async function deleteOwnedStorageObjects(
  adminClient: ReturnType<typeof createClient>,
  objects: OwnedStorageObject[],
) {
  const byBucket = new Map<string, string[]>();
  for (const object of objects) {
    const names = byBucket.get(object.bucket_id) || [];
    names.push(object.object_name);
    byBucket.set(object.bucket_id, names);
  }

  for (const [bucketId, names] of byBucket) {
    for (const batch of chunks(names, 1000)) {
      const { error } = await adminClient.storage.from(bucketId).remove(batch);
      if (error) throw new Error(`Storage cleanup failed for ${bucketId}: ${error.message}`);
    }
  }
}

serve(async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeKey) {
    console.error("delete-account: missing server configuration");
    return json(503, {
      success: false,
      code: "SERVICE_UNAVAILABLE",
      error: "Account deletion is temporarily unavailable. Please try again shortly.",
    });
  }
  if (!token) {
    return json(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Please sign in again before deleting your account.",
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const confirmation = typeof body?.confirmation === "string" ? body.confirmation : "";

    if (confirmation !== "DELETE" || body?.acknowledged !== true) {
      return json(400, {
        success: false,
        code: "CONFIRMATION_REQUIRED",
        error: 'Type "DELETE" and confirm that you understand the account deletion is permanent.',
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authenticatedUser, error: userError } = await authClient.auth.getUser(token);
    const user = authenticatedUser.user;

    if (userError || !user?.id || !user.email) {
      return json(401, {
        success: false,
        code: "UNAUTHORIZED",
        error: "Your session expired. Please sign in again before deleting your account.",
      });
    }

    const providers = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : [];
    const requiresPassword = user.identities?.some((identity) => identity.provider === "email")
      || user.app_metadata?.provider === "email"
      || providers.includes("email");

    if (requiresPassword) {
      if (!currentPassword) {
        return json(400, {
          success: false,
          code: "CURRENT_PASSWORD_REQUIRED",
          error: "Enter your current password.",
        });
      }

      const verificationClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: verification, error: verificationError } = await verificationClient.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verificationError || verification.user?.id !== user.id) {
        if (verificationError?.status === 429) {
          return json(429, {
            success: false,
            code: "RATE_LIMITED",
            error: "Too many verification attempts. Please wait and try again.",
          });
        }
        return json(400, {
          success: false,
          code: "CURRENT_PASSWORD_INCORRECT",
          error: "Current password is incorrect.",
        });
      }
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Billing is canceled before destructive data work. A Stripe failure stops
    // deletion so no deleted user can continue to be charged.
    const customerIds = new Set<string>();
    const { data: subscriber, error: subscriberError } = await adminClient
      .from("subscribers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriberError) {
      console.error("delete-account: subscriber lookup failed", { userId: user.id, message: subscriberError.message });
      return json(500, { success: false, code: "BILLING_CHECK_FAILED", error: "We could not verify your billing status. Nothing was deleted." });
    }
    if (typeof subscriber?.stripe_customer_id === "string" && subscriber.stripe_customer_id) {
      customerIds.add(subscriber.stripe_customer_id);
    }

    const customers = await stripe.customers.list({ email: user.email, limit: 100 });
    customers.data.forEach((customer) => customerIds.add(customer.id));
    await cancelSubscriptions(stripe, [...customerIds]);

    // Supabase Auth rejects hard deletion while a user still owns any Storage
    // objects. The RPC only lists paths; removal happens through Storage API so
    // the underlying files are deleted rather than orphaned.
    const { data: ownedObjects, error: ownedObjectsError } = await adminClient.rpc(
      "list_owned_storage_objects_for_account_deletion_v1",
      { p_user_id: user.id },
    );
    if (ownedObjectsError) {
      console.error("delete-account: storage inventory failed", { userId: user.id, message: ownedObjectsError.message });
      return json(500, { success: false, code: "STORAGE_CHECK_FAILED", error: "We could not prepare your files for deletion. Please try again." });
    }
    await deleteOwnedStorageObjects(adminClient, (ownedObjects || []) as OwnedStorageObject[]);

    // This RPC removes public account rows in one transaction and rolls back if
    // any account-owned row is blocked by an unexpected relationship.
    const { error: cleanupError } = await adminClient.rpc("cleanup_account_data_v1", {
      p_user_id: user.id,
    });
    if (cleanupError) {
      console.error("delete-account: data cleanup failed", {
        requestId,
        userId: user.id,
        code: cleanupError.code,
        message: cleanupError.message,
        details: cleanupError.details,
        hint: cleanupError.hint,
      });
      return json(500, {
        success: false,
        code: "DATA_CLEANUP_FAILED",
        requestId,
        error: "We could not safely remove all account data. Please try again.",
      });
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("delete-account: auth deletion failed", { userId: user.id, message: deleteError.message });
      return json(500, { success: false, code: "DELETE_FAILED", error: "We could not finish deleting your account. Please contact support." });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("delete-account: account deleted but RESEND_API_KEY is missing", { userId: user.id });
      return json(200, { success: true, notificationSent: false });
    }

    try {
      const fromEmail = Deno.env.get("FROM_EMAIL") || "no-reply@creatives-takeover.com";
      const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";
      const resend = new Resend(resendApiKey);
      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [user.email],
        subject: "Your Creatives Takeover account was deleted",
        html: buildDeletionEmail(user.email),
      });

      if (result.error || !result.data?.id) {
        console.error("delete-account: deletion email failed", { userId: user.id, message: result.error?.message || "No email id returned" });
        return json(200, { success: true, notificationSent: false });
      }
      return json(200, { success: true, notificationSent: true });
    } catch (emailError) {
      console.error("delete-account: deletion email threw", {
        userId: user.id,
        message: emailError instanceof Error ? emailError.message : String(emailError),
      });
      return json(200, { success: true, notificationSent: false });
    }
  } catch (error) {
    console.error("delete-account: unexpected error", error instanceof Error ? error.message : String(error));
    return json(500, {
      success: false,
      code: "UNEXPECTED_ERROR",
      error: "Your account was not deleted. Please try again.",
    });
  }
});
