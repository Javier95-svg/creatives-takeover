/**
 * Logs in to an SMTP server with a user and password, then hangs up: no email
 * is sent. Used by ai-provider-health to check the SMTP login Supabase Auth
 * sends through (Resend).
 *
 * On 2026-11-16 that password (a Resend API key) stopped working, and every
 * email signup failed with "Error sending confirmation email" until an outside
 * tester noticed. AUTH_SMTP_PASSWORD must hold the same key as Supabase →
 * Authentication → Emails → SMTP Settings → Password.
 */
export async function probeSmtpLogin(options: { host: string; port: number; user: string; password: string; timeoutMs?: number }) {
  const deadline = Date.now() + (options.timeoutMs ?? 15_000);
  const conn = await Deno.connectTls({ hostname: options.host, port: options.port });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const buffer = new Uint8Array(4096);
  let pending = "";

  const readChunk = async (): Promise<number | null> => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("SMTP timed out");
    let timer: number | undefined;
    try {
      return await Promise.race([
        conn.read(buffer),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("SMTP timed out")), remaining); }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };

  // One full reply: lines until one has a space after the code ("250 ok").
  const reply = async (): Promise<{ code: number; last: string }> => {
    while (true) {
      const lines = pending.split("\r\n");
      const done = lines.findIndex((line) => /^\d{3} /.test(line));
      if (done >= 0) {
        pending = lines.slice(done + 1).join("\r\n");
        return { code: Number(lines[done].slice(0, 3)), last: lines[done] };
      }
      const read = await readChunk();
      if (read === null) throw new Error("SMTP closed the connection");
      pending += decoder.decode(buffer.subarray(0, read));
    }
  };
  const send = (line: string) => conn.write(encoder.encode(`${line}\r\n`));
  const expect = async (want: number, step: string) => {
    const answer = await reply();
    if (answer.code !== want) throw new Error(`${step}: ${answer.last.slice(0, 200)}`);
  };

  try {
    await expect(220, "greeting");
    await send("EHLO creatives-takeover.com");
    await expect(250, "EHLO");
    await send("AUTH LOGIN");
    await expect(334, "AUTH");
    await send(btoa(options.user));
    await expect(334, "AUTH user");
    await send(btoa(options.password));
    await expect(235, "login rejected");
    await send("QUIT").catch(() => undefined);
  } finally {
    try { conn.close(); } catch { /* already closed */ }
  }
}
