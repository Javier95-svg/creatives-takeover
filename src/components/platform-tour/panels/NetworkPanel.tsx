import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { sampleCofounderPosts } from '@/data/sampleCofounderPosts';
import { PanelFrame } from './PanelFrame';
import { useTourGate } from '../PlatformTourGateContext';

const DIRECTORIES = [
  { title: 'Mentors', body: 'Operators who have shipped in the stage you are in, matched on the track you need rather than on popularity.' },
  { title: 'Co-founders', body: 'Listings that state the project, the stage, the commitment and the equity range up front.' },
  { title: 'Investors', body: 'Angels and funds, filtered by the stage and the sector they actually write cheques in.' },
  { title: 'Marketplace', body: 'Vetted service providers for the work a founder should not be doing themselves.' },
];

export function NetworkPanel() {
  const openGate = useTourGate();
  // Real listings are written by real people who opted in, so the tour shows
  // the sample set the co-founder surface already publishes rather than
  // reproducing anybody's actual post here.
  const listings = sampleCofounderPosts.slice(0, 3);
  return <PanelFrame
    eyebrow="Network"
    title="The people around the work"
    lede="Four directories sit alongside the tools, so a founder who hits a wall has somewhere to go that is not another form."
  >
    <div className="grid gap-4 sm:grid-cols-2">
      {DIRECTORIES.map((entry) => <Card key={entry.title}>
        <CardHeader><CardTitle>{entry.title}</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">{entry.body}</p></CardContent>
      </Card>)}
    </div>

    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Co-founder listings</CardTitle>
        <CardDescription>Sample posts, shown in the same shape the real board uses.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {listings.map((post) => <div key={post.id} className="rounded-card border border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{post.project_name}</p>
            <Badge variant="outline">{post.stage}</Badge>
            {post.location && <Badge variant="outline">{post.location}</Badge>}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Looking for {post.looking_for.join(', ')}
            {post.commitment ? ` · ${post.commitment}` : ''}
            {post.equity_range ? ` · ${post.equity_range}` : ''}
          </p>
        </div>)}
        <Button size="sm" onClick={() => openGate('network')}>Reach someone here</Button>
      </CardContent>
    </Card>
  </PanelFrame>;
}
