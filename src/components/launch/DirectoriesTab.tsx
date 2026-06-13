import { useState, useMemo } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LAUNCH_DIRECTORIES,
  CATEGORY_LABELS,
  type DirectoryCategory,
  type CostType,
} from '@/data/launchDirectories';

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
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<DirectoryCategory | 'all'>('all');
  const [activeCost, setActiveCost] = useState<CostType | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return LAUNCH_DIRECTORIES.filter((dir) => {
      if (activeCategory !== 'all' && dir.category !== activeCategory) return false;
      if (activeCost !== 'all' && dir.costType !== activeCost) return false;
      if (q && !dir.name.toLowerCase().includes(q) && !dir.description.toLowerCase().includes(q) && !dir.bestFor.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, activeCategory, activeCost]);

  return (
    <div className="space-y-6">
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
              key={dir.name}
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
                  asChild
                  className="flex-shrink-0 h-7 px-2 text-xs gap-1"
                >
                  <a href={dir.url} target="_blank" rel="noopener noreferrer">
                    Visit <ExternalLink className="w-3 h-3" />
                  </a>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
