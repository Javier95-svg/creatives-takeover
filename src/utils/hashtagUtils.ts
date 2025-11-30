/**
 * Hashtag utility functions for normalization, validation, and URL generation
 */

/**
 * Normalize a hashtag: lowercase, remove spaces, ensure # prefix
 * @param tag - The hashtag to normalize
 * @returns Normalized hashtag with # prefix
 */
export function normalizeHashtag(tag: string): string {
  if (!tag || !tag.trim()) {
    return '';
  }

  // Remove # if present, trim whitespace, convert to lowercase
  let normalized = tag.trim().replace(/^#+/, '').toLowerCase().trim();

  // Remove any remaining spaces or special characters (keep alphanumeric and underscores)
  normalized = normalized.replace(/[^a-z0-9_]/g, '');

  // Ensure it's not empty and add # prefix
  if (!normalized) {
    return '';
  }

  return `#${normalized}`;
}

/**
 * Validate and clean an array of hashtags: deduplicate, sort, limit count
 * @param tags - Array of hashtag strings
 * @param maxTags - Maximum number of tags to return (default: 20)
 * @returns Array of normalized, unique, sorted hashtags
 */
export function validateHashtags(tags: string[], maxTags: number = 20): string[] {
  if (!tags || !Array.isArray(tags)) {
    return [];
  }

  // Normalize all tags
  const normalized = tags
    .map(tag => normalizeHashtag(tag))
    .filter(tag => tag.length > 0); // Remove empty tags

  // Remove duplicates using Set
  const unique = Array.from(new Set(normalized));

  // Sort alphabetically (case-insensitive)
  const sorted = unique.sort((a, b) => 
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  // Limit to maxTags
  return sorted.slice(0, maxTags);
}

/**
 * Create a URL-friendly slug from a hashtag (for tag archive pages)
 * @param tag - The hashtag to slugify
 * @returns URL-friendly slug without # prefix
 */
export function slugifyTag(tag: string): string {
  if (!tag) {
    return '';
  }

  // Remove # prefix
  let slug = tag.replace(/^#+/, '').trim().toLowerCase();

  // Replace spaces and special characters with hyphens
  slug = slug.replace(/[\s_]+/g, '-');
  
  // Remove special characters except hyphens
  slug = slug.replace(/[^a-z0-9-]/g, '');
  
  // Replace multiple consecutive hyphens with a single hyphen
  slug = slug.replace(/-+/g, '-');
  
  // Remove leading and trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');

  return slug;
}

/**
 * Extract hashtags from text content (e.g., markdown or plain text)
 * Finds patterns like #hashtag or #hashtag1, #hashtag2
 * @param text - The text content to extract hashtags from
 * @returns Array of found hashtags (normalized)
 */
export function extractHashtags(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Match hashtags: # followed by alphanumeric characters and underscores
  // Allows for multiple hashtags in sequence
  const hashtagRegex = /#[\w]+/g;
  const matches = text.match(hashtagRegex) || [];

  // Normalize and deduplicate
  return validateHashtags(matches);
}

/**
 * Parse a comma-separated string of hashtags
 * Handles tags with or without # prefix, trims whitespace
 * @param tagsString - Comma-separated string of hashtags
 * @returns Array of normalized hashtags
 */
export function parseHashtags(tagsString: string): string[] {
  if (!tagsString || typeof tagsString !== 'string') {
    return [];
  }

  // Split by comma, normalize each tag
  const tags = tagsString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);

  return validateHashtags(tags);
}

/**
 * Format hashtags for display (remove # prefix if needed)
 * @param tags - Array of hashtags
 * @param includeHash - Whether to include # prefix (default: false for display)
 * @returns Array of formatted hashtag strings
 */
export function formatHashtagsForDisplay(tags: string[], includeHash: boolean = false): string[] {
  if (!tags || !Array.isArray(tags)) {
    return [];
  }

  return tags.map(tag => {
    const cleaned = tag.replace(/^#+/, '');
    return includeHash ? `#${cleaned}` : cleaned;
  });
}
