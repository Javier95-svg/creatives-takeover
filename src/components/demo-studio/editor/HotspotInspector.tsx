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
import { resolveGotoTarget } from '@/lib/demoStudio/readiness';
import type { DemoStudioHotspot, HotspotAction, HotspotType } from '@/lib/demoStudio/types';

interface HotspotInspectorProps {
  hotspot: DemoStudioHotspot | null;
  /** Every screen in order, for "jump to a screen". */
  screens: Array<{ id: string; label: string }>;
  currentScreenId: string | null;
  onChange: (patch: Partial<DemoStudioHotspot>) => void;
  onDelete: (id: string) => void;
}

export default function HotspotInspector({ hotspot, screens, currentScreenId, onChange, onDelete }: HotspotInspectorProps) {
  if (!hotspot) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Click targets are optional. Drag on the screenshot to add one where you want the viewer to click, or select one to edit it.
      </div>
    );
  }

  const screenIds = screens.map((screen) => screen.id);
  // Older targets stored a screen number; show them as the screen they point at.
  const targetIndex = resolveGotoTarget(hotspot.action_target, screenIds);
  const targetId = targetIndex === null ? '' : screenIds[targetIndex];

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Click target</h4>
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
        <Label htmlFor="hotspot-label">Label</Label>
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
            <SelectItem value="hotspot">Pulsing dot</SelectItem>
            <SelectItem value="tooltip">Tooltip</SelectItem>
            <SelectItem value="callout">Callout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>When clicked</Label>
        <Select value={hotspot.action} onValueChange={(v) => onChange({ action: v as HotspotAction })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="next">Go to the next screen</SelectItem>
            <SelectItem value="goto">Jump to a screen</SelectItem>
            <SelectItem value="url">Open a web page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hotspot.action === 'goto' && (
        <div className="space-y-1.5">
          <Label>Screen</Label>
          {/* Stored by screen id, so the target survives reordering. */}
          <Select value={targetId} onValueChange={(id) => onChange({ action_target: id })}>
            <SelectTrigger aria-label="Screen to jump to">
              <SelectValue placeholder="Choose a screen" />
            </SelectTrigger>
            <SelectContent>
              {screens.map((screen, index) => (
                <SelectItem key={screen.id} value={screen.id} disabled={screen.id === currentScreenId}>
                  {index + 1}. {screen.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {hotspot.action === 'url' && (
        <div className="space-y-1.5">
          <Label htmlFor="hotspot-target-url">Web address</Label>
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
