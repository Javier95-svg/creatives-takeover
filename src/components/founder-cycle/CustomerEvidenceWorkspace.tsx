import { useMemo, useState, type ChangeEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Check,
  ClipboardCopy,
  ExternalLink,
  FileUp,
  Loader2,
  MessageSquareText,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useFounderCycle } from '@/hooks/useFounderCycle';
import { supabase } from '@/integrations/supabase/client';
import {
  CUSTOMER_CONTACT_STAGES,
  evidenceEventForContactStage,
  isFounderCycleSnapshot,
  parseContactCsv,
  type CustomerContactStage,
  type CustomerEvidenceEventType,
  type EvidenceVerificationMode,
} from '@/lib/founderCycle';
import {
  trackCostlyCommitmentRecorded,
  trackCycleLoopExited,
  trackCustomerEvidenceRecorded,
} from '@/lib/analytics';
import { personalizeSprintMessage } from '@/lib/firstCustomerSprint';
import type { FirstCustomerMessageVariant, FirstCustomerMessageVariantKey } from '@/types/firstCustomerSprint';

interface FounderCustomerContact {
  id: string;
  display_name: string;
  company: string | null;
  role: string | null;
  profile_url: string | null;
  source: string;
  stage: CustomerContactStage;
  notes: string;
  last_activity_at: string;
}

// Generated database types are refreshed after the additive migration is deployed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = supabase as any;

