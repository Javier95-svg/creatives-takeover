# Discovery Call V4: Preply-style booking and Google Meet

## Outcome

Discovery Calls now support two platform-owned booking paths:

1. **Instant booking:** a founder chooses one published mentor slot.
2. **Request fallback:** a founder proposes three times and the mentor accepts or counters through the secure no-login portal.

Neither path asks the mentor to create a meeting link. Once a time is accepted, a durable calendar worker creates a company-organized Google Calendar event and private Google Meet room. The existing 10-credit hold is finalized only after the `meet.google.com` URL is stored.

External Calendly, Koalendar, Cal.com, and Google booking-page URLs remain private legacy references. They are not booking or verification dependencies.

## State and reliability boundary

```text
founder selects/proposes time
        -> 10-credit hold
        -> mentor approval when required
        -> pending_meeting_creation
        -> durable Google calendar job
        -> event + Meet URL persisted
        -> atomic credit finalization
        -> scheduled
        -> durable founder + mentor + admin email rows
```

If Google is unavailable, the call stays in `pending_meeting_creation` and the credits remain held. Jobs retry with backoff. The admin dashboard shows the job and allows retry. After 60 minutes, deadline processing expires the attempt, releases the hold and slot, revokes tokens, and notifies founder, mentor, and admin.

Google Calendar sends the canonical event invitation/update/cancellation using `sendUpdates=all`. Resend still sends the workflow email, but deliberately omits the second ICS attachment for Google-managed calls to prevent duplicate events.

## Database migrations

The original V2 migrations and notification reliability migration must already exist. Apply the new files in this exact order:

1. `20260809130000_discovery_call_calendar_status_v4.sql`
2. `20260809131000_discovery_call_calendar_booking_schema_v4.sql`
3. `20260809132000_discovery_call_calendar_booking_transitions_v4.sql`
4. `20260809133000_schedule_discovery_call_calendar_worker_v4.sql`
5. `20260809134000_discovery_call_calendar_admin_health_v4.sql`

The enum migration must commit separately before the other migrations use `pending_meeting_creation`.

Recommended CLI flow from the repository root:

```powershell
supabase link --project-ref rcjlaybjnozqbsoxzboa
supabase db push --linked --dry-run
supabase db push --linked
```

If the project's existing migration-history mismatch still prevents `db push`, run the five files individually in Supabase SQL Editor in the order above. Do not concatenate the first enum file with the second file into one SQL Editor execution.

After the migrations exist remotely, regenerate the checked-in Supabase types from the real schema:

```powershell
supabase gen types typescript --linked --schema public | Set-Content -Encoding utf8 .\src\integrations\supabase\types.ts
npm.cmd run typecheck
```

Do not hand-write the generated database types before the remote schema exists.

## Google Workspace setup

Use a dedicated Workspace organizer such as `discovery-calls@creatives-takeover.com`.

1. Create or select a Google Cloud project.
2. Enable **Google Calendar API**.
3. Configure the OAuth consent screen.
4. Create a **Web application** OAuth client.
5. Add these authorized redirect URIs:
   - `http://localhost:53682/oauth/callback` for one-time platform authorization.
   - `https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/discovery-call-google-oauth` for optional mentor busy-calendar connections.
6. Sign in to the local authorization flow as the account that owns or can write to the platform calendar.

Before production, publish the OAuth consent screen as **Production**. Google documents that an External app left in **Testing** can issue refresh tokens that expire after seven days. Because optional mentor busy-calendar sync requests `calendar.readonly`, complete Google's consent-screen verification before offering that connection to mentors outside your Workspace. The core platform booking flow can launch first with only the dedicated organizer authorized; the mentor connection remains optional.

Generate the platform refresh token without persisting it to disk:

```powershell
$env:GOOGLE_CALENDAR_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID"
$env:GOOGLE_CALENDAR_CLIENT_SECRET = "YOUR_GOOGLE_CLIENT_SECRET"
node .\scripts\google-calendar-oauth.mjs
```

Open the URL printed by the script. After authorization, copy the refresh token from PowerShell.

## Supabase Edge secrets

```powershell
supabase secrets set --project-ref rcjlaybjnozqbsoxzboa `
  "GOOGLE_CALENDAR_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID" `
  "GOOGLE_CALENDAR_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET" `
  "GOOGLE_CALENDAR_REFRESH_TOKEN=YOUR_PLATFORM_REFRESH_TOKEN" `
  "GOOGLE_CALENDAR_ID=discovery-calls@creatives-takeover.com" `
  "GOOGLE_CALENDAR_OAUTH_REDIRECT_URI=https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/discovery-call-google-oauth"
