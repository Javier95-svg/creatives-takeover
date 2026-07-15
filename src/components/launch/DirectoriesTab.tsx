import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LAUNCH_DIRECTORIES,
  CATEGORY_LABELS,
  type LaunchDirectory,
  type DirectoryCategory,
  type CostType,
} from '@/data/launchDirectories';
import { useDirectoryViewTracking } from '@/hooks/useDirectoryViewTracking';
import { PLAN_LABELS } from '@/config/planPermissions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { captureEvent } from '@/lib/analytics';
import type { GTMPlay } from '@/lib/gtmV2';

type DirectoryProgress = 'recommended' | 'visited' | 'submitted' | 'live' | 'skipped';

const COST_FILTERS: { label: string; value: CostType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Free', value: 'free' },
  { label: 'Freemium', value: 'freemium' },
  { label: 'Paid', value: 'paid' },
];

const CATEGORY_FILTER_OPTIONS: { label: string; value: DirectoryCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Aggregators', value: 'aggregator' },
  { label: 'Communities', value: 'community' },
  { label: 'Review Sites', value: 'review' },
  { label: 'Social', value: 'social' },
  { label: 'Newsletters', value: 'newsletter' },
  { label: 'VC / Investor', value: 'vc-platform' },
];

const COST_BADGE_STYLES: Record<CostType, string> = {
  free: 'bg-success/10 text-success border-success/30',
  freemium: 'bg-info/10 text-info border-info/30',
  paid: 'bg-warning/10 text-warning border-warning/30',
};

const CATEGORY_BADGE_STYLES: Record<DirectoryCategory, string> = {
  aggregator: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30',
  community: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  newsletter: 'bg-warning/10 text-warning border-warning/30',
  review: 'bg-info/10 text-info border-info/30',
  social: 'bg-pink-500/10 text-pink-700 border-pink-500/30',
  'vc-platform': 'bg-success/10 text-success border-success/30',
};

