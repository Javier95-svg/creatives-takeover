type EmailPayload = Record<string, unknown>;

const text = (value: unknown) => typeof value === "string" ? value : "";
const escapeHtml = (value: unknown) => text(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

function formatDate(value: unknown, timezone = "UTC") {
  if (typeof value !== "string") return "";
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "full", timeStyle: "short", timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return new Date(value).toISOString();
  }
}

function titleFor(template: string) {
  const titles: Record<string, string> = {
    request_created: "New Discovery Call request",
    mentor_reminder_24h: "Discovery Call request awaiting your response",
    mentor_reminder_48h: "Final reminder: Discovery Call request",
    founder_reminder_24h: "Your mentor's proposed time is waiting",
    mentor_countered: "Your mentor proposed a time",
    booking_confirmed: "Discovery Call confirmed",
    request_declined: "Discovery Call request declined",
    request_withdrawn: "Discovery Call request withdrawn",
    request_expired: "Discovery Call request expired",
    reschedule_requested: "Discovery Call reschedule requested",
    reschedule_confirmed: "Discovery Call rescheduled",
    reschedule_expired: "Reschedule closed; original booking remains",
    booking_cancelled: "Discovery Call cancelled",
    outcome_recorded: "Discovery Call status updated",
    outcome_required: "Discovery Call outcome requires review",
    call_reminder_24h: "Reminder: Discovery Call tomorrow",
    call_reminder_1h: "Reminder: Discovery Call in one hour",
    attendance_confirmation_required: "Please confirm what happened on your Discovery Call",
    attendance_confirmation_reminder: "Reminder: confirm your Discovery Call outcome",
    attendance_manual_review_required: "Discovery Call attendance requires admin review",
    attendance_verified: "Discovery Call attendance verified",
  };
  return titles[template] ?? "Discovery Call update";
}

function rows(payload: EmailPayload, recipientRole: string) {
  const founderTimezone = text(payload.founderTimezone) || "UTC";
  const mentorTimezone = text(payload.mentorTimezone) || "UTC";
  const timezone = recipientRole === "mentor" ? mentorTimezone : founderTimezone;
  const result: Array<[string, string]> = [];
  if (payload.callId) result.push(["Booking ID", text(payload.callId)]);
  if (payload.founderName) result.push(["Founder", text(payload.founderName)]);
  if (payload.mentorName) result.push(["Mentor", text(payload.mentorName)]);
  if (recipientRole === "admin" && payload.founderId) result.push(["Founder ID", text(payload.founderId)]);
  if (recipientRole === "admin" && payload.mentorId) result.push(["Mentor ID", text(payload.mentorId)]);
  if (recipientRole === "admin" && payload.founderEmail) result.push(["Founder email", text(payload.founderEmail)]);
  if (recipientRole === "admin" && payload.mentorEmail) result.push(["Mentor email", text(payload.mentorEmail)]);
  if (payload.topic) result.push(["Topic", text(payload.topic)]);
  if (payload.desiredOutcome) result.push(["Desired outcome", text(payload.desiredOutcome)]);
  if (payload.notes) result.push(["Notes", text(payload.notes)]);
  if (payload.scheduledFor) {
    result.push([`Scheduled for (${timezone})`, formatDate(payload.scheduledFor, timezone)]);
    if (timezone !== "UTC") result.push(["Scheduled for (UTC)", formatDate(payload.scheduledFor, "UTC")]);
  }
  if (payload.counterStartsAt) {
    result.push([`Proposed time (${timezone})`, formatDate(payload.counterStartsAt, timezone)]);
    if (timezone !== "UTC") result.push(["Proposed time (UTC)", formatDate(payload.counterStartsAt, "UTC")]);
  }
  if (Array.isArray(payload.slots)) {
    result.push([`Proposed times (${mentorTimezone})`, payload.slots.map((slot) => formatDate(slot, mentorTimezone)).join("\n")]);
    if (founderTimezone !== mentorTimezone) result.push([`Proposed times (${founderTimezone})`, payload.slots.map((slot) => formatDate(slot, founderTimezone)).join("\n")]);
  }
  if (payload.meetingUrl) result.push(["Meeting link", text(payload.meetingUrl)]);
  if (payload.meetingInstructions) result.push(["Meeting instructions", text(payload.meetingInstructions)]);
  if (payload.responseDueAt) result.push(["Response deadline", formatDate(payload.responseDueAt, timezone)]);
  if (payload.heldCredits) result.push(["Credits held", String(payload.heldCredits)]);
  if (payload.creditsCharged) result.push(["Credits finalized", String(payload.creditsCharged)]);
  if (typeof payload.refunded === "boolean") result.push(["Credit refund", payload.refunded ? "Refunded" : "Not refunded"]);
  return result;
}

