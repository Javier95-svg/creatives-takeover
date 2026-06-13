import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, FileText, Loader2, MonitorPlay, Rocket, Sparkles, Wand2 } from 'lucide-react';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
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
  applyStoryboardToDemo,
  createDemo,
  generateDemoStudioKit,
  getOrCreateBrief,
  getOrCreateLaunchPage,
  getProject,
  updateDemo,
  updateBrief,
  updateLaunchPage,
} from '@/lib/demoStudio/api';
import {
  DEFAULT_DEMO_STUDIO_CTA,
  DEMO_STUDIO_GOAL_LABELS,
  DEMO_STUDIO_GOALS,
  DEMO_STUDIO_PRODUCT_STAGES,
  DEMO_STUDIO_TONES,
  getBriefCompleteness,
} from '@/lib/demoStudio/brief';
import type { DemoStudioAiKit, DemoStudioBrief, DemoStudioLaunchCopy, DemoStudioProject } from '@/lib/demoStudio/types';

function getRenderableLaunchCopy(value: unknown): DemoStudioLaunchCopy | null {
  if (!value || typeof value !== 'object') return null;
  const launchCopy = value as Partial<DemoStudioLaunchCopy>;
  if (!Array.isArray(launchCopy.headlines) || launchCopy.headlines.length === 0) return null;
  return {
    headlines: launchCopy.headlines,
    subheadline: typeof launchCopy.subheadline === 'string' ? launchCopy.subheadline : '',
    cta_label:
      typeof launchCopy.cta_label === 'string' && launchCopy.cta_label.trim()
        ? launchCopy.cta_label
        : DEFAULT_DEMO_STUDIO_CTA,
    proof_bullets: Array.isArray(launchCopy.proof_bullets) ? launchCopy.proof_bullets : [],
    success_message: typeof launchCopy.success_message === 'string' ? launchCopy.success_message : undefined,
  };
}

