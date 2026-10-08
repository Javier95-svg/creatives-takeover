import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LaunchpadShell } from '@/components/launchpad/LaunchpadShell';
import { TopicFollowButton } from '@/components/launchpad/TopicFollowButton';
import { useFollowedTopics, useTopicStats } from '@/hooks/useLaunchpad';
import { LAUNCHPAD_TOPIC_GROUP_LABEL, LAUNCHPAD_TOPICS, type LaunchpadTopicGroup } from '@/lib/launchpadTopics';

const GROUP_INTRO: Record<LaunchpadTopicGroup, string> = {
  stage: 'Follow the stage you are in, and the next one.',
  craft: 'The skills every stage leans on.',
};

export default function LaunchpadTopics() {
  const stats = useTopicStats();
  const followed = useFollowedTopics();
  const followCount = followed.data?.size ?? 0;

  return <LaunchpadShell seoTitle="Topics | Launchpad" title="Topics"
    intro="Each topic follows a stage of the startup cycle or a founder skill, and links to the CT tool that does the work.">
    {followed.isSuccess && followCount === 0 && <p className="mb-6 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
      Follow two or three topics to shape what you see first in Posts.
    </p>}

    {(['stage', 'craft'] as const).map((group) => <section key={group} aria-labelledby={`topics-${group}`} className="mb-8">
      <div className="mb-3">
        <h2 id={`topics-${group}`} className="font-space-grotesk text-lg font-semibold">{LAUNCHPAD_TOPIC_GROUP_LABEL[group]}</h2>
        <p className="text-sm text-muted-foreground">{GROUP_INTRO[group]}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LAUNCHPAD_TOPICS.filter((topic) => topic.group === group).map((topic) => {
          const row = stats.data?.get(topic.slug);
          return <Card key={topic.slug} className="border-border/70 transition-shadow hover:shadow-md">
            <CardContent className="flex h-full flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/launchpad/topics/${topic.slug}`} className="flex items-center gap-1.5 font-space-grotesk font-semibold hover:underline">
                  <Hash className="h-4 w-4 text-primary" aria-hidden="true" />{topic.label}
                </Link>
                <TopicFollowButton slug={topic.slug} label={topic.label} />
              </div>
              <p className="flex-1 text-sm text-muted-foreground">{topic.description}</p>
              <p className="text-xs text-muted-foreground">
                {row ? <>
                  {row.post_count} {row.post_count === 1 ? 'post' : 'posts'} · {row.follower_count} following
                  {row.last_post_at && <> · active {formatDistanceToNow(new Date(row.last_post_at), { addSuffix: true })}</>}
                </> : stats.isPending ? 'Loading…' : null}
              </p>
            </CardContent>
          </Card>;
        })}
      </div>
    </section>)}
  </LaunchpadShell>;
}
