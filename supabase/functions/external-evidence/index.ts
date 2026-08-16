import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-ct-connection-id, idempotency-key",
};

const TYPES = new Set([
  "page_view", "demo_completed", "cta_clicked", "lead_created", "signup", "activated",
  "qualified_conversation", "commitment_received", "payment_received", "subscription_cancelled",
]);

const MAX_CSV_BYTES = 2 * 1024 * 1024;
const MAX_CSV_ROWS = 10_000;

type EvidenceEvent = {
  externalId: string;
  type: string;
  occurredAt: string;
  value?: number;
  currency?: string;
  subjectHash?: string;
  properties?: Record<string, string | number | boolean | null>;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes).map((value) => value.toString(16).padStart(2, "0")).join("");

async function sha256(value: string): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function validEvent(value: unknown): { event?: EvidenceEvent; error?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { error: "Event must be an object" };
  const event = value as Record<string, unknown>;
  const externalId = typeof event.externalId === "string" ? event.externalId.trim() : "";
  const type = typeof event.type === "string" ? event.type.trim() : "";
  const occurredAt = typeof event.occurredAt === "string" ? event.occurredAt : "";
  if (!externalId || externalId.length > 240) return { error: "externalId is required and must be at most 240 characters" };
  if (!TYPES.has(type)) return { error: "Unsupported event type" };
  if (!occurredAt || Number.isNaN(Date.parse(occurredAt))) return { error: "occurredAt must be an ISO timestamp" };
  if (event.value !== undefined && (typeof event.value !== "number" || !Number.isFinite(event.value))) return { error: "value must be numeric" };
  if (event.currency !== undefined && (typeof event.currency !== "string" || !/^[A-Za-z]{3}$/.test(event.currency))) return { error: "currency must be a three-letter code" };
  if (event.subjectHash !== undefined && (typeof event.subjectHash !== "string" || event.subjectHash.length > 256)) return { error: "subjectHash is invalid" };
  const properties = event.properties;
  if (properties !== undefined && (!properties || typeof properties !== "object" || Array.isArray(properties) || new TextEncoder().encode(JSON.stringify(properties)).length > 16000)) return { error: "properties must be an object smaller than 16 KB" };
  return { event: {
    externalId, type, occurredAt: new Date(occurredAt).toISOString(),
    value: event.value as number | undefined,
    currency: typeof event.currency === "string" ? event.currency.toUpperCase() : undefined,
    subjectHash: typeof event.subjectHash === "string" ? event.subjectHash : undefined,
    properties: (properties ?? {}) as EvidenceEvent["properties"],
  } };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { current += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { values.push(current); current = ""; }
    else current += char;
  }
  values.push(current);
  return values;
}

function parseCsv(csv: string): Array<Record<string, string>> {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1, MAX_CSV_ROWS + 1).map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value.trim()])));
}