function operationKey(prefix: string) {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${value}`;
}

function stableContactImportKey(input: {
  displayName: string;
  company?: string;
  role?: string;
  profileUrl?: string;
}) {
  const value = [
    input.displayName,
    input.company ?? '',
    input.role ?? '',
    input.profileUrl ?? '',
  ].map((part) => part.trim().toLowerCase()).join('|');
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `csv-contact:${(hash >>> 0).toString(16)}`;
}

function outreachDraft(contact: FounderCustomerContact) {
  const context = contact.company ? ` at ${contact.company}` : '';
  return `Hi ${contact.display_name}, I noticed your work${context}. I am speaking with a small number of people dealing with this problem and I am not trying to sell you anything on the first call. Would you be open to a 20-minute conversation about how you handle it today?`;
}

export interface CustomerEvidenceSprintContext {
  sprintId: string;
  contactIds: string[];
  messageVariants: FirstCustomerMessageVariant[];
  selectedMessageKey: FirstCustomerMessageVariantKey | null;
  onContactAttached: (contactId: string) => Promise<unknown>;
  onEvidenceRecorded?: () => void | Promise<void>;
}

export default function CustomerEvidenceWorkspace({ sprintContext }: { sprintContext?: CustomerEvidenceSprintContext }) {
  const { user } = useAuth();
  const cycle = useFounderCycle();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ displayName: '', company: '', role: '', profileUrl: '' });
  const [pending, setPending] = useState<string | null>(null);
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [openMessage, setOpenMessage] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const contactsQuery = useQuery({
    queryKey: ['founder-customer-contacts', user?.id],
    enabled: Boolean(user?.id) && cycle.showCycle,
    queryFn: async () => {
      const { data, error } = await client
        .from('founder_customer_contacts')
        .select('id, display_name, company, role, profile_url, source, stage, notes, last_activity_at')
        .eq('user_id', user!.id)
        .order('last_activity_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as FounderCustomerContact[];
    },
  });

  const contacts = useMemo(() => {
    const all = contactsQuery.data ?? [];
    if (!sprintContext) return all;
    const attached = new Set(sprintContext.contactIds);
    return all.filter((contact) => attached.has(contact.id));
  }, [contactsQuery.data, sprintContext]);
  const activeContacts = useMemo(
    () => contacts.filter((contact) => contact.stage !== 'lost'),
    [contacts],
  );

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['founder-customer-contacts', user?.id] }),
      cycle.refresh(),
    ]);
    await sprintContext?.onEvidenceRecorded?.();
  };

  const sprintMetadata = (messageVariantKey?: string | null) => sprintContext ? {
    sprintId: sprintContext.sprintId,
    messageVariantKey: messageVariantKey ?? sprintContext.selectedMessageKey,
  } : {};

  const messageFor = (contact: FounderCustomerContact) => {
    if (!sprintContext?.selectedMessageKey) return outreachDraft(contact);
    const variant = sprintContext.messageVariants.find((item) => item.key === sprintContext.selectedMessageKey);
    return variant ? personalizeSprintMessage(variant.body, contact) : outreachDraft(contact);
  };

  const run = async (key: string, action: () => Promise<void>) => {
    setPending(key);
    try {
      await action();
    } catch (error) {
      console.error(error);
      toast.error('That evidence could not be saved. Please try again.');
    } finally {
      setPending(null);
    }
  };

  const addContact = async (input = form, source = 'manual') => {
    if (!input.displayName.trim()) {
      toast.error('Add a prospect name first.');
      return;
    }
    const { data, error } = await client.rpc('upsert_founder_customer_contact_v1', {
      p_display_name: input.displayName,
      p_company: input.company || null,
      p_role: input.role || null,
      p_profile_url: input.profileUrl || null,
      p_source: source,
      p_notes: '',
      p_contact_id: null,
      p_creation_key: source === 'csv'
        ? stableContactImportKey(input)
        : operationKey('manual-contact'),
    });
    if (error) throw error;
    const created = Array.isArray(data) ? data[0] : data;
    if (sprintContext && created?.id) await sprintContext.onContactAttached(created.id);
    trackCustomerEvidenceRecorded({
      loop: cycle.snapshot?.selectedLoop ?? 'PROVE',
      evidence_type: 'prospect_added',
      contact_source: source,
      verification_mode: source === 'csv' ? 'imported' : 'founder_reported',
    });
  };

  const submitContact = () => void run('add-contact', async () => {
    await addContact();
    setForm({ displayName: '', company: '', role: '', profileUrl: '' });
    await refresh();
    toast.success('Prospect added to the evidence pipeline.');
  });

  const saveNotes = (contact: FounderCustomerContact) => {
    void run(`${contact.id}:notes`, async () => {
      const { error } = await client.rpc('upsert_founder_customer_contact_v1', {
        p_display_name: contact.display_name,
        p_company: contact.company,
        p_role: contact.role,
        p_profile_url: contact.profile_url,
        p_source: contact.source,
        p_notes: noteDrafts[contact.id] ?? contact.notes,
        p_contact_id: contact.id,
        p_creation_key: null,
      });
      if (error) throw error;
      await refresh();
      toast.success('Customer notes saved. Use the pattern to update your ICP or offer.');
    });
  };

  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await run('csv-import', async () => {
      const rows = parseContactCsv(await file.text());
      if (!rows.length) throw new Error('CSV needs a name or display_name column and at least one row');
      const seen = new Set(contacts.map((contact) => stableContactImportKey({
        displayName: contact.display_name,
        company: contact.company ?? '',
        role: contact.role ?? '',
        profileUrl: contact.profile_url ?? '',
      })));
      const newRows = rows.filter((row) => {
        const key = stableContactImportKey(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      for (const row of newRows) {
        await addContact(row, 'csv');
      }
      await refresh();
      const skipped = rows.length - newRows.length;
      toast.success(newRows.length
        ? `${newRows.length} prospect${newRows.length === 1 ? '' : 's'} imported${skipped ? `; ${skipped} duplicate${skipped === 1 ? '' : 's'} skipped` : ''}.`
        : 'No new prospects were imported; all rows already exist.');
    });
  };

  const logAnalytics = (
    eventType: CustomerEvidenceEventType,
    source: string,
    mode: EvidenceVerificationMode,
  ) => {
    trackCustomerEvidenceRecorded({
      loop: cycle.snapshot?.selectedLoop ?? 'PROVE',
      evidence_type: eventType,
      contact_source: source,
      verification_mode: mode,
    });
    if (eventType === 'commitment_received' || eventType === 'payment_received') {
      trackCostlyCommitmentRecorded({
        loop: cycle.snapshot?.selectedLoop ?? 'PROVE',
        commitment_type: eventType === 'payment_received' ? 'payment' : 'commitment',
        verification_mode: mode,
      });
    }
  };

  const transition = async (
    contact: FounderCustomerContact,
    stage: CustomerContactStage,
    eventType: CustomerEvidenceEventType,
    mode: EvidenceVerificationMode = 'founder_reported',
  ) => {
    const previousRecommendation = cycle.snapshot?.recommendedLoop ?? 'PROVE';
    const { error } = await client.rpc('transition_founder_customer_contact_v1', {
      p_contact_id: contact.id,
      p_stage: stage,
      p_event_type: eventType,
      p_active_loop: cycle.snapshot?.selectedLoop ?? 'PROVE',
      p_verification_mode: mode,
      p_amount: null,
      p_currency: null,
      p_metadata: sprintMetadata(),
      p_idempotency_key: operationKey(`contact-${contact.id}-${eventType}`),
    });
    if (error) throw error;
    logAnalytics(eventType, contact.source, mode);
    const { data: nextSnapshot } = await client.rpc('get_founder_cycle_snapshot_v1');
    if (
      isFounderCycleSnapshot(nextSnapshot)
      && (previousRecommendation === 'PROVE' || previousRecommendation === 'SELL')
      && nextSnapshot.recommendedLoop !== previousRecommendation
    ) {
      trackCycleLoopExited({
        from_loop: previousRecommendation,
        to_loop: nextSnapshot.recommendedLoop as 'SELL' | 'GROW',
        exit_evidence: eventType,
      });
    }
    await refresh();
  };

  const changeStage = (contact: FounderCustomerContact, stage: CustomerContactStage) => {
    const eventType = evidenceEventForContactStage(stage);
    if (!eventType) return;
    void run(`${contact.id}:${stage}`, async () => {
      await transition(contact, stage, eventType);
      toast.success(`Prospect moved to ${stage}.`);
    });
  };

  const logCompletedConversation = (contact: FounderCustomerContact) => {
    void run(`${contact.id}:interview-completed`, async () => {
      await cycle.recordEvidence({
        eventType: 'interview_completed',
        contactId: contact.id,
        sourceEntityType: 'founder_customer_contact',
        sourceEntityId: contact.id,
        verificationMode: 'customer_action',
        metadata: sprintMetadata(),
        idempotencyKey: operationKey(`contact-${contact.id}-interview-completed`),
      });
      logAnalytics('interview_completed', contact.source, 'customer_action');
      await refresh();
      toast.success('Qualified conversation recorded.');
    });
  };

  const copyApprovedMessage = (contact: FounderCustomerContact) => {
    if (!approved[contact.id]) {
      toast.error('Review and approve the message before copying it.');
      return;
    }
    void run(`${contact.id}:copy`, async () => {
      await navigator.clipboard.writeText(messageFor(contact));
      await cycle.recordEvidence({
        eventType: 'outreach_prepared',
        contactId: contact.id,
        sourceEntityType: 'founder_customer_contact',
        sourceEntityId: contact.id,
        verificationMode: 'founder_reported',
        metadata: sprintMetadata(sprintContext?.selectedMessageKey),
        idempotencyKey: operationKey(`contact-${contact.id}-outreach-prepared`),
      });
      logAnalytics('outreach_prepared', contact.source, 'founder_reported');
      toast.success('Approved message copied. Mark it sent after you send it manually.');
    });
  };

  if (!user || !cycle.showCycle) return null;

  return (
    <section id="customer-evidence" className="scroll-mt-28 space-y-5 rounded-2xl border border-primary/20 bg-card/80 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge className="mb-2 bg-primary/10 text-primary">{sprintContext ? 'Sprint execution' : 'Assisted first-customer loop'}</Badge>
          <h2 className="text-2xl font-semibold">{sprintContext ? 'Sprint outreach and evidence' : 'Customer evidence pipeline'}</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Keep named prospects, approved outreach, replies, conversations, commitments, and customers in one place. Sending remains manual.
          </p>
        </div>
        <label className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
          {pending === 'csv-import' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
          Import CSV
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void importCsv(event)} />
        </label>
      </div>

      <div className="rounded-xl border border-border/60 bg-background/70 p-4">
        <h3 className="font-semibold">Add a named prospect</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          CSV columns: name, company, role, profile_url. Imports are limited to 100 rows at a time.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input aria-label="Prospect name" placeholder="Name *" value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} />
          <Input aria-label="Prospect company" placeholder="Company" value={form.company} onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))} />
          <Input aria-label="Prospect role" placeholder="Role" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} />
          <Input aria-label="Public profile URL" type="url" placeholder="Public profile URL" value={form.profileUrl} onChange={(event) => setForm((current) => ({ ...current, profileUrl: event.target.value }))} />
        </div>
        <Button className="mt-3" disabled={pending === 'add-contact'} onClick={submitContact}>
          {pending === 'add-contact' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add prospect
        </Button>
      </div>

      {contactsQuery.isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /> : null}
      {contactsQuery.error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          The customer evidence database is not available yet. Apply the founder execution cycle migration and refresh.
        </p>
      ) : null}
      {!contactsQuery.isLoading && !contactsQuery.error && activeContacts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <MessageSquareText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Your evidence loop starts with a person, not a document.</p>
          <p className="mt-1 text-sm text-muted-foreground">Add ten reachable prospects who match the problem you want to prove.</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {activeContacts.map((contact) => {
          const draftOpen = openMessage === contact.id;
          return (
            <article key={contact.id} className="rounded-xl border border-border/60 bg-background/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{contact.display_name}</p>
                    <Badge variant="outline">{contact.source}</Badge>
                    <Badge variant="secondary">{contact.stage}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[contact.role, contact.company].filter(Boolean).join(' at ') || 'Qualification details not added yet'}
                  </p>
                </div>
                {contact.profile_url ? (
                  <a className="inline-flex items-center text-xs text-primary hover:underline" href={contact.profile_url} target="_blank" rel="noreferrer">
                    Public profile <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <select
                  aria-label={`Pipeline stage for ${contact.display_name}`}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={contact.stage}
                  disabled={pending?.startsWith(contact.id)}
                  onChange={(event) => changeStage(contact, event.target.value as CustomerContactStage)}
                >
                  {CUSTOMER_CONTACT_STAGES.map((stage) => (
                    <option key={stage} value={stage}>{stage.replaceAll('_', ' ')}</option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="sm" onClick={() => setOpenMessage(draftOpen ? null : contact.id)}>
                  <MessageSquareText className="mr-2 h-4 w-4" />
                  {draftOpen ? 'Close message' : 'Prepare message'}
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={pending?.startsWith(contact.id)} onClick={() => logCompletedConversation(contact)}>
                  <Check className="mr-2 h-4 w-4" /> Conversation completed
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={pending?.startsWith(contact.id)} onClick={() => void run(`${contact.id}:commitment`, async () => {
                  await transition(contact, 'commitment', 'commitment_received', 'customer_action');
                  toast.success('Costly commitment recorded.');
                })}>
                  Log commitment
                </Button>
                <Button type="button" size="sm" disabled={pending?.startsWith(contact.id)} onClick={() => void run(`${contact.id}:payment`, async () => {
                  await transition(contact, 'customer', 'payment_received', 'founder_reported');
                  toast.success('Customer payment recorded as founder-reported evidence.');
                })}>
                  Log payment
                </Button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Textarea
                  className="min-h-20"
                  aria-label={`Evidence and objection notes for ${contact.display_name}`}
                  placeholder="Capture the problem in their words, current workaround, urgency, objections, and next commitment."
                  value={noteDrafts[contact.id] ?? contact.notes}
                  maxLength={4000}
                  onChange={(event) => setNoteDrafts((current) => ({
                    ...current,
                    [contact.id]: event.target.value,
                  }))}
                />
                <div className="flex gap-2 sm:flex-col">
                  <Button variant="outline" size="sm" disabled={pending === `${contact.id}:notes`} onClick={() => saveNotes(contact)}>
                    Save notes
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/icp-builder">Update ICP</Link>
                  </Button>
                </div>
              </div>

              {draftOpen ? (
                <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <Textarea readOnly value={messageFor(contact)} aria-label={`Outreach message for ${contact.display_name}`} />
                  <label className="mt-3 flex items-start gap-2 text-sm">
                    <input
                      className="mt-1"
                      type="checkbox"
                      checked={Boolean(approved[contact.id])}
                      onChange={(event) => setApproved((current) => ({ ...current, [contact.id]: event.target.checked }))}
                    />
                    <span>I reviewed and personalised this message. I will send it manually.</span>
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" disabled={!approved[contact.id] || pending === `${contact.id}:copy`} onClick={() => copyApprovedMessage(contact)}>
                      <ClipboardCopy className="mr-2 h-4 w-4" /> Copy approved message
                    </Button>
                    <Button variant="outline" size="sm" disabled={pending?.startsWith(contact.id)} onClick={() => void run(`${contact.id}:sent`, async () => {
                      await transition(contact, 'contacted', 'outreach_sent');
                      toast.success('Manual outreach recorded.');
                    })}>
                      Mark sent
                    </Button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
