import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, PenSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LaunchpadShell } from '@/components/launchpad/LaunchpadShell';
import { PostComposerDialog } from '@/components/launchpad/PostComposerDialog';
import { PostFeed } from '@/components/launchpad/PostFeed';
import { TopicFollowButton } from '@/components/launchpad/TopicFollowButton';
import { launchpadTopic } from '@/lib/launchpadTopics';
import { WORKSPACE_ROUTES } from '@/lib/workspaceNavigation';

export default function LaunchpadTopic() {
  const { slug } = useParams<{ slug: string }>();
  const topic = launchpadTopic(slug);
  const [composing, setComposing] = useState(false);
  if (!topic) return <Navigate to="/launchpad/topics" replace />;
  const tools = topic.tools.filter((tool) => WORKSPACE_ROUTES[tool]);

  return <LaunchpadShell seoTitle={`#${topic.label} | Launchpad`} title={`#${topic.label}`} intro={topic.description}
    actions={<>
      <TopicFollowButton slug={topic.slug} label={topic.label} size="default" />
      <Button onClick={() => setComposing(true)} className="gap-2"><PenSquare className="h-4 w-4" aria-hidden="true" />New post</Button>
    </>}>
    <Link to="/launchpad/topics" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />All topics
    </Link>

    {tools.length > 0 && <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Work on it in:</span>
      {tools.map((tool) => <Link key={tool} to={WORKSPACE_ROUTES[tool]}
        className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1 font-medium hover:border-primary/60 hover:text-primary">
        {tool}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>)}
    </div>}

    <PostFeed topic={topic.slug} empty={<Card className="border-dashed">
      <CardContent className="space-y-3 py-12 text-center">
        <h2 className="font-space-grotesk text-lg font-semibold">No posts in #{topic.label} yet</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{topic.prompt}</p>
        <Button onClick={() => setComposing(true)}>Write the first post</Button>
      </CardContent>
    </Card>} />

    <PostComposerDialog open={composing} onOpenChange={setComposing} initialTopic={topic.slug} />
  </LaunchpadShell>;
}
