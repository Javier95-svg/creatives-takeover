import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Legacy checkout accepted the caller's price and credit quantity. The
// supported checkout uses a server-owned price catalogue instead.
serve(() => new Response(JSON.stringify({ error: "Legacy checkout retired" }), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));
