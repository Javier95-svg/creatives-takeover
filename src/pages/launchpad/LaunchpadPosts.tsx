import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PenSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LaunchpadShell } from '@/components/launchpad/LaunchpadShell';
import { PostComposerDialog } from '@/components/launchpad/PostComposerDialog';
import { PostFeed } from '@/components/launchpad/PostFeed';

export default function LaunchpadPosts() {
  const [composing, setComposing] = useState(false);
  return <LaunchpadShell
    seoTitle="Posts | Launchpad"
    title="Posts"
    intro="Ask for feedback, share milestones and test ideas with founders working through the same stages as you."
    actions={<Button onClick={() => setComposing(true)} className="gap-2"><PenSquare className="h-4 w-4" aria-hidden="true" />New post</Button>}>
    <PostFeed empty={<Card className="border-dashed">
      <CardContent className="space-y-3 py-12 text-center">
        <h2 className="font-space-grotesk text-lg font-semibold">Start the first thread</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          The fastest way to get useful replies is to ask for feedback on something specific: a landing page, a price or a pitch.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => setComposing(true)}>Ask for feedback</Button>
          <Button variant="outline" asChild><Link to="/launchpad/topics">Browse topics</Link></Button>
        </div>
      </CardContent>
    </Card>} />
    <PostComposerDialog open={composing} onOpenChange={setComposing} />
  </LaunchpadShell>;
}
