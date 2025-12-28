/**
 * Utility functions for generating and parsing mentor profile slugs
 */

/**
 * Generate a URL-friendly slug from a mentor's name
 * Examples:
 * - "Samuel Starkman" -> "samuel-starkman"
 * - "Nic M Rayce" -> "nic-m-rayce"
 * - "Gonzalo Wangüemert" -> "gonzalo-wanguemert"
 */
export function generateMentorSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove accents and special characters
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove any remaining non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '');
}

/**
 * Map of mentor IDs to their canonical slugs
 * This ensures consistent URLs even if mentor names change slightly
 */
export const MENTOR_SLUG_MAP: Record<string, string> = {
  // These will be populated from database, but we can hardcode known mentors
  // Format: mentor_id -> slug
};

/**
 * Get the profile URL for a mentor
 */
export function getMentorProfileUrl(mentorId: string, mentorName: string): string {
  const slug = generateMentorSlug(mentorName);
  return `/community/${slug}`;
}
