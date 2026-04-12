import { normalizePlan, type Plan } from '@/config/planPermissions';

export const DASHBOARD_FILES_BUCKET = 'dashboard-files';
export const DASHBOARD_FILE_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const DASHBOARD_FILE_STORAGE_LIMITS: Record<Plan, number> = {
  rookie: 100 * 1024 * 1024,
  starter: 100 * 1024 * 1024,
  rising: 100 * 1024 * 1024,
  pro: 500 * 1024 * 1024,
};

export const DASHBOARD_FILE_ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'md'] as const;

export const DASHBOARD_FILE_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
] as const;

export type DashboardFileOrigin = 'system_generated' | 'user_upload';
export type DashboardFileUploadStatus = 'ready' | 'processing' | 'failed';

export const getDashboardStorageLimit = (planLike: string | null | undefined) =>
  DASHBOARD_FILE_STORAGE_LIMITS[normalizePlan(planLike)];

export const getFileExtension = (filename: string | null | undefined) => {
  const extension = filename?.split('.').pop()?.trim().toLowerCase();
  return extension || '';
};

export const isSupportedDashboardFile = (file: File) => {
  const extension = getFileExtension(file.name);
  return (
    DASHBOARD_FILE_ALLOWED_EXTENSIONS.includes(extension as (typeof DASHBOARD_FILE_ALLOWED_EXTENSIONS)[number]) ||
    DASHBOARD_FILE_ALLOWED_MIME_TYPES.includes(file.type as (typeof DASHBOARD_FILE_ALLOWED_MIME_TYPES)[number])
  );
};

export const getDashboardFileTypeLabel = (extension: string | null | undefined, fileKind?: string) => {
  if (fileKind === 'icp_draft') return 'ICP Draft';

  switch ((extension || '').toLowerCase()) {
    case 'pdf':
      return 'PDF';
    case 'doc':
      return 'Word';
    case 'docx':
      return 'Word';
    case 'md':
      return 'Markdown';
    case 'txt':
      return 'Text';
    default:
      return 'File';
  }
};

export const stripFileExtension = (filename: string) => filename.replace(/\.[^.]+$/, '');

export const formatFileSize = (bytes: number | null | undefined) => {
  if (!bytes || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

export const buildUploadedFilePreview = (text: string | null | undefined) => {
  if (!text) return null;

  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  return normalized.slice(0, 220);
};
