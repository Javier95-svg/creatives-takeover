import type { ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getCohortRate,
  PRODUCT_CATEGORY_LABELS,
  type RetentionWindowStatus,
  type TractionProductCategory,
  type TractionRetentionInput,
} from '@/lib/tractionEngine';

// Cohort retention in plain words: of the people who started in one week, how
// many came back. A window that has not closed yet shows as "still open" and is
// left out of the score.

const numberFromInput = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const formatWeek = (weekStart: string) => {
  const date = new Date(`${weekStart}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? weekStart
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

interface TractionRetentionCardProps {
  retention: TractionRetentionInput;
  cohortWeekStart: string;
  sevenDayStatus: RetentionWindowStatus;
  thirtyDayStatus: RetentionWindowStatus;
  platformVisitors: number | null;
  onChange: (patch: Partial<TractionRetentionInput>) => void;
}

export function TractionRetentionCard({
  retention,
  cohortWeekStart,
  sevenDayStatus,
  thirtyDayStatus,
  platformVisitors,
  onChange,
}: TractionRetentionCardProps) {
  const scored = { ...retention, sevenDayStatus, thirtyDayStatus };
  const sevenRate = getCohortRate(scored, 'sevenDay');
  const thirtyRate = getCohortRate(scored, 'thirtyDay');
  const tooMany = retention.sevenDayActiveUsers > retention.newUsers || retention.thirtyDayActiveUsers > retention.newUsers;
  const windowHint = (status: RetentionWindowStatus, rate: number | null) =>
    status === 'pending' ? 'Still open. Not counted yet.' : rate === null ? 'Add the number who started.' : `${Math.round(rate * 100)}% came back.`;

  return (
    <section className="space-y-5 rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Are people coming back?</h3>
        <p className="text-sm text-muted-foreground">
          Pick a week, count the people who started that week, then count how many of them came back.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Week they started" htmlFor="traction-cohort-week" hint={`Week of ${formatWeek(cohortWeekStart)}`}>
          <Input
            id="traction-cohort-week"
            type="date"
            value={cohortWeekStart}
            onChange={(event) => onChange({ cohortWeekStart: event.target.value })}
          />
        </Field>
        <Field label="People who started" htmlFor="traction-cohort-size">
          <Input id="traction-cohort-size" type="number" min="0" value={retention.newUsers}
            onChange={(event) => onChange({ newUsers: numberFromInput(event.target.value) })} />
        </Field>
        <div />
        <Field label="Came back within 7 days" htmlFor="traction-returned-7" hint={windowHint(sevenDayStatus, sevenRate)}>
          <Input id="traction-returned-7" type="number" min="0" value={retention.sevenDayActiveUsers}
            onChange={(event) => onChange({ sevenDayActiveUsers: numberFromInput(event.target.value) })} />
        </Field>
        <Field label="Came back within 30 days" htmlFor="traction-returned-30" hint={windowHint(thirtyDayStatus, thirtyRate)}>
          <Input id="traction-returned-30" type="number" min="0" value={retention.thirtyDayActiveUsers}
            onChange={(event) => onChange({ thirtyDayActiveUsers: numberFromInput(event.target.value) })} />
        </Field>
      </div>
      {tooMany && (
        <p className="text-sm text-destructive">More people came back than started. Count only people from that starting week.</p>
      )}

      <div className="grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-3">
        <Field label="Main channel this week" htmlFor="traction-primary-channel">
          <Input id="traction-primary-channel" value={retention.primaryAcquisitionChannel}
            onChange={(event) => onChange({ primaryAcquisitionChannel: event.target.value })}
            placeholder="e.g. LinkedIn posts" />
        </Field>
        <Field label="Product type">
          <Select value={retention.productCategory} onValueChange={(value) => onChange({ productCategory: value as TractionProductCategory })}>
            <SelectTrigger aria-label="Product type"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PRODUCT_CATEGORY_LABELS) as TractionProductCategory[]).map((category) => (
                <SelectItem key={category} value={category}>{PRODUCT_CATEGORY_LABELS[category]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Revenue this week (optional)" htmlFor="traction-revenue">
          <Input id="traction-revenue" type="number" min="0" value={retention.revenue ?? ''}
            onChange={(event) => onChange({ revenue: event.target.value ? numberFromInput(event.target.value) : undefined })} />
        </Field>
      </div>

      {platformVisitors !== null && (
        <p className="text-xs text-muted-foreground">
          Your published MVP site has recorded {platformVisitors} visitor{platformVisitors === 1 ? '' : 's'}. Use your analytics to count the people from one starting week.
        </p>
      )}
    </section>
  );
}
