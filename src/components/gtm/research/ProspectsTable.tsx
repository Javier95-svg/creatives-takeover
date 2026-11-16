import { useMemo, useState } from 'react';
import { Download, Lock, Mail, Phone, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { captureEvent } from '@/lib/analytics';
import { prospectsToCsv } from '@/lib/gtmResearch';
import type { ProspectRow } from '@/hooks/useGtmResearch';
import { cn } from '@/lib/utils';
import { availableText, FitBadge, TIER_TEXT } from './ProspectSheet';

const STATUS_TEXT: Record<ProspectRow['status'], string> = { new: 'New', shortlisted: 'Shortlisted', dismissed: 'Dismissed', in_pipeline: 'In pipeline', contacted: 'Contacted' };

/** The strongest confirmed reason, for the table's "Why it fits" column. */
export function topReason(prospect: ProspectRow): string {
  const met = prospect.criteria.filter((item) => item.verdict === 'met');
  if (!met.length) return prospect.blocked ? 'Their site blocks automated reading' : 'Not confirmed on their site';
  return `${met[0].criterion}${met.length > 1 ? ` · +${met.length - 1} more` : ''}`;
}

/** The best email and phone when the plan includes this lead; otherwise a lock with what's waiting. */
function ContactCell({ prospect }: { prospect: ProspectRow }) {
  const stop = (event: React.MouseEvent) => event.stopPropagation();
  if (!prospect.contact_unlocked) {
    const waiting = availableText(prospect.contact_available);
    return (
      <a href="/pricing" onClick={(event) => { stop(event); captureEvent('gtm_contact_upgrade_clicked', { where: 'table' }); }}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" title="Emails and phone numbers are on Rising and Pro">
        <Lock className="h-3 w-3 text-primary" aria-hidden="true" />{waiting ?? 'Contact'} · Rising
      </a>
    );
  }
  const email = prospect.contact?.email ?? prospect.contact_details?.emails[0]?.value ?? null;
  const phone = prospect.contact_details?.phones[0]?.value ?? null;
  if (!email && !phone) return <span className="text-xs text-muted-foreground">Not published</span>;
  return (
    <span className="block space-y-0.5 text-xs">
      {email ? <a href={`mailto:${email}`} onClick={stop} className="flex items-center gap-1.5 truncate text-foreground underline-offset-4 hover:underline"><Mail className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="truncate">{email}</span></a> : null}
      {phone ? <a href={`tel:${phone}`} onClick={stop} className="flex items-center gap-1.5 text-foreground underline-offset-4 hover:underline"><Phone className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />{phone}</a> : null}
    </span>
  );
}

export function ProspectsTable({ prospects, onOpen }: { prospects: readonly ProspectRow[]; onOpen: (prospect: ProspectRow) => void }) {
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<'all' | 'A' | 'B' | 'C'>('all');
  const [status, setStatus] = useState<'active' | ProspectRow['status'] | 'all'>('active');
  const [showPossible, setShowPossible] = useState(false);

  const visible = useMemo(() => prospects.filter((prospect) => {
    if (tier !== 'all' ? prospect.fit_tier !== tier : prospect.fit_tier === 'C' && !showPossible) return false;
    if (status === 'active' ? prospect.status === 'dismissed' : status !== 'all' && prospect.status !== status) return false;
    const text = `${prospect.name} ${prospect.domain} ${prospect.location ?? ''} ${prospect.description ?? ''}`.toLowerCase();
    return !query.trim() || text.includes(query.trim().toLowerCase());
  }), [prospects, query, tier, status, showPossible]);
  const possibleCount = prospects.filter((prospect) => prospect.fit_tier === 'C' && prospect.status !== 'dismissed').length;

  const exportCsv = () => {
    const csv = prospectsToCsv(visible.map((prospect) => ({
      name: prospect.name, domain: prospect.domain, fitTier: prospect.fit_tier, fitScore: prospect.fit_score, location: prospect.location,
      sizeBand: prospect.size_band, status: STATUS_TEXT[prospect.status], whyItFits: topReason(prospect),
      contactRoutes: [
        ...(prospect.contact ? [`${prospect.contact.full_name} <${prospect.contact.email}>`] : []),
        ...(prospect.contact_details?.emails ?? []).map((item) => item.value),
        ...(prospect.contact_details?.phones ?? []).map((item) => item.value),
        ...prospect.contact_routes.filter((route) => route.kind !== 'generic_email').map((route) => route.value),
      ].join(' | '),
      draftSubject: (prospect.draft?.chosen_variant === 'b' ? prospect.draft.variant_b_subject : prospect.draft?.subject) ?? '',
      draftBody: (prospect.draft?.chosen_variant === 'b' ? prospect.draft.variant_b_body : prospect.draft?.body) ?? '',
    })));
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'customer-research.csv'; link.click();
    URL.revokeObjectURL(url);
    captureEvent('gtm_prospects_exported', { count: visible.length });
  };

  return (
    <section aria-label="Companies found" className="rounded-2xl border border-border/60 bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-4">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search companies" aria-label="Search companies" className="pl-9" />
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
        <Select value={tier} onValueChange={(value) => setTier(value as typeof tier)}>
          <SelectTrigger className="min-w-0 flex-1 sm:w-36 sm:flex-none" aria-label="Filter by fit"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All fits</SelectItem>
            <SelectItem value="A">{TIER_TEXT.A}</SelectItem>
            <SelectItem value="B">{TIER_TEXT.B}</SelectItem>
            <SelectItem value="C">{TIER_TEXT.C}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
          <SelectTrigger className="min-w-0 flex-1 sm:w-36 sm:flex-none" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
            <SelectItem value="in_pipeline">In pipeline</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={exportCsv} disabled={!visible.length}><Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Export CSV</Button>
        </div>
      </div>

      {visible.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border/60">
                <th scope="col" className="px-4 py-3 font-medium">Company</th>
                <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">Why it fits</th>
                <th scope="col" className="px-4 py-3 font-medium">Fit</th>
                <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">Contact</th>
                <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">Location</th>
                <th scope="col" className="hidden px-4 py-3 font-medium xl:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((prospect) => (
                <tr key={prospect.id} className="cursor-pointer border-b border-border/40 last:border-0 hover:bg-muted/40" onClick={() => onOpen(prospect)}>
                  <td className="px-4 py-3">
                    <button type="button" className="text-left" onClick={(event) => { event.stopPropagation(); onOpen(prospect); }}>
                      <span className="block font-medium text-foreground">{prospect.name}</span>
                      <span className="block text-xs text-muted-foreground">{prospect.domain}</span>
                      {prospect.contact ? <span className="block text-xs text-foreground">{prospect.contact.full_name}{prospect.contact.role ? ` · ${prospect.contact.role}` : ''}</span> : null}
                    </button>
                    <div className="mt-1 sm:hidden"><ContactCell prospect={prospect} /></div>
                  </td>
                  <td className="hidden max-w-xs px-4 py-3 text-muted-foreground md:table-cell">{topReason(prospect)}</td>
                  <td className="px-4 py-3"><FitBadge tier={prospect.fit_tier} /></td>
                  <td className="hidden max-w-[16rem] px-4 py-3 sm:table-cell"><ContactCell prospect={prospect} /></td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{prospect.location ?? '—'}</td>
                  <td className={cn('hidden px-4 py-3 xl:table-cell', prospect.status === 'new' ? 'text-muted-foreground' : 'text-foreground')}>{STATUS_TEXT[prospect.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="p-6 text-center text-sm text-muted-foreground">No companies match these filters.</p>}

      {tier === 'all' && possibleCount ? (
        <div className="border-t border-border/60 p-3 text-center">
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowPossible((show) => !show)}>
            {showPossible ? 'Hide possible fits' : `Show ${possibleCount} possible fit${possibleCount === 1 ? '' : 's'} with less evidence`}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
