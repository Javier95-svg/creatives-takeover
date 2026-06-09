import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { LoomVideo } from '@loomhq/record-sdk';
import type { DemoStudioVsl, DemoStudioVslScript } from '@/lib/demoStudio/types';
import { createVsl, deleteVsl, setPrimaryVsl, updateVsl } from '@/lib/demoStudio/api';
import { normalizeLoomUrl, VSL_VARIATION_LABELS } from '@/lib/demoStudio/vsl';
import VslSlot from './VslSlot';

interface VslStudioProps {
  projectId: string;
  ownerId: string;
  initialVsls: DemoStudioVsl[];
  scriptDrafts?: DemoStudioVslScript[];
  onChange?: (vsls: DemoStudioVsl[]) => void;
}

export default function VslStudio({ projectId, ownerId, initialVsls, scriptDrafts = [], onChange }: VslStudioProps) {
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
        hook: scriptDrafts.find((script) => script.variation === label)?.hook || 'Recorded in Demo Studio',
        script: scriptDrafts.find((script) => script.variation === label)?.script,
        script_outline: scriptDrafts.find((script) => script.variation === label)?.outline,
        target_duration_seconds: scriptDrafts.find((script) => script.variation === label)?.target_duration_seconds,
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
      const draft = scriptDrafts.find((script) => script.variation === label);
      const existing = vsls.find((vsl) => (vsl.variation_label || '').toUpperCase() === label);
      const parsed = normalizeLoomUrl(fields.url);
      if (existing) {
        await updateVsl(existing.id, {
          title: fields.title || existing.title || draft?.title || `Variation ${label}`,
          hook: fields.hook || existing.hook || draft?.hook || null,
          loom_shared_url: fields.url,
          script: existing.script || draft?.script || null,
          script_outline: existing.script_outline || draft?.outline || [],
          target_duration_seconds: existing.target_duration_seconds || draft?.target_duration_seconds || null,
        });
        sync(vsls.map((vsl) => vsl.id === existing.id ? {
          ...vsl,
          title: fields.title || existing.title || draft?.title || `Variation ${label}`,
          hook: fields.hook || existing.hook || draft?.hook || null,
          loom_video_id: parsed.videoId,
          loom_shared_url: parsed.sharedUrl,
          loom_embed_url: parsed.embedUrl,
          script: existing.script || draft?.script || null,
          script_outline: existing.script_outline || draft?.outline || [],
          target_duration_seconds: existing.target_duration_seconds || draft?.target_duration_seconds || null,
        } : vsl));
      } else {
        const created = await createVsl(projectId, ownerId, {
          variation_label: label,
          title: fields.title || draft?.title || `Variation ${label}`,
          hook: fields.hook || draft?.hook || '',
          script: draft?.script,
          script_outline: draft?.outline,
          target_duration_seconds: draft?.target_duration_seconds,
          loom_shared_url: fields.url,
        });
        sync([...vsls, created]);
      }
      toast.success(`Saved VSL variation ${label}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the Loom link.');
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleApplyScript = async (label: string) => {
    const draft = scriptDrafts.find((script) => script.variation === label);
    if (!draft) return;
    const existing = vsls.find((vsl) => (vsl.variation_label || '').toUpperCase() === label);
    setSaving(true);
    try {
      if (existing) {
        await updateVsl(existing.id, {
          title: draft.title,
          hook: draft.hook,
          script: draft.script,
          script_outline: draft.outline,
          target_duration_seconds: draft.target_duration_seconds,
        });
        sync(vsls.map((vsl) => vsl.id === existing.id ? {
          ...vsl,
          title: draft.title,
          hook: draft.hook,
          script: draft.script,
          script_outline: draft.outline,
          target_duration_seconds: draft.target_duration_seconds,
        } : vsl));
      } else {
        const created = await createVsl(projectId, ownerId, {
          variation_label: label,
          title: draft.title,
          hook: draft.hook,
          script: draft.script,
          script_outline: draft.outline,
          target_duration_seconds: draft.target_duration_seconds,
        });
        sync([...vsls, created]);
      }
      toast.success(`Script applied to variation ${label}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not apply script.');
    } finally {
      setSaving(false);
    }
  };

  const handleRewriteScript = async (label: string, style: 'shorter' | 'sharper' | 'founder') => {
    const existing = vsls.find((vsl) => (vsl.variation_label || '').toUpperCase() === label);
    if (!existing?.script) return;
    const sentences = existing.script.split(/(?<=[.!?])\s+/).filter(Boolean);
    const nextScript =
      style === 'shorter'
        ? sentences.slice(0, 7).join(' ')
        : style === 'founder'
          ? `I built this because ${existing.hook || 'this problem kept showing up'}. ${existing.script}`
          : `${existing.hook || 'Here is the clearest reason this matters.'}\n\n${existing.script}`;
    setSaving(true);
    try {
      await updateVsl(existing.id, { script: nextScript });
      sync(vsls.map((vsl) => vsl.id === existing.id ? { ...vsl, script: nextScript } : vsl));
      toast.success('Script rewritten.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not rewrite script.');
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
          scriptDraft={scriptDrafts.find((script) => script.variation === label)}
          saving={saving}
          onCreateFromLoom={handleCreateFromVideo}
          onPaste={handlePaste}
          onApplyScript={handleApplyScript}
          onRewriteScript={handleRewriteScript}
          onSetPrimary={handlePrimary}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
