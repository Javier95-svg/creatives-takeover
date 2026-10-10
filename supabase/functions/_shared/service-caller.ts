/**
 * Whether a request was made with the project's service role.
 *
 * Comparing the bearer token with SUPABASE_SERVICE_ROLE_KEY as a string is not
 * enough: the database jobs call with the service role key stored in
 * private.service_config, which is a valid service role JWT but not the same
 * string as the key this runtime is given. Since 3 Oct 2026 that mismatch made
 * send-retention-email answer 403 to every routine reminder and win-back.
 *
 * Only for functions deployed with verify_jwt on: the gateway has already
 * checked the token's signature, so its role claim can be trusted. Pure, so
 * node tests load it.
 */
export function isServiceRoleToken(token: string, serviceKey: string): boolean {
  if (!token) return false;
  if (serviceKey && token === serviceKey) return true;
  const payload = token.split(".")[1];
  if (!payload) return false;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(base64 + "=".repeat((4 - base64.length % 4) % 4)));
    return claims?.role === "service_role";
  } catch {
    return false;
  }
}
