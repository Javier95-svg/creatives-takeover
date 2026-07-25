/**
 * Resolves profile fields from Supabase auth identity metadata.
 *
 * Providers disagree on which keys carry the display name and avatar: Google and X
 * send `full_name`/`avatar_url`, LinkedIn OIDC sends only the OIDC standard claims
 * (`name`, `given_name`/`family_name`, `picture`). Reading `full_name` alone left every
 * LinkedIn account with an email-prefix display name and no avatar, and addressed their
 * welcome email to nobody.
 *
 * Kept free of Supabase client imports so it stays usable from plain unit tests.
 */

function readString(metadata: Record<string, unknown> | null | undefined, key: string): string {
  const value = metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function resolveIdentityDisplayName(metadata?: Record<string, unknown> | null): string {
  const composedName = [readString(metadata, 'given_name'), readString(metadata, 'family_name')]
    .filter(Boolean)
    .join(' ');

  return (
    readString(metadata, 'full_name') ||
    readString(metadata, 'name') ||
    composedName ||
    readString(metadata, 'user_name') ||
    readString(metadata, 'preferred_username') ||
    ''
  );
}

export function resolveIdentityAvatarUrl(metadata?: Record<string, unknown> | null): string | null {
  return readString(metadata, 'avatar_url') || readString(metadata, 'picture') || null;
}
