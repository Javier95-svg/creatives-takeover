/**
 * Generates a profile slug from a full name.
 * Format: firstname + lastname (lowercase, no spaces)
 * Example: "Aamir Khan" -> "aamirkhan"
 * 
 * @param fullName - The user's full name
 * @returns The generated profile slug, or empty string if name is invalid
 */
export function generateProfileSlug(fullName: string | null | undefined): string {
  if (!fullName || !fullName.trim()) {
    return '';
  }

  const normalizeUsernamePart = (value: string): string =>
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const trimmed = fullName.trim();
  const nameParts = trimmed.split(/\s+/).filter(part => part.length > 0);
  
  if (nameParts.length === 0) {
    return '';
  }

  // If only one name part, use it
  if (nameParts.length === 1) {
    return normalizeUsernamePart(nameParts[0]);
  }

  // Combine first and last name (handle middle names by taking first and last)
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  
  const slug = normalizeUsernamePart(firstName) + normalizeUsernamePart(lastName);
  
  return slug;
}

/**
 * Gets the profile URL for a user.
 * Prefers existing username if available, otherwise generates from full name.
 * 
 * @param usernameOrSlug - Existing username/slug, or null/undefined
 * @param fullName - User's full name for fallback generation
 * @returns Profile URL path (e.g., "/profile/aamirkhan")
 */
export function getProfileUrl(
  usernameOrSlug: string | null | undefined,
  fullName?: string | null | undefined
): string {
  // If username exists, use it
  if (usernameOrSlug) {
    return `/profile/${usernameOrSlug}`;
  }

  // Otherwise, generate from full name
  if (fullName) {
    const slug = generateProfileSlug(fullName);
    if (slug) {
      return `/profile/${slug}`;
    }
  }

  // Fallback: return empty or user ID based on usage context
  return '#';
}

/**
 * Gets the profile slug for display or database operations.
 * This is a convenience function that returns just the slug, not the full URL.
 * 
 * @param usernameOrSlug - Existing username/slug
 * @param fullName - User's full name for fallback
 * @returns Profile slug (e.g., "aamirkhan")
 */
export function getProfileSlug(
  usernameOrSlug: string | null | undefined,
  fullName?: string | null | undefined
): string {
  if (usernameOrSlug) {
    return usernameOrSlug;
  }

  if (fullName) {
    return generateProfileSlug(fullName) || '';
  }

  return '';
}

