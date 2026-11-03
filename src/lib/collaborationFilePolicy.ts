export const MAX_COLLABORATION_FILE_BYTES = 20 * 1024 * 1024;

export const COLLABORATION_FILE_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/markdown', 'text/csv',
] as const;

export function isAllowedCollaborationFile(file: Pick<File, 'size' | 'type'>): boolean {
  return file.size > 0 && file.size <= MAX_COLLABORATION_FILE_BYTES &&
    COLLABORATION_FILE_MIME_TYPES.includes(file.type as typeof COLLABORATION_FILE_MIME_TYPES[number]);
}
