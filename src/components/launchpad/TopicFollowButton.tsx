import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFollowedTopics, useFollowTopic } from '@/hooks/useLaunchpad';

export function TopicFollowButton({ slug, label, size = 'sm' }: { slug: string; label: string; size?: 'sm' | 'default' }) {
  const followed = useFollowedTopics();
  const follow = useFollowTopic();
  const on = followed.data?.has(slug) ?? false;
  return <Button type="button" size={size} variant={on ? 'secondary' : 'outline'} disabled={followed.isPending}
    aria-pressed={on} aria-label={on ? `Unfollow ${label}` : `Follow ${label}`}
    onClick={() => follow.mutate({ topic: slug, on: !on })} className="gap-1.5">
    {on ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
    {on ? 'Following' : 'Follow'}
  </Button>;
}
