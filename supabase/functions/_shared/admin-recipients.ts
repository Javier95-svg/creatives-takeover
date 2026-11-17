/**
 * Who gets admin notices (provider alerts, new signups).
 *
 * Always the same two inboxes contact-form-submission notifies, plus every
 * valid address in ADMIN_NOTIFICATION_EMAILS. On 2026-11-12 Resend rejected
 * that secret's value as a `to` list, so it is read loosely (commas,
 * semicolons, spaces, quotes, "Name <a@b.c>") and entries that are not
 * addresses are dropped instead of failing the send. No imports, so Node
 * tests load it directly.
 */

export const REQUIRED_ADMIN_RECIPIENTS = ["admin@creatives-takeover.com", "javier@creatives-takeover.com"];
const EMAIL_PATTERN = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i;

export function adminRecipients(configuredValue?: string | null, label = "admin notice"): string[] {
  const configured = (configuredValue ?? "")
    .split(/[,;\s]+/)
    .map((entry) => entry.replace(/^[\s"'<[(]+|[\s"'>\])]+$/g, "").trim().toLowerCase())
    .filter(Boolean);
  const valid = configured.filter((entry) => EMAIL_PATTERN.test(entry));
  if (configured.length !== valid.length) {
    const dropped = configured.length - valid.length;
    console.warn(`${label}: ignored ${dropped} invalid ADMIN_NOTIFICATION_EMAILS entr${dropped === 1 ? "y" : "ies"}`);
  }
  return Array.from(new Set([...REQUIRED_ADMIN_RECIPIENTS, ...valid]));
}
