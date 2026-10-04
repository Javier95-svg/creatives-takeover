import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';
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
import { DashboardDisclosure } from '@/components/dashboard/DashboardDisclosure';
import { NextStepCard } from '@/components/tool-shell/NextStepCard';
import { ToolEmptyState } from '@/components/tool-shell/ToolEmptyState';
import { ToolPageShell } from '@/components/tool-shell/ToolPageShell';
import { ToolProjectContext } from '@/components/tool-shell/ToolProjectContext';
import { useActiveProjectContext } from '@/hooks/useActiveProjectContext';
import DemoStoryboardWallpaper, { DemoStoryboardChart } from '@/components/wallpapers/DemoStoryboardWallpaper';
import { useAuth } from '@/contexts/AuthContext';
import { createDemo, createProject, getOwnerDemoCounts, listProjects, updateBrief } from '@/lib/demoStudio/api';
import type { DemoStudioProject } from '@/lib/demoStudio/types';
import { trackToolOpened } from '@/lib/analytics';
import { resolveIcpSource } from '@/lib/icpHandoffSource';
import { supabase } from '@/integrations/supabase/client';
import { isCompletionChainEnabled } from '@/lib/completionChain';
import { icpArtifactToDemoBrief } from '@/lib/icpToDemoBrief';
import { ensurePrebuildContext } from '@/lib/prebuildContext';
import { consumeJourneyHandoff, findJourneyHandoff, trackJourneyEvent, trackPrebuildLineageEvent } from '@/lib/journeyOutcomes';

