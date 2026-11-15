// Wakes the research worker right away instead of waiting for the one-minute
// sweeper. Fire and forget: the sweeper is the safety net if this call is lost.

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

export function kickResearchWorker(): void {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  const request = fetch(`${url}/functions/v1/gtm-research-worker`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ source: "kick" }),
  }).then((response) => response.body?.cancel()).catch(() => undefined);
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(request);
}