export function buildDiscoveryCallEmail(input: {
  template: string;
  recipientRole: string;
  payload: EmailPayload;
  actionUrl?: string | null;
}) {
  const title = titleFor(input.template);
  const detailRows = rows(input.payload, input.recipientRole)
    .map(([label, value]) => `<div style="margin-top:14px"><div style="font-size:12px;font-weight:700;color:#1f7a8c;text-transform:uppercase">${escapeHtml(label)}</div><div style="white-space:pre-line">${escapeHtml(value)}</div></div>`)
    .join("");
  const message = input.template === "request_created" && input.recipientRole === "mentor"
    ? "A founder has requested a 30-minute Discovery Call. Choose one of their times, propose another, or decline securely."
    : input.template === "request_created" && input.recipientRole === "founder"
      ? "Your Discovery Call request was received. Ten credits are held and will only be finalized if the call is confirmed."
    : input.template === "outcome_required"
      ? "The scheduled call has ended. Record its outcome in the admin dashboard."
    : input.template === "call_reminder_24h"
      ? "Your Discovery Call is tomorrow. The meeting link and time are below."
    : input.template === "call_reminder_1h"
      ? "Your Discovery Call starts in about one hour."
    : input.template === "attendance_confirmation_required" || input.template === "attendance_confirmation_reminder"
      ? "We could not verify attendance automatically. Please use the secure form to tell us what happened. Opening the link does not change the call outcome."
    : input.template === "attendance_manual_review_required"
      ? "The automated attendance check and participant responses require an audited admin decision."
    : input.template === "attendance_verified"
      ? "Attendance was verified from derived Google Meet timing metadata. The call is marked completed."
    : input.template === "booking_confirmed"
      ? "The time and meeting details are confirmed."
      : input.template === "request_expired"
        ? "The response window closed and the founder's held credits were released."
        : "There is an update to this Discovery Call.";
  return {
    subject: title,
    html: `<!doctype html><html><body style="font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#0f172a;background:#f8fafc;padding:24px"><main style="max-width:620px;margin:auto;background:white;border:1px solid #dbe4ea;border-radius:12px;overflow:hidden"><header style="background:#022b3a;color:white;padding:24px"><h1 style="font-size:22px;margin:0">${escapeHtml(title)}</h1></header><section style="padding:24px"><p>${escapeHtml(message)}</p>${detailRows}${input.actionUrl ? `<a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;margin-top:22px;background:#1f7a8c;color:white;padding:11px 18px;border-radius:8px;text-decoration:none">Open Discovery Call</a>` : ""}<p style="color:#64748b;font-size:12px;margin-top:24px">Automated message from Creatives Takeover.</p></section></main></body></html>`,
  };
}

function icsEscape(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replaceAll("\n", "\\n");
}

function icsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildDiscoveryCallIcs(payload: EmailPayload, cancelled = false) {
  const startsAt = text(payload.scheduledFor);
  if (!startsAt) return null;
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + Number(payload.durationMinutes ?? 30) * 60_000);
  const callId = text(payload.callId);
  const description = [text(payload.meetingUrl), text(payload.meetingInstructions)].filter(Boolean).join("\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Creatives Takeover//Discovery Call//EN",
    `METHOD:${cancelled ? "CANCEL" : "REQUEST"}`, "BEGIN:VEVENT",
    `UID:discovery-call-${icsEscape(callId)}@creatives-takeover.com`,
    `SEQUENCE:${Number(payload.calendarSequence ?? 0)}`,
    `DTSTAMP:${icsDate(text(payload.notificationCreatedAt) || startsAt)}`,
    `DTSTART:${icsDate(start.toISOString())}`, `DTEND:${icsDate(end.toISOString())}`,
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    `SUMMARY:${icsEscape(`Discovery Call with ${text(payload.mentorName) || "mentor"}`)}`,
    `DESCRIPTION:${icsEscape(description)}`, "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}
