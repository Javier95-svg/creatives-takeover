import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Retired: this endpoint used the service role to mark new email accounts as
// confirmed without proving inbox ownership. Keep a fail-closed response at
// the old URL until every deployed client has stopped calling it.
serve(() => new Response(JSON.stringify({
  ok: false,
  code: "GONE",
  error: "Please sign up through email confirmation.",
}), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));
