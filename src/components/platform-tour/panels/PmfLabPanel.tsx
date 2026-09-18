import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { getFounderTool } from '@/config/founderToolCatalog';
import { PMF_REQUIRED_SIGNALS } from '@/lib/bizmapStages';
import { PLATFORM_TOUR_FIXTURE } from '@/lib/platformTour/tourFixture';
import { PanelFrame } from './PanelFrame';
import { useTourGate } from '../PlatformTourGateContext';

// The sample founder's evidence, sitting just short of the threshold on purpose.
// A tour that showed a passing score would teach an evaluator nothing about how
// the tool behaves when the evidence is thin, which is the interesting case.
const SIGNALS = [
  { source: 'Creator Discord, 8 calls', reading: 'Named the reporting pain unprompted', weight: 'Independent' },
  { source: 'Own newsletter, 11 replies', reading: 'Agreed the pain exists when described', weight: 'Warm audience' },
  { source: 'Loomi, paid pilot call', reading: 'Price acceptable, setup cost was not', weight: 'Objection on record' },
  { source: 'Two agency owners', reading: 'Wanted per client reporting, not per creator', weight: 'Out of segment' },
];

const VERDICTS = ['Build', 'Narrow', 'Pivot', 'Stop'];

export function PmfLabPanel() {
  const openGate = useTourGate();
  const tool = getFounderTool('pmf_lab');
  const logged = 21;
  return <PanelFrame eyebrow="Stage 3 · Validating" title="PMF Lab" lede={tool?.purpose}>
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Evidence</CardTitle>
          <CardDescription>
            {logged} of {PMF_REQUIRED_SIGNALS} signals logged. The verdict stays locked until the threshold is met, so a decision is never made on a hunch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {SIGNALS.map((signal) => <div key={signal.source} className="rounded-card border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{signal.source}</p>
              <Badge variant="outline">{signal.weight}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{signal.reading}</p>
          </div>)}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>The decision</CardTitle>
            <CardDescription>One of four, written down and dated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {VERDICTS.map((verdict) => <Badge key={verdict} variant="secondary">{verdict}</Badge>)}
            </div>
            <p className="text-sm text-muted-foreground">
              Locked. {PMF_REQUIRED_SIGNALS - logged} more signals and one documented objection are needed before PMF Lab will score this.
            </p>
            <Button size="sm" onClick={() => openGate('tool')}>Run this on your own idea</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Definition of done</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{tool?.responsibleOutcome}</p>
          </CardContent>
        </Card>
      </div>
    </div>

    {/* The worked exchange sits here rather than on the Pulse panel, because
        this is the evidence it argues about. It is the clearest example of the
        assistant disagreeing with the founder, which is the point of it. */}
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>What Pulse said about this evidence</CardTitle>
        <CardDescription>A saved exchange from the sample project.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {PLATFORM_TOUR_FIXTURE.pulseExchange.map((message) => <div key={message.id}
          className={message.role === 'user'
            ? 'ml-auto max-w-xl rounded-card bg-muted/70 px-5 py-3 text-sm'
            : 'rounded-card border border-border px-5 py-4 text-sm leading-7'}>
          {message.role === 'assistant' && <p className="mb-2 text-xs font-semibold text-primary">Pulse</p>}
          <div className="[&_li]:mb-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_p:last-child]:mb-0">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>)}
      </CardContent>
    </Card>
  </PanelFrame>;
}
