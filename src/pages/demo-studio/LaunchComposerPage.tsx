import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink, Globe, Loader2, Rocket } from 'lucide-react';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
import DemoPlayer from '@/components/demo-studio/player/DemoPlayer';
import LoomEmbed from '@/components/demo-studio/vsl/LoomEmbed';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOrCreateLaunchPage,
  getProject,
  getProjectMetrics,
  getProjectReadiness,
  listDemos,
  listHotspotsForDemo,
  listSteps,
  listVsls,
  publishLaunchPage,
  updateLaunchPage,
  unpublishLaunchPage,
} from '@/lib/demoStudio/api';
import type {
  DemoStepWithHotspots,
  DemoStudioDemo,
  DemoStudioHotspot,
  DemoStudioLaunchPage,
  DemoStudioMetrics,
  DemoStudioProject,
  DemoStudioReadiness,
  DemoStudioVsl,
} from '@/lib/demoStudio/types';

export default function LaunchComposerPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<DemoStudioProject | null>(null);
  const [launchPage, setLaunchPage] = useState<DemoStudioLaunchPage | null>(null);
  const [demos, setDemos] = useState<DemoStudioDemo[]>([]);
  const [vsls, setVsls] = useState<DemoStudioVsl[]>([]);
  const [readiness, setReadiness] = useState<DemoStudioReadiness | null>(null);
  const [metrics, setMetrics] = useState<DemoStudioMetrics | null>(null);
  const [previewSteps, setPreviewSteps] = useState<DemoStepWithHotspots[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?return=/demo-studio/projects');
      return;
    }
    if (!projectId) return;
    let active = true;
    void (async () => {
      try {
        const projectRow = await getProject(projectId);
        if (!projectRow) {
          toast.error('Project not found.');
          navigate('/demo-studio/projects');
          return;
        }
        const [launchRow, demoRows, vslRows, ready, metricRows] = await Promise.all([
          getOrCreateLaunchPage(projectRow, user.id),
          listDemos(projectId),
          listVsls(projectId),
          getProjectReadiness(projectId),
          getProjectMetrics(projectId),
        ]);
        if (!active) return;
        setProject(projectRow);
        setLaunchPage(launchRow);
        setDemos(demoRows);
        setVsls(vslRows);
        setReadiness(ready);
        setMetrics(metricRows);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not load launch composer.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user, projectId, navigate]);

  const selectedDemo = useMemo(
    () => demos.find((demo) => demo.id === launchPage?.primary_demo_id) ?? demos.find((demo) => demo.status === 'published') ?? demos[0] ?? null,
    [demos, launchPage?.primary_demo_id],
  );
  const selectedVsl = useMemo(
    () => vsls.find((vsl) => vsl.id === launchPage?.primary_vsl_id) ?? vsls.find((vsl) => vsl.is_primary) ?? vsls[0] ?? null,
    [vsls, launchPage?.primary_vsl_id],
  );

  useEffect(() => {
    if (!selectedDemo) {
      setPreviewSteps([]);
      return;
    }
    let active = true;
    (async () => {
      const [stepRows, hotspotRows] = await Promise.all([listSteps(selectedDemo.id), listHotspotsForDemo(selectedDemo.id)]);
      if (!active) return;
      const byStep = new Map<string, DemoStudioHotspot[]>();
      hotspotRows.forEach((hotspot) => {
        const arr = byStep.get(hotspot.step_id) ?? [];
        arr.push(hotspot);
        byStep.set(hotspot.step_id, arr);
      });
      setPreviewSteps(stepRows.map((step) => ({ ...step, hotspots: byStep.get(step.id) ?? [] })));
    })().catch(() => setPreviewSteps([]));
    return () => {
      active = false;
    };
  }, [selectedDemo]);

  const patchLaunch = async (patch: Partial<DemoStudioLaunchPage>) => {
    if (!projectId || !user || !launchPage) return;
    const next = { ...launchPage, ...patch };
    setLaunchPage(next);
    try {
      const saved = await updateLaunchPage(projectId, user.id, patch);
      setLaunchPage(saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save launch page.');
    }
  };

  const handlePublish = async () => {
    if (!project || !user) return;
    setSaving(true);
    try {
      const updated = await publishLaunchPage(project, user.id);
      setProject(updated);
      setReadiness(await getProjectReadiness(project.id));
      toast.success('Launch page published.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Launch page is not ready yet.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    if (!project) return;
    setSaving(true);
    try {
      await unpublishLaunchPage(project.id);
      setProject({ ...project, launch_published: false });
      toast.success('Launch page unpublished.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not unpublish launch page.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const launchUrl = project?.slug ? `${window.location.origin}/p/${project.slug}` : '';

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${project?.name ?? 'Project'} Launch Page`} description="Compose the public page that shows your demo and founder VSL." noindex />
      <Navigation />
      <main className="container mx-auto max-w-6xl px-4 pt-28 pb-20 md:pt-32">
        <Link
          to={`/demo-studio/projects/${projectId}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to project
        </Link>

        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Globe className="h-3.5 w-3.5" /> Launch Page Composer
            </span>
            <h1 className="creatives-font mt-3 text-3xl font-bold md:text-4xl">Publish the proof page</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              This page combines the interactive demo, the founder pitch, and the signup form in one shareable URL.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {project?.launch_published && launchUrl && (
              <Button asChild variant="outline" className="gap-2">
                <a href={launchUrl} target="_blank" rel="noopener noreferrer">
                  View live <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            {project?.launch_published ? (
              <Button variant="outline" onClick={handleUnpublish} disabled={saving}>Unpublish</Button>
            ) : (
              <Button onClick={handlePublish} disabled={saving || !readiness?.canPublishLaunchPage} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                Publish
              </Button>
            )}
          </div>
        </div>

        {readiness && !readiness.canPublishLaunchPage && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900">
            {readiness.missing.join(' ')}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Page content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="launch-headline">Headline</Label>
                  <Input
                    id="launch-headline"
                    value={launchPage?.headline ?? ''}
                    onChange={(e) => setLaunchPage((prev) => prev ? { ...prev, headline: e.target.value } : prev)}
                    onBlur={(e) => patchLaunch({ headline: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="launch-subheadline">Subheadline</Label>
                  <Textarea
                    id="launch-subheadline"
                    rows={3}
                    value={launchPage?.subheadline ?? ''}
                    onChange={(e) => setLaunchPage((prev) => prev ? { ...prev, subheadline: e.target.value } : prev)}
                    onBlur={(e) => patchLaunch({ subheadline: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="launch-cta">CTA label</Label>
                  <Input
                    id="launch-cta"
                    value={launchPage?.cta_label ?? ''}
                    onChange={(e) => setLaunchPage((prev) => prev ? { ...prev, cta_label: e.target.value } : prev)}
                    onBlur={(e) => patchLaunch({ cta_label: e.target.value || 'Join the waitlist' })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Primary demo</Label>
                  <Select value={selectedDemo?.id} onValueChange={(value) => patchLaunch({ primary_demo_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Select a demo" /></SelectTrigger>
                    <SelectContent>
                      {demos.map((demo) => (
                        <SelectItem key={demo.id} value={demo.id}>
                          {demo.title} {demo.status === 'published' ? '' : '(draft)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Primary VSL</Label>
                  <Select value={selectedVsl?.id} onValueChange={(value) => patchLaunch({ primary_vsl_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Select a VSL" /></SelectTrigger>
                    <SelectContent>
                      {vsls.map((vsl) => (
                        <SelectItem key={vsl.id} value={vsl.id}>
                          Variation {vsl.variation_label || '?'} {vsl.is_primary ? '(primary)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funnel</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Launch views" value={metrics?.launchPageViews ?? 0} />
                <Metric label="Demo views" value={metrics?.demoViews ?? 0} />
                <Metric label="VSL impressions" value={metrics?.vslImpressions ?? 0} />
                <Metric label="Signups" value={metrics?.signups ?? 0} />
              </CardContent>
            </Card>
          </div>

          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="rounded-xl bg-background p-6">
              <h2 className="creatives-font text-3xl font-bold">{launchPage?.headline || project?.name}</h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">{launchPage?.subheadline || project?.tagline}</p>
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <LoomEmbed embedUrl={selectedVsl?.loom_embed_url} sharedUrl={selectedVsl?.loom_shared_url} title={selectedVsl?.title} />
                <DemoPlayer steps={previewSteps} theme={selectedDemo?.theme} mode="preview" showWatermark={selectedDemo?.theme?.watermark !== false} />
              </div>
              <div className="mt-6 flex max-w-md gap-2">
                <Input readOnly placeholder="founder@example.com" />
                <Button>{launchPage?.cta_label || 'Join the waitlist'}</Button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
