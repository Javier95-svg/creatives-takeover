import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Posts shown per page in a room feed. */
export const POSTS_PER_PAGE = 5;

/** The page numbers to show: always the first and last, and the current one with its neighbours. */
export function visiblePages(current: number, total: number): Array<number | 'gap'> {
  const pages: Array<number | 'gap'> = [];
  for (let page = 1; page <= total; page += 1) {
    if (page === 1 || page === total || Math.abs(page - current) <= 1) pages.push(page);
    else if (pages[pages.length - 1] !== 'gap') pages.push('gap');
  }
  return pages;
}

/** Numbered pages under a feed. Hidden when everything fits on one page. */
export function FeedPages({ page, total, onChange, hasMore = false }: {
  page: number;
  total: number;
  onChange: (page: number) => void;
  /** More posts exist past the last numbered page; Next stays enabled to load them. */
  hasMore?: boolean;
}) {
  if (total <= 1 && !hasMore) return null;
  const button = 'inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40';
  return <nav aria-label="Pages" className="mt-6 flex justify-center">
    <ul className="flex flex-wrap items-center justify-center gap-1">
      <li>
        <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page"
          className={cn(button, 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Previous</span>
        </button>
      </li>
      {visiblePages(page, total).map((item, index) => <li key={item === 'gap' ? `gap-${index}` : item}>
        {item === 'gap'
          ? <span aria-hidden="true" className="inline-flex h-9 w-6 items-center justify-center text-muted-foreground">…</span>
          : <button type="button" onClick={() => onChange(item)} aria-current={item === page ? 'page' : undefined} aria-label={`Page ${item}`}
              className={cn(button, item === page
                ? 'border border-primary bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
              {item}
            </button>}
      </li>)}
      <li>
        <button type="button" onClick={() => onChange(page + 1)} disabled={page >= total && !hasMore} aria-label="Next page"
          className={cn(button, 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
          <span className="hidden sm:inline">Next</span><ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </li>
    </ul>
  </nav>;
}

/**
 * Scrolls a feed's top into view after a page change, so the reader starts at
 * its first post. Only the nearest scrolling area moves: scrollIntoView would
 * also nudge the workspace shell, whose overflow is hidden, and push the
 * sidebar logo and top bar off screen until reload.
 */
export function scrollToFeed(element: HTMLElement | null) {
  if (!element) return;
  let area = element.parentElement;
  while (area && !/(auto|scroll)/.test(getComputedStyle(area).overflowY)) area = area.parentElement;
  const container = area ?? document.scrollingElement;
  if (!container) return;
  const containerTop = area ? area.getBoundingClientRect().top : 0;
  // Leave room for the sticky header on pages that scroll the window.
  const offset = element.getBoundingClientRect().top - containerTop - (area ? 16 : 96);
  if (offset < 0) container.scrollBy({ top: offset, behavior: 'smooth' });
}
