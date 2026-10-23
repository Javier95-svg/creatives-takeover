import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getUserFromAuth } from "../_shared/credit-deduction.ts";
import { checkPublicUrl, htmlToText, isPrivateAddress } from "../_shared/public-url-guard.ts";

// Project setup for founders: drafts the project's fields from files the
// founder uploaded (their own dashboard_files rows, already parsed by
// document-parser) and their website. Free (no credit charge): it's
// onboarding. Uses gpt-4o-mini to keep cost negligible. Nothing is saved
// here; the founder reviews and saves on /project-setup.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_FILES = 5;
const MAX_INPUT_CHARS = 30000;
const MAX_WEBSITE_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 8000;

const STAGES = ["idea", "prototype", "mvp", "launch", "growth", "scale"];
const BUSINESS_MODELS = ["b2b_saas", "service", "b2c_product", "marketplace", "ecommerce", "media", "other"];
// src/data/angelSectors.ts, minus the legacy "Mobility & Logistics".
const INDUSTRIES = [
  "AI & Machine Learning", "BioTech & Life Sciences", "CleanTech & Climate", "Consumer & D2C", "Cybersecurity",
  "DeepTech & Hardware", "Developer Tools", "E-Commerce & Marketplace", "EdTech", "Energy", "Enterprise Software",
  "FinTech", "FoodTech & AgTech", "Gaming & Entertainment", "GovTech", "HealthTech", "HR Tech & Future of Work",
  "InsurTech", "LegalTech", "Logistics & Supply Chain", "Manufacturing & Industry 4.0", "Media & Creator Economy",
  "Mobility & Transportation", "PropTech & Real Estate", "RetailTech", "Robotics & Automation", "SaaS",
  "Social Impact", "SpaceTech", "Sports & Wellness", "Travel & Hospitality", "Web3 & Blockchain",
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function hostResolvesPublic(hostname: string): Promise<boolean> {
  const addresses: string[] = [];
  for (const type of ["A", "AAAA"] as const) {
    try {
      addresses.push(...(await Deno.resolveDns(hostname, type)));
    } catch {
      // No record of this type (or DNS not permitted): the fetch decides.
    }
  }
  return !addresses.some(isPrivateAddress);
}

async function readCapped(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_WEBSITE_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  const bytes = new Uint8Array(Math.min(total, MAX_WEBSITE_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    const slice = chunk.subarray(0, bytes.length - offset);
    bytes.set(slice, offset);
    offset += slice.byteLength;
    if (offset >= bytes.length) break;
  }
  return new TextDecoder().decode(bytes);
}

/** Fetches a public page with the guard re-checked on every redirect. */
async function fetchWebsite(input: string): Promise<{ url: string; text: string } | { error: string }> {
  let check = checkPublicUrl(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!check.ok) return { error: check.reason };
    if (!(await hostResolvesPublic(check.url.hostname))) return { error: "That website points to a private address." };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(check.url.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "CreativesTakeoverProjectImport/1.0", Accept: "text/html,text/plain;q=0.9" },
      });
    } catch {
      clearTimeout(timer);
      return { error: "We couldn't open that website." };
    }

    if (response.status >= 300 && response.status < 400) {
      clearTimeout(timer);
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => undefined);
      if (!location) return { error: "We couldn't open that website." };
      check = checkPublicUrl(new URL(location, check.url).toString());
      continue;
    }

    try {
      if (!response.ok) return { error: `That website answered with an error (${response.status}).` };
      const type = response.headers.get("content-type") ?? "";
      if (type && !/text\/html|text\/plain|application\/xhtml/i.test(type)) return { error: "That link isn't a web page." };
      const body = await readCapped(response);
      const page = /html/i.test(type) || /<html|<body/i.test(body) ? htmlToText(body) : { title: "", description: "", text: body };
      const text = [page.title && `Title: ${page.title}`, page.description && `Description: ${page.description}`, page.text]
        .filter(Boolean)
        .join("\n");
      return { url: check.url.toString(), text };
    } catch {
      return { error: "We couldn't read that website in time." };
    } finally {
      clearTimeout(timer);
    }
  }
  return { error: "That website redirects too many times." };
}

