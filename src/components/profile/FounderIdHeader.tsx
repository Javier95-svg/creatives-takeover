import { Link } from 'react-router-dom';
import { Copy, IdCard, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { captureEvent } from '@/lib/analytics';
import { founderIdDisplay, founderIdUrl } from '@/lib/founderId';

/**
 * The top of a Founder ID: the name of the thing and its short link, visible
 * and copyable by anyone, the way a Patreon page shows patreon.com/name.
 */
export function FounderIdHeader({ username, isOwnProfile }: { username: string; isOwnProfile: boolean }) {
  const copy = async () => {
    const url = founderIdUrl(username);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Founder ID link copied.');
      captureEvent('founder_id_link_copied', { is_owner: isOwnProfile });
    } catch {
      toast.error(`Copy this link: ${url}`);
    }
  };

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
        <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
        Founder ID
      </span>
      <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
        <div className="flex min-w-0 max-w-full items-center gap-2 rounded-2xl border border-border/70 bg-muted/30 py-1 pl-3 pr-1 sm:rounded-full">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {/* Wraps on a phone rather than cutting off the handle people need to read. */}
          <span className="min-w-0 break-all text-sm font-medium sm:truncate sm:break-normal" title={founderIdUrl(username)}>{founderIdDisplay(username)}</span>
          <Button type="button" size="sm" variant="ghost" className="h-7 shrink-0 rounded-full px-3" onClick={() => void copy()}>
            <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Copy
          </Button>
        </div>
        {isOwnProfile && (
          <Link to="/account" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Change link
          </Link>
        )}
      </div>
    </div>
  );
}
