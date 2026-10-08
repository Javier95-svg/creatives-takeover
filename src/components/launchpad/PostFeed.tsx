import { useEffect, useState, type ReactNode } from 'react';
import { Clock, Flame, Layers, Search, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLaunchpadPosts, useMyStage, useSavePost, useUpvote } from '@/hooks/useLaunchpad';
import { founderStageLabel } from '@/lib/bizmapStageOrder';
import { POST_KINDS, type PostKind, type PostSort } from '@/lib/launchpad';
import { cn } from '@/lib/utils';
import { LaunchpadPostCard } from './LaunchpadPostCard';
import { ReportDialog, type ReportTarget } from './ReportDialog';
import { KIND_VISUALS } from './roomVisuals';

const SORTS = [
  { value: 'best', label: 'Best', icon: Flame },
  { value: 'new', label: 'New', icon: Clock },
  { value: 'top', label: 'Top', icon: TrendingUp },
] as const satisfies ReadonlyArray<{ value: PostSort; label: string; icon: unknown }>;

const PAGE = 20;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active}
    className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      active ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 bg-background text-muted-foreground hover:text-foreground')}>
    {children}
  </button>;
}

/**
 * Posts for one room, several rooms (Following) or the viewer's saved posts.
 * The page supplies the empty state because it knows what to suggest.
 */
export function PostFeed({ topic, topics, savedOnly = false, empty }: {
  topic?: string | null;
  topics?: readonly string[] | null;
  savedOnly?: boolean;
  empty: ReactNode;
}) {
  const { user } = useAuth();
  const myStage = useMyStage().data ?? null;
  const [sort, setSort] = useState<PostSort>('best');
  const [kind, setKind] = useState<PostKind | null>(null);
  const [atMyStage, setAtMyStage] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [report, setReport] = useState<ReportTarget>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(query); setLimit(PAGE); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const posts = useLaunchpadPosts({
    sort, topic: topic ?? null, topics: topics ?? null, kind, savedOnly, search,
    stage: atMyStage ? myStage : null, limit,
  });
  const upvote = useUpvote();
  const save = useSavePost();
  const rows = posts.data ?? [];
  const filtered = Boolean(kind || atMyStage || search.trim());
  const myStageLabel = founderStageLabel(myStage);
  const clear = () => { setKind(null); setAtMyStage(false); setQuery(''); setSearch(''); };

  return <section aria-label="Posts">
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search posts" aria-label="Search posts" className="h-9 pl-9 pr-8" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
        </div>
        <div role="tablist" aria-label="Sort posts" className="flex rounded-lg border border-border/70 bg-muted/40 p-0.5">
          {SORTS.map(({ value, label, icon: Icon }) => <button key={value} role="tab" type="button" aria-selected={sort === value}
            onClick={() => { setSort(value); setLimit(PAGE); }}
            className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', sort === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}
          </button>)}
        </div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {POST_KINDS.map((option) => {
          const Icon = KIND_VISUALS[option.value].icon;
          return <Chip key={option.value} active={kind === option.value} onClick={() => { setKind(kind === option.value ? null : option.value); setLimit(PAGE); }}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />{option.label}
          </Chip>;
        })}
        {myStageLabel && <Chip active={atMyStage} onClick={() => setAtMyStage(!atMyStage)}><Layers className="h-3.5 w-3.5" aria-hidden="true" />{myStageLabel} stage</Chip>}
      </div>
    </div>

    {posts.isError && <p role="alert" className="text-sm text-destructive">
      Could not load posts. <button className="underline" onClick={() => void posts.refetch()}>Retry</button>
    </p>}

    {posts.isPending && <div role="status" className="space-y-3"><span className="sr-only">Loading posts…</span>
      {[0, 1, 2].map((index) => <div key={index} className="h-40 animate-pulse rounded-xl bg-muted/60" />)}
    </div>}

    {posts.isSuccess && rows.length === 0 && (filtered
      ? <div className="rounded-xl border border-dashed border-border/80 py-10 text-center text-sm text-muted-foreground">
          No posts match{search.trim() ? ` "${search.trim()}"` : ' these filters'}. <button className="text-primary underline-offset-4 hover:underline" onClick={clear}>Clear filters</button>
        </div>
      : empty)}

    <div className={cn('space-y-3 transition-opacity', posts.isFetching && !posts.isPending && 'opacity-70')}>
      {rows.map((post) => <LaunchpadPostCard key={post.id} post={post} isOwn={post.user_id === user?.id}
        onUpvote={() => upvote.mutate({ postId: post.id, on: !post.voted })}
        onSave={() => save.mutate({ postId: post.id, on: !post.saved })}
        onReport={() => setReport({ postId: post.id })} />)}
    </div>

    {rows.length >= limit && <div className="mt-6 flex justify-center">
      <Button variant="outline" onClick={() => setLimit(limit + PAGE)} disabled={posts.isFetching}>{posts.isFetching ? 'Loading…' : 'Show more'}</Button>
    </div>}

    <ReportDialog target={report} onClose={() => setReport(null)} />
  </section>;
}
