import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Clock, Flame, Layers, Search, TrendingUp, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLaunchpadPosts, useMyStage, useSavePost, useUpvote } from '@/hooks/useLaunchpad';
import { founderStageLabel } from '@/lib/bizmapStageOrder';
import { POST_KINDS, type PostKind, type PostSort } from '@/lib/launchpad';
import { cn } from '@/lib/utils';
import { FeedPages, POSTS_PER_PAGE, scrollToFeed } from './FeedPages';
import { LaunchpadPostCard } from './LaunchpadPostCard';
import { useRequireAccount } from './requireAccount';
import { ReportDialog, type ReportTarget } from './ReportDialog';
import { KIND_VISUALS } from './roomVisuals';

const SORTS = [
  { value: 'best', label: 'Best', icon: Flame },
  { value: 'new', label: 'New', icon: Clock },
  { value: 'top', label: 'Top', icon: TrendingUp },
] as const satisfies ReadonlyArray<{ value: PostSort; label: string; icon: unknown }>;

// Posts are fetched in batches and shown POSTS_PER_PAGE at a time.
const BATCH = 100;

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
  const [limit, setLimit] = useState(BATCH);
  const [page, setPage] = useState(1);
  const top = useRef<HTMLElement>(null);
  const [report, setReport] = useState<ReportTarget>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(query); setLimit(BATCH); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const posts = useLaunchpadPosts({
    sort, topic: topic ?? null, topics: topics ?? null, kind, savedOnly, search,
    stage: atMyStage ? myStage : null, limit,
  });
  const upvote = useUpvote();
  const save = useSavePost();
  const requireAccount = useRequireAccount();
  const rows = posts.data ?? [];
  const filtered = Boolean(kind || atMyStage || search.trim());
  const myStageLabel = founderStageLabel(myStage);
  const clear = () => { setKind(null); setAtMyStage(false); setQuery(''); setSearch(''); setPage(1); };
  const pages = Math.max(1, Math.ceil(rows.length / POSTS_PER_PAGE));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * POSTS_PER_PAGE, current * POSTS_PER_PAGE);
  // A full batch means older posts may exist past the last page; Next loads them.
  const hasMore = rows.length >= limit;
  const goTo = (next: number) => {
    if (next > pages && hasMore) setLimit(limit + BATCH);
    setPage(next);
    scrollToFeed(top.current);
  };

  return <section ref={top} aria-label="Posts" className="scroll-mt-24">
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search posts" aria-label="Search posts" className="h-9 pl-9 pr-8" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
        </div>
        <div role="tablist" aria-label="Sort posts" className="flex rounded-lg border border-border/70 bg-muted/40 p-0.5">
          {SORTS.map(({ value, label, icon: Icon }) => <button key={value} role="tab" type="button" aria-selected={sort === value}
            onClick={() => { setSort(value); setLimit(BATCH); setPage(1); }}
            className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', sort === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}
          </button>)}
        </div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {POST_KINDS.map((option) => {
          const Icon = KIND_VISUALS[option.value].icon;
          return <Chip key={option.value} active={kind === option.value} onClick={() => { setKind(kind === option.value ? null : option.value); setLimit(BATCH); setPage(1); }}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />{option.label}
          </Chip>;
        })}
        {myStageLabel && <Chip active={atMyStage} onClick={() => { setAtMyStage(!atMyStage); setPage(1); }}><Layers className="h-3.5 w-3.5" aria-hidden="true" />{myStageLabel} stage</Chip>}
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
      {shown.map((post) => <LaunchpadPostCard key={post.id} post={post} isOwn={post.user_id === user?.id}
        onUpvote={() => { if (requireAccount('upvote posts')) upvote.mutate({ postId: post.id, on: !post.voted }); }}
        onSave={() => { if (requireAccount('save posts')) save.mutate({ postId: post.id, on: !post.saved }); }}
        onReport={() => { if (requireAccount('report a post')) setReport({ postId: post.id }); }} />)}
    </div>

    <FeedPages page={current} total={pages} onChange={goTo} hasMore={hasMore} />

    <ReportDialog target={report} onClose={() => setReport(null)} />
  </section>;
}
