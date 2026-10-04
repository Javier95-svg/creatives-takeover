import { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardDisclosure } from '@/components/dashboard/DashboardDisclosure';
import { ToolEmptyState } from '@/components/tool-shell/ToolEmptyState';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { PMFInterviewLog } from '@/hooks/usePMFLab';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent, trackPMFEvidenceLogged } from '@/lib/analytics';
import { listJourneyAssumptions, type JourneyAssumption } from '@/lib/journeyOutcomes';
import type { PMFInterviewLeadSeed } from '@/components/pmf/PMFDiscoveryPipeline';
import { FIRST_READ_INTERVIEWS } from '@/lib/pmfNextStep';
import { PMFInterviewSheet } from './PMFInterviewSheet';
import { BUYING_INTENT_OPTIONS, createEmptyInterview, interviewFromLead, newInterviewId } from './pmfInterviewModel';

export interface PMFIcpInterviewPlanItem {
  step: number;
  question: string;
  successSignal: string;
}

interface PMFConversationsStepProps {
  interviews: PMFInterviewLog[];
  icpDraftId: string | null;
  icpInterviewPlan: PMFIcpInterviewPlanItem[] | null;
  /** Incremented by the page to open the add dialog from the next-step card. */
  addRequest: number;
  leadSeed: PMFInterviewLeadSeed | null;
  /** False while "add a conversation" is the page's next step, so the button is not shown twice. */
  showAddButton: boolean;
  onSaveInterview: (interview: PMFInterviewLog) => Promise<PMFInterviewLog | void>;
  onDeleteInterview: (id: string) => Promise<void>;
  onImportInterviews: (interviews: PMFInterviewLog[]) => Promise<void>;
  onFindPeople: () => void;
}

const intentLabel = (value: PMFInterviewLog['buyingIntent']) =>
  BUYING_INTENT_OPTIONS.find((option) => option.value === value)?.label ?? '';

export function PMFConversationsStep({
  interviews,
  icpDraftId,
  icpInterviewPlan,
  addRequest,
  leadSeed,
  showAddButton,
  onSaveInterview,
  onDeleteInterview,
  onImportInterviews,
  onFindPeople,
}: PMFConversationsStepProps) {
  const [assumptions, setAssumptions] = useState<JourneyAssumption[]>([]);
  const [editing, setEditing] = useState<PMFInterviewLog | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [importing, setImporting] = useState(false);
  const handledAddRequest = useRef(addRequest);
  const handledLead = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listJourneyAssumptions(icpDraftId ?? undefined)
      // Anything but a list (no rows, an RPC error shape) means no assumptions to test.
      .then((items) => { if (!cancelled) setAssumptions(Array.isArray(items) ? items : []); })
      .catch(() => { if (!cancelled) setAssumptions([]); });
    return () => { cancelled = true; };
  }, [icpDraftId]);

  const openNew = (seed?: PMFInterviewLog) => {
    setIsNew(true);
    setEditing(seed ?? createEmptyInterview());
  };

  useEffect(() => {
    if (addRequest === handledAddRequest.current) return;
    handledAddRequest.current = addRequest;
    openNew();
  }, [addRequest]);

  useEffect(() => {
    if (!leadSeed || handledLead.current === leadSeed.sourceLeadId) return;
    handledLead.current = leadSeed.sourceLeadId;
    openNew(interviewFromLead(leadSeed));
  }, [leadSeed]);

  const save = async (interview: PMFInterviewLog) => {
    trackPMFEvidenceLogged({ evidence_type: 'interview' });
    setSaving(true);
    try {
      await onSaveInterview(interview);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save this conversation.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await onDeleteInterview(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete this conversation.');
    }
  };

  // Pasted notes or transcripts become structured conversations (pmf-interview-extract).
  const importNotes = async () => {
    const text = notes.trim();
    if (text.length < 80) {
      toast.error('Paste at least a few sentences of notes first.');
      return;
    }
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('pmf-interview-extract', { body: { notes: text } });
      if (error || !data?.success || !Array.isArray(data.interviews)) {
        toast.error(data?.error || 'Could not read conversations from these notes. Add who you spoke to and what they said.');
        return;
      }
      const extracted: PMFInterviewLog[] = (data.interviews as Array<Partial<PMFInterviewLog>>).map((item) => ({
        ...createEmptyInterview(),
        ...item,
        id: newInterviewId(),
      }));
      await onImportInterviews(extracted);
      extracted.forEach(() => trackPMFEvidenceLogged({ evidence_type: 'interview' }));
      captureEvent('pmf_interviews_imported', { count: extracted.length, notes_chars: text.length });
      toast.success(`${extracted.length} conversation${extracted.length === 1 ? '' : 's'} added.`, {
        description: 'Check each one and fix anything that was read wrong.',
      });
      setNotes('');
    } catch {
      toast.error('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Your conversations</h2>
          <p className="text-sm text-muted-foreground">
            {interviews.length} logged. {FIRST_READ_INTERVIEWS} give a first read, 25 give a solid verdict.
          </p>
        </div>
        {showAddButton && (
          <Button type="button" variant="outline" onClick={() => openNew()}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Add a conversation
          </Button>
        )}
      </div>

      {interviews.length === 0 ? (
        <ToolEmptyState
          title="No conversations yet"
          description="Talk to people who have the problem you solve. After each conversation, log what they said here."
          action={<Button type="button" variant="link" onClick={onFindPeople}>Not sure who to talk to? Find people</Button>}
        />
      ) : (
        <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
          {interviews.map((interview) => (
            <li key={interview.id} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {interview.intervieweeName || 'Unnamed'}
                  <span className="font-normal text-muted-foreground">
                    {interview.basicProfile ? `, ${interview.basicProfile}` : ''}
                  </span>
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{interview.mainFeedback}</p>
                <p className="mt-1 text-xs text-muted-foreground">{intentLabel(interview.buyingIntent)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label="Edit conversation" onClick={() => { setIsNew(false); setEditing(interview); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Delete conversation" onClick={() => void remove(interview.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {icpInterviewPlan && icpInterviewPlan.length > 0 && (
        <DashboardDisclosure title="Questions to ask" summary="Suggested by your ICP Builder draft.">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
            {icpInterviewPlan.map((item) => (
              <li key={item.step}>
                {item.question}
                {item.successSignal ? <span className="block text-muted-foreground">Good sign: {item.successSignal}</span> : null}
              </li>
            ))}
          </ol>
        </DashboardDisclosure>
      )}

      <DashboardDisclosure title="Paste notes instead" summary="Paste notes or a transcript and we turn them into conversations you can check.">
        <div className="space-y-3">
          <Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste your interview notes here" />
          <Button type="button" variant="outline" onClick={() => void importNotes()} disabled={importing || notes.trim().length < 80}>
            {importing ? 'Reading notes…' : 'Add from notes'}
          </Button>
        </div>
      </DashboardDisclosure>

      <PMFInterviewSheet
        open={Boolean(editing)}
        interview={editing}
        isNew={isNew}
        assumptions={assumptions}
        saving={saving}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        onSave={(interview) => void save(interview)}
      />
    </div>
  );
}
