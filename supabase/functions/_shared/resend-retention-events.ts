/**
 * Which retention_email_log column a Resend event fills.
 *
 * Resend sends every account event to one signed webhook,
 * discovery-call-resend-webhook. Retention emails' opens, clicks, bounces and
 * complaints arrived there and were dropped, so no open or click was ever
 * recorded. Only the first of each is kept. Pure, so node tests load it.
 */
export type RetentionEventColumn = "opened_at" | "clicked_at" | "bounced_at" | "complained_at";

const COLUMN_BY_EVENT: Record<string, RetentionEventColumn> = {
  "email.opened": "opened_at",
  "email.clicked": "clicked_at",
  "email.bounced": "bounced_at",
  "email.complained": "complained_at",
};

export function retentionEventColumn(eventType: string | null): RetentionEventColumn | null {
  return eventType ? COLUMN_BY_EVENT[eventType] ?? null : null;
}
