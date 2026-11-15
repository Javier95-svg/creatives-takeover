import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Loader2, Mail, MessageCircle, ThumbsDown, UserSearch } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { captureEvent } from '@/lib/analytics';
import { CONTACT_FIND_CREDITS, personalizeDraft } from '@/lib/gtmResearch';
import type { ProspectDraft, ProspectRow } from '@/hooks/useGtmResearch';
import { cn } from '@/lib/utils';

export const FEEDBACK_REASONS = ['Wrong industry', 'Too big', 'Too small', 'A competitor', 'Not a real business', 'Other'] as const;

const VERDICT_TEXT = { met: 'Confirmed on their site', not_met: 'Does not fit', unknown: 'Not found on their site' } as const;
const ROUTE_TEXT = { contact_page: 'Contact page', generic_email: 'Published email', careers: 'Careers page' } as const;
const SIGNAL_TEXT = { hiring: 'Hiring', funding: 'Funding', launch: 'Launch', expansion: 'Expansion', partnership: 'Partnership', news: 'News' } as const;

export const TIER_TEXT = { A: 'Strong fit', B: 'Good fit', C: 'Possible fit' } as const;

export function FitBadge({ tier, score }: { tier: ProspectRow['fit_tier']; score?: number }) {
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap', tier === 'A' && 'border-primary/50 bg-primary/10 text-primary', tier === 'C' && 'text-muted-foreground')}>
      {TIER_TEXT[tier]}{typeof score === 'number' ? ` · ${score}` : ''}
    </Badge>
  );
}

type DraftPatch = Partial<Pick<ProspectDraft, 'subject' | 'body' | 'variant_b_subject' | 'variant_b_body' | 'chosen_variant'>>;

/** Whether the "Find the right person" lookup is switched on in this build. */
const CONTACT_FINDER_ON = import.meta.env.VITE_GTM_CONTACT_FINDER === 'on';

