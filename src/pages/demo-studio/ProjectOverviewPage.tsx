import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { FinishSetupPrompt } from '@/components/onboarding/FinishSetupPrompt';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { NextStepCard } from '@/components/tool-shell/NextStepCard';
import { ToolPageShell } from '@/components/tool-shell/ToolPageShell';
import DemoStoryboardWallpaper, { DemoStoryboardChart } from '@/components/wallpapers/DemoStoryboardWallpaper';
import { useAuth } from '@/contexts/AuthContext';
import { applyStoryboardToDemo, createDemo, deleteDemo, getBrief, getDemoMetrics, getProject, listDemos, listVsls } from '@/lib/demoStudio/api';
import { getDemoProjectNextStep } from '@/lib/demoStudio/nextStep';
import type { DemoMetrics, DemoStudioBrief, DemoStudioDemo, DemoStudioProject, DemoStudioVsl } from '@/lib/demoStudio/types';
import { trackActivationFunnelEvent } from '@/lib/activationEntry';
import { trackJourneyEvent } from '@/lib/journeyOutcomes';
import { trackDemoStudioFunnel } from '@/lib/analytics';
import { buildEmbedSnippet } from '@/lib/demoStudio/share';

const linkClass = 'text-sm font-medium text-primary underline-offset-4 hover:underline';

