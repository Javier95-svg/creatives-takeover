import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// The CNAME target users should point their www subdomain to.
// This is the address of the App Builder hosting edge.
const CNAME_TARGET = "apps.creativestakeover.com";

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveTxt(hostname: string): Promise<string[]> {
  try {
    const records = await Deno.resolveDns(hostname, "TXT");
    return records.flatMap((entry) =>
      Array.isArray(entry) ? entry.map(String) : [String(entry)]
    );
  } catch {
    return [];
  }
}

async function resolveCname(hostname: string): Promise<string[]> {
  try {
    const records = await Deno.resolveDns(hostname, "CNAME");
    return records.map((r) => String(r).toLowerCase().replace(/\.$/, ""));
  } catch {
    return [];
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON" }, 400);
  }

  const projectId = String(body.projectId ?? "").trim();
  const rawDomain = String(body.domain ?? "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const verificationToken = String(body.verificationToken ?? "").trim();
  const userId = String(body.userId ?? "").trim();

  if (!projectId || !rawDomain || !verificationToken) {
    return jsonResponse(
      { ok: false, error: "projectId, domain, and verificationToken are required" },
      400
    );
  }

  // ── DNS checks ─────────────────────────────────────────────────────────────
  // TXT: _ct-verify.<domain>  →  ct-app-verify=<token>
  // CNAME: www.<domain>  →  apps.creativestakeover.com

  const txtHost = `_ct-verify.${rawDomain}`;
  const expectedTxt = `ct-app-verify=${verificationToken}`;
  const cnameHost = `www.${rawDomain}`;

  const [txtRecords, cnameRecords] = await Promise.all([
    resolveTxt(txtHost),
    resolveCname(cnameHost),
  ]);

  const txtVerified = txtRecords.some((r) =>
    r.toLowerCase().includes(expectedTxt.toLowerCase())
  );
  const cnameVerified = cnameRecords.some((r) => r === CNAME_TARGET);

  // Ownership is confirmed by the TXT record alone
  const verified = txtVerified;
  const status = verified ? "verified" : "pending";

  // ── Update DB ──────────────────────────────────────────────────────────────
  if (userId) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });

      await supabase.from("app_builder_domains").upsert(
        {
          project_id: projectId,
          user_id: userId,
          domain: rawDomain,
          verification_token: verificationToken,
          txt_verified: txtVerified,
          status,
          verified_at: verified ? new Date().toISOString() : null,
        },
        { onConflict: "project_id" }
      );
    } catch (e) {
      console.error("DB update error:", e);
      // Non-fatal — return DNS result regardless
    }
  }

  return jsonResponse({
    ok: true,
    verified,
    txtVerified,
    cnameVerified,
    status,
    checks: {
      txt: {
        host: txtHost,
        expected: expectedTxt,
        found: txtRecords,
        passed: txtVerified,
      },
      cname: {
        host: cnameHost,
        expected: CNAME_TARGET,
        found: cnameRecords,
        passed: cnameVerified,
      },
    },
  });
});
