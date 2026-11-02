import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Legacy self-reported sprint outcomes could mint bonus credits. This path is
// retired until a server-authoritative outcome flow is reviewed.
serve(() => new Response(JSON.stringify({ error: "Legacy sprint rewards retired" }), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));