export default function DirectoriesTab() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId');
  const playId = searchParams.get('playId');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<DirectoryCategory | 'all'>('all');
  const [activeCost, setActiveCost] = useState<CostType | 'all'>('all');
  const [play, setPlay] = useState<GTMPlay | null>(null);
  const [progress, setProgress] = useState<Record<string, DirectoryProgress>>({});
  const [showAll, setShowAll] = useState(false);
  const {
    trackDirectoryView,
    isAuthenticated,
    hasUnlimited,
    limit,
    viewCount,
    remaining,
    upgradeTarget,
  } = useDirectoryViewTracking();

  useEffect(() => {
    if (!user || !planId || !playId) return;
    let active = true;
    const loadContext = async () => {
      const [{ data: playRow, error: playError }, { data: actionRows }] = await Promise.all([
        (supabase as any).from('gtm_plays').select('play_content').eq('id', playId).eq('plan_id', planId).eq('user_id', user.id).maybeSingle(),
        (supabase as any).from('gtm_directory_actions').select('directory_id,status').eq('plan_id', planId).eq('play_id', playId).eq('user_id', user.id),
      ]);
      if (!active) return;
      if (playError || !playRow) {
        toast.error('This GTM play is unavailable or does not belong to your account.');
        return;
      }
      const loaded = playRow.play_content as GTMPlay;
      setPlay(loaded);
      const next = Object.fromEntries((actionRows ?? []).map((row: { directory_id: string; status: DirectoryProgress }) => [row.directory_id, row.status]));
      loaded.recommendedDirectoryIds.forEach((id) => { if (!next[id]) next[id] = 'recommended'; });
      setProgress(next);
    };
    void loadContext();
    return () => { active = false; };
  }, [planId, playId, user]);

  const recommendedIds = useMemo(() => {
    if (!play) return new Set<string>();
    const explicit = play.recommendedDirectoryIds.filter((id) => LAUNCH_DIRECTORIES.some((directory) => directory.id === id));
    const matching = LAUNCH_DIRECTORIES
      .filter((directory) => directory.channelKeys.includes(play.channelId))
      .map((directory) => directory.id);
    return new Set([...explicit, ...matching].slice(0, 5));
  }, [play]);

  const updateProgress = async (directoryId: string, status: DirectoryProgress) => {
    if (!user || !planId || !playId) return;
    const previous = progress[directoryId];
    setProgress((current) => ({ ...current, [directoryId]: status }));
    const { error } = await (supabase as any).from('gtm_directory_actions').upsert({
      user_id: user.id,
      plan_id: planId,
      play_id: playId,
      directory_id: directoryId,
      status,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'play_id,directory_id' });
    if (error) {
      setProgress((current) => ({ ...current, [directoryId]: previous ?? 'recommended' }));
      toast.error('Could not update directory progress.');
      return;
    }
    captureEvent('gtm_directory_progress_updated', { plan_id: planId, play_id: playId, directory_id: directoryId, status });
  };

  // Meter directory opens against the monthly quota. Anonymous preview visitors
  // open links directly. A blank tab is opened synchronously so the quota check
  // (async) doesn't trip the browser's popup blocker.
  const handleVisit = async (directory: LaunchDirectory) => {
    if (isAuthenticated === false) {
      window.open(directory.url, '_blank', 'noopener,noreferrer');
      return;
    }

    const placeholder = window.open('about:blank', '_blank');
    const result = await trackDirectoryView(directory.id, { planId, playId });
    if (result.success) {
      if (play && (!progress[directory.id] || progress[directory.id] === 'recommended')) {
        void updateProgress(directory.id, 'visited');
      }
      if (placeholder) {
        placeholder.opener = null;
        placeholder.location.href = directory.url;
      } else {
        window.open(directory.url, '_blank', 'noopener,noreferrer');
      }
    } else {
      placeholder?.close();
      if (result.message) toast.error(result.message);
    }
  };

  const quotaExhausted = isAuthenticated === true && !hasUnlimited && remaining <= 0;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const candidates = play && !showAll ? LAUNCH_DIRECTORIES.filter((directory) => recommendedIds.has(directory.id)) : LAUNCH_DIRECTORIES;
    return candidates.filter((dir) => {
      if (activeCategory !== 'all' && dir.category !== activeCategory) return false;
      if (activeCost !== 'all' && dir.costType !== activeCost) return false;
      if (q && !dir.name.toLowerCase().includes(q) && !dir.description.toLowerCase().includes(q) && !dir.bestFor.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, activeCategory, activeCost, play, recommendedIds, showAll]);

  return (
    <div className="space-y-6">
      {play && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" />Recommended for {play.channelName}</p><p className="mt-1 text-sm text-muted-foreground">These launch surfaces match the selected play. Progress is saved back to your GTM workspace.</p></div>
            <Button variant="outline" size="sm" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Show recommendations' : 'Browse all directories'}</Button>
          </div>
        </div>
      )}
      {/* Monthly visit quota (authenticated users) */}
      {isAuthenticated && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs">
          <span className="text-muted-foreground">
            {hasUnlimited
              ? 'Unlimited directory visits on your plan.'
              : `Directory visits this month: ${viewCount} of ${limit} used · ${Math.max(0, remaining)} left`}
          </span>
          {quotaExhausted && upgradeTarget && (
            <span className="font-medium text-primary">
              Upgrade to {PLAN_LABELS[upgradeTarget]} for more visits.
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search platforms, categories, use cases…"
            className="pl-9"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveCategory(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeCategory === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Cost filter */}
        <div className="flex gap-1.5">
          {COST_FILTERS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveCost(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeCost === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground self-center">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No platforms match your filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((dir) => (
            <div
              key={dir.id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{dir.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{dir.cost}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleVisit(dir)}
                  className="flex-shrink-0 h-7 px-2 text-xs gap-1"
                >
                  Visit <ExternalLink className="w-3 h-3" />
                </Button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant="outline"
                  className={`text-xs py-0 px-2 ${COST_BADGE_STYLES[dir.costType]}`}
                >
                  {dir.costType === 'free' ? 'Free' : dir.costType === 'freemium' ? 'Freemium' : 'Paid'}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs py-0 px-2 ${CATEGORY_BADGE_STYLES[dir.category]}`}
                >
                  {CATEGORY_LABELS[dir.category]}
                </Badge>
                {recommendedIds.has(dir.id) && <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Recommended</Badge>}
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {dir.description}
              </p>

              {/* Recommendation */}
              <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                <p className="text-xs font-medium text-primary mb-0.5">Tip</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{dir.recommendation}</p>
              </div>

              {/* Best for */}
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Best for:</span> {dir.bestFor}
              </p>
              {play && (
                <label className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs font-medium">
                  Progress
                  <select className="rounded-md border border-border bg-background px-2 py-1 text-xs" value={progress[dir.id] ?? 'recommended'} onChange={(event) => void updateProgress(dir.id, event.target.value as DirectoryProgress)}>
                    <option value="recommended">Recommended</option><option value="visited">Visited</option><option value="submitted">Submitted</option><option value="live">Live</option><option value="skipped">Skipped</option>
                  </select>
                </label>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
