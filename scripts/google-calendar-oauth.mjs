import http from 'node:http';
import crypto from 'node:crypto';

const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
const port = Number(process.env.GOOGLE_CALENDAR_OAUTH_PORT || 53682);
const redirectUri = `http://localhost:${port}/oauth/callback`;

if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET in this PowerShell session first.');
  process.exit(1);
}

const state = crypto.randomBytes(32).toString('base64url');
const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authorization.search = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  access_type: 'offline',
  prompt: 'consent',
  include_granted_scopes: 'true',
  // Calendar creates the company-owned event. Meet's sensitive read-only scope
  // is used only after the call to derive timing/count attendance evidence.
  scope: 'https://www.googleapis.com/auth/calendar.events.owned https://www.googleapis.com/auth/meetings.space.readonly',
  state,
}).toString();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', redirectUri);
  if (url.pathname !== '/oauth/callback') {
    response.writeHead(404).end('Not found');
    return;
  }
  if (url.searchParams.get('state') !== state || !url.searchParams.get('code')) {
    response.writeHead(400, { 'Content-Type': 'text/plain' }).end('OAuth state or authorization code is invalid.');
    server.close();
    return;
  }
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: url.searchParams.get('code'),
        grant_type: 'authorization_code',
      }),
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.refresh_token) throw new Error(token.error_description || 'Google did not return a refresh token. Revoke the app grant and retry with prompt=consent.');
    response.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }).end('Authorization complete. Return to PowerShell and close this browser tab.');
    console.log('\nGOOGLE_CALENDAR_REFRESH_TOKEN (copy it now; it is not written to disk):\n');
    console.log(token.refresh_token);
    console.log('\nThen run: supabase secrets set --project-ref YOUR_PROJECT_REF "GOOGLE_CALENDAR_REFRESH_TOKEN=PASTE_TOKEN_HERE"');
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain' }).end('Authorization failed. Return to PowerShell for details.');
    console.error(error instanceof Error ? error.message : String(error));
  } finally {
    server.close();
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Register this exact redirect URI in Google Cloud: ${redirectUri}`);
  console.log('\nOpen this URL in a browser and sign in as the platform calendar organizer:\n');
  console.log(authorization.toString());
});
