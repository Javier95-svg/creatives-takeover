import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { hasApplicationConfig } from '@/lib/hasApplicationConfig';
import { enterWorkspaceRoute } from '@/lib/workspaceNavigation';
import { accountRoute } from '@/lib/accountSearchRoute';
import { accountTag } from '@/lib/accountSearchTag';

export type SearchAccount = { id: string; username: string | null; full_name: string | null; avatar_url: string | null; headline?: string | null; isMentor?: boolean; mentorName?: string | null; isMarketplace?: boolean; serviceSlug?: string | null; founderSegment?: 'founder' | 'builder' | null; isConnection?: boolean };
const LiveAccountSearch = lazy(() => import('./WorkspaceAccountSearchLive'));

export default function WorkspaceAccountSearch() {
  return hasApplicationConfig
    ? <Suspense fallback={<div className="min-w-0 flex-1 text-xs text-muted-foreground">Loading account search…</div>}><LiveAccountSearch /></Suspense>
    : <AccountSearchField />;
}

export function AccountSearchField({ search, renderActions }: {
  search?: (query: string, signal?: AbortSignal) => Promise<SearchAccount[]>;
  renderActions?: (account: SearchAccount) => ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ query: string; accounts: SearchAccount[]; error?: string } | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const term = query.trim().replace(/^@/, '');
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);
  useEffect(() => {
    if (!search || term.length < 2) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const accounts = await search(term, controller.signal);
        if (!cancelled) setResult({ query: term, accounts });
      } catch {
        if (!cancelled) setResult({ query: term, accounts: [], error: 'Account search is unavailable. Please try again.' });
      }
    }, 220);
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timer); };
  }, [term, search]);
  const searching = Boolean(search && term.length >= 2 && result?.query !== term);
  return <div ref={container} className="relative min-w-0 flex-1" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); input.current?.focus(); } }}>
    <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input ref={input} type="search" aria-label="Search accounts by first name, last name or username" placeholder="Search…" maxLength={80}
        value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
        className="h-10 rounded-full bg-background/60 pl-9 pr-9" />
      {query && <button type="button" aria-label="Clear account search" onClick={() => { setQuery(''); input.current?.focus(); }} className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>}
    </div>
    {open && <div aria-label="Account search results" className="absolute left-0 top-full z-50 mt-2 max-h-[min(24rem,60dvh)] w-full max-w-full overflow-y-auto rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl">
      <p className="mb-2 text-xs text-muted-foreground">Search by first name, last name, or @username</p>
      <div role="status" className="text-sm text-muted-foreground">
        {!search ? 'Live account search requires local application configuration.' : term.length < 2 ? 'Type at least 2 characters to find accounts.' : searching ? 'Searching accounts…' : result?.error || (result?.accounts.length === 0 ? 'No matching accounts found.' : '')}
      </div>
      {!searching && result?.query === term && term.length >= 2 && result.accounts.map(account => <div key={account.id} className="space-y-2 border-b border-border/60 py-3 last:border-0">
        {(() => { const route = accountRoute(account); return <a href={route} aria-disabled={!route} onClick={(event) => {
          if (route && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); enterWorkspaceRoute(route); }
        }} className="flex items-center gap-3 rounded-lg p-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-9 w-9"><AvatarImage src={account.avatar_url ?? undefined} /><AvatarFallback>{(account.full_name || account.username || 'Founder').charAt(0)}</AvatarFallback></Avatar>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{account.full_name || account.username || 'Founder'}</span><span className="block truncate text-xs text-muted-foreground">{account.isConnection ? 'Connection · ' : ''}{account.headline || account.username || 'Founder'}</span></span>
          {(() => {
            // One tag per account. Mentors and marketplace providers are not
            // regular users of the platform, so they are never also labelled
            // Founder or Builder. Mentor wins over Marketplace for anyone who
            // is both, since the mentorship profile is where they are booked.
            const tag = accountTag(account);
            return tag ? <Badge variant={tag.variant}>{tag.label}</Badge> : null;
          })()}
        </a>; })()}
        {renderActions?.(account)}
      </div>)}
    </div>}
  </div>;
}
