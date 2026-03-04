import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CNAME_TARGET = "apps.creativestakeover.com";
const A_TARGETS = ["76.76.21.21"];

// Known two-level public suffixes for apex detection
const KNOWN_TWO_LEVEL_SUFFIXES = new Set([
  "ac.uk", "co.jp", "co.kr", "co.nz", "co.uk",
  "com.au", "com.br", "com.mx", "com.tr",
  "gov.uk", "net.au", "org.au", "org.uk",
]);

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getRegistrableDomain(hostname: string): string {
  const labels = hostname.split(".").filter(Boolean);
  if (labels.length <= 2) return hostname;
  const lastTwo = labels.slice(-2).join(".");
  const lastThree = labels.slice(-3).join(".");
  if (KNOWN_TWO_LEVEL_SUFFIXES.has(lastTwo) && labels.length >= 3) return lastThree;
  return lastTwo;
}

async function resolveTxt(hostname: string): Promise<string[]> {
  try {
    const records = await Deno.resolveDns(hostname, "TXT");
    return records.flatMap((e) => (Array.isArray(e) ? e.map(String) : [String(e)]));
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

async function resolveA(hostname: string): Promise<string[]> {
  try {
    const records = await Deno.resolveDns(hostname, "A");
    return records.map(String);
  } catch {
    return [];
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON" }, 400);
  }

  const projectId = String(body.projectId ?? "").trim();
  const rawDomain = String(body.domain ?? "")
    .toLowerCase().trim()
    .replace(/^https?:\/\//, "").replace(/\/$/, "");
  const verificationToken = String(body.verificationToken ?? "").trim();

  if (!projectId || !rawDomain || !verificationToken) {
    return jsonResponse(
      { ok: false, error: "projectId, domain, and verificationToken are required" },
      400
    );
  }

  // Determine if this is an apex domain or subdomain
  const registrableDomain = getRegistrableDomain(rawDomain);
  const isApex = rawDomain === registrableDomain;

  const txtHost = `_ct-verify.${rawDomain}`;
  const expectedTxt = `ct-app-verify=${verificationToken}`;
  const routingHost = rawDomain;
  const routingType = isApex ? "A" : "CNAME";
  const expectedRouting = isApex ? A_TARGETS : [CNAME_TARGET];

  // Run DNS lookups in parallel
  const [txtRecords, routingRecords] = await Promise.all([
    resolveTxt(txtHost),
    isApex ? resolveA(routingHost) : resolveCname(routingHost),
  ]);

  const txtVerified = txtRecords.some((r) =>
    r.toLowerCase().includes(expectedTxt.toLowerCase())
  );
  const routingVerified = isApex
    ? A_TARGETS.every((t) => routingRecords.includes(t))
    : routingRecords.some((r) => r === CNAME_TARGET);

  // Both TXT (ownership) and routing must be confirmed for full verification
  const verified = txtVerified && routingVerified;
  const status = verified ? "verified" : "pending";
  const now = new Date().toISOString();

  const checks = {
    txt: {
      host: txtHost,
      expected: [expectedTxt],
      found: txtRecords,
      passed: txtVerified,
      recordType: "TXT",
    },
    routing: {
      host: routingHost,
      expected: expectedRouting,
      found: routingRecords,
      passed: routingVerified,
      recordType: routingType,
    },
  };

  // ── Update DB ──────────────────────────────────────────────────────────────
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    await supabase.from("app_builder_domains").update({
      txt_verified: txtVerified,
      routing_verified: routingVerified,
      status,
      verified_at: verified ? now : null,
      last_checked_at: now,
      verification_details: checks,
    }).eq("project_id", projectId);
  } catch (e) {
    console.error("DB update error:", e);
    // Non-fatal — return DNS result regardless
  }

  return jsonResponse({
    ok: true,
    verified,
    txtVerified,
    routingVerified,
    status,
    verifiedAt: verified ? now : null,
    lastCheckedAt: now,
    checks,
  });
});