```

Existing required secrets remain:

- `RESEND_API_KEY`
- `FROM_EMAIL`
- `APP_URL`
- `CRON_SECRET`
- `DISCOVERY_CALL_TOKEN_SECRET`
- `DISCOVERY_CALL_RESEND_WEBHOOK_SECRET`
- `DISCOVERY_CALL_REQUESTS_V2_ENABLED=true`

Supabase does not reveal secret values after they are stored. `supabase secrets list` confirms names, not plaintext values.

## Edge Function deployment

Deploy all changed/new functions from the repository root:

```powershell
supabase functions deploy discovery-call-service --project-ref rcjlaybjnozqbsoxzboa
supabase functions deploy discovery-call-mentor-response --project-ref rcjlaybjnozqbsoxzboa --no-verify-jwt
supabase functions deploy discovery-call-mentor-availability --project-ref rcjlaybjnozqbsoxzboa --no-verify-jwt
supabase functions deploy discovery-call-google-oauth --project-ref rcjlaybjnozqbsoxzboa --no-verify-jwt
supabase functions deploy process-discovery-call-calendar-events --project-ref rcjlaybjnozqbsoxzboa --no-verify-jwt
supabase functions deploy process-discovery-call-deadlines --project-ref rcjlaybjnozqbsoxzboa --no-verify-jwt
supabase functions deploy process-discovery-call-notifications --project-ref rcjlaybjnozqbsoxzboa --no-verify-jwt
```

The calendar and notification workers reject public requests internally. `--no-verify-jwt` allows the existing `x-cron-secret`/service-role authorization mechanism to reach them.

## Mentor activation

1. Open the existing Admin Mentor Editor.
2. Confirm the mentor notification email.
3. Choose `Instant availability` or `Instant + request fallback`.
4. Save the mentor.
5. Click **Copy secure mentor availability link**.
6. Send that private 30-day link to the mentor.
7. The mentor publishes weekly hours and time off.
8. Optionally, the mentor connects Google Calendar read-only. Only busy intervals are stored; event titles, descriptions, attendees, and meeting URLs are not stored.

Mentors who remain in `Three-time request` mode continue using V2 negotiation, but the platform now creates their Meet link after acceptance.

## Production smoke test

Use test founder and mentor records with real deliverable emails.

1. Ensure the founder has at least 10 credits.
2. Book a published instant slot.
3. Confirm:
   - Call is initially `pending_meeting_creation`.
   - Reservation is `pending`; wallet spendable credits are reduced by 10.
   - Calendar outbox contains one `create` job.
4. Wait for the worker.
5. Confirm:
   - Call is `scheduled`.
   - `meeting_url` begins with `https://meet.google.com/`.
   - `external_calendar_event_id` is populated.
   - Reservation is `finalized` with exactly one deduction transaction.
   - Founder, mentor, and admin confirmation outbox rows exist and reach `delivered`.
   - All three attendees receive one Google calendar invitation.
6. Reschedule and verify the same Google event ID changes time without another credit transaction.
7. Cancel and verify Google sends a cancellation and the existing refund policy is applied.
8. Repeat the test using the three-time request path and mentor portal acceptance.

The deployment is not operationally proven until this production smoke test reaches confirmed Resend delivery and a joinable Google Meet URL.

## Embedded classroom evaluation (implementation order item 8)

An embedded classroom is deliberately deferred. Google Meet now satisfies the core need without requiring Creatives Takeover to operate WebRTC infrastructure.

The schema isolates `meeting_provider`, `meeting_url`, `meeting_creation_status`, and the calendar outbox so a future provider such as Daily, LiveKit, or Twilio can replace `google_meet` without changing credit or notification semantics.

Re-evaluate an embedded classroom when at least one of these becomes material:

- Attendance must be automatically proven from join/leave telemetry.
- Calls need in-platform recording, transcription, shared notes, or screen artifacts.
- Google guest-admission friction measurably reduces completed calls.
- Discovery Call volume justifies the video-provider cost and operational support.
- A consistent branded room materially improves conversion or trust.

Until then, the platform owns scheduling and tracking while Google owns the video transport.

## Primary API references

- [Google Calendar events.insert](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert) — `conferenceDataVersion=1`, unique Meet creation, attendee updates, and private events.
- [Google Calendar freeBusy.query](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query) — read-only mentor conflict synchronization.
- [Google OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server) — offline access, refresh tokens, redirect URI matching, and token-expiry behavior.
- [Google OAuth security practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices) — state validation, encrypted token storage, and revoked-token handling.