async function ingest(admin: ReturnType<typeof createClient>, connection: any, rawEvents: unknown[], method: "webhook" | "csv", sourcePath?: string) {
  const batchInsert = await admin.from("external_evidence_import_batches").insert({
    connection_id: connection.id, user_id: connection.user_id, method, source_file_path: sourcePath ?? null,
    source_file_delete_after: sourcePath ? new Date(Date.now() + 7 * 86400000).toISOString() : null,
  }).select("id").single();
  if (batchInsert.error) throw batchInsert.error;
  const batchId = batchInsert.data.id;
  const errors: Array<{ row_number: number; external_id: string | null; error_code: string; error_message: string }> = [];
  const valid: EvidenceEvent[] = [];
  rawEvents.forEach((raw, index) => {
    const checked = validEvent(raw);
    if (checked.event) valid.push(checked.event);
    else errors.push({ row_number: index + 2, external_id: typeof (raw as any)?.externalId === "string" ? (raw as any).externalId : null, error_code: "INVALID_EVENT", error_message: checked.error ?? "Invalid event" });
  });

  const unique = new Map(valid.map((event) => [event.externalId, event]));
  const externalIds = [...unique.keys()];
  const existing = new Set<string>();
  for (let offset = 0; offset < externalIds.length; offset += 500) {
    const result = await admin.from("external_evidence_events").select("external_id").eq("connection_id", connection.id).in("external_id", externalIds.slice(offset, offset + 500));
    if (result.error) throw result.error;
    result.data?.forEach((row: any) => existing.add(row.external_id));
  }
  const rows = [...unique.values()].filter((event) => !existing.has(event.externalId)).map((event) => ({
    connection_id: connection.id, batch_id: batchId, user_id: connection.user_id,
    external_id: event.externalId, event_type: event.type, occurred_at: event.occurredAt,
    value: event.value ?? null, currency: event.currency ?? null, subject_hash: event.subjectHash ?? null,
    properties: event.properties ?? {}, verification_mode: "imported",
  }));
  for (let offset = 0; offset < rows.length; offset += 500) {
    const result = await admin.from("external_evidence_events").insert(rows.slice(offset, offset + 500));
    if (result.error) throw result.error;
  }
  const journeyTypeMap: Record<string, { eventType: string; loop: "PROVE" | "SELL" | "GROW" }> = {
    lead_created: { eventType: "prospect_added", loop: "PROVE" },
    qualified_conversation: { eventType: "interview_completed", loop: "SELL" },
    commitment_received: { eventType: "commitment_received", loop: "SELL" },
    payment_received: { eventType: "payment_received", loop: "SELL" },
    subscription_cancelled: { eventType: "customer_lost", loop: "GROW" },
  };
  const journeyRows = [];
  for (const row of rows) {
    const mapped = journeyTypeMap[row.event_type];
    if (!mapped) continue;
    const sourceDigest = await sha256(`${connection.id}:${row.external_id}`);
    journeyRows.push({
      user_id: connection.user_id,
      active_loop: mapped.loop,
      event_type: mapped.eventType,
      source_entity_type: "external_evidence_event",
      source_entity_id: sourceDigest,
      verification_mode: method === "webhook" ? "corroborated" : "imported",
      amount: row.value,
      currency: row.currency,
      metadata: { providerLabel: connection.provider_label, method, importedEventType: row.event_type },
      idempotency_key: `external:${sourceDigest}`,
      occurred_at: row.occurred_at,
    });
  }
  if (journeyRows.length) {
    const journeyResult = await admin.from("customer_evidence_events").upsert(journeyRows, {
      onConflict: "user_id,idempotency_key", ignoreDuplicates: true,
    });
    if (journeyResult.error) throw journeyResult.error;
  }
  if (errors.length) await admin.from("external_evidence_import_errors").insert(errors.map((error) => ({ ...error, batch_id: batchId })));
  const duplicateCount = valid.length - rows.length;
  const status = errors.length ? (rows.length ? "partial" : "failed") : "completed";
  await admin.from("external_evidence_import_batches").update({
    status, accepted_count: rows.length, duplicate_count: duplicateCount,
    rejected_count: errors.length, completed_at: new Date().toISOString(),
  }).eq("id", batchId);
  await admin.from("external_evidence_connections").update({
    last_success_at: rows.length ? new Date().toISOString() : connection.last_success_at,
    last_error: errors.length ? `${errors.length} row(s) rejected` : null, updated_at: new Date().toISOString(),
  }).eq("id", connection.id);
  return { batchId, accepted: rows.length, duplicate: duplicateCount, rejected: errors.length, errors: errors.slice(0, 100) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = new URL(req.url);
  let parsedBody: Record<string, unknown> | null = null;
  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    try { parsedBody = await req.clone().json(); } catch { parsedBody = null; }
  }
  const bodyAction = typeof parsedBody?.action === "string" ? parsedBody.action : null;
  const action = url.searchParams.get("action") ?? bodyAction ?? "ingest";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    if (action === "create") {
      const authorization = req.headers.get("authorization") ?? "";
      const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
      const userResult = await client.auth.getUser();
      if (!userResult.data.user) return json({ error: "Authentication required" }, 401);
      const body = parsedBody ?? await req.json();
      const token = `ctwh_${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
      const result = await client.rpc("create_external_evidence_connection_v1", {
        p_provider_label: body.providerLabel, p_method: body.method ?? "webhook",
        p_token_hash: body.method === "csv" ? null : await sha256(token), p_token_last_four: body.method === "csv" ? null : token.slice(-4),
      });
      if (result.error) throw result.error;
      return json({ connection: result.data, token: body.method === "csv" ? null : token }, 201);
    }

    if (action === "import_csv") {
      const authorization = req.headers.get("authorization") ?? "";
      const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
      const userResult = await client.auth.getUser();
      if (!userResult.data.user) return json({ error: "Authentication required" }, 401);
      const body = parsedBody ?? await req.json();
      const connectionResult = await admin.from("external_evidence_connections").select("*").eq("id", body.connectionId).eq("user_id", userResult.data.user.id).eq("status", "active").single();
      if (connectionResult.error) return json({ error: "Connection not found" }, 404);
      let csv = typeof body.csv === "string" ? body.csv : "";
      if (!csv && typeof body.storagePath === "string") {
        const downloaded = await admin.storage.from("evidence-imports").download(body.storagePath);
        if (downloaded.error) throw downloaded.error;
        csv = await downloaded.data.text();
      }
      if (!csv || new TextEncoder().encode(csv).length > MAX_CSV_BYTES) return json({ error: "CSV must be between 1 byte and 2 MB" }, 400);
      const csvRowCount = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim()).length - 1;
      if (csvRowCount > MAX_CSV_ROWS) return json({ error: `CSV cannot exceed ${MAX_CSV_ROWS} data rows` }, 400);
      const records = parseCsv(csv).map((row) => ({
        externalId: row.externalId, type: row.type, occurredAt: row.occurredAt,
        value: row.value ? Number(row.value) : undefined, currency: row.currency || undefined,
        subjectHash: row.subjectHash || undefined,
        properties: row.properties ? (() => { try { return JSON.parse(row.properties); } catch { return { note: row.properties }; } })() : {},
      }));
      const result = await ingest(admin, connectionResult.data, records, "csv", typeof body.storagePath === "string" ? body.storagePath : undefined);
      if (typeof body.storagePath === "string") await admin.storage.from("evidence-imports").remove([body.storagePath]);
      return json(result);
    }

    const connectionId = req.headers.get("x-ct-connection-id")?.trim();
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!connectionId || !bearer) return json({ error: "Connection ID and bearer token are required" }, 401);
    const connectionResult = await admin.from("external_evidence_connections").select("*").eq("id", connectionId).eq("method", "webhook").eq("status", "active").single();
    if (connectionResult.error || !safeEqual(await sha256(bearer), connectionResult.data.token_hash ?? "")) return json({ error: "Invalid connection token" }, 401);
    const recent = await admin.from("external_evidence_events").select("id", { count: "exact", head: true }).eq("connection_id", connectionId).gte("created_at", new Date(Date.now() - 60000).toISOString());
    if ((recent.count ?? 0) >= 1000) return json({ error: "Rate limit exceeded" }, 429);
    const body = await req.json();
    if (body?.version !== 1 || !Array.isArray(body.events) || body.events.length < 1 || body.events.length > 100) return json({ error: "Version 1 requires 1-100 events" }, 400);
    return json(await ingest(admin, connectionResult.data, body.events, "webhook"));
  } catch (error) {
    console.error("external-evidence", error);
    return json({ error: error instanceof Error ? error.message : "External evidence request failed" }, 500);
  }
});
