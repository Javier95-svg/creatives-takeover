import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessagesSquare, Rocket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { subscribeJoinPrompt } from './requireAccount';

/**
 * Community is public to read. Anything that writes (post, reply, vote, save,
 * follow, enter a launch) asks a visitor to join first, naming what they
 * tried, and brings them back to the same page afterwards. Triggered through
 * useRequireAccount.
 */
export function JoinGateProvider({ theme, children }: { theme: 'rooms' | 'launches'; children: ReactNode }) {
  const location = useLocation();
  const [intent, setIntent] = useState<string | null>(null);

  useEffect(() => subscribeJoinPrompt(setIntent), []);

  const back = encodeURIComponent(`${location.pathname}${location.search}`);

  return <>
    {children}
    <Dialog open={Boolean(intent)} onOpenChange={(open) => { if (!open) setIntent(null); }}>
      <DialogContent className={`tool-theme-${theme} max-w-md`}>
        <DialogHeader>
          <DialogTitle>Join Creatives Takeover to {intent}</DialogTitle>
          <DialogDescription>A free account lets you post in Rooms, reply, upvote and enter your own launch in the weekly round.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2"><MessagesSquare className="h-4 w-4 text-primary" aria-hidden="true" />Get feedback from founders at your stage</li>
          <li className="flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" aria-hidden="true" />Launch your product to the community each week</li>
          <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />Use the CT tools behind every room</li>
        </ul>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1"><Link to={`/signup?source=community&return=${back}`}>Sign up free</Link></Button>
          <Button asChild variant="outline" className="flex-1"><Link to={`/login?source=community&return=${back}`}>Log in</Link></Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
