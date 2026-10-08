import { PenSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useMyProfileSummary } from '@/hooks/useLaunchpad';
import { POST_KINDS, type PostKind } from '@/lib/launchpad';
import { launchpadTopic } from '@/lib/launchpadTopics';
import { cn } from '@/lib/utils';
import { KIND_VISUALS } from './roomVisuals';

/**
 * The prompt at the top of a room, built to be noticed: a tinted, ringed card
 * with a heading, a large input-style button, a Post button and colour-coded
 * shortcuts that open the composer already set to the kind of post.
 */
export function InlineComposer({ room, onCompose }: { room?: string | null; onCompose: (kind?: PostKind) => void }) {
  const me = useMyProfileSummary().data;
  const name = me?.full_name || me?.username || 'You';
  const firstName = name.split(' ')[0];
  const topic = launchpadTopic(room);
  return <section aria-label="Start a post" className="relative mb-5 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-4 shadow-sm ring-1 ring-primary/10 sm:p-5">
    <p className="mb-3 font-space-grotesk text-base font-semibold">
      {topic ? `What's happening in ${topic.label}, ${firstName}?` : `What are you working on, ${firstName}?`}
    </p>
    <div className="flex items-center gap-3">
      <Avatar className="h-11 w-11 ring-2 ring-primary/30">
        {me?.avatar_url && <AvatarImage src={me.avatar_url} alt="" />}
        <AvatarFallback className="text-sm">{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <button type="button" onClick={() => onCompose()}
        className="h-12 min-w-0 flex-1 truncate rounded-xl border border-border bg-background px-4 text-left text-base text-muted-foreground shadow-inner transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {topic ? `Start a conversation in ${topic.label}…` : 'Share progress or ask the room…'}
      </button>
      <Button type="button" onClick={() => onCompose()} className="hidden h-12 gap-2 rounded-xl px-5 sm:inline-flex">
        <PenSquare className="h-4 w-4" aria-hidden="true" />Post
      </Button>
    </div>
    <div className="mt-3 flex gap-2 overflow-x-auto sm:pl-14">
      {POST_KINDS.filter((kind) => kind.value !== 'discussion').map((kind) => {
        const { icon: Icon, badge } = KIND_VISUALS[kind.value];
        return <button key={kind.value} type="button" onClick={() => onCompose(kind.value)}
          className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', badge)}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />{kind.label}
        </button>;
      })}
    </div>
  </section>;
}
