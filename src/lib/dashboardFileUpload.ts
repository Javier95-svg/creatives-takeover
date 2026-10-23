import { supabase } from '@/integrations/supabase/client';
import type { DashboardFileRecord } from '@/hooks/usePersonalizedDashboard';
import { DASHBOARD_FILES_BUCKET, getFileExtension, stripFileExtension } from '@/lib/dashboardFiles';

/**
 * The My Files upload pipeline (dashboard_files row, storage upload,
 * document-parser), shared by the Files page and Project setup so both put
 * uploads in the same place.
 */

export interface PreparedDashboardUpload {
  fileId: string;
  title: string;
  extension: string;
  storagePath: string;
  createdAt: string;
}

export type DashboardUploadResult =
  | { status: 'insert_failed'; error: unknown }
  | { status: 'upload_failed'; error: unknown }
  | { status: 'parse_failed' }
  | { status: 'ready'; parsedRow: Partial<DashboardFileRecord> | null; extractedText: string | null };

export function prepareDashboardUpload(userId: string, file: File): PreparedDashboardUpload {
  const extension = getFileExtension(file.name);
  const fileId = crypto.randomUUID();
  return {
    fileId,
    title: stripFileExtension(file.name),
    extension,
    storagePath: `${userId}/${fileId}.${extension}`,
    createdAt: new Date().toISOString(),
  };
}

export async function runDashboardUpload(
  userId: string,
  file: File,
  prepared: PreparedDashboardUpload,
  options: { onUploaded?: () => void } = {},
): Promise<DashboardUploadResult> {
  const { fileId, storagePath, extension, title, createdAt } = prepared;

  const { error: insertError } = await supabase.from('dashboard_files').insert({
    id: fileId,
    user_id: userId,
    file_kind: 'uploaded_file',
    title,
    summary: 'Uploading file...',
    origin: 'user_upload',
    source_table: 'dashboard_files',
    source_id: fileId,
    storage_path: storagePath,
    mime_type: file.type || null,
    file_extension: extension,
    file_size_bytes: file.size,
    preview_payload: { stage: 'Uploading' },
    upload_status: 'processing',
    is_protected: false,
    created_at: createdAt,
    updated_at: createdAt,
  });
  if (insertError) return { status: 'insert_failed', error: insertError };

  const { error: uploadError } = await supabase.storage.from(DASHBOARD_FILES_BUCKET).upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (uploadError) {
    await supabase.from('dashboard_files').delete().eq('id', fileId).eq('user_id', userId);
    return { status: 'upload_failed', error: uploadError };
  }

  options.onUploaded?.();

  const { data: parseData, error: parseError } = await supabase.functions.invoke('document-parser', {
    body: {
      file_path: storagePath,
      user_id: userId,
      bucket: DASHBOARD_FILES_BUCKET,
      target_table: 'dashboard_files',
      record_id: fileId,
    },
  });
  if (parseError || !parseData?.success) return { status: 'parse_failed' };

  const parsedRow = (parseData.dashboard_file as Partial<DashboardFileRecord> | null) ?? null;
  return {
    status: 'ready',
    parsedRow,
    extractedText: parsedRow?.extracted_text ?? parseData.document?.text ?? null,
  };
}