const SYSTEM_PROMPT = `You draft a startup's project profile from the founder's own documents and website.

Rules:
- Return valid JSON only: { "fields": { ... }, "sources": { ... } }.
- Use only what the sources say. Never invent customers, numbers, team members or traction. Leave a field as "" (or [] for industry) when the sources don't cover it.
- Write in the same language as the sources, plainly, in the founder's voice, without hype.
- "sources" maps each field you filled to the label of the source it came from (exactly as given after "SOURCE:").

fields shape:
{
  "name": "project or company name",
  "pitch": "one sentence, max 160 characters: what it is and for whom",
  "description": "what it does, 2-4 sentences",
  "problem": "the problem it solves",
  "customer": "who the target customer is",
  "businessModel": one of ${JSON.stringify(BUSINESS_MODELS)} or "",
  "stage": one of ${JSON.stringify(STAGES)} or "" (idea = no product yet; prototype = something to show; mvp = first users; launch = publicly available; growth = growing revenue; scale = scaling a proven model),
  "customers": "named or described customers or users, only if stated",
  "traction": "metrics, revenue, users, pilots, only if stated",
  "team": "founders and team, only if stated",
  "industry": up to 3 values from ${JSON.stringify(INDUSTRIES)},
  "website": "the project's website URL",
  "demo": "a demo or product video URL, only if stated",
  "pitchDeck": "a public pitch deck URL, only if stated"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getUserFromAuth(req);
    if (!user) return json({ success: false, error: "Authentication required" }, 401);

    const body = await req.json().catch(() => ({}));
    const fileIds = Array.isArray(body?.file_ids)
      ? body.file_ids.filter((id: unknown): id is string => typeof id === "string").slice(0, MAX_FILES)
      : [];
    const websiteUrl = typeof body?.website_url === "string" ? body.website_url.trim() : "";
    if (fileIds.length === 0 && !websiteUrl) return json({ success: false, error: "Add a file or a website link." }, 422);

    const sources: Array<{ label: string; text: string }> = [];
    const warnings: string[] = [];

    if (fileIds.length > 0) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { persistSession: false },
      });
      // Only the caller's own files are read.
      const { data: files, error } = await supabase
        .from("dashboard_files")
        .select("id, title, file_extension, extracted_text")
        .eq("user_id", user.id)
        .in("id", fileIds);
      if (error) throw error;
      for (const file of files ?? []) {
        const label = [file.title, file.file_extension].filter(Boolean).join(".") || "file";
        if (typeof file.extracted_text === "string" && file.extracted_text.trim()) {
          sources.push({ label, text: file.extracted_text });
        } else {
          warnings.push(`We couldn't read text from ${label}.`);
        }
      }
    }

    let website: string | null = null;
    if (websiteUrl) {
      const result = await fetchWebsite(websiteUrl);
      if ("error" in result) {
        warnings.push(result.error);
      } else if (result.text.trim()) {
        website = result.url;
        sources.push({ label: "website", text: `URL: ${result.url}\n${result.text}` });
      } else {
        warnings.push("That website has no readable text.");
      }
    }

    if (sources.length === 0) {
      return json({ success: false, error: warnings[0] ?? "We couldn't read anything from those sources.", warnings }, 422);
    }

    // Share the input budget evenly so one long deck can't crowd out the rest.
    const perSource = Math.floor(MAX_INPUT_CHARS / sources.length);
    const input = sources.map((source) => `SOURCE: ${source.label}\n${source.text.slice(0, perSource)}`).join("\n\n---\n\n");

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) throw new Error("OpenAI API key not configured");

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 2000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: input },
        ],
      }),
    });
    if (!completion.ok) {
      const errBody = await completion.text().catch(() => "");
      throw new Error(`OpenAI API Error: ${completion.status} ${errBody.slice(0, 200)}`.trim());
    }

    const aiData = await completion.json();
    const content = aiData?.choices?.[0]?.message?.content;
    let parsed: { fields?: Record<string, unknown>; sources?: Record<string, unknown> } = {};
    try {
      parsed = JSON.parse(typeof content === "string" ? content : "{}");
    } catch {
      parsed = {};
    }

    const fields = parsed.fields && typeof parsed.fields === "object" ? parsed.fields : {};
    // The fetched site is the website, whatever the model wrote.
    if (website && !fields.website) fields.website = website;
    const fieldSources = parsed.sources && typeof parsed.sources === "object" ? parsed.sources : {};
    if (website && !fieldSources.website) fieldSources.website = "website";

    return json({
      success: true,
      fields,
      sources: fieldSources,
      read: sources.map((source) => source.label),
      warnings,
    });
  } catch (error) {
    console.error("project-import-extract failed", error);
    return json({ success: false, error: "We couldn't read your project right now. Please try again." }, 500);
  }
});
