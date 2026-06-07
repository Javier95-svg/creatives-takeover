import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ExternalLink,
  Film,
  Globe,
  Loader2,
  MonitorPlay,
  Pencil,
  Plus,
  Rocket,
  Trash2,
} from 'lucide-react';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { createDemo, deleteDemo, getProject, listDemos } from '@/lib/demoStudio/api';
import type { DemoStudioDemo, DemoStudioProject } from '@/lib/demoStudio/types';

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

        <div className="mb-8">
          <h1 className="text-3xl font-bold">{project?.name}</h1>
          {project?.tagline && <p className="mt-1 text-muted-foreground">{project.tagline}</p>}
        </div>

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

        {/* Next steps: VSL + Launch (upcoming milestones) */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Pitch video (VSL)</h3>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                Coming next
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Record up to 3 in-app pitch variations with Loom and A/B test them on your launch page.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Launch page</h3>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                Coming next
              </span>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
              <Globe className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Compose a public page with your demo + pitch + waitlist form. Requires{' '}
                <strong className={hasPublishedDemo ? 'text-emerald-600' : undefined}>1 published demo</strong> and 1
                saved pitch video.
              </span>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
