import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { LoomVideo } from '@loomhq/record-sdk';
import type { DemoStudioVsl } from '@/lib/demoStudio/types';
import { createVsl, deleteVsl, setPrimaryVsl } from '@/lib/demoStudio/api';
import { VSL_VARIATION_LABELS } from '@/lib/demoStudio/vsl';
import VslSlot from './VslSlot';

interface VslStudioProps {
  projectId: string;
  ownerId: string;
  initialVsls: DemoStudioVsl[];
  onChange?: (vsls: DemoStudioVsl[]) => void;
}

export default function VslStudio({ projectId, ownerId, initialVsls, onChange }: VslStudioProps) {
  const [vsls, setVsls] = useState(initialVsls);
  const [saving, setSaving] = useState(false);

  const sync = useCallback((next: DemoStudioVsl[]) => {
    setVsls(next);
    onChange?.(next);
  }, [onChange]);

  const handleCreateFromVideo = async (label: string, video: LoomVideo) => {
    setSaving(true);
    try {
      const created = await createVsl(projectId, ownerId, {
        variation_label: label,
        title: video.title || `Variation ${label}`,
        hook: 'Recorded in Demo Studio',
        loom_video_id: video.id,
        loom_shared_url: video.sharedUrl,
        loom_embed_url: video.embedUrl,
        thumbnail_url: video.thumbnailUrl,
        duration_seconds: video.duration ? Math.round(video.duration) : null,
      });
      sync([...vsls, created]);
      toast.success(`Saved VSL variation ${label}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the VSL.');
    } finally {
      setSaving(false);
    }
  };

  const handlePaste = async (label: string, fields: { url: string; title: string; hook: string }) => {
    setSaving(true);
    try {
      const created = await createVsl(projectId, ownerId, {
        variation_label: label,
        title: fields.title || `Variation ${label}`,
        hook: fields.hook,
        loom_shared_url: fields.url,
      });
      sync([...vsls, created]);
      toast.success(`Saved VSL variation ${label}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the Loom link.');
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handlePrimary = async (vsl: DemoStudioVsl) => {
    setSaving(true);
    try {
      await setPrimaryVsl(projectId, vsl.id);
      sync(vsls.map((item) => ({ ...item, is_primary: item.id === vsl.id })));
      toast.success(`Variation ${vsl.variation_label || ''} is now primary.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update primary VSL.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vsl: DemoStudioVsl) => {
    const next = vsls.filter((item) => item.id !== vsl.id);
    sync(next);
    try {
      await deleteVsl(vsl.id);
      toast.success('VSL deleted.');
    } catch (e) {
      sync(vsls);
      toast.error(e instanceof Error ? e.message : 'Could not delete the VSL.');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {VSL_VARIATION_LABELS.map((label) => (
        <VslSlot
          key={label}
          label={label}
          vsl={vsls.find((vsl) => (vsl.variation_label || '').toUpperCase() === label)}
          saving={saving}
          onCreateFromLoom={handleCreateFromVideo}
          onPaste={handlePaste}
          onSetPrimary={handlePrimary}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
