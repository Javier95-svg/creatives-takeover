import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, ExternalLink, IdCard } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { captureEvent } from '@/lib/analytics';
import {
  cohortShowcasePath,
  fetchShowcaseMembership,
  fetchShowcaseSettings,
  setShowcaseOptIn,
  setShowcasePublic,
} from '@/lib/cohortShowcase';

const copyLink = async (path: string) => {
  const url = `${window.location.origin}${path}`;
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Showcase link copied.');
  } catch {
    toast.error(`Copy this link: ${url}`);
  }
};

/**
 * Program staff: switch the cohort's public showcase on or off. Only founders
 * who opt in appear, so staff see how many have.
 */
export function CohortShowcaseStaffCard({ cohortId }: { cohortId: string }) {
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ['cohort-showcase-settings', cohortId],
    retry: false,
    queryFn: () => fetchShowcaseSettings(cohortId),
  });

  const toggle = useMutation({
    mutationFn: (isPublic: boolean) => setShowcasePublic(cohortId, isPublic),
    onSuccess: (result) => {
      captureEvent('cohort_showcase_toggled', { cohort_id: cohortId, public: result.public });
      toast.success(result.public ? 'Showcase is public.' : 'Showcase is hidden.');
      void queryClient.invalidateQueries({ queryKey: ['cohort-showcase-settings', cohortId] });
    },
    onError: () => toast.error('We couldn’t change the showcase. Try again.'),
  });

  // Until the migration runs the functions do not exist: show nothing.
  if (!settings.data) return null;
  const { public: isPublic, slug, optedIn, members } = settings.data;
  const path = slug ? cohortShowcasePath(slug) : null;

  return (
    <Card className="mb-6 border-border/60 bg-card/70">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <IdCard className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <Label htmlFor={`showcase-${cohortId}`} className="text-base font-semibold">Public showcase</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              A public page with the Founder ID of each startup, for demo day or your website. Founders choose whether they appear.
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {optedIn} of {members} {members === 1 ? 'founder has' : 'founders have'} opted in
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {isPublic && path ? (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void copyLink(path)}>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy link
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <a href={path} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open
                </a>
              </Button>
            </>
          ) : null}
          <Switch
            id={`showcase-${cohortId}`}
            checked={isPublic}
            disabled={toggle.isPending}
            onCheckedChange={(value) => toggle.mutate(value)}
            aria-label="Public showcase"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** A founder: choose whether their Founder ID appears on the program's showcase. */
export function CohortShowcaseOptInCard({ cohortId, programName }: { cohortId: string; programName: string }) {
  const queryClient = useQueryClient();
  const membership = useQuery({
    queryKey: ['cohort-showcase-membership', cohortId],
    retry: false,
    queryFn: () => fetchShowcaseMembership(cohortId),
  });

  const toggle = useMutation({
    mutationFn: (optIn: boolean) => setShowcaseOptIn(cohortId, optIn),
    onSuccess: (optIn) => {
      captureEvent('cohort_showcase_opt_in_changed', { opt_in: optIn });
      toast.success(optIn ? 'You appear on the showcase.' : 'You no longer appear on the showcase.');
      void queryClient.invalidateQueries({ queryKey: ['cohort-showcase-membership', cohortId] });
    },
    onError: () => toast.error('We couldn’t save your choice. Try again.'),
  });

  if (!membership.data) return null;
  const { optIn, showcasePublic, slug } = membership.data;

  return (
    <Card className="mt-6 border-border/60 bg-card/70">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <IdCard className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <Label htmlFor={`showcase-opt-in-${cohortId}`} className="text-base font-semibold">
              Appear on the {programName} showcase
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Your Founder ID card on the program’s public page: your name, project, one-line pitch and founder number. Your stage shows only if you made it public.
            </p>
            {!showcasePublic && (
              <p className="mt-1 text-xs text-muted-foreground">The program hasn’t published its showcase yet. Your choice applies when it does.</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {showcasePublic && slug ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={cohortShowcasePath(slug)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> View showcase
              </a>
            </Button>
          ) : null}
          <Switch
            id={`showcase-opt-in-${cohortId}`}
            checked={optIn}
            disabled={toggle.isPending}
            onCheckedChange={(value) => toggle.mutate(value)}
            aria-label={`Appear on the ${programName} showcase`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
