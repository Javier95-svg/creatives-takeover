import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchDiscoveryLeads,
  saveDiscoveryLeadNotes,
  updateDiscoveryLeadStatus,
  type PMFDiscoveryLead,
} from '@/lib/pmfDiscoveryLeads';
import type { PMFDiscoveryLeadStatus } from '@/hooks/useCustomerDiscovery';

export function useDiscoveryLeads(enabled = true) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<PMFDiscoveryLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      setLeads(await fetchDiscoveryLeads(user.id));
    } catch (err) {
      console.warn('Failed to load PMF discovery leads:', err);
      setError('Could not load the discovery pipeline.');
    } finally {
      setLoading(false);
    }
  }, [enabled, user]);

  useEffect(() => { void reload(); }, [reload]);

  const setStatus = useCallback(async (leadId: string, status: PMFDiscoveryLeadStatus) => {
    if (!user) return;
    await updateDiscoveryLeadStatus(user.id, leadId, status);
    await reload();
  }, [reload, user]);

  const saveNotes = useCallback(async (leadId: string, notes: string) => {
    if (!user) return;
    await saveDiscoveryLeadNotes(user.id, leadId, notes);
    await reload();
  }, [reload, user]);

  return { leads, loading, error, reload, setStatus, saveNotes };
}

