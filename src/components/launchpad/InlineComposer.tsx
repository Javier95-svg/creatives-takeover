import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMyProfileSummary } from '@/hooks/useLaunchpad';
import { POST_KINDS, type PostKind } from '@/lib/launchpad';
import { launchpadTopic } from '@/lib/launchpadTopics';
import { KIND_VISUALS } from './roomVisuals';

/**
 * The prompt at the top of a room. It opens the full composer, already set to
 * the room and, from the quick buttons, to the kind of post.
 */
export function InlineComposer({ room, onCompose }: { room?: string | null; onCompose: (kind?: PostKind) => void }) {
  const me = useMyProfileSummary().data;
  const name = me?.full_name || me?.username || 'You';
  const topic = launchpadTopic(room);
  return <div className="mb-5 rounded-xl border border-border/70 bg-card p-3 sm:p-4">
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        {me?.avatar_url && <AvatarImage src={me.avatar_url} alt="" />}
        <AvatarFallback className="text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <button type="button" onClick={() => onCompose()}
        className="h-10 min-w-0 flex-1 truncate rounded-full border border-border/70 bg-muted/40 px-4 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {topic ? `Start a conversation in ${topic.label}…` : 'Share progress or ask the room…'}
      </button>
    </div>
    <div className="mt-3 flex gap-1.5 overflow-x-auto sm:pl-12">
      {POST_KINDS.filter((kind) => kind.value !== 'discussion').map((kind) => {
        const Icon = KIND_VISUALS[kind.value].icon;
        return <button key={kind.value} type="button" onClick={() => onCompose(kind.value)}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />{kind.label}
        </button>;
      })}
    </div>
  </div>;
}
