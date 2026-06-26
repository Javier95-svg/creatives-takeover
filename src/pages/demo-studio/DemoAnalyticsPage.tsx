import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import DemoAnalyticsPanel from '@/components/demo-studio/analytics/DemoAnalyticsPanel';
import { getDemo } from '@/lib/demoStudio/api';
import type { DemoStudioDemo } from '@/lib/demoStudio/types';

export default function DemoAnalyticsPage() {
  const { projectId, demoId } = useParams<{ projectId: string; demoId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [demo, setDemo] = useState<DemoStudioDemo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?return=/demo-studio/projects');
      return;
    }
    if (!demoId) return;
    let active = true;
    void (async () => {
      try {
        const demoRow = await getDemo(demoId);
        if (!active) return;
        if (!demoRow) {
          toast.error('Demo not found.');
          navigate(`/demo-studio/projects/${projectId}`);
          return;
        }
        setDemo(demoRow);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load demo.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user, demoId, projectId, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${demo?.title ?? 'Demo'} analytics — Demo Studio`} description="See how viewers engage with your interactive demo." noindex url="/demo-studio/projects" />
      <Navigation />

      <main className="container mx-auto max-w-4xl px-4 pt-28 pb-20 md:pt-32">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            to={`/demo-studio/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to project
          </Link>
          <div className="flex items-center gap-2">
            {demo?.status === 'published' && demo.public_id && (
              <Button asChild variant="ghost" size="sm" className="gap-1.5">
                <a href={`/demo/${demo.public_id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> View
                </a>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to={`/demo-studio/projects/${projectId}/demos/${demoId}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="creatives-font text-3xl font-bold md:text-4xl">{demo?.title}</h1>
        </div>

        {demoId && <DemoAnalyticsPanel demoId={demoId} publicId={demo?.public_id} />}
      </main>
    </div>
  );
}
