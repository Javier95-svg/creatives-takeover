import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  MonitorPlay,
  Pencil,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { applyStoryboardToDemo, createDemo, deleteDemo, getBrief, getProject, getProjectReadiness, listDemos, listVsls } from '@/lib/demoStudio/api';
import type { DemoStudioBrief, DemoStudioDemo, DemoStudioProject, DemoStudioReadiness, DemoStudioVsl } from '@/lib/demoStudio/types';
import GettingStartedChecklist, { type ChecklistStep } from '@/components/demo-studio/GettingStartedChecklist';
import WhatIsADemoPopover from '@/components/demo-studio/WhatIsADemoPopover';

export default function ProjectOverviewPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<DemoStudioProject | null>(null);
  const [brief, setBrief] = useState<DemoStudioBrief | null>(null);
  const [demos, setDemos] = useState<DemoStudioDemo[]>([]);
  const [vsls, setVsls] = useState<DemoStudioVsl[]>([]);
  const [readiness, setReadiness] = useState<DemoStudioReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
        const [projectRow, demoRows, vslRows, ready, briefRow] = await Promise.all([
          getProject(projectId),
          listDemos(projectId),
          listVsls(projectId),
          getProjectReadiness(projectId),
          getBrief(projectId),
        ]);
        if (!active) return;
        if (!projectRow) {
          toast.error('Project not found.');
          navigate('/demo-studio/projects');
          return;
        }
        setProject(projectRow);
        setBrief(briefRow);
        setDemos(demoRows);
        setVsls(vslRows);
        setReadiness(ready);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load project.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user, projectId, navigate]);

  const handleCreateBlankDemo = async () => {
    if (!user || !projectId) return;
    setCreating(true);
    try {
      const demo = await createDemo(projectId, user.id, 'Untitled demo');
      navigate(`/demo-studio/projects/${projectId}/demos/${demo.id}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create demo.');
      setCreating(false);
    }
  };

  const handleCreateGuidedDemo = async () => {
    if (!user || !projectId) return;
    if (!brief?.ai_storyboard?.length) {
      navigate(`/demo-studio/projects/${projectId}/brief`);
      return;
    }
    setCreating(true);
    try {
      const demo = await createDemo(projectId, user.id, `${project?.name ?? 'Product'} guided demo`);
      await applyStoryboardToDemo(demo.id, brief.ai_storyboard, 0);
      navigate(`/demo-studio/projects/${projectId}/demos/${demo.id}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create guided demo.');
      setCreating(false);
    }
  };

  const handleDeleteDemo = async (demoId: string) => {
    const prev = demos;
    setDemos((d) => d.filter((demo) => demo.id !== demoId));
    try {
      await deleteDemo(demoId);
      toast.success('Demo deleted.');
    } catch {
      setDemos(prev);
      toast.error('Could not delete demo.');
    }
  };

  const hasPublishedDemo = demos.some((d) => d.status === 'published');
  const hasVsl = vsls.some((vsl) => vsl.loom_embed_url || vsl.loom_shared_url || vsl.video_url);
  const hasStoryboard = Boolean(brief?.ai_storyboard?.length);
  const briefComplete = Boolean(
    brief?.audience?.trim() &&
    brief?.problem?.trim() &&
    brief?.product_promise?.trim() &&
    brief?.aha_moment?.trim() &&
    brief?.primary_cta_label?.trim(),
  );
  const firstDemoId = demos[0]?.id;
  const nextProjectAction = !briefComplete
    ? {
        label: 'Complete brief',
        description: `Start by defining who ${project?.name ?? 'your product'} is for, the pain it solves, and the proof your demo should show.`,
        to: `/demo-studio/projects/${projectId}/brief`,
        icon: FileText,
      }
    : !hasStoryboard
      ? {
          label: 'Generate storyboard + VSL scripts',
          description: 'Use the completed brief to create guided demo steps and pitch scripts.',
          to: `/demo-studio/projects/${projectId}/brief`,
          icon: Sparkles,
        }
      : demos.length === 0
        ? {
            label: 'Create guided demo',
            description: 'Turn the generated storyboard into an editable demo with steps ready for screenshots.',
            onClick: handleCreateGuidedDemo,
            icon: MonitorPlay,
          }
        : !hasPublishedDemo
          ? {
              label: 'Add screenshots',
              description: 'Open the editor, attach screenshots, add hotspots, and publish the walkthrough.',
              to: firstDemoId ? `/demo-studio/projects/${projectId}/demos/${firstDemoId}/edit` : undefined,
              icon: MonitorPlay,
            }
          : !hasVsl
            ? {
                label: 'Record VSL',
                description: 'Save one Loom founder pitch so the launch page has both proof formats.',
                to: `/demo-studio/projects/${projectId}/vsl`,
                icon: Video,
              }
            : {
                label: 'Compose launch page',
                description: 'Combine your published demo, VSL, and signup CTA into one public proof page.',
                to: `/demo-studio/projects/${projectId}/launch`,
                icon: Rocket,
              };
  const NextProjectActionIcon = nextProjectAction.icon;
  const roadmapSteps: ChecklistStep[] = [
    {
      label: 'Define the proof story',
      description: 'Audience, pain, promise, aha moment, and CTA before screenshots.',
      done: briefComplete,
      action: { label: 'Complete brief', to: `/demo-studio/projects/${projectId}/brief` },
    },
    {
      label: 'Build a guided demo',
      description: 'Apply the storyboard, upload screenshots, then add clickable hotspots.',
      done: demos.length > 0,
      action: hasStoryboard
        ? { label: 'Create guided demo', onClick: handleCreateGuidedDemo }
        : { label: 'Open brief', to: `/demo-studio/projects/${projectId}/brief` },
    },
    {
      label: 'Publish & share',
      description: 'Publish to get a public link and an embed snippet.',
      done: hasPublishedDemo,
      action: firstDemoId
        ? { label: 'Add screenshots', to: `/demo-studio/projects/${projectId}/demos/${firstDemoId}/edit` }
        : undefined,
    },
    {
      label: 'Record a pitch video',
      description: 'Up to 3 Loom variations to A/B test on your launch page.',
      done: hasVsl,
      action: { label: 'Open VSL Studio', to: `/demo-studio/projects/${projectId}/vsl` },
    },
    {
      label: 'Publish your launch page',
      description: 'Your demo + pitch + early-access signup on one public page.',
      done: Boolean(project?.launch_published),
      action: { label: 'Compose page', to: `/demo-studio/projects/${projectId}/launch` },
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${project?.name ?? 'Project'} — Demo Studio`} description="Manage your demos, pitch videos, and launch page." noindex url="/demo-studio/projects" />
      <Navigation />

      <main className="container mx-auto max-w-5xl px-4 pt-28 pb-20 md:pt-32">
        <Link
          to="/demo-studio/projects"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All projects
        </Link>

        <div className="mb-6">
          <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-label font-medium uppercase tracking-wide text-muted-foreground">
            Demo Studio project
          </span>
          <h1 className="creatives-font mt-2 text-3xl font-bold md:text-4xl">{project?.name}</h1>
          {project?.tagline && <p className="mt-1 text-muted-foreground">{project.tagline}</p>}
        </div>

        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Next best action</p>
              <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold">
                <NextProjectActionIcon className="h-5 w-5 text-primary" />
                {nextProjectAction.label}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{nextProjectAction.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Your launch page needs one published demo and one recorded VSL. You can create them in either order.
              </p>
            </div>
            {nextProjectAction.to ? (
              <Button asChild className="shrink-0 gap-2">
                <Link to={nextProjectAction.to}>
                  {nextProjectAction.label} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button onClick={nextProjectAction.onClick} disabled={creating} className="shrink-0 gap-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <NextProjectActionIcon className="h-4 w-4" />}
                {nextProjectAction.label}
              </Button>
            )}
          </div>
        </div>

        <GettingStartedChecklist
          title="Your launch roadmap"
          subtitle="Demo Studio is complete when your demo, pitch video, and launch page are all live."
          steps={roadmapSteps}
          className="mb-8"
        />

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Brief</p>
            <p className="mt-2 text-2xl font-semibold">{readiness?.hasBrief ? 'Ready' : 'Draft'}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Published demos</p>
            <p className="mt-2 text-2xl font-semibold">{readiness?.publishedDemoCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">VSL variations</p>
            <p className="mt-2 text-2xl font-semibold">{readiness?.vslCount ?? 0}/3</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Launch page</p>
            <p className="mt-2 text-2xl font-semibold">{project?.launch_published ? 'Live' : 'Draft'}</p>
          </div>
        </div>

        {/* Demos */}
        <section className="mb-10">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <MonitorPlay className="h-5 w-5 text-primary" /> Demos
                </h2>
                <WhatIsADemoPopover />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                An interactive, click-through walkthrough of your product — screenshots + clickable hotspots.
              </p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={handleCreateBlankDemo} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Start blank demo
            </Button>
          </div>

          {demos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-muted-foreground/30 p-8 text-center">
              <MonitorPlay className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Build your first interactive demo — upload screenshots and add clickable hotspots.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {hasStoryboard ? (
                  <Button className="gap-1.5" onClick={handleCreateGuidedDemo} disabled={creating}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MonitorPlay className="h-4 w-4" />}
                    Create guided demo from brief
                  </Button>
                ) : (
                  <Button asChild className="gap-1.5">
                    <Link to={`/demo-studio/projects/${projectId}/brief`}>
                      Open brief <FileText className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                <Button variant="outline" className="gap-1.5" onClick={handleCreateBlankDemo} disabled={creating}>
                  <Plus className="h-4 w-4" /> Start blank demo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {demos.map((demo) => (
                <div
                  key={demo.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                      <MonitorPlay className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{demo.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {demo.status === 'published' ? 'Published' : 'Draft'}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {demo.status === 'published' && demo.public_id && (
                      <Button asChild variant="ghost" size="sm" className="gap-1.5">
                        <a href={`/demo/${demo.public_id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" /> View
                        </a>
                      </Button>
                    )}
                    <Button asChild variant="outline" size="sm" className="gap-1.5">
                      <Link to={`/demo-studio/projects/${projectId}/demos/${demo.id}/edit`}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteDemo(demo.id)}
                      aria-label="Delete demo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <FileText className="h-5 w-5 text-primary" /> Demo Brief
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Define the story, generate AI drafts, and create a guided demo storyboard.
            </p>
            <Button asChild className="mt-4 gap-2">
              <Link to={`/demo-studio/projects/${projectId}/brief`}>
                Open brief <FileText className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Video className="h-5 w-5 text-primary" /> VSL Studio
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Record or paste up to three Loom pitch variations for this demo.
            </p>
            <Button asChild className="mt-4 gap-2">
              <Link to={`/demo-studio/projects/${projectId}/vsl`}>
                Open VSL Studio <Video className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Globe className="h-5 w-5 text-primary" /> Launch Page
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Publish one page with the demo, VSL, and signup form.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild className="gap-2">
                <Link to={`/demo-studio/projects/${projectId}/launch`}>
                  Compose page <Rocket className="h-4 w-4" />
                </Link>
              </Button>
              {project?.launch_published && project.slug && (
                <Button asChild variant="outline" className="gap-2">
                  <a href={`/p/${project.slug}`} target="_blank" rel="noopener noreferrer">
                    View live <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
