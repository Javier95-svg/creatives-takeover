const encoder = new TextEncoder();
const encode = (data: Uint8Array) => btoa(String.fromCharCode(...data));
const decode = (data: string) => Uint8Array.from(atob(data), c => c.charCodeAt(0));
async function key() {
  const secret = Deno.env.get('INTEGRATION_TOKEN_SECRET');
  if (!secret || secret.length < 32) throw new Error('Connection encryption has not been configured.');
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', encoder.encode(secret)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function sealSecret(value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), encoder.encode(JSON.stringify(value)));
  return `${encode(iv)}.${encode(new Uint8Array(data))}`;
}
export async function openSecret(value: string) {
  const [iv, data] = value.split('.');
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(iv) }, await key(), decode(data))));
}
