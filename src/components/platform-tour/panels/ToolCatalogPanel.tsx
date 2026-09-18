import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FounderToolDefinition } from '@/config/founderToolCatalog';
import { TOUR_ARTIFACT_LABELS, tourArtifactStatus } from '@/lib/platformTour/tourArtifacts';
import { PanelFrame } from './PanelFrame';
import { useTourGate } from '../PlatformTourGateContext';

/**
 * Every tool without a hand-built panel renders from the catalog itself.
 *
 * The catalog already carries the contract language a program or a fund cares
 * about: what the tool is for, what it hands back, and what has to be true
 * before it counts as finished. Ten shallow replicas would read as vaporware;
 * ten honest commitments read as a product with a spine.
 */
export function ToolCatalogPanel({ tool }: { tool: FounderToolDefinition }) {
  const openGate = useTourGate();
  const status = tourArtifactStatus(tool);
  return <PanelFrame
    eyebrow={`Stage ${tool.stageNumber} · ${tool.stage.charAt(0)}${tool.stage.slice(1).toLowerCase()}`}
    title={tool.name}
    lede={tool.purpose}
  >
    <div className="grid gap-6 sm:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>What you leave with</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">{tool.promisedArtifact}</p>
          <Badge variant={status === 'complete' ? 'secondary' : 'outline'} className="mt-3">
            {TOUR_ARTIFACT_LABELS[status]}
          </Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Definition of done</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{tool.responsibleOutcome}</p>
        </CardContent>
      </Card>
    </div>

    <Card className="mt-6">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
        <p className="text-sm text-muted-foreground">
          The tour shows what this tool commits to. Running it writes a saved result against a project, which is why it needs an account.
        </p>
        <Button size="sm" onClick={() => openGate('tool')}>Open {tool.name}</Button>
      </CardContent>
    </Card>
  </PanelFrame>;
}
