import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { ExternalEvidenceBatch, ExternalEvidenceConnection } from '@/types/externalEvidence';

export function useExternalEvidence() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ExternalEvidenceConnection[]>([]);
  const [batches, setBatches] = useState<ExternalEvidenceBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setConnections([]); setBatches([]); setLoading(false); return; }
    setLoading(true);
    const [connectionResult, batchResult] = await Promise.all([
      (supabase as any).from('external_evidence_connections').select('id,provider_label,method,token_last_four,status,last_success_at,last_error,created_at').order('created_at', { ascending: false }),
      (supabase as any).from('external_evidence_import_batches').select('id,connection_id,method,status,accepted_count,duplicate_count,rejected_count,created_at').order('created_at', { ascending: false }).limit(30),
    ]);
    if (connectionResult.error) throw connectionResult.error;
    if (batchResult.error) throw batchResult.error;
    setConnections(connectionResult.data ?? []); setBatches(batchResult.data ?? []); setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const createWebhook = async (providerLabel: string) => {
    const { data, error } = await supabase.functions.invoke('external-evidence', { body: { action: 'create', providerLabel, method: 'webhook' } });
    if (error) throw error;
    if (!data?.token || !data?.connection?.id) throw new Error('Connection token was not returned.');
    await refresh();
    return data as { token: string; connection: ExternalEvidenceConnection };
  };

  const importCsv = async (providerLabel: string, file: File) => {
    if (!user) throw new Error('Authentication required.');
    if (file.size > 2 * 1024 * 1024) throw new Error('CSV files must be 2 MB or smaller.');
    const connection = connections.find((item) => item.method === 'csv' && item.provider_label === providerLabel && item.status === 'active');
    let connectionId = connection?.id;
    if (!connectionId) {
      const { data, error } = await (supabase as any).rpc('create_external_evidence_connection_v1', { p_provider_label: providerLabel, p_method: 'csv', p_token_hash: null, p_token_last_four: null });
      if (error) throw error;
      connectionId = data.id;
    }
    const path = `${user.id}/${crypto.randomUUID()}.csv`;
    const upload = await supabase.storage.from('evidence-imports').upload(path, file, { contentType: 'text/csv', upsert: false });
    if (upload.error) throw upload.error;
    const result = await supabase.functions.invoke('external-evidence', { body: { action: 'import_csv', connectionId, storagePath: path } });
    if (result.error) throw result.error;
    await refresh();
    return result.data as { accepted: number; duplicate: number; rejected: number; errors: unknown[] };
  };

  const revoke = async (connectionId: string) => {
    const { error } = await (supabase as any).rpc('revoke_external_evidence_connection_v1', { p_connection_id: connectionId });
    if (error) throw error;
    await refresh();
  };

  return { connections, batches, loading, refresh, createWebhook, importCsv, revoke };
}
