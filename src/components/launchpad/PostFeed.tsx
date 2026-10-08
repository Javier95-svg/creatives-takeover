import { useState, type ReactNode } from 'react';
import { Bookmark, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLaunchpadPosts, useMyStage, useSavePost, useUpvote } from '@/hooks/useLaunchpad';
import { founderStageLabel } from '@/lib/bizmapStageOrder';
import { POST_KINDS, type PostKind, type PostSort } from '@/lib/launchpad';
import { cn } from '@/lib/utils';
import { LaunchpadPostCard } from './LaunchpadPostCard';
import { ReportDialog, type ReportTarget } from './ReportDialog';

const SORTS: ReadonlyArray<{ value: PostSort; label: string }> = [
  { value: 'best', label: 'Best' },
  { value: 'new', label: 'New' },
  { value: 'top', label: 'Top' },
];

const PAGE = 20;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active}
    className={cn('flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      active ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground hover:text-foreground')}>
    {children}
  </button>;
}

/**
 * The post list with its sort and filters. A topic page passes its topic, and
 * the empty state is supplied by the page because it knows what to suggest.
 */
export function PostFeed({ topic, empty }: { topic?: string | null; empty: ReactNode }) {
  const { user } = useAuth();
  const myStage = useMyStage().data ?? null;
  const [sort, setSort] = useState<PostSort>('best');
  const [kind, setKind] = useState<PostKind | null>(null);
  const [atMyStage, setAtMyStage] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [report, setReport] = useState<ReportTarget>(null);
  const filters = { sort, topic: topic ?? null, kind, stage: atMyStage ? myStage ?? null : null, savedOnly, limit };
  const posts = useLaunchpadPosts(filters);
  const upvote = useUpvote();
  const save = useSavePost();
  const rows = posts.data ?? [];
  const filtered = Boolean(kind || atMyStage || savedOnly);
  const myStageLabel = founderStageLabel(myStage);

  return <section aria-label="Posts">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div role="tablist" aria-label="Sort posts" className="flex rounded-lg border border-border/70 p-0.5">
        {SORTS.map((option) => <button key={option.value} role="tab" type="button" aria-selected={sort === option.value}
          onClick={() => { setSort(option.value); setLimit(PAGE); }}
          className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', sort === option.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
          {option.label}
        </button>)}
      </div>
      <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
        {POST_KINDS.map((option) => <Chip key={option.value} active={kind === option.value} onClick={() => setKind(kind === option.value ? null : option.value)}>{option.label}</Chip>)}
        {myStageLabel && <Chip active={atMyStage} onClick={() => setAtMyStage(!atMyStage)}><Layers className="h-3.5 w-3.5" aria-hidden="true" />{myStageLabel} stage</Chip>}
        <Chip active={savedOnly} onClick={() => setSavedOnly(!savedOnly)}><Bookmark className="h-3.5 w-3.5" aria-hidden="true" />Saved</Chip>
      </div>
    </div>

    {posts.isError && <p role="alert" className="text-sm text-destructive">
      Could not load posts. <button className="underline" onClick={() => void posts.refetch()}>Retry</button>
    </p>}

    {posts.isPending && <div role="status" className="space-y-3"><span className="sr-only">Loading posts…</span>
      {[0, 1, 2].map((index) => <div key={index} className="h-36 animate-pulse rounded-xl bg-muted/60" />)}
    </div>}

    {posts.isSuccess && rows.length === 0 && (filtered
      ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No posts match these filters. <button className="text-primary underline-offset-4 hover:underline" onClick={() => { setKind(null); setAtMyStage(false); setSavedOnly(false); }}>Clear filters</button>
        </CardContent></Card>
      : empty)}

    <div className="space-y-3">
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