const PURPOSE = 'Turn screenshots of your product into a click-through demo you can share as a link or embed on your site.';

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
  const [searchParams] = useSearchParams();
  const icpParam = searchParams.get('icp');
  const [icpPrefilled, setIcpPrefilled] = useState(false);
  const [validationContextId, setValidationContextId] = useState<string | null>(null);
  const [originatingHandoffId, setOriginatingHandoffId] = useState<string | null>(null);
  const handoffConsumedRef = useRef(false);
  const projectContext = useActiveProjectContext();

  useEffect(() => {
    const abandon = () => {
      if (validationContextId && originatingHandoffId && !handoffConsumedRef.current) {
        trackPrebuildLineageEvent('prebuild_handoff_abandoned', {
          validationContextId, handoffId: originatingHandoffId, sourceTool: 'icp_builder', destinationTool: 'demo_studio',
        });
      }
    };
    window.addEventListener('beforeunload', abandon);
    return () => window.removeEventListener('beforeunload', abandon);
  }, [originatingHandoffId, validationContextId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Front door for logged-out visitors: send them to the no-signup "try" flow
      // so they hit the aha moment before being asked to create an account, instead
      // of bouncing to a login wall. Deeper project pages stay gated.
      navigate('/demo-studio/try', { replace: true });
      return;
    }
    trackToolOpened('demo_studio');
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

  // Arriving from an ICP Draft: open the New Project dialog already filled in, so the
  // handoff lands the founder one click from a brief built on the customer they chose
  // rather than on an empty form.
  useEffect(() => {
    if (!user || !icpParam || icpPrefilled) return;
    let active = true;
    void (async () => {
      const icp = await resolveIcpSource({ userId: user.id, draftId: icpParam, allowLatestFallback: false });
      if (!active || !icp) return;
      const { project } = icpArtifactToDemoBrief(icp.artifact);
      const [context, handoff] = await Promise.all([
        ensurePrebuildContext({ userId: user.id, icpAnalysisId: icpParam, label: project.name, sourceTool: 'demo_studio' }),
        findJourneyHandoff('demo_studio', icpParam).catch(() => null),
      ]);
      if (!active) return;
      if (isCompletionChainEnabled()) {
        const mapped = icpArtifactToDemoBrief(icp.artifact);
        const { data, error } = await (supabase as any).rpc('start_completion_concept_v1', {
          p_icp_id: icpParam, p_context_id: context.id,
          p_name: mapped.project.name || 'My concept', p_tagline: mapped.project.tagline,
          p_audience: mapped.patch.audience, p_problem: mapped.patch.problem,
          p_promise: mapped.patch.product_promise,
        });
        if (error) throw error;
        const saved = data as DemoStudioProject;
        if (handoff) {
          await consumeJourneyHandoff(handoff.id, saved.id).catch(() => {
            toast.info('Concept saved. Journey tracking will retry when you reopen this ICP.');
          });
        }
        if (active) navigate(`/demo-studio/projects/${saved.id}/launch`, { replace: true });
        return;
      }
      setName((prev) => prev || project.name);
      setTagline((prev) => prev || project.tagline);
      setValidationContextId(context.id);
      setOriginatingHandoffId(handoff?.id ?? null);
      trackJourneyEvent('journey_next_stage_started', {
        tool: 'demo_studio', source: 'icp_handoff', artifact_type: 'customer_decision_brief',
        artifact_id: icpParam, validation_context_id: context.id, handoff_id: handoff?.id ?? null,
      });
      trackPrebuildLineageEvent('prebuild_handoff_opened', {
        validationContextId: context.id, handoffId: handoff?.id, sourceTool: 'icp_builder',
        destinationTool: 'demo_studio', artifactId: icpParam,
      });
      setIcpPrefilled(true);
      setDialogOpen(true);
    })().catch((error) => {
      if (active) toast.error(error instanceof Error ? error.message : 'Could not prepare your concept. Reopen this ICP to retry.');
    });
    return () => {
      active = false;
    };
  }, [user, icpParam, icpPrefilled, navigate]);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    try {
      const project = await createProject(user.id, {
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        validationContextId,
        originatingHandoffId,
        sourceIcpAnalysisId: icpParam ?? projectContext.outcomes?.icpDraftId ?? null,
        workspaceProjectId: projectContext.projectId,
      });
      if (!icpParam && projectContext.icp) {
        // The brief is optional, but filling it from the ICP costs nothing and
        // lets the storyboard and launch copy start from the real customer.
        await updateBrief(project.id, user.id, icpArtifactToDemoBrief(projectContext.icp.artifact).patch).catch(() => undefined);
      }
      if (originatingHandoffId) {
        await consumeJourneyHandoff(originatingHandoffId, project.id);
        handoffConsumedRef.current = true;
        if (validationContextId) trackPrebuildLineageEvent('prebuild_handoff_consumed', {
          validationContextId, handoffId: originatingHandoffId, sourceTool: 'icp_builder',
          destinationTool: 'demo_studio', artifactId: project.id,
        });
      }
      if (icpParam) {
        // Carry the ICP through so the brief prefills from the same draft.
        navigate(`/demo-studio/projects/${project.id}/brief?icp=${encodeURIComponent(icpParam)}`);
        return;
      }
      // The brief is optional, so a new project goes straight to adding screens.
      const demo = await createDemo(project.id, user.id, `${project.name} demo`);
      navigate(`/demo-studio/projects/${project.id}/demos/${demo.id}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create project.');
    } finally {
      setCreating(false);
    }
  };

  // The workspace project's current Demo Studio project comes first; demos made
  // for other projects (or before projects existed) are listed separately.
  const workspaceProjectId = projectContext.projectId;
  const currentProject = workspaceProjectId
    ? projects.find((project) => project.project_id === workspaceProjectId && !project.superseded_at) ?? null
    : projects[0] ?? null;
  const listedProjects = projects.filter((project) => project.id !== currentProject?.id);
  const openNewProject = () => {
    if (!name.trim() && projectContext.project) {
      const fromIcp = projectContext.icp ? icpArtifactToDemoBrief(projectContext.icp.artifact).project : null;
      setName(fromIcp?.name || projectContext.project.title);
      setTagline((current) => current || fromIcp?.tagline || projectContext.project?.ideaSummary || '');
    }
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Demo Studio | Creatives Takeover"
        description="Turn screenshots of your product into a click-through demo you can share as a link or embed on your site."
        url="/demo-studio/projects"
      />
      <Navigation />
      <main>
        <ToolPageShell
          title="Demo Studio"
          purpose={PURPOSE}
          context={<ToolProjectContext context={projectContext} />}
          theme="demo"
          wallpaper={<DemoStoryboardWallpaper />}
          headerArt={<DemoStoryboardChart />}
        >
          {loading ? (
            <div className="flex justify-center py-16" role="status" aria-label="Loading your projects">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {currentProject ? (
                <NextStepCard
                  title={`Continue ${currentProject.name}`}
                  reason={currentProject.launch_published
                    ? 'Your launch page is live. Check who watched the demo and what they clicked.'
                    : 'Pick up where you left off. The project page shows the one thing to do next.'}
                  cta="Open project"
                  onAction={() => navigate(`/demo-studio/projects/${currentProject.id}`)}
                  secondary={(
                    <button type="button" onClick={openNewProject} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                      Start another project
                    </button>
                  )}
                />
              ) : (
                <NextStepCard
                  title={projectContext.project ? `Make a demo for ${projectContext.project.title}` : 'Make your first demo'}
                  reason={projectContext.icp
                    ? 'The name and story are filled in from your customer profile. Add screenshots next; a one-screen demo can go live.'
                    : 'Name your product, then add screenshots. A one-screen demo can go live, and you can add screens later.'}
                  cta="New project"
                  onAction={openNewProject}
                  secondary={(
                    <Link to="/demo-studio/try" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                      Try a 60-second preview first
                    </Link>
                  )}
                />
              )}

              {listedProjects.length > 0 ? (
                <section className="space-y-3" aria-labelledby="demo-projects-heading">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 id="demo-projects-heading" className="text-lg font-semibold text-foreground">{currentProject ? 'Other demo projects' : 'Your demo projects'}</h2>
                    <span className="text-sm text-muted-foreground">
                      {counts.published} of {counts.total} {counts.total === 1 ? 'demo' : 'demos'} published
                    </span>
                  </div>
                  <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
                    {listedProjects.map((project) => (
                      <li key={project.id}>
                        <Link
                          to={`/demo-studio/projects/${project.id}`}
                          className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/40"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">{project.name}</span>
                            {project.tagline ? <span className="mt-0.5 block truncate text-sm text-muted-foreground">{project.tagline}</span> : null}
                          </span>
                          <span className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                            <span className={project.launch_published ? 'font-medium text-primary' : undefined}>
                              {project.launch_published ? 'Live' : 'Draft'}
                            </span>
                            <span className="hidden sm:inline">Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : currentProject ? null : (
                <ToolEmptyState
                  title="No projects yet"
                  description="A project holds your demos for one product. Later you can add a short pitch video and a launch page to it."
                />
              )}

              <DashboardDisclosure title="How Demo Studio works" summary="Add screens, guide the viewer, preview, share.">
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li><span className="font-medium text-foreground">Add screens.</span> Upload screenshots or capture your product.</li>
                  <li><span className="font-medium text-foreground">Guide the viewer.</span> Write one line under each screen. Add click targets where it helps.</li>
                  <li><span className="font-medium text-foreground">Preview.</span> Click through it the way a viewer will.</li>
                  <li><span className="font-medium text-foreground">Share.</span> Publish to get a link and an embed code, then watch who finishes and clicks.</li>
                </ol>
                <p className="mt-3 text-sm text-muted-foreground">
                  A pitch video and a launch page with a signup form are optional extras once the demo is out.
                </p>
              </DashboardDisclosure>
            </>
          )}
        </ToolPageShell>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="tool-theme-demo">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>Name the product this demo is for. You will add screens next.</DialogDescription>
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
              <Label htmlFor="project-tagline">One line on what it does (optional)</Label>
              <Textarea
                id="project-tagline"
                value={tagline}
                placeholder="Who it is for and what it helps them do."
                rows={2}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={!name.trim() || creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Create and add screens
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