export default function DemoBriefPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<DemoStudioProject | null>(null);
  const [brief, setBrief] = useState<DemoStudioBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

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
        const briefRow = await getOrCreateBrief(projectRow, user.id);
        if (!active) return;
        setProject(projectRow);
        setBrief(briefRow);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not load the demo brief.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user, projectId, navigate]);

  const completeness = useMemo(() => getBriefCompleteness(brief), [brief]);
  const aiKit: DemoStudioAiKit = useMemo(
    () => ({
      storyboard: Array.isArray(brief?.ai_storyboard) ? brief.ai_storyboard : [],
      vsl_scripts: Array.isArray(brief?.ai_vsl_scripts) ? brief.ai_vsl_scripts : [],
      launch_copy: getRenderableLaunchCopy(brief?.ai_launch_copy) ?? undefined,
    }),
    [brief],
  );
  const hasGeneratedKit = Boolean(aiKit.storyboard?.length || aiKit.vsl_scripts?.length || aiKit.launch_copy);
  const guideSteps = ['Define the story', 'Build the demo', 'Record the VSL', 'Publish the page', 'Measure interest'];

  const patchBrief = async (patch: Partial<DemoStudioBrief>) => {
    if (!projectId || !user || !brief) return;
    const next = { ...brief, ...patch };
    setBrief(next);
    setSaving(true);
    try {
      const saved = await updateBrief(projectId, user.id, patch);
      setBrief(saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the brief.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async (mode: 'full_kit' | 'storyboard' | 'vsl_scripts' | 'launch_copy') => {
    if (!project || !brief || !user || !projectId) return;
    const ready = getBriefCompleteness(brief);
    if (!ready.complete) {
      toast.error(`Complete the brief first: ${ready.missing.join(', ')}.`);
      return;
    }
    setGenerating(true);
    try {
      const kit = await generateDemoStudioKit({ mode, project, brief });
      const patch: Partial<DemoStudioBrief> = {};
      if (kit.storyboard) patch.ai_storyboard = kit.storyboard;
      if (kit.vsl_scripts) patch.ai_vsl_scripts = kit.vsl_scripts;
      if (kit.launch_copy) patch.ai_launch_copy = kit.launch_copy;
      const saved = await updateBrief(projectId, user.id, patch);
      setBrief(saved);
      toast.success('Demo Studio drafts generated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not generate drafts.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateDemoFromStoryboard = async () => {
    if (!projectId || !user || !brief?.ai_storyboard?.length) return;
    setSaving(true);
    try {
      const demo = await createDemo(projectId, user.id, `${project?.name ?? 'Product'} guided demo`);
      await updateDemo(demo.id, {
        theme: {
          ...demo.theme,
          endCtaLabel: brief.primary_cta_label || DEFAULT_DEMO_STUDIO_CTA,
          endCtaHref: brief.primary_cta_url || `/demo-studio/projects/${projectId}/launch`,
          brief: {
            audience: brief.audience || undefined,
            promise: brief.product_promise || undefined,
            ahaMoment: brief.aha_moment || undefined,
            cta: brief.primary_cta_label || DEFAULT_DEMO_STUDIO_CTA,
          },
        },
      });
      await applyStoryboardToDemo(demo.id, brief.ai_storyboard, 0);
      toast.success('Storyboard applied. Add screenshots next.');
      navigate(`/demo-studio/projects/${projectId}/demos/${demo.id}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the storyboard demo.');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyLaunchCopy = async () => {
    const launchCopy = getRenderableLaunchCopy(brief?.ai_launch_copy);
    if (!project || !user || !launchCopy) return;
    setSaving(true);
    try {
      await getOrCreateLaunchPage(project, user.id);
      const headline = launchCopy.headlines[0];
      await updateLaunchPage(project.id, user.id, {
        headline: headline?.headline || project.name,
        subheadline: headline?.subheadline || launchCopy.subheadline || project.tagline,
        cta_label: launchCopy.cta_label || brief?.primary_cta_label || DEFAULT_DEMO_STUDIO_CTA,
        theme: {
          primaryColor: '#6366f1',
          background: 'dark',
          layoutStyle: 'split',
          successMessage: launchCopy.success_message || 'You are on the early access list.',
        },
      });
      toast.success('Launch copy applied.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not apply launch copy.');
    } finally {
      setSaving(false);
    }
  };

  const focusBrief = () => {
    document.getElementById('brief-audience')?.focus();
  };

  const nextBriefAction = !completeness.complete
    ? {
        label: 'Complete brief',
        description: `Fill in ${completeness.missing.join(', ')} to unlock storyboard and VSL script generation.`,
        onClick: focusBrief,
        icon: FileText,
      }
    : !hasGeneratedKit
      ? {
          label: 'Generate storyboard + VSL scripts',
          description: 'Turn the brief into demo steps, VSL script drafts, and launch page copy.',
          onClick: () => handleGenerate('full_kit'),
          icon: Sparkles,
        }
      : {
          label: 'Create guided demo',
          description: 'Use the generated storyboard to create your first interactive demo.',
          onClick: handleCreateDemoFromStoryboard,
          icon: MonitorPlay,
        };
  const NextActionIcon = nextBriefAction.icon;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${project?.name ?? 'Project'} Demo Brief`} description="Define the story before building your demo and VSL." noindex />
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
              <FileText className="h-3.5 w-3.5" /> Demo Brief
            </span>
            <h1 className="creatives-font mt-3 text-3xl font-bold md:text-4xl">Define the proof before the pixels</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Lock the audience, pain, promise, aha moment, and CTA. Then generate a storyboard, VSL scripts, and launch copy.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => handleGenerate('storyboard')} disabled={generating || !completeness.complete} className="gap-2">
              <Wand2 className="h-4 w-4" /> Storyboard
            </Button>
            <Button onClick={() => handleGenerate('full_kit')} disabled={generating || !completeness.complete} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate storyboard + VSL scripts
            </Button>
            {!completeness.complete && (
              <p className="w-full text-xs text-muted-foreground">
                Complete Audience, Problem, Product promise, Aha moment, and CTA to unlock this.
              </p>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Step 1 of 5: Define the story</p>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Fill your proof brief first. From there, Demo Studio can generate storyboard steps and VSL scripts, then help you build the demo and publish the launch page.
              </p>
            </div>
            <Button onClick={nextBriefAction.onClick} disabled={generating || saving || (hasGeneratedKit && !aiKit.storyboard?.length)} className="gap-2">
              <NextActionIcon className="h-4 w-4" />
              {nextBriefAction.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-5">
            {guideSteps.map((step, index) => (
              <div key={step} className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                <p className="text-label font-medium uppercase tracking-wide text-muted-foreground">Step {index + 1}</p>
                <p className="text-sm font-semibold">{step}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{nextBriefAction.description}</p>
        </div>

        {!completeness.complete && (
          <div className="mb-6 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            Complete Audience, Problem, Product promise, Aha moment, and CTA to unlock storyboard and VSL script generation. Missing now: {completeness.missing.join(', ')}.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Founder brief</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Audience">
                <Input id="brief-audience" value={brief?.audience ?? ''} placeholder="Who needs this most?" onChange={(e) => setBrief((prev) => prev ? { ...prev, audience: e.target.value } : prev)} onBlur={(e) => patchBrief({ audience: e.target.value || null })} />
              </Field>
              <Field label="Problem">
                <Textarea rows={3} value={brief?.problem ?? ''} placeholder="What painful moment are they stuck in?" onChange={(e) => setBrief((prev) => prev ? { ...prev, problem: e.target.value } : prev)} onBlur={(e) => patchBrief({ problem: e.target.value || null })} />
              </Field>
              <Field label="Product promise">
                <Textarea rows={3} value={brief?.product_promise ?? ''} placeholder="What concrete outcome does the product create?" onChange={(e) => setBrief((prev) => prev ? { ...prev, product_promise: e.target.value } : prev)} onBlur={(e) => patchBrief({ product_promise: e.target.value || null })} />
              </Field>
              <Field label="Aha moment">
                <Textarea rows={3} value={brief?.aha_moment ?? ''} placeholder="What should the viewer understand by the end of the demo?" onChange={(e) => setBrief((prev) => prev ? { ...prev, aha_moment: e.target.value } : prev)} onBlur={(e) => patchBrief({ aha_moment: e.target.value || null })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="CTA label">
                  <Input value={brief?.primary_cta_label ?? ''} placeholder={DEFAULT_DEMO_STUDIO_CTA} onChange={(e) => setBrief((prev) => prev ? { ...prev, primary_cta_label: e.target.value } : prev)} onBlur={(e) => patchBrief({ primary_cta_label: e.target.value || DEFAULT_DEMO_STUDIO_CTA })} />
                </Field>
                <Field label="CTA URL">
                  <Input value={brief?.primary_cta_url ?? ''} placeholder="/p/product-slug" onChange={(e) => setBrief((prev) => prev ? { ...prev, primary_cta_url: e.target.value } : prev)} onBlur={(e) => patchBrief({ primary_cta_url: e.target.value || null })} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Tone">
                  <Select value={brief?.tone ?? 'conversational'} onValueChange={(value) => patchBrief({ tone: value as DemoStudioBrief['tone'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DEMO_STUDIO_TONES.map((tone) => <SelectItem key={tone} value={tone}>{tone}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Stage">
                  <Select value={brief?.product_stage ?? 'prototype'} onValueChange={(value) => patchBrief({ product_stage: value as DemoStudioBrief['product_stage'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DEMO_STUDIO_PRODUCT_STAGES.map((stage) => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Goal">
                  <Select value={brief?.demo_goal ?? 'collect_signups'} onValueChange={(value) => patchBrief({ demo_goal: value as DemoStudioBrief['demo_goal'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DEMO_STUDIO_GOALS.map((goal) => <SelectItem key={goal} value={goal}>{DEMO_STUDIO_GOAL_LABELS[goal]}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              {saving && <p className="text-xs text-muted-foreground">Saving...</p>}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="text-base">AI storyboard</CardTitle>
                <Button size="sm" variant="outline" onClick={handleCreateDemoFromStoryboard} disabled={saving || !aiKit.storyboard?.length} className="gap-2">
                  <MonitorPlay className="h-4 w-4" /> Create demo
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {aiKit.storyboard?.length ? aiKit.storyboard.map((step, index) => (
                  <div key={`${step.title}-${index}`} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <p className="text-sm font-semibold">{step.title}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{step.caption}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Hotspot: {step.hotspot_label}</p>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">Generate a storyboard to turn your brief into demo steps.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="text-base">VSL scripts</CardTitle>
                <Button size="sm" variant="outline" onClick={() => handleGenerate('vsl_scripts')} disabled={generating || !completeness.complete}>
                  Regenerate
                </Button>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {aiKit.vsl_scripts?.length ? aiKit.vsl_scripts.map((script) => (
                  <div key={script.variation} className="rounded-lg border border-border p-3">
                    <Badge>{script.variation}</Badge>
                    <p className="mt-2 text-sm font-semibold">{script.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{script.hook}</p>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground md:col-span-3">Generate scripts to guide your A/B/C founder pitch variations.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="text-base">Launch copy</CardTitle>
                <Button size="sm" variant="outline" onClick={handleApplyLaunchCopy} disabled={saving || !aiKit.launch_copy} className="gap-2">
                  <Rocket className="h-4 w-4" /> Apply
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {aiKit.launch_copy ? (
                  <>
                    {aiKit.launch_copy.headlines?.map((headline) => (
                      <div key={headline.variant} className="rounded-lg border border-border p-3">
                        <Badge variant="outline">Variant {headline.variant}</Badge>
                        <p className="mt-2 text-sm font-semibold">{headline.headline}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{headline.subheadline}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Generate launch copy and apply the best variant to the public page.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
