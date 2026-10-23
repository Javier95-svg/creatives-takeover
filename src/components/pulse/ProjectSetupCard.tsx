import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FolderUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import { updateUserPreferences } from '@/lib/retentionSystem';

/**
 * Founders' counterpart to the Builder path: bring the project in from a deck
 * or the website once. Shown until Project setup is saved or dismissed.
 */
export function ProjectSetupCard({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['project-setup-card', user?.id];
  const status = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase.schema('public').from('profiles').select('user_preferences').eq('id', user!.id).maybeSingle();
      const preferences = (data?.user_preferences ?? {}) as Record<string, unknown>;
      return Boolean(preferences.project_import_completed_at || preferences.project_import_dismissed_at);
    },
  });

  if (status.isPending || status.data !== false) return null;

  const dismiss = () => {
    captureEvent('project_setup_card_dismissed');
    queryClient.setQueryData(queryKey, true);
    if (user) void updateUserPreferences(user.id, { project_import_dismissed_at: new Date().toISOString() }).catch(() => undefined);
  };

  return (
    <section aria-labelledby="project-setup-card-title" className="mx-auto mb-8 max-w-xl text-left">
      <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
        <p id="project-setup-card-title" className="flex items-center gap-2 text-sm font-semibold">
          <FolderUp className="h-4 w-4 text-primary" aria-hidden="true" />
          Bring your project in
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your pitch deck, a one-pager or your website. We draft your project's details for you to check and can add them to your Founder ID.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { captureEvent('project_setup_card_opened'); navigate('/project-setup'); }}>
            Set up my project<ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
        </div>
      </div>
    </section>
  );
}

export default ProjectSetupCard;
