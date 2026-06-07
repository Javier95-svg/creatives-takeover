import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  MonitorPlay,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { createDemo, deleteDemo, getProject, listDemos } from '@/lib/demoStudio/api';
import type { DemoStudioDemo, DemoStudioProject } from '@/lib/demoStudio/types';
import GettingStartedChecklist, { type ChecklistStep } from '@/components/demo-studio/GettingStartedChecklist';

export default function ProjectOverviewPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<DemoStudioProject | null>(null);
  const [demos, setDemos] = useState<DemoStudioDemo[]>([]);
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
    (async () => {
      try {
        const [projectRow, demoRows] = await Promise.all([getProject(projectId), listDemos(projectId)]);
        if (!active) return;
        if (!projectRow) {
          toast.error('Project not found.');
          navigate('/demo-studio/projects');
          return;
        }
        setProject(projectRow);
        setDemos(demoRows);
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
  const firstDemoId = demos[0]?.id;
  const roadmapSteps: ChecklistStep[] = [
    {
      label: 'Build a demo',
      description: 'Upload screenshots, then add clickable hotspots.',
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
      done: false,
      soon: true,
    },
    {
      label: 'Publish your launch page',
      description: 'Your demo + pitch + waitlist signup on one public page.',
      done: false,
      soon: true,
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
          <h1 className="text-3xl font-bold">{project?.name}</h1>
          {project?.tagline && <p className="mt-1 text-muted-foreground">{project.tagline}</p>}
        </div>

        <GettingStartedChecklist
          title="Your launch roadmap"
          subtitle="Build a demo first — the pitch video and launch page come next."
          steps={roadmapSteps}
          className="mb-8"
        />

        {/* Demos */}
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <MonitorPlay className="h-5 w-5 text-primary" /> Demos
            </h2>
            <Button size="sm" className="gap-1.5" onClick={handleCreateDemo} disabled={creating}>
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
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{demo.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {demo.status === 'published' ? 'Published' : 'Draft'}
                    </p>
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
      </main>
    </div>
  );
}
