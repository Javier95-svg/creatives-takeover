import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  clearLeadFollowUp,
  fetchDiscoveryLeads,
  saveDiscoveryLeadNotes,
  scheduleLeadFollowUp,
  updateDiscoveryLeadStatus,
  type PMFDiscoveryLead,
} from '@/lib/pmfDiscoveryLeads';
import type { PMFDiscoveryLeadStatus } from '@/hooks/useCustomerDiscovery';

export function useDiscoveryLeads(enabled = true) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<PMFDiscoveryLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // False until the first load settles, so the page does not lay out for a
  // first visit and then jump to a returning one.
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!user || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      setLeads(await fetchDiscoveryLeads(user.id));
    } catch (err) {
      console.warn('Failed to load PMF discovery leads:', err);
      setError('Could not load your conversations.');
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [enabled, user]);

  useEffect(() => { void reload(); }, [reload]);

  const setStatus = useCallback(async (leadId: string, status: PMFDiscoveryLeadStatus) => {
    if (!user) return;
    await updateDiscoveryLeadStatus(user.id, leadId, status);
    // A follow-up only makes sense while waiting for a reply.
    const lead = leads.find((item) => item.id === leadId);
    if (lead && status !== 'contacted') {
      await clearLeadFollowUp(user.id, lead).catch((err) => console.warn('Could not clear the follow-up:', err));
    }
    await reload();
  }, [leads, reload, user]);

  /** "I sent it": contacted, with an optional reminder to follow up. */
  const markContacted = useCallback(async (leadId: string, followUpAt: Date | null) => {
    if (!user) return;
    await updateDiscoveryLeadStatus(user.id, leadId, 'contacted');
    const lead = leads.find((item) => item.id === leadId);
    if (lead && followUpAt) await scheduleLeadFollowUp(user.id, lead, followUpAt);
    await reload();
  }, [leads, reload, user]);

  const setFollowUp = useCallback(async (leadId: string, followUpAt: Date | null) => {
    if (!user) return;
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) return;
    if (followUpAt) await scheduleLeadFollowUp(user.id, lead, followUpAt);
    else await clearLeadFollowUp(user.id, lead);
    await reload();
  }, [leads, reload, user]);

  const saveNotes = useCallback(async (leadId: string, notes: string) => {
    if (!user) return;
    await saveDiscoveryLeadNotes(user.id, leadId, notes);
    await reload();
  }, [reload, user]);

  return { leads, loading, loaded, error, reload, setStatus, markContacted, setFollowUp, saveNotes };
}
