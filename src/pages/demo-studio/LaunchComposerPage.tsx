import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink, Globe, Loader2, Rocket } from 'lucide-react';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
import DemoPlayer from '@/components/demo-studio/player/DemoPlayer';
import LoomEmbed from '@/components/demo-studio/vsl/LoomEmbed';
import { Badge } from '@/components/ui/badge';
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
  getBrief,
  getProject,
  getProjectMetrics,
  getProjectReadiness,
  listDemos,
  listHotspotsForDemo,
  listSteps,
  listVsls,
  publishLaunchPage,
  isLaunchSlugAvailable,
  normalizeProjectSlug,
  updateLaunchPage,
  updateProject,
  unpublishLaunchPage,
} from '@/lib/demoStudio/api';
import { DEFAULT_DEMO_STUDIO_CTA } from '@/lib/demoStudio/brief';
import type {
  DemoStudioBrief,
  DemoStepWithHotspots,
  DemoStudioDemo,
  DemoStudioHotspot,
  DemoStudioLaunchPage,
  DemoStudioMetrics,
  DemoStudioMetricsWindow,
  DemoStudioProject,
  DemoStudioReadiness,
  DemoStudioVsl,
} from '@/lib/demoStudio/types';

export default function LaunchComposerPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<DemoStudioProject | null>(null);
  const [brief, setBrief] = useState<DemoStudioBrief | null>(null);
  const [launchPage, setLaunchPage] = useState<DemoStudioLaunchPage | null>(null);
  const [demos, setDemos] = useState<DemoStudioDemo[]>([]);
  const [vsls, setVsls] = useState<DemoStudioVsl[]>([]);
  const [readiness, setReadiness] = useState<DemoStudioReadiness | null>(null);
  const [metrics, setMetrics] = useState<DemoStudioMetrics | null>(null);
  const [metricsWindow, setMetricsWindow] = useState<DemoStudioMetricsWindow>('all');
  const [slugDraft, setSlugDraft] = useState('');
  const [slugChecking, setSlugChecking] = useState(false);
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
        const [launchRow, demoRows, vslRows, ready, metricRows, briefRow] = await Promise.all([
          getOrCreateLaunchPage(projectRow, user.id),
          listDemos(projectId),
          listVsls(projectId),
          getProjectReadiness(projectId),
          getProjectMetrics(projectId, metricsWindow),
          getBrief(projectId),
        ]);
        if (!active) return;
        setProject(projectRow);
        setBrief(briefRow);
        setSlugDraft(projectRow.slug || normalizeProjectSlug(projectRow.name));
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
  }, [authLoading, user, projectId, navigate, metricsWindow]);

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

  const handleSlugBlur = async (value: string) => {
    if (!project || !value.trim()) return;
    const slug = normalizeProjectSlug(value);
    setSlugDraft(slug);
    setSlugChecking(true);
    try {
      const available = await isLaunchSlugAvailable(slug, project.id);
      if (!available) {
        toast.error('That public slug is already taken.');
        return;
      }
      await updateProject(project.id, { slug });
      setProject({ ...project, slug });
      toast.success('Public slug saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save slug.');
    } finally {
      setSlugChecking(false);
    }
  };

  const applyLaunchHeadline = async (index: number) => {
    const headline = brief?.ai_launch_copy?.headlines[index];
    if (!headline) return;
    await patchLaunch({
      headline: headline.headline,
      subheadline: headline.subheadline || brief?.ai_launch_copy?.subheadline || launchPage?.subheadline,
      cta_label: brief?.ai_launch_copy?.cta_label || DEFAULT_DEMO_STUDIO_CTA,
      theme: {
        ...(launchPage?.theme ?? {}),
        successMessage: brief?.ai_launch_copy?.success_message || launchPage?.theme?.successMessage,
      },
    });
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
  const attachedVslCount = vsls.filter((vsl) => vsl.loom_embed_url || vsl.loom_shared_url || vsl.video_url).length;
  const launchChecklist = [
    { label: 'Published demo', done: demos.some((demo) => demo.status === 'published') },
    { label: 'Recorded VSL', done: attachedVslCount > 0 },
    { label: 'Headline', done: Boolean(launchPage?.headline?.trim()) },
    { label: 'Subheadline', done: Boolean(launchPage?.subheadline?.trim()) },
    { label: 'CTA', done: Boolean(launchPage?.cta_label?.trim()) },
    { label: 'Public slug', done: Boolean(project?.slug?.trim()) },
  ];
  type LaunchFixAction = { label: string; to: string } | { label: string; onClick: () => void };
  const launchFixActions: LaunchFixAction[] = [];
  if (!launchChecklist[0].done) {
    launchFixActions.push({
      label: 'Publish demo',
      to: selectedDemo
        ? `/demo-studio/projects/${projectId}/demos/${selectedDemo.id}/edit`
        : `/demo-studio/projects/${projectId}`,
    });
  }
  if (!launchChecklist[1].done) {
    launchFixActions.push({ label: 'Record VSL', to: `/demo-studio/projects/${projectId}/vsl` });
  }
  if (!launchChecklist[2].done) {
    launchFixActions.push({ label: 'Add headline', onClick: () => document.getElementById('launch-headline')?.focus() });
  }
  if (!launchChecklist[5].done) {
    launchFixActions.push({ label: 'Set slug', onClick: () => document.getElementById('launch-slug')?.focus() });
  }

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
          <div className="mb-6 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            {readiness.missing.join(' ')}
            {launchFixActions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {launchFixActions.map((action) =>
                  'to' in action ? (
                    <Button key={action.label} asChild size="sm" variant="outline">
                      <Link to={action.to}>{action.label}</Link>
                    </Button>
                  ) : (
                    <Button key={action.label} size="sm" variant="outline" onClick={action.onClick}>
                      {action.label}
                    </Button>
                  ),
                )}
              </div>
            )}
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
                    onBlur={(e) => patchLaunch({ cta_label: e.target.value || DEFAULT_DEMO_STUDIO_CTA })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="launch-slug">Public slug</Label>
                  <div className="flex gap-2">
                    <Input
                      id="launch-slug"
                      value={slugDraft}
                      onChange={(e) => setSlugDraft(e.target.value)}
                      onBlur={(e) => handleSlugBlur(e.target.value)}
                    />
                    {slugChecking && <Loader2 className="mt-3 h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="launch-color">Primary color</Label>
                    <input
                      id="launch-color"
                      type="color"
                      value={launchPage?.theme?.primaryColor ?? '#6366f1'}
                      onChange={(e) => patchLaunch({ theme: { ...(launchPage?.theme ?? {}), primaryColor: e.target.value } })}
                      className="h-10 w-full cursor-pointer rounded border border-border bg-transparent"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Background</Label>
                    <Select
                      value={launchPage?.theme?.background ?? 'dark'}
                      onValueChange={(value) => patchLaunch({ theme: { ...(launchPage?.theme ?? {}), background: value as 'dark' | 'light' | 'gradient' } })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="gradient">Gradient</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Layout</Label>
                  <Select
                    value={launchPage?.theme?.layoutStyle ?? 'split'}
                    onValueChange={(value) => patchLaunch({ theme: { ...(launchPage?.theme ?? {}), layoutStyle: value as 'split' | 'vsl_first' | 'demo_first' } })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="split">Split hero</SelectItem>
                      <SelectItem value="vsl_first">VSL first</SelectItem>
                      <SelectItem value="demo_first">Demo first</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="success-message">Signup success message</Label>
                  <Input
                    id="success-message"
                    value={launchPage?.theme?.successMessage ?? ''}
                    placeholder="You are on the early access list."
                    onChange={(e) => setLaunchPage((prev) => prev ? { ...prev, theme: { ...prev.theme, successMessage: e.target.value } } : prev)}
                    onBlur={(e) => patchLaunch({ theme: { ...(launchPage?.theme ?? {}), successMessage: e.target.value || 'You are on the early access list.' } })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI copy options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {brief?.ai_launch_copy?.headlines?.length ? brief.ai_launch_copy.headlines.map((headline, index) => (
                  <button
                    key={headline.variant}
                    type="button"
                    className="w-full rounded-lg border border-border p-3 text-left transition hover:border-primary/50"
                    onClick={() => applyLaunchHeadline(index)}
                  >
                    <Badge variant="outline">Variant {headline.variant}</Badge>
                    <p className="mt-2 text-sm font-semibold">{headline.headline}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{headline.subheadline}</p>
                  </button>
                )) : (
                  <p className="text-sm text-muted-foreground">Generate launch copy from the Demo Brief to choose headline variants here.</p>
                )}
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
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Funnel</CardTitle>
                  <Select value={metricsWindow} onValueChange={(value) => setMetricsWindow(value as DemoStudioMetricsWindow)}>
                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All time</SelectItem>
                      <SelectItem value="7d">7 days</SelectItem>
                      <SelectItem value="30d">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Launch views" value={metrics?.launchPageViews ?? 0} />
                <Metric label="Demo starts" value={metrics?.demoStarts ?? 0} />
                <Metric label="Demo completes" value={metrics?.demoCompletions ?? 0} />
                <Metric label="VSL impressions" value={metrics?.vslImpressions ?? 0} />
                <Metric label="CTA clicks" value={metrics?.ctaClicks ?? 0} />
                <Metric label="Signup attempts" value={metrics?.signupAttempts ?? 0} />
                <Metric label="Signups" value={metrics?.signups ?? 0} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Launch checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {launchChecklist.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <span>{item.label}</span>
                    <Badge variant={item.done ? 'default' : 'outline'}>{item.done ? 'Ready' : 'Missing'}</Badge>
                  </div>
                ))}
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
                <Button>{launchPage?.cta_label || DEFAULT_DEMO_STUDIO_CTA}</Button>
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
