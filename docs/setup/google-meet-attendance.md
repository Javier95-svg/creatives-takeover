# Google Meet attendance verification

Enable the **Google Meet REST API** in the same Google Cloud project that owns
the company calendar OAuth client. Re-run `node scripts/google-calendar-oauth.mjs`
while signed in as the dedicated organizer, then replace
`GOOGLE_CALENDAR_REFRESH_TOKEN` with the new token. The consent screen must show
both `calendar.events.owned` and the sensitive, read-only
`meetings.space.readonly` permission.

Set `DISCOVERY_CALL_ATTENDANCE_TRACKING_ENABLED=true` only after the new token
has been deployed, while leaving `DISCOVERY_CALL_ATTENDANCE_AUTO_COMPLETE_ENABLED=false`
for shadow mode. Compare ten verified real calls with audited admin decisions
before enabling automatic completion. A health failure or revoked Meet scope
never creates a no-show: after the retry window, the system asks both
participants to confirm.

The system stores only the conference start/end time, participant count,
maximum concurrency, qualifying overlap duration, check outcome, and the final
resolution source. It does not store participant names, email addresses, Google
user IDs, recordings, transcripts, or raw Meet API responses.
