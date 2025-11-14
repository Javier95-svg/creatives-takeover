/**
 * Generates a profile slug from a full name
 * Converts to lowercase, removes spaces, but keeps special characters like ñ, é, etc.
 * Examples:
 * - "Carlos Rodriguez" -> "carlosrodriguez"
 * - "Aamir Khan" -> "aamirkhan"
 * - "Javier Peña" -> "javierpeña"
 */
export function generateProfileSlug(fullName: string | null | undefined): string {
  if (!fullName) return '';
  
  return fullName
    .toLowerCase()
    .replace(/\s+/g, '') // Remove all spaces
    .trim();
}

/**
 * Gets the profile URL path for a user
 */
export function getProfilePath(fullName: string | null | undefined, userId?: string): string {
  const slug = generateProfileSlug(fullName);
  return `/profile/${slug || userId || ''}`;
}

