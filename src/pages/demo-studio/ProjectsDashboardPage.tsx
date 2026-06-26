import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight,
  FolderPlus,
  Globe,
  ImagePlus,
  Loader2,
  MonitorPlay,
  Plus,
  Rocket,
  Share2,
  Sparkles,
  Video,
} from 'lucide-react';
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
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { createProject, getOwnerDemoCounts, listProjects } from '@/lib/demoStudio/api';
import type { DemoStudioProject } from '@/lib/demoStudio/types';
import GettingStartedChecklist, { type ChecklistStep } from '@/components/demo-studio/GettingStartedChecklist';
import WhatIsADemoPopover from '@/components/demo-studio/WhatIsADemoPopover';
import DemoStudioWallpaper from '@/components/wallpapers/DemoStudioWallpaper';

const HOW_IT_WORKS = [
  { icon: Sparkles, step: '1', title: 'Define the story', desc: 'Audience, promise, aha moment, and CTA.' },
  { icon: ImagePlus, step: '2', title: 'Build the demo', desc: 'Screenshots, captions, and hotspots.' },
  { icon: Video, step: '3', title: 'Record the VSL', desc: 'Save up to three Loom pitch variations.' },
  { icon: Rocket, step: '4', title: 'Publish the page', desc: 'One URL with demo, pitch, and signup.' },
  { icon: Share2, step: '5', title: 'Measure interest', desc: 'Views, VSL impressions, and signups.' },
];

export default function ProjectsDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DemoStudioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [creating, setCreating] = useState(false);
  const [counts, setCounts] = useState({ total: 0, published: 0 });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Front door for logged-out visitors: send them to the no-signup "try" flow
      // so they hit the aha moment before being asked to create an account, instead
      // of bouncing to a login wall. Deeper project pages stay gated.
      navigate('/demo-studio/try', { replace: true });
      return;
    }
    let active = true;
    void (async () => {
      try {
        const [rows, demoCounts] = await Promise.all([
          listProjects(user.id),
          getOwnerDemoCounts(user.id),
        ]);
        if (!active) return;
        setProjects(rows);
        setCounts(demoCounts);
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
      navigate(`/demo-studio/projects/${project.id}/brief`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create project.');
    } finally {
      setCreating(false);
    }
  };

  const recentProjectId = projects[0]?.id;
  const checklistSteps: ChecklistStep[] = [
    {
      label: 'Create a project',
      description: 'Name your product — it holds your demos and launch page.',
      done: projects.length > 0,
      action: { label: 'New project', onClick: () => setDialogOpen(true) },
    },
    {
      label: 'Define the proof story',
      description: 'Write the brief, then generate storyboard, VSL scripts, and launch copy.',
      done: counts.total > 0,
      action: recentProjectId
        ? { label: 'Open brief', to: `/demo-studio/projects/${recentProjectId}/brief` }
        : { label: 'New project', onClick: () => setDialogOpen(true) },
    },
    {
      label: 'Publish proof page',
      description: 'Publish a demo, record a VSL, then ship the launch page.',
      done: counts.published > 0,
      action: recentProjectId
        ? { label: 'Open project', to: `/demo-studio/projects/${recentProjectId}` }
        : undefined,
    },
  ];
  const allChecklistDone = checklistSteps.every((s) => s.done);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SEO
        title="Demo Studio — Build interactive product demos"
        description="Create an interactive, click-through demo of your product from screenshots, then publish a shareable, embeddable walkthrough."
        url="/demo-studio/projects"
      />
      <DemoStudioWallpaper />
      <Navigation />

      <main className="relative z-10 container mx-auto max-w-6xl px-4 pt-28 pb-20 md:pt-32">
        {/* Hero — what Demo Studio (and a "demo") is */}
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/[0.12] bg-card/[0.82] p-8 shadow-2xl shadow-black/10 backdrop-blur-xl md:p-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.35] to-transparent" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-72 rounded-tl-full border-l border-t border-white/10 bg-white/5" />
          <div className="relative w-full text-center">
            <span className="mx-auto inline-flex items-center justify-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Demo Studio · Prototype stage
            </span>
            <h1 className="creatives-font mt-4 text-4xl font-bold leading-[1.05] md:text-5xl">
              Build your <span className="takeover-gradient">demo + VSL</span> in an afternoon
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Define the product story, turn screenshots into an{' '}
              <strong className="font-semibold text-foreground">interactive walkthrough</strong>, record a VSL, and
              publish one proof page with signup capture.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" className="gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" /> New project
              </Button>
              {recentProjectId && (
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <Link to={`/demo-studio/projects/${recentProjectId}`}>
                    Continue your project <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" variant="ghost" className="gap-2">
                <Link to="/demo-studio/try">
                  Try a 60-second preview <Sparkles className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* How it works — concretely defines a "demo" */}
        {!allChecklistDone && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {HOW_IT_WORKS.map((s, index) => (
              <div
                key={s.step}
                className="demo-step-card rounded-2xl border border-white/10 bg-card/[0.84] p-5 shadow-sm backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/10"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold">
                  <span className="text-primary">{s.step}.</span> {s.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        )}
        <style>{`
          @keyframes demoStepRise {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .demo-step-card {
            animation: demoStepRise 520ms ease-out both;
          }

          @media (prefers-reduced-motion: reduce) {
            .demo-step-card {
              animation: none;
            }
          }
        `}</style>

        {/* Getting-started checklist */}
        {!loading && !allChecklistDone && (
          <GettingStartedChecklist
            title="Get your first demo live"
            subtitle="Three quick steps — we'll keep this here until your first demo is published."
            steps={checklistSteps}
            className="mb-8"
          />
        )}

        {/* Projects */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Your projects</h2>
            <WhatIsADemoPopover />
          </div>
          {projects.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> New
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-primary/[0.35] bg-card/[0.78] px-6 py-16 text-center shadow-xl shadow-black/5 backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
              <MonitorPlay className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Create your first project</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              A project is your product's home — it holds the interactive demo you build, your pitch video, and your
              launch page.
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
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/[0.86] p-5 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                    <MonitorPlay className="h-5 w-5" />
                  </div>
                  {project.launch_published ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-label font-medium text-success">
                      <Globe className="h-3 w-3" /> Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-label text-muted-foreground">Draft</span>
                  )}
                </div>
                <h3 className="font-semibold group-hover:text-primary">{project.name}</h3>
                {project.tagline && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{project.tagline}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}

            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-muted-foreground/30 bg-card/[0.58] text-muted-foreground backdrop-blur-sm transition hover:border-primary/40 hover:text-primary"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">New project</span>
            </button>
          </div>
        )}
      </main>

      {/* Create project dialog (controlled) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                  if (e.key === 'Enter') void handleCreate();
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

      <Footer />
    </div>
  );
}
