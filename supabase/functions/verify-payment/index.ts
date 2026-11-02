import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Legacy credit verification belonged to the caller-priced checkout. Stripe
// webhooks and server-owned catalogue prices remain the supported flow.
serve(() => new Response(JSON.stringify({ error: "Legacy payment verification retired" }), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));
