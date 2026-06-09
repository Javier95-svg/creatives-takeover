import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  MonitorPlay,
  Pencil,
  Plus,
  Rocket,
  Trash2,
  Video,
} from 'lucide-react';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { createDemo, deleteDemo, getProject, getProjectReadiness, listDemos, listVsls } from '@/lib/demoStudio/api';
import type { DemoStudioDemo, DemoStudioProject, DemoStudioReadiness, DemoStudioVsl } from '@/lib/demoStudio/types';
import GettingStartedChecklist, { type ChecklistStep } from '@/components/demo-studio/GettingStartedChecklist';
import WhatIsADemoPopover from '@/components/demo-studio/WhatIsADemoPopover';

export default function ProjectOverviewPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<DemoStudioProject | null>(null);
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
        const [projectRow, demoRows, vslRows, ready] = await Promise.all([
          getProject(projectId),
          listDemos(projectId),
          listVsls(projectId),
          getProjectReadiness(projectId),
        ]);
        if (!active) return;
        if (!projectRow) {
          toast.error('Project not found.');
          navigate('/demo-studio/projects');
          return;
        }
        setProject(projectRow);
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

  const handleCreateDemo = async () => {
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
  const hasVsl = vsls.length > 0;
  const firstDemoId = demos[0]?.id;
  const roadmapSteps: ChecklistStep[] = [
    {
      label: 'Define the proof story',
      description: 'Audience, pain, promise, aha moment, and CTA before screenshots.',
      done: Boolean(readiness?.hasBrief),
      action: { label: 'Open brief', to: `/demo-studio/projects/${projectId}/brief` },
    },
    {
      label: 'Build a guided demo',
      description: 'Apply the storyboard, upload screenshots, then add clickable hotspots.',
      done: demos.length > 0,
      action: { label: 'New demo', onClick: handleCreateDemo },
    },
    {
      label: 'Publish & share',
      description: 'Publish to get a public link and an embed snippet.',
      done: hasPublishedDemo,
      action: firstDemoId
        ? { label: 'Open editor', to: `/demo-studio/projects/${projectId}/demos/${firstDemoId}/edit` }
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
          <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Demo Studio project
          </span>
          <h1 className="creatives-font mt-2 text-3xl font-bold md:text-4xl">{project?.name}</h1>
          {project?.tagline && <p className="mt-1 text-muted-foreground">{project.tagline}</p>}
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
            <Button size="sm" className="shrink-0 gap-1.5" onClick={handleCreateDemo} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} New demo
            </Button>
          </div>

          {demos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-muted-foreground/30 p-8 text-center">
              <MonitorPlay className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Build your first interactive demo — upload screenshots and add clickable hotspots.
              </p>
              <Button className="mt-4 gap-1.5" onClick={handleCreateDemo} disabled={creating}>
                <Plus className="h-4 w-4" /> New demo
              </Button>
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
