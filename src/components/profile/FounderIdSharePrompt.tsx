import { useEffect, useRef } from 'react';
import { Copy, IdCard, Linkedin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { captureEvent } from '@/lib/analytics';
import { founderIdDisplay } from '@/lib/founderId';
import { useProfileShareActions, XIcon } from './ProfileShareButton';

interface Props {
  username: string;
  name: string;
  startupName: string | null;
  /** Which moment asked: 'stage_completed', 'update_posted' or 'launch_published'. */
  placement: string;
  title: string;
  body: string;
  onDismiss: () => void;
}

/**
 * Asks a founder to share their Founder ID at a moment worth sharing (a stage
 * finished, an update posted), instead of a standing button they learn to
 * ignore. Any share or the close button dismisses it.
 */
export function FounderIdSharePrompt({ username, name, startupName, placement, title, body, onDismiss }: Props) {
  const share = useProfileShareActions({ username, name, startupName, isOwnProfile: true, founderId: true, placement });
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    captureEvent('founder_id_share_prompt_shown', { placement });
  }, [placement]);

  const after = (action: () => void | Promise<void>) => async () => {
    await action();
    onDismiss();
  };

  return (
    <Card className="relative mb-6 overflow-hidden border-primary/25 bg-primary/[0.04] p-5">
      <button
        type="button"
        onClick={() => {
          captureEvent('founder_id_share_prompt_dismissed', { placement });
          onDismiss();
        }}
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex flex-col gap-4 pr-6 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <IdCard className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{founderIdDisplay(username)}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={after(share.copyLink)}>
          <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
          Copy link
        </Button>
        <Button size="sm" variant="outline" onClick={after(() => share.openIntent('linkedin'))}>
          <Linkedin className="mr-2 h-4 w-4" aria-hidden="true" />
          LinkedIn
        </Button>
        <Button size="sm" variant="outline" onClick={after(() => share.openIntent('x'))}>
          <span className="mr-2"><XIcon /></span>
          X
        </Button>
      </div>
    </Card>
  );
}
