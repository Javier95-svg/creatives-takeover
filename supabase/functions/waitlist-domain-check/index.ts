import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DomainCheckPayload {
  action: "check_dns";
  domain?: string;
  token?: string;
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

async function resolveTxt(hostname: string): Promise<string[]> {
  try {
    const records = await Deno.resolveDns(hostname, "TXT");
    return records.flatMap((entry) => (Array.isArray(entry) ? entry : [String(entry)]));
  } catch {
    return [];
  }
}

async function resolveCname(hostname: string): Promise<string[]> {
  try {
    const records = await Deno.resolveDns(hostname, "CNAME");
    return records.map((entry) => String(entry).toLowerCase().replace(/\.$/, ""));
  } catch {
    return [];
  }
}

async function checkDns(domain: string, token: string): Promise<Response> {
  const normalizedDomain = sanitizeText(domain).toLowerCase().replace(/\.$/, "");
  const normalizedToken = sanitizeText(token);

  if (!normalizedDomain || !normalizedToken) {
    return jsonResponse({ ok: false, error: "Domain and token are required." }, 400);
  }

  const txtRecords = await resolveTxt(normalizedDomain);
  const dkimHost = `ct1._domainkey.${normalizedDomain}`;
  const dkimRecords = await resolveCname(dkimHost);

  const expectedVerification = `ct-waitlist-verification=${normalizedToken}`;
  const verificationMatch = txtRecords.some((record) => record.toLowerCase().includes(expectedVerification.toLowerCase()));
  const spfMatch = txtRecords.some((record) => record.toLowerCase().includes("v=spf1") && record.toLowerCase().includes("include:_spf.resend.com"));
  const dkimMatch = dkimRecords.some((record) => record === "ct1._domainkey.resend.com");

  return jsonResponse({
    ok: true,
    checks: {
      verification: verificationMatch,
      spf: spfMatch,
      dkim: dkimMatch,
    },
    records: {
      verification: {
        type: "TXT",
        host: normalizedDomain,
        expected: expectedVerification,
      },
      spf: {
        type: "TXT",
        host: normalizedDomain,
        expected: "v=spf1 include:_spf.resend.com ~all",
      },
      dkim: {
        type: "CNAME",
        host: dkimHost,
        expected: "ct1._domainkey.resend.com",
      },
    },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  let payload: DomainCheckPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload" }, 400);
  }

  if (payload.action !== "check_dns") {
    return jsonResponse({ ok: false, error: "Unsupported action" }, 400);
  }

  return checkDns(payload.domain || "", payload.token || "");
});