export default function ProjectOverviewPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState<DemoStudioProject | null>(null);
  const [brief, setBrief] = useState<DemoStudioBrief | null>(null);
  const [demos, setDemos] = useState<DemoStudioDemo[]>([]);
  const [vsls, setVsls] = useState<DemoStudioVsl[]>([]);
  const [metrics, setMetrics] = useState<DemoMetrics | null>(null);
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
        const [projectRow, demoRows, vslRows, briefRow] = await Promise.all([
          getProject(projectId),
          listDemos(projectId),
          listVsls(projectId),
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
        // Results decide whether the next step is sharing or the launch page.
        const live = demoRows.find((demo) => demo.status === 'published' && demo.public_id);
        if (live) {
          const result = await getDemoMetrics(live.id, 'all').catch(() => null);
          if (active) setMetrics(result);
        }
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
      const demo = await createDemo(projectId, user.id, `${project?.name ?? 'Product'} demo`);
      navigate(`/demo-studio/projects/${projectId}/demos/${demo.id}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create demo.');
      setCreating(false);
    }
  };

  const handleCreateGuidedDemo = async () => {
    if (!user || !projectId || !brief?.ai_storyboard?.length) return;
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

  const handleDeleteDemo = async (demo: DemoStudioDemo) => {
    if (!window.confirm(`Delete "${demo.title}"? ${demo.status === 'published' ? 'Its public link will stop working.' : 'This cannot be undone.'}`)) return;
    const prev = demos;
    setDemos((d) => d.filter((item) => item.id !== demo.id));
    try {
      await deleteDemo(demo.id);
      toast.success('Demo deleted.');
    } catch {
      setDemos(prev);
      toast.error('Could not delete demo.');
    }
  };

  const publishedDemo = demos.find((demo) => demo.status === 'published' && demo.public_id);
  const draftDemo = demos.find((demo) => demo.status !== 'published') ?? demos[0];
  const hasVsl = vsls.some((vsl) => vsl.loom_embed_url || vsl.loom_shared_url || vsl.video_url);
  const hasStoryboard = Boolean(brief?.ai_storyboard?.length);
  const briefStarted = Boolean(brief?.audience?.trim() || brief?.problem?.trim() || brief?.product_promise?.trim());
  const arrivedFromTry = searchParams.get('source') === 'demo-try' || project?.acquisition_source === 'demo-try';
  const tryAssetMode = publishedDemo?.asset_mode ?? (
    searchParams.get('assetMode') === 'generated_placeholders'
      ? 'generated_placeholders'
      : 'uploaded_screenshots'
  );
  const shareUrl = publishedDemo?.public_id && typeof window !== 'undefined'
    ? `${window.location.origin}/demo/${publishedDemo.public_id}`
    : '';

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // A denied clipboard permission must not report success or advance the funnel.
      toast.error('Could not copy the link.');
      return;
    }
    toast.success('Link copied. Send it to people who have the problem.');
    trackActivationFunnelEvent('activation_step_completed', {
      entry_id: 'demo_try',
      tool: 'demo_studio',
      source: 'demo_try',
      step: 'second_meaningful_action',
      is_authenticated: true,
      artifact_type: 'interactive_proof_page',
      artifact_id: publishedDemo?.id,
      action: 'copy_share_link',
    });
    trackJourneyEvent('journey_next_stage_started', {
      tool: 'demo_studio',
      artifact_type: 'interactive_proof_page',
      artifact_id: publishedDemo?.id,
      source: 'demo_try',
      action: 'copy_share_link',
    });
  };
  // Deliberately does not fire activation_step_completed: copyShareLink already claims
  // that step, and a second button claiming it would inflate the activation funnel.
  const copyEmbedSnippet = async () => {
    if (!publishedDemo?.public_id) return;
    try {
      await navigator.clipboard.writeText(buildEmbedSnippet(publishedDemo.public_id, publishedDemo.title));
      toast.success('Embed code copied. Paste it into your site.');
      trackDemoStudioFunnel('demo_shared', {
        demoId: publishedDemo.id,
        surface: 'embed',
        location: 'overview',
      });
    } catch {
      toast.error('Could not copy the embed code.');
    }
  };

  const nextStep = getDemoProjectNextStep({
    demoCount: demos.length,
    hasPublishedDemo: Boolean(publishedDemo),
    hasViews: (metrics?.uniqueViewers ?? 0) > 0,
    launchPublished: Boolean(project?.launch_published),
  });

  const runNextStep = () => {
    if (!nextStep || !projectId) return;
    if (nextStep.action === 'start_demo') void handleCreateBlankDemo();
    else if (nextStep.action === 'finish_demo' && draftDemo) navigate(`/demo-studio/projects/${projectId}/demos/${draftDemo.id}/edit`);
    else if (nextStep.action === 'share_demo') void copyShareLink();
    else if (nextStep.action === 'add_launch_page') navigate(`/demo-studio/projects/${projectId}/launch`);
  };

  const nextStepLinks = !nextStep ? null : nextStep.action === 'start_demo' ? (
    hasStoryboard ? (
      <button type="button" className={linkClass} onClick={() => void handleCreateGuidedDemo()} disabled={creating}>
        Start from your brief&apos;s storyboard
      </button>
    ) : (
      <Link to={`/demo-studio/projects/${projectId}/brief`} className={linkClass}>Plan the story first (optional)</Link>
    )
  ) : nextStep.action === 'share_demo' ? (
    <>
      <button type="button" className={linkClass} onClick={() => void copyEmbedSnippet()}>Copy embed code</button>
      <Link to="/pmf-lab" className={linkClass}>Ask viewers the demand question in PMF Lab</Link>
      {arrivedFromTry && publishedDemo ? (
        <Link to={`/demo-studio/projects/${projectId}/demos/${publishedDemo.id}/edit`} className={linkClass}>
          {tryAssetMode === 'generated_placeholders' ? 'Replace the sample frames with screenshots' : 'Refine screens and click targets'}
        </Link>
      ) : null}
    </>
  ) : nextStep.action === 'add_launch_page' && !hasVsl ? (
    <Link to={`/demo-studio/projects/${projectId}/vsl`} className={linkClass}>Record the pitch video first</Link>
  ) : null;

  const extras = [
    {
      label: 'Story brief',
      status: briefStarted ? 'Started' : 'Optional',
      detail: 'Who the demo is for and the moment it should land. Can draft screens for you.',
      to: `/demo-studio/projects/${projectId}/brief`,
      action: briefStarted ? 'Edit brief' : 'Write a brief',
    },
    {
      label: 'Pitch video',
      status: hasVsl ? `${vsls.length} saved` : 'Not recorded',
      detail: 'A short Loom of you explaining the product. Needed for the launch page.',
      to: `/demo-studio/projects/${projectId}/vsl`,
      action: hasVsl ? 'Open pitch videos' : 'Record a pitch video',
    },
    {
      label: 'Launch page',
      status: project?.launch_published ? 'Live' : 'Not published',
      detail: 'Your demo, pitch video and a signup form on one link.',
      to: `/demo-studio/projects/${projectId}/launch`,
      action: project?.launch_published ? 'Edit launch page' : 'Build launch page',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${project?.name ?? 'Project'} | Demo Studio`} description="Manage your demos, pitch videos, and launch page." noindex url="/demo-studio/projects" />
      <Navigation />
      <main>
        <ToolPageShell
          title={project?.name ?? 'Project'}
          purpose={project?.tagline || 'Your click-through demo, and what to do with it next.'}
          context={(
            <Link to="/demo-studio/projects" className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All projects
            </Link>
          )}
          theme="demo"
          wallpaper={<DemoStoryboardWallpaper />}
          headerArt={<DemoStoryboardChart />}
        >
          {loading ? (
            <div className="flex justify-center py-16" role="status" aria-label="Loading project">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {arrivedFromTry ? <FinishSetupPrompt surface="demo_project" /> : null}

              {nextStep ? (
                <NextStepCard
                  title={nextStep.title}
                  reason={nextStep.reason}
                  cta={nextStep.cta}
                  onAction={runNextStep}
                  disabled={creating}
                  secondary={nextStepLinks}
                />
              ) : null}

              {publishedDemo && metrics ? (
                <section className="rounded-xl border border-border/60 bg-card p-4 sm:p-5" aria-labelledby="demo-results-heading">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 id="demo-results-heading" className="text-base font-semibold text-foreground">Results so far</h2>
                    <Link to={`/demo-studio/projects/${projectId}/demos/${publishedDemo.id}/analytics`} className={linkClass}>See full results</Link>
                  </div>
                  {metrics.uniqueViewers > 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {metrics.uniqueViewers} {metrics.uniqueViewers === 1 ? 'person' : 'people'} opened the demo, {metrics.completions} watched to the end, and {metrics.ctaClicks} clicked your end button.
                      {' '}Views show interest, not that people will pay.
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Nobody has opened the demo yet. Results appear here as soon as someone does.</p>
                  )}
                </section>
              ) : null}

              <section className="space-y-3" aria-labelledby="demo-list-heading">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 id="demo-list-heading" className="text-lg font-semibold text-foreground">Demos</h2>
                  {demos.length > 0 ? (
                    <button type="button" className={linkClass} onClick={() => void handleCreateBlankDemo()} disabled={creating}>
                      Start another demo
                    </button>
                  ) : null}
                </div>
                {demos.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    No demos yet. Starting one opens the editor, where you add screenshots.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
                    {demos.map((demo) => (
                      <li key={demo.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{demo.title}</p>
                          <p className="text-sm text-muted-foreground">{demo.status === 'published' ? 'Published' : 'Draft'}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
                          {demo.status === 'published' && demo.public_id ? (
                            <a href={`/demo/${demo.public_id}`} target="_blank" rel="noopener noreferrer" className={linkClass}>View</a>
                          ) : null}
                          {demo.status === 'published' ? (
                            <Link to={`/demo-studio/projects/${projectId}/demos/${demo.id}/analytics`} className={linkClass}>Results</Link>
                          ) : null}
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/demo-studio/projects/${projectId}/demos/${demo.id}/edit`}>Edit</Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => void handleDeleteDemo(demo)}
                            aria-label={`Delete ${demo.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-3" aria-labelledby="demo-extras-heading">
                <div>
                  <h2 id="demo-extras-heading" className="text-lg font-semibold text-foreground">After you share</h2>
                  <p className="text-sm text-muted-foreground">Optional. Add these once people are watching the demo.</p>
                </div>
                <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
                  {extras.map((item) => (
                    <li key={item.label} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {item.label} <span className="font-normal text-muted-foreground">· {item.status}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                      <Link to={item.to} className={linkClass}>{item.action}</Link>
                    </li>
                  ))}
                </ul>
                {project?.launch_published && project.slug ? (
                  <a href={`/p/${project.slug}`} target="_blank" rel="noopener noreferrer" className={linkClass}>Open the live launch page</a>
                ) : null}
              </section>
            </>
          )}
        </ToolPageShell>
      </main>
      <Footer />
    </div>
  );
}
