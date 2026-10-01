// The existing Calendar OAuth application can be reused after registering the
// core-tools callback URLs and enabling its additional Sheets/Meet scopes.
export function coreGoogleConfig(read: (name: string) => string | undefined) {
  const id = read('CORE_GOOGLE_CLIENT_ID');
  const secret = read('CORE_GOOGLE_CLIENT_SECRET');
  if (id || secret) {
    if (!id || !secret) throw new Error('Configure both core Google OAuth credentials.');
    return { clientId: id, clientSecret: secret };
  }
  const clientId = read('GOOGLE_CALENDAR_CLIENT_ID');
  const clientSecret = read('GOOGLE_CALENDAR_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Google connection setup is not configured.');
  return { clientId, clientSecret };
}
