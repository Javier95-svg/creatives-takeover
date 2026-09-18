import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IcpSamplePreviewSection } from '@/components/icp/IcpSamplePreviewSection';
import { getFounderTool } from '@/config/founderToolCatalog';
import { PLATFORM_TOUR_FIXTURE } from '@/lib/platformTour/tourFixture';
import { PanelFrame } from './PanelFrame';
import { useTourGate } from '../PlatformTourGateContext';

/**
 * The one panel that shows a finished artifact rather than a description of one.
 * These samples are hand-authored and complete, and the same component already
 * renders them anonymously on the ICP marketing surface, so an evaluator is
 * looking at real output rather than a mock of it.
 */
export function IcpBuilderPanel() {
  const openGate = useTourGate();
  const tool = getFounderTool('icp_builder');
  return <PanelFrame eyebrow="Stage 1 · Identity" title="ICP Builder" lede={tool?.purpose}>
    <Card>
      <CardHeader><CardTitle>Definition of done</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{tool?.responsibleOutcome}</p>
        <Button size="sm" onClick={() => openGate('tool')}>Build your own</Button>
      </CardContent>
    </Card>
    <IcpSamplePreviewSection initialSampleKey={PLATFORM_TOUR_FIXTURE.icpSampleKey} />
  </PanelFrame>;
}
