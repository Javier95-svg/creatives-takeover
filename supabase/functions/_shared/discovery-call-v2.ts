export const discoveryCallCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

export function env(name: string): string {
  return (Deno.env.get(name) ?? "").trim();
}
export function json(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...discoveryCallCorsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export function generateDiscoveryCallToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export async function hashDiscoveryCallToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function tokenEncryptionKey(): Promise<CryptoKey> {
  const secret = env("DISCOVERY_CALL_TOKEN_SECRET") || env("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("Discovery Call token encryption is not configured");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptDiscoveryCallToken(token: string): Promise<string> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await tokenEncryptionKey(),
    new TextEncoder().encode(token),
  ));
  return `${base64Url(iv)}.${base64Url(encrypted)}`;
}

export async function decryptDiscoveryCallToken(ciphertext: string): Promise<string> {
  const [ivPart, encryptedPart] = ciphertext.split(".");
  if (!ivPart || !encryptedPart) throw new Error("Invalid token ciphertext");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(ivPart) },
    await tokenEncryptionKey(),
    fromBase64Url(encryptedPart),
  );
  return new TextDecoder().decode(decrypted);
}

export function isDiscoveryCallV2Enabled(): boolean {
  return env("DISCOVERY_CALL_REQUESTS_V2_ENABLED").toLowerCase() === "true";
}

export function isAuthorizedWorker(req: Request): boolean {
  const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const cronSecret = req.headers.get("x-cron-secret") ?? "";
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const configuredCronSecret = env("CRON_SECRET");
  return Boolean(
    (serviceKey && bearer === serviceKey)
    || (configuredCronSecret && cronSecret === configuredCronSecret)
  );
}

export function errorStatus(errorCode?: string): number {
  if (errorCode === "TOKEN_EXPIRED" || errorCode === "RESPONSE_EXPIRED") return 410;
  if (["STALE_STATE", "ACTIVE_CALL_EXISTS", "ACTIVE_RESCHEDULE_EXISTS", "SLOT_UNAVAILABLE"].includes(errorCode ?? "")) return 409;
  if (errorCode === "FORBIDDEN") return 403;
  if (errorCode === "NOT_FOUND") return 404;
  if (errorCode === "INSUFFICIENT_CREDITS" || errorCode?.startsWith("INVALID_") || errorCode === "MEETING_DETAILS_REQUIRED") return 422;
  return 400;
}
