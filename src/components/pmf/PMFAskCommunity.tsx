import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, Loader2, MessageSquareText, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { PostComposerDialog } from '@/components/launchpad/PostComposerDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/hooks/useMessaging';
import type { PMFValidationStage } from '@/hooks/useCustomerDiscovery';
import { captureEvent } from '@/lib/analytics';
import { authorName, findOwnPostBySource, listComments } from '@/lib/launchpad';
import { postPath } from '@/lib/launchpadTopics';
import { draftCommunityQuestion, PMF_DISCOVERY_ORIGIN } from '@/lib/pmfCommunityAsk';
import { upsertPlatformLead } from '@/lib/pmfDiscoveryLeads';

/**
 * "Ask founders in Rooms": the free way to find people to talk to. One click
 * opens the Rooms composer with a question drafted from who has the problem
 * and what it is; the founder edits it and stays on PMF Lab. Replies show up
 * here, and anyone who answers can be added to Your conversations.
 */
export function PMFAskCommunity({ validationContextId, stage, audience, problem, onLeadAdded, compact = false, onExpand }: {
  validationContextId: string | null;
  stage: PMFValidationStage;
  audience: string;
  problem: string;
  onLeadAdded?: () => void;
  /** One line under the folded search: only shown once a question is posted. */
  compact?: boolean;
  onExpand?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { startConversation } = useMessaging({ autoLoad: false });
  const [composing, setComposing] = useState(false);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<string | null>(null);
  const source = { origin: PMF_DISCOVERY_ORIGIN, validationContextId };
  const ready = Boolean(audience.trim() && problem.trim());
  const draft = draftCommunityQuestion({ stage, audience, problem });

  const post = useQuery({
    queryKey: ['pmf-discovery-ask', user?.id, validationContextId],
    enabled: Boolean(user?.id && validationContextId),
    queryFn: () => findOwnPostBySource(user!.id, source),
  });
  const replies = useQuery({
    queryKey: ['pmf-discovery-ask-replies', post.data?.id],
    enabled: Boolean(post.data?.id),
    queryFn: async () => (await listComments(post.data!.id)).filter((comment) => comment.user_id !== user?.id),
  });

  const addToList = async (comment: NonNullable<typeof replies.data>[number]) => {
    if (!user || !comment.author?.username) return;
    setPending(comment.id);
    try {
      await upsertPlatformLead(user.id, {
        platformUserId: comment.user_id,
        username: comment.author.username,
        displayName: comment.author.full_name,
        painQuote: comment.content.slice(0, 280),
      });
      setAdded((current) => ({ ...current, [comment.user_id]: true }));
      captureEvent('pmf_discovery_rooms_reply_added', {});
      toast.success('Added to Your conversations.');
      onLeadAdded?.();
    } catch (error) {
      console.warn('Could not add this person:', error);
      toast.error('Could not add this person. Please try again.');
    } finally {
      setPending(null);
    }
  };

  const message = async (userId: string) => {
    const conversationId = await startConversation(userId);
    if (conversationId) navigate(`/messages?conversationId=${conversationId}`);
  };

  const composer = <PostComposerDialog open={composing} onOpenChange={setComposing}
    initialTopic={draft.room} initialKind={draft.kind} initialTitle={draft.title} initialBody={draft.body}
    source={source}
    onPublished={() => {
      captureEvent('pmf_discovery_rooms_question_posted', { stage });
      toast.success('Your question is live in Rooms. Replies will show up here.');
      void queryClient.invalidateQueries({ queryKey: ['pmf-discovery-ask', user?.id, validationContextId] });
    }} />;

  if (compact) {
    if (!post.data) return null;
    const count = replies.data?.length ?? 0;
    return <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-sm">
      <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" aria-hidden="true" />
        Your question in Rooms
        <span className="text-muted-foreground">· {replies.isPending ? '…' : `${count} ${count === 1 ? 'reply' : 'replies'}`}</span>
      </span>
      <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={onExpand}>
        {count ? 'See replies' : 'View'}
      </button>
    </div>;
  }

  if (post.data) {
    const list = replies.data ?? [];
    return <div className="space-y-3 rounded-xl border border-border/60 bg-background/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" aria-hidden="true" />Your question in Rooms</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{post.data.title}</p>
        </div>
        <Link to={postPath(post.data.id)} className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline">
          Open in Rooms <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
      {replies.isPending && <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Loading replies" />}
      {!replies.isPending && list.length === 0 && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          No replies yet. Rooms is new, so it can take a few days. Replies show up here, and you can add anyone who answers to your list.
        </p>
      )}
      {list.length > 0 && <ul className="space-y-2">
        {list.map((comment) => {
          const inList = added[comment.user_id];
          return <li key={comment.id} className="rounded-lg border border-border/50 p-3">
            <p className="text-sm font-medium">{authorName(comment.author)}</p>
            <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">{comment.content}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant={inList ? 'ghost' : 'outline'} disabled={inList || pending === comment.id || !comment.author?.username}
                onClick={() => void addToList(comment)}>
                {inList ? <Check className="mr-1.5 h-4 w-4 text-success" aria-hidden="true" /> : <UserPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                {inList ? 'In your list' : 'Add to your list'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void message(comment.user_id)}>
                <MessageSquareText className="mr-1.5 h-4 w-4" aria-hidden="true" />Message
              </Button>
            </div>
          </li>;
        })}
      </ul>}
      <button type="button" className="text-xs text-muted-foreground hover:text-foreground hover:underline" onClick={() => setComposing(true)}>
        Ask another question
      </button>
      {composer}
    </div>;
  }

  return <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-border/60 bg-background/70 p-4">
    <div>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Users className="h-4 w-4 text-primary" aria-hidden="true" />Ask founders in Rooms
        <Badge variant="outline" className="border-success/40 text-caption text-success">Free</Badge>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Post your question in the {draft.roomLabel} room. We draft it for you; replies show up here.
      </p>
    </div>
    <div>
      <Button variant="outline" className="w-full" disabled={!ready || !validationContextId} onClick={() => setComposing(true)}>
        Write my question
      </Button>
    </div>
    {composer}
  </div>;
}

export default PMFAskCommunity;
