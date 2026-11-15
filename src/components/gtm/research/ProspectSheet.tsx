import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Mail, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { captureEvent } from '@/lib/analytics';
import type { ProspectRow } from '@/hooks/useGtmResearch';
import { cn } from '@/lib/utils';

export const FEEDBACK_REASONS = ['Wrong industry', 'Too big', 'Too small', 'A competitor', 'Not a real business', 'Other'] as const;

const VERDICT_TEXT = { met: 'Confirmed on their site', not_met: 'Does not fit', unknown: 'Not found on their site' } as const;
const ROUTE_TEXT = { contact_page: 'Contact page', generic_email: 'Published email', careers: 'Careers page' } as const;

export const TIER_TEXT = { A: 'Strong fit', B: 'Good fit', C: 'Possible fit' } as const;

export function FitBadge({ tier, score }: { tier: ProspectRow['fit_tier']; score?: number }) {
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap', tier === 'A' && 'border-primary/50 bg-primary/10 text-primary', tier === 'C' && 'text-muted-foreground')}>
      {TIER_TEXT[tier]}{typeof score === 'number' ? ` · ${score}` : ''}
    </Badge>
  );
}

export function ProspectSheet({ prospect, onClose, canAddToPipeline, onUpdate, onUpdateDraft, onAddToPipeline }: {
  prospect: ProspectRow | null;
  onClose: () => void;
  canAddToPipeline: boolean;
  onUpdate: (id: string, patch: Partial<Pick<ProspectRow, 'status' | 'feedback'>>) => Promise<void>;
  onUpdateDraft: (id: string, patch: { subject?: string; body?: string; status?: 'draft' | 'approved' | 'sent_manually' }) => Promise<void>;
  onAddToPipeline: (prospect: ProspectRow) => Promise<void>;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  useEffect(() => {
    setSubject(prospect?.draft?.subject ?? '');
    setBody(prospect?.draft?.body ?? '');
    setFeedbackOpen(false);
  }, [prospect?.id, prospect?.draft?.subject, prospect?.draft?.body]);
  if (!prospect) return null;
  const draft = prospect.draft;
  const dirty = Boolean(draft && (subject !== draft.subject || body !== draft.body));
  const email = prospect.contact_routes.find((route) => route.kind === 'generic_email')?.value ?? '';

  const save = async () => {
    try { await onUpdateDraft(prospect.id, { subject, body }); toast.success('Draft saved.'); } catch { toast.error('Could not save the draft.'); }
  };
  const copy = async () => {
    await navigator.clipboard.writeText(`${subject}\n\n${body}`);
    captureEvent('gtm_draft_copied', { tier: prospect.fit_tier, edited: draft?.edited ?? false });
    toast.success('Copied. Paste it into your email, then mark it sent.');
  };
  const markSent = async () => {
    try {
      if (dirty) await onUpdateDraft(prospect.id, { subject, body });
      await onUpdateDraft(prospect.id, { status: 'sent_manually' });
      await onUpdate(prospect.id, { status: 'contacted' });
      captureEvent('gtm_draft_marked_sent', { tier: prospect.fit_tier });
      toast.success('Marked as sent.');
    } catch { toast.error('Could not update this company.'); }
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="text-left">
          <div className="flex flex-wrap items-center gap-2"><FitBadge tier={prospect.fit_tier} score={prospect.fit_score} />{prospect.blocked ? <Badge variant="outline">Site blocks automated reading</Badge> : null}</div>
          <SheetTitle className="text-xl">{prospect.name}</SheetTitle>
          <SheetDescription>
            <a href={`https://${prospect.domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">{prospect.domain}<ExternalLink className="h-3 w-3" aria-hidden="true" /></a>
            {prospect.location ? ` · ${prospect.location}` : ''}{prospect.size_band ? ` · ${prospect.size_band}` : ''}
          </SheetDescription>
        </SheetHeader>

        {prospect.description ? <p className="mt-4 text-sm text-foreground">{prospect.description}</p> : null}

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-foreground">Why it fits</h3>
          <ul className="mt-2 space-y-3">
            {prospect.criteria.map((item) => (
              <li key={item.criterionId} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{item.criterion}</span>
                  <span className={cn('shrink-0 text-xs', item.verdict === 'met' ? 'text-primary' : 'text-muted-foreground')}>{VERDICT_TEXT[item.verdict]}</span>
                </div>
                {item.quote ? <blockquote className="mt-2 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">“{item.quote}”</blockquote> : null}
                {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline">Source<ExternalLink className="h-3 w-3" aria-hidden="true" /></a> : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Checked {new Date(prospect.last_checked_at).toLocaleDateString()}. “Not found” means their site doesn't say, not that it's false.</p>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-foreground">How to reach them</h3>
          {prospect.contact_routes.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {prospect.contact_routes.map((route) => (
                <li key={route.value}>
                  <span className="text-muted-foreground">{ROUTE_TEXT[route.kind]}: </span>
                  {route.kind === 'generic_email' ? <span className="text-foreground">{route.value}</span>
                    : <a href={route.value} target="_blank" rel="noreferrer" className="text-foreground underline-offset-4 hover:underline">{route.value.replace(/^https?:\/\//, '')}</a>}
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-muted-foreground">No public contact route on their site. Try their website's contact form or LinkedIn.</p>}
          {prospect.suggested_roles.length ? <p className="mt-2 text-sm text-muted-foreground">Who to look for: {prospect.suggested_roles.join(', ')}</p> : null}
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-foreground">Outreach draft</h3>
          {draft ? (
            <div className="mt-2 space-y-2">
              <Input aria-label="Email subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} />
              <Textarea aria-label="Email body" value={body} onChange={(event) => setBody(event.target.value)} rows={9} maxLength={2000} />
              <p className="text-xs text-muted-foreground">Replace {'{{first_name}}'} with the person's name. You send it. Nothing is sent from Creatives Takeover.</p>
              <div className="flex flex-wrap gap-2">
                {dirty ? <Button type="button" size="sm" variant="outline" onClick={() => void save()}>Save draft</Button> : null}
                <Button type="button" size="sm" variant="outline" onClick={() => void copy()}><Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Copy</Button>
                <Button asChild size="sm" variant="outline">
                  <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`} onClick={() => captureEvent('gtm_draft_copied', { tier: prospect.fit_tier, edited: draft.edited, via: 'mailto' })}>
                    <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Open in email
                  </a>
                </Button>
                {draft.status === 'sent_manually'
                  ? <span className="inline-flex items-center gap-1 text-sm text-primary"><Check className="h-4 w-4" aria-hidden="true" />Sent</span>
                  : <Button type="button" size="sm" onClick={() => void markSent()}>Mark as sent</Button>}
              </div>
            </div>
          ) : <p className="mt-2 text-sm text-muted-foreground">Drafts are written for strong and good fits.</p>}
        </section>

        <section className="mt-6 flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Button type="button" size="sm" variant={prospect.status === 'shortlisted' ? 'default' : 'outline'} onClick={() => void onUpdate(prospect.id, { status: prospect.status === 'shortlisted' ? 'new' : 'shortlisted' })}>
            {prospect.status === 'shortlisted' ? 'Shortlisted' : 'Shortlist'}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!canAddToPipeline || prospect.status === 'in_pipeline'} title={canAddToPipeline ? undefined : 'Build your GTM plan first'} onClick={() => void onAddToPipeline(prospect)}>
            {prospect.status === 'in_pipeline' ? 'In your pipeline' : 'Add to pipeline'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setFeedbackOpen((open) => !open)}><ThumbsDown className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Looks off</Button>
          {prospect.status !== 'dismissed'
            ? <Button type="button" size="sm" variant="ghost" onClick={() => { void onUpdate(prospect.id, { status: 'dismissed' }); onClose(); }}>Dismiss</Button>
            : null}
        </section>
        {feedbackOpen ? (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="What's wrong with this company?">
            {FEEDBACK_REASONS.map((reason) => (
              <Button key={reason} type="button" size="sm" variant="outline" onClick={() => {
                void onUpdate(prospect.id, { status: 'dismissed', feedback: { reason, at: new Date().toISOString() } });
                toast.success('Thanks. We use this to improve the next search.');
                onClose();
              }}>{reason}</Button>
            ))}
          </div>
        ) : null}
        {!canAddToPipeline ? <p className="mt-3 text-xs text-muted-foreground">Build your GTM plan to add companies to its pipeline and to First Customer Proof.</p> : null}
      </SheetContent>
    </Sheet>
  );
}
