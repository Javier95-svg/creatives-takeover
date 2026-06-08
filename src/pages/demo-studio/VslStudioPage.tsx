import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Rocket, Video } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import VslStudio from '@/components/demo-studio/vsl/VslStudio';
import { getProject, listVsls } from '@/lib/demoStudio/api';
import type { DemoStudioProject, DemoStudioVsl } from '@/lib/demoStudio/types';

export default function VslStudioPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<DemoStudioProject | null>(null);
  const [vsls, setVsls] = useState<DemoStudioVsl[]>([]);
  const [loading, setLoading] = useState(true);

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
        const [projectRow, vslRows] = await Promise.all([getProject(projectId), listVsls(projectId)]);
        if (!active) return;
        if (!projectRow) {
          toast.error('Project not found.');
          navigate('/demo-studio/projects');
          return;
        }
        setProject(projectRow);
        setVsls(vslRows);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not load VSL Studio.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user, projectId, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${project?.name ?? 'Project'} VSL Studio`} description="Record and manage up to three Video Sales Letter variations." noindex />
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
              <Video className="h-3.5 w-3.5" /> VSL Studio
            </span>
            <h1 className="creatives-font mt-3 text-3xl font-bold md:text-4xl">Record the pitch behind the demo</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Save up to three Loom variations. Use different hooks or CTAs, then choose the primary version for the launch page.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link to={`/demo-studio/projects/${projectId}/launch`}>
              Launch page <Rocket className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {projectId && user && (
          <VslStudio projectId={projectId} ownerId={user.id} initialVsls={vsls} onChange={setVsls} />
        )}
      </main>
    </div>
  );
}
