import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFollowedTopics, useFollowTopic } from '@/hooks/useLaunchpad';
import { cn } from '@/lib/utils';
import { useRequireAccount } from './requireAccount';

/** Follow or unfollow a room. `named` shows the room name instead of "Follow", for pickers. */
export function TopicFollowButton({ slug, label, size = 'sm', named = false }: {
  slug: string;
  label: string;
  size?: 'sm' | 'default';
  named?: boolean;
}) {
  const followed = useFollowedTopics();
  const follow = useFollowTopic();
  const requireAccount = useRequireAccount();
  const on = followed.data?.has(slug) ?? false;
  return <Button type="button" size={size} variant="outline" disabled={followed.isLoading}
    aria-pressed={on} aria-label={on ? `Unfollow ${label}` : `Follow ${label}`}
    onClick={() => { if (requireAccount('follow rooms')) follow.mutate({ topic: slug, on: !on }); }}
    className={cn('gap-1.5', on && 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary')}>
    {on ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
    {named ? label : on ? 'Following' : 'Follow'}
  </Button>;
}
