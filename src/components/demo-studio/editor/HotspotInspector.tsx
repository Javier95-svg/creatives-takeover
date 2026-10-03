import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DemoStudioHotspot, HotspotAction, HotspotType } from '@/lib/demoStudio/types';

interface HotspotInspectorProps {
  hotspot: DemoStudioHotspot | null;
  stepCount: number;
  onChange: (patch: Partial<DemoStudioHotspot>) => void;
  onDelete: (id: string) => void;
}

export default function HotspotInspector({ hotspot, stepCount, onChange, onDelete }: HotspotInspectorProps) {
  if (!hotspot) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
        Select a hotspot to edit its label and click behavior, or drag on the image to create one.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Hotspot</h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-destructive hover:text-destructive"
          onClick={() => onDelete(hotspot.id)}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hotspot-label">Tooltip label</Label>
        <Input
          id="hotspot-label"
          value={hotspot.label ?? ''}
          placeholder="e.g. Click to create a project"
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Style</Label>
        <Select value={hotspot.type} onValueChange={(v) => onChange({ type: v as HotspotType })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hotspot">Hotspot (clickable area)</SelectItem>
            <SelectItem value="tooltip">Tooltip</SelectItem>
            <SelectItem value="callout">Callout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>On click</Label>
        <Select value={hotspot.action} onValueChange={(v) => onChange({ action: v as HotspotAction })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="next">Go to next step</SelectItem>
            <SelectItem value="goto">Jump to a step</SelectItem>
            <SelectItem value="url">Open a URL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hotspot.action === 'goto' && (
        <div className="space-y-1.5">
          <Label htmlFor="hotspot-target-step">Step number (1–{stepCount})</Label>
          <Input
            id="hotspot-target-step"
            type="number"
            min={1}
            max={stepCount}
            value={hotspot.action_target ? String(Number(hotspot.action_target) + 1) : ''}
            onChange={(e) => {
              const oneBased = Number.parseInt(e.target.value, 10);
              if (Number.isNaN(oneBased)) {
                onChange({ action_target: null });
                return;
              }
              onChange({ action_target: String(Math.max(0, oneBased - 1)) });
            }}
          />
        </div>
      )}

      {hotspot.action === 'url' && (
        <div className="space-y-1.5">
          <Label htmlFor="hotspot-target-url">Destination URL</Label>
          <Input
            id="hotspot-target-url"
            type="url"
            placeholder="https://"
            value={hotspot.action_target ?? ''}
            onChange={(e) => onChange({ action_target: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