export function ProspectSheet({ prospect, onClose, canAddToPipeline, onUpdate, onUpdateDraft, onAddToPipeline, onMarkSent, onMarkReplied, proof, onFindContact }: {
  prospect: ProspectRow | null;
  onClose: () => void;
  canAddToPipeline: boolean;
  onUpdate: (id: string, patch: Partial<Pick<ProspectRow, 'status' | 'feedback'>>) => Promise<void>;
  onUpdateDraft: (id: string, patch: DraftPatch) => Promise<void>;
  onAddToPipeline: (prospect: ProspectRow) => Promise<void>;
  onMarkSent: (prospect: ProspectRow) => Promise<void>;
  onMarkReplied: (prospect: ProspectRow) => Promise<void>;
  /** First Customer Proof, when the founder has a sprint open. */
  proof?: { attached: boolean; onAdd: (prospect: ProspectRow) => Promise<void> } | null;
  onFindContact?: (prospect: ProspectRow) => Promise<{ found: boolean; message: string | null } | undefined>;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [variant, setVariant] = useState<'a' | 'b'>('a');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const draft = prospect?.draft ?? null;
  const hasB = Boolean(draft?.variant_b_subject && draft?.variant_b_body);
  const firstName = prospect?.contact?.full_name.split(' ')[0] ?? null;

  useEffect(() => {
    const chosen = draft?.chosen_variant === 'b' && hasB ? 'b' : 'a';
    setVariant(chosen);
    setSubject((chosen === 'b' ? draft?.variant_b_subject : draft?.subject) ?? '');
    setBody(personalizeDraft((chosen === 'b' ? draft?.variant_b_body : draft?.body) ?? '', firstName));
    setFeedbackOpen(false);
  }, [prospect?.id, draft?.subject, draft?.body, draft?.variant_b_subject, draft?.variant_b_body, draft?.chosen_variant, hasB, firstName]);
  if (!prospect) return null;

  const stored = draft ? { subject: variant === 'b' ? draft.variant_b_subject ?? '' : draft.subject, body: personalizeDraft((variant === 'b' ? draft.variant_b_body : draft.body) ?? '', firstName) } : null;
  const dirty = Boolean(stored && (subject !== stored.subject || body !== stored.body));
  const sent = draft?.status === 'sent_manually' || draft?.status === 'replied';
  const email = prospect.contact?.email ?? prospect.contact_routes.find((route) => route.kind === 'generic_email')?.value ?? '';
  const textPatch = (): DraftPatch => (variant === 'b' ? { variant_b_subject: subject, variant_b_body: body } : { subject, body });

  const busy = async (key: string, work: () => Promise<void>, failure: string) => {
    setWorking(key);
    try { await work(); } catch { toast.error(failure); } finally { setWorking(null); }
  };
  const pickVariant = (next: 'a' | 'b') => {
    if (!draft || next === variant) return;
    setVariant(next);
    setSubject((next === 'b' ? draft.variant_b_subject : draft.subject) ?? '');
    setBody(personalizeDraft((next === 'b' ? draft.variant_b_body : draft.body) ?? '', firstName));
    if (!sent) void onUpdateDraft(prospect.id, { chosen_variant: next }).catch(() => undefined);
  };
  const copy = async () => {
    await navigator.clipboard.writeText(`${subject}\n\n${body}`);
    captureEvent('gtm_draft_copied', { tier: prospect.fit_tier, edited: draft?.edited ?? false, variant });
    toast.success('Copied. Paste it into your email, then mark it sent.');
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl" onOpenAutoFocus={(event) => event.preventDefault()}>
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

        {prospect.signals.length ? (
          <section className="mt-6">
            <h3 className="text-sm font-semibold text-foreground">Recent news</h3>
            <ul className="mt-2 space-y-2">
              {prospect.signals.map((signal) => (
                <li key={`${signal.sourceUrl}-${signal.date}`} className="text-sm">
                  <span className="mr-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{SIGNAL_TEXT[signal.kind]} · {signal.date.slice(0, 7)}</span>
                  <a href={signal.sourceUrl} target="_blank" rel="noreferrer" className="text-foreground underline-offset-4 hover:underline">{signal.text}</a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-foreground">How to reach them</h3>
          {prospect.contact ? (
            <div className="mt-2 rounded-lg border border-border/60 p-3 text-sm">
              <p className="font-medium text-foreground">{prospect.contact.full_name}{prospect.contact.role ? <span className="font-normal text-muted-foreground"> · {prospect.contact.role}</span> : null}</p>
              <p className="mt-0.5 text-foreground">{prospect.contact.email} <span className="text-xs text-muted-foreground">({prospect.contact.email_status === 'valid' ? 'verified' : 'their server accepts any address, so not fully verified'})</span></p>
              {prospect.contact.sources.length ? <p className="mt-1 text-xs text-muted-foreground">Found on: {prospect.contact.sources.map((source) => source.replace(/^https?:\/\//, '')).join(', ')}</p> : null}
            </div>
          ) : null}
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
          ) : !prospect.contact ? <p className="mt-2 text-sm text-muted-foreground">No public contact route on their site. Try their website's contact form or LinkedIn.</p> : null}
          {prospect.suggested_roles.length ? <p className="mt-2 text-sm text-muted-foreground">Who to look for: {prospect.suggested_roles.join(', ')}</p> : null}
          {CONTACT_FINDER_ON && onFindContact && !prospect.contact && prospect.fit_tier !== 'C' ? (
            <Button type="button" size="sm" variant="outline" className="mt-3" disabled={working === 'contact'} onClick={() => void busy('contact', async () => {
              const result = await onFindContact(prospect);
              if (result && !result.found) toast.message(result.message ?? 'No one was found. You were not charged.');
            }, 'Could not look up a contact. You were not charged.')}>
              {working === 'contact' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <UserSearch className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
              Find the right person · {CONTACT_FIND_CREDITS} credit, only if found
            </Button>
          ) : null}
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Outreach draft</h3>
            {draft && hasB ? (
              <div className="inline-flex rounded-lg border border-border/60 p-0.5" role="radiogroup" aria-label="Draft version">
                {(['a', 'b'] as const).map((key) => (
                  <button key={key} type="button" role="radio" aria-checked={variant === key} disabled={sent && variant !== key}
                    className={cn('rounded-md px-3 py-1 text-xs font-medium', variant === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground disabled:opacity-50')}
                    onClick={() => pickVariant(key)}>Version {key.toUpperCase()}</button>
                ))}
              </div>
            ) : null}
          </div>
          {draft ? (
            <div className="mt-2 space-y-2">
              <Input aria-label="Email subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} />
              <Textarea aria-label="Email body" value={body} onChange={(event) => setBody(event.target.value)} rows={9} maxLength={2000} />
              <p className="text-xs text-muted-foreground">
                {firstName ? '' : "Replace {{first_name}} with the person's name. "}{hasB ? 'Two versions open differently; your sent and reply marks show which works better. ' : ''}You send it. Nothing is sent from Creatives Takeover.
              </p>
              <div className="flex flex-wrap gap-2">
                {dirty ? <Button type="button" size="sm" variant="outline" onClick={() => void busy('save', async () => { await onUpdateDraft(prospect.id, textPatch()); toast.success('Draft saved.'); }, 'Could not save the draft.')}>Save draft</Button> : null}
                <Button type="button" size="sm" variant="outline" onClick={() => void copy()}><Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Copy</Button>
                <Button asChild size="sm" variant="outline">
                  <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`} onClick={() => captureEvent('gtm_draft_copied', { tier: prospect.fit_tier, edited: draft.edited, via: 'mailto', variant })}>
                    <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Open in email
                  </a>
                </Button>
                {draft.status === 'replied'
                  ? <span className="inline-flex items-center gap-1 text-sm text-primary"><MessageCircle className="h-4 w-4" aria-hidden="true" />Replied</span>
                  : sent
                    ? <>
                      <span className="inline-flex items-center gap-1 text-sm text-primary"><Check className="h-4 w-4" aria-hidden="true" />Sent</span>
                      <Button type="button" size="sm" variant="outline" disabled={working === 'replied'} onClick={() => void busy('replied', async () => { await onMarkReplied(prospect); toast.success('Reply recorded in your customer evidence.'); }, 'Could not record the reply.')}>They replied</Button>
                    </>
                    : <Button type="button" size="sm" disabled={working === 'sent'} onClick={() => void busy('sent', async () => {
                      if (dirty) await onUpdateDraft(prospect.id, textPatch());
                      await onMarkSent(prospect);
                      toast.success('Marked as sent and added to your customer evidence.');
                    }, 'Could not update this company.')}>Mark as sent</Button>}
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
          {proof ? (
            <Button type="button" size="sm" variant="outline" disabled={proof.attached || working === 'proof'} onClick={() => void busy('proof', async () => { await proof.onAdd(prospect); toast.success('Added to your First Customer Proof list.'); }, 'Could not add it to First Customer Proof.')}>
              {proof.attached ? 'In First Customer Proof' : 'Add to First Customer Proof'}
            </Button>
          ) : null}
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
                toast.success('Thanks. Your next search will avoid companies like this.');
                onClose();
              }}>{reason}</Button>
            ))}
          </div>
        ) : null}
        {!canAddToPipeline ? <p className="mt-3 text-xs text-muted-foreground">Build your GTM plan to add companies to its pipeline.</p> : null}
      </SheetContent>
    </Sheet>
  );
}
