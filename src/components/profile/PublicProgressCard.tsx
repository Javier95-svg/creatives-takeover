import { useQuery } from '@tanstack/react-query';
import { Check, PenLine, Route, ShieldCheck, UserCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  buildPublicStages,
  hasPublicEvidence,
  normalizePublicProgress,
  type PublicEvidenceCount,
  type PublicStageRow,
  type StageCheck,
} from '@/lib/publicProgress';
import { cn } from '@/lib/utils';

interface Props {
  username: string;
  name: string;
  isOwnProfile: boolean;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const CHECK_LABEL: Record<StageCheck, string> = {
  verified: 'Verified by CT',
  reviewed: 'Reviewed by an expert',
  founder: 'Founder-reported',
};

// Plain text rather than a pill: seven stage columns leave too little room.
function CheckLabel({ check }: { check: StageCheck }) {
  const Icon = check === 'verified' ? ShieldCheck : check === 'reviewed' ? UserCheck : PenLine;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        check === 'founder' ? 'text-muted-foreground' : 'text-success',
      )}
    >
      <Icon className={cn('h-3 w-3 shrink-0', check === 'founder' && 'md:hidden')} aria-hidden="true" />
      {CHECK_LABEL[check]}
    </span>
  );
}

function StageItem({ row }: { row: PublicStageRow }) {
  return (
    <li className="relative flex items-start gap-3 md:flex-col md:items-center md:gap-2 md:text-center">
      <span
        className={cn(
          'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-card',
          row.status === 'done' && 'border-primary bg-primary text-primary-foreground',
          row.status === 'current' && 'border-primary',
          row.status === 'upcoming' && 'border-border',
          row.status === 'optional' && 'border-dashed border-border',
        )}
        aria-hidden="true"
      >
        {row.status === 'done' && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        {row.status === 'current' && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 md:flex-col md:gap-1">
        <p className={cn('text-sm font-semibold', (row.status === 'upcoming' || row.status === 'optional') && 'font-medium text-muted-foreground')}>
          {row.label}
        </p>
        {row.status === 'done' && row.completedAt && (
          <p className="text-xs tabular-nums text-muted-foreground">{formatDate(row.completedAt)}</p>
        )}
        {row.status === 'done' && row.check && <CheckLabel check={row.check} />}
        {row.status === 'current' && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">In progress</span>
        )}
        {row.status === 'upcoming' && <p className="text-xs text-muted-foreground">Not started</p>}
        {row.status === 'optional' && <p className="text-xs text-muted-foreground">Optional</p>}
      </div>
      <span className="sr-only">
        {row.status === 'done' ? `Completed${row.check ? `, ${CHECK_LABEL[row.check]}` : ''}` : row.status === 'current' ? 'In progress' : row.status === 'optional' ? 'Optional' : 'Not started'}
      </span>
    </li>
  );
}

function EvidenceTile({ value, label, verifiedLabel }: { value: PublicEvidenceCount; label: string; verifiedLabel: string }) {
  if (value.total === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-border/70 px-4 py-3">
      <p className="text-2xl font-bold tabular-nums leading-tight">{value.total.toLocaleString()}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {value.verified > 0 ? (
        <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          {value.verified === value.total
            ? verifiedLabel
            : `${value.verified.toLocaleString()} ${verifiedLabel.charAt(0).toLowerCase()}${verifiedLabel.slice(1)}`}
        </span>
      ) : (
        <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          <PenLine className="h-3 w-3" aria-hidden="true" />
          Founder-reported
        </span>
      )}
    </div>
  );
}

/**
 * Opt-in progress on a founder profile: the Startup Development Cycle stages
 * and counts of customer evidence, labelled by who checked them. Nobody sees
 * it, the owner included, until the founder switches on "Show my progress
 * publicly" in Edit Founder ID.
 */
export function PublicProgressCard({ username, name, isOwnProfile }: Props) {
  const { user } = useAuth();
  const progress = useQuery({
    queryKey: ['public-founder-progress', username, user?.id ?? null],
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('public_founder_progress_v1' as never, { p_username: username } as never);
      // Until its migration runs the function does not exist; the card stays hidden.
      if (error) return null;
      return normalizePublicProgress(data);
    },
  });

  const data = progress.data;
  if (!data || !data.visible) return null;

  const stages = buildPublicStages(data);
  const firstName = name.split(' ')[0] || name;

  return (
    <Card className="mb-6 flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="public-progress-heading" className="flex items-center gap-2 text-base font-semibold">
            <Route className="h-4 w-4 text-primary" aria-hidden="true" />
            Progress
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Startup Development Cycle</p>
        </div>
        {isOwnProfile && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Visible to everyone
          </span>
        )}
      </div>

      <ol className="relative flex flex-col gap-3.5 before:absolute before:bottom-3 before:left-3 before:top-3 before:w-0.5 before:-translate-x-1/2 before:bg-border md:grid md:grid-cols-7 md:gap-2 md:before:bottom-auto md:before:left-14 md:before:right-14 md:before:h-0.5 md:before:w-auto md:before:translate-x-0 md:before:-translate-y-1/2">
        {stages.map((row) => <StageItem key={row.stage} row={row} />)}
      </ol>

      {hasPublicEvidence(data) && (
        <div className="grid gap-3 sm:grid-cols-3">
          <EvidenceTile value={data.evidence.interviews} label="customer interviews" verifiedLabel="Verified by CT" />
          <EvidenceTile value={data.evidence.commitments} label="customer commitments" verifiedLabel="Verified" />
          <EvidenceTile value={data.evidence.payments} label="customer payments" verifiedLabel="Verified" />
        </div>
      )}

      <p className="max-w-3xl text-xs text-muted-foreground">
        Verified means Creatives Takeover recorded it or imported it from a connected tool. Founder-reported means {firstName} completed the step or entered the evidence, and nobody has checked it yet.
      </p>
    </Card>
  );
}
