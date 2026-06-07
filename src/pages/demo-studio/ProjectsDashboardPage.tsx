import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FolderPlus, Globe, Loader2, Plus, Sparkles } from 'lucide-react';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { createProject, listProjects } from '@/lib/demoStudio/api';
import type { DemoStudioProject } from '@/lib/demoStudio/types';

export default function ProjectsDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DemoStudioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?return=/demo-studio/projects');
      return;
    }
    let active = true;
    (async () => {
      try {
        const rows = await listProjects(user.id);
        if (active) setProjects(rows);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load projects.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user, navigate]);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    try {
      const project = await createProject(user.id, { name: name.trim(), tagline: tagline.trim() || undefined });
      toast.success('Project created.');
      navigate(`/demo-studio/projects/${project.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create project.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Demo Studio — Build interactive demos & pitch videos"
        description="Create an interactive demo and a recorded pitch for your startup, then launch a page that converts."
        url="/demo-studio/projects"
      />
      <Navigation />

      <main className="container mx-auto max-w-6xl px-4 pt-28 pb-20 md:pt-32">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Demo Studio
            </span>
            <h1 className="text-3xl font-bold md:text-4xl">Your projects</h1>
            <p className="max-w-xl text-muted-foreground">
              From idea to a demo + pitch video you can actually show — in an afternoon. Every project ships an
              interactive demo and a launch page.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a project</DialogTitle>
                <DialogDescription>A project holds your demos, pitch videos, and launch page.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="project-name">Product name</Label>
                  <Input
                    id="project-name"
                    value={name}
                    autoFocus
                    placeholder="e.g. Acme Analytics"
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate();
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="project-tagline">Tagline (optional)</Label>
                  <Textarea
                    id="project-tagline"
                    value={tagline}
                    placeholder="One line on what it does and who it's for."
                    rows={2}
                    onChange={(e) => setTagline(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!name.trim() || creating} className="gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                  Create project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted-foreground/30 px-6 py-16 text-center">
            <FolderPlus className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first project to build an interactive demo and a launch page.
            </p>
            <Button className="mt-5 gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> New project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/demo-studio/projects/${project.id}`}
                className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold group-hover:text-primary">{project.name}</h3>
                  {project.launch_published ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                      <Globe className="h-3 w-3" /> Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Draft</span>
                  )}
                </div>
                {project.tagline && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{project.tagline}</p>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  Updated {new Date(project.updated_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
