export const POST_MAX_LENGTH = 5000;
export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const POST_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validatePost(content: string, hasImage: boolean, localSchedule: string, now = Date.now()) {
  if (!content.trim() && !hasImage) return 'Write an update or attach a photo first.';
  if (content.length > POST_MAX_LENGTH) return 'Keep your update within 5,000 characters.';
  if (localSchedule) {
    const timestamp = new Date(localSchedule).getTime();
    if (!Number.isFinite(timestamp) || timestamp <= now) return 'Choose a date and time in the future.';
  }
  return null;
}

export function validatePostImage(file: { type: string; size: number }) {
  if (!POST_IMAGE_TYPES.includes(file.type)) return 'Choose a JPG, PNG, WebP, or GIF photo.';
  if (file.size > POST_IMAGE_MAX_BYTES) return 'Your photo must be 5 MB or smaller.';
  return null;
}

export function insertPostEmoji(content: string, emoji: string, start: number, end: number) {
  const text = content.slice(0, start) + emoji + content.slice(end);
  return text.length > POST_MAX_LENGTH ? null : { text, cursor: start + emoji.length };
}
