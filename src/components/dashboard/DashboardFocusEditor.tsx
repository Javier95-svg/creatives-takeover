import { useEffect, useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useOnboardingContext } from '@/hooks/useOnboardingContext';
import {
  deriveOnboardingContextV1,
  normalizeWorkingDays,
  WORKING_DAY_OPTIONS,
  type OnboardingAnswersV1,
} from '@/lib/onboardingContext';
import { updateOnboardingFocus } from '@/lib/onboardingSession';
import { cn } from '@/lib/utils';

const GOALS: Array<[OnboardingAnswersV1['primaryGoal'], string]> = [
  ['validate_problem', 'Validate the customer problem'],
  ['win_first_customer', 'Win the first customer'],
  ['reach_three_customers', 'Reach three customers'],
  ['repeatable_growth', 'Find repeatable growth'],
  ['build_product', 'Ship the smallest useful product'],
  ['launch', 'Launch and find a channel'],
  ['raise', 'Prepare for or raise funding'],
];

const BLOCKERS: Array<[OnboardingAnswersV1['blocker'], string]> = [
  ['customer_clarity', 'Customer or problem clarity'],
  ['prospect_access', 'Prospect access'],
  ['messaging', 'Messaging and replies'],
  ['sales_conversion', 'Sales conversion'],
  ['product_delivery', 'Product delivery'],
  ['traction_growth', 'Repeatable traction'],
  ['fundraising', 'Fundraising'],
  ['accountability', 'Accountability'],
  ['team', 'Team or co-founder'],
];

const RUNWAY: Array<[Exclude<OnboardingAnswersV1['runwayMonths'], ''>, string]> = [
  ['under_3', 'Less than 3 months'],
  ['3_6', '3 to 6 months'],
  ['6_12', '6 to 12 months'],
  ['over_12', 'More than 12 months'],
  ['not_applicable', 'Not burning money yet'],
];

const REVENUE: Array<[Exclude<OnboardingAnswersV1['revenueBand'], ''>, string]> = [
  ['none', 'No revenue yet'],
  ['under_1k', 'Under $1k / month'],
  ['1k_10k', '$1k to $10k / month'],
  ['10k_50k', '$10k to $50k / month'],
  ['over_50k', 'Over $50k / month'],
];

export default function DashboardFocusEditor() {
  const { value, loading, refetch } = useOnboardingContext();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<OnboardingAnswersV1 | null>(null);

  useEffect(() => {
    if (value) setDraft(value.answers);
  }, [value]);

  if (loading || !value || !draft) return null;

  const save = async () => {
    const briefLength = draft.startupBrief.trim().length;
    if (briefLength > 0 && briefLength < 20) {
      toast.error('Your startup brief must be at least 20 characters, or left blank.');
      return;
    }
    setSaving(true);
    try {
      const context = deriveOnboardingContextV1(draft, {
        flowVersion: value.context.flowVersion,
        selectedIntent: value.context.selectedIntent,
        dataCompleteness: briefLength >= 20 ? 'complete' : 'legacy_partial',
      });
      await updateOnboardingFocus({
        answers: {
          startupBrief: draft.startupBrief.trim(),
          primaryGoal: draft.primaryGoal,
          blocker: draft.blocker,
          weeklyCapacityHours: draft.weeklyCapacityHours,
          country: draft.country.trim(),
          runwayMonths: draft.runwayMonths,
          revenueBand: draft.revenueBand,
          workingDays: normalizeWorkingDays(draft.workingDays),
        },
        context,
      });
      await refetch();
      setOpen(false);
      toast.success('Command Center focus updated.');
    } catch (error) {
      console.error('Unable to update dashboard focus', error);
      toast.error('We could not update your focus. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Founders whose context was back-derived rather than answered directly get a
  // visible invitation instead of a quiet ghost button: their recommendations
  // are ranked from a lossy approximation until they fill these in.
  const needsTopUp = value.context.dataCompleteness === 'legacy_partial';
  const missing = [
    draft.startupBrief.trim().length < 20 ? 'what you are building' : null,
    draft.runwayMonths ? null : 'your runway',
  ].filter(Boolean) as string[];

  return (
    <div className={needsTopUp && missing.length ? 'mb-6' : '-mt-3 mb-6 flex justify-end'}>
      <Dialog open={open} onOpenChange={setOpen}>
        {needsTopUp && missing.length ? (
          <div className="rounded-card border border-accent-teal/30 bg-accent-teal/5 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
              <p className="text-sm font-semibold">Sharpen your recommendations</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your Command Center is ranking from an estimate. Tell us {missing.join(' and ')} to
                make it specific to you.
              </p>
            </div>
            <DialogTrigger asChild>
              <Button type="button" size="sm" className="mt-3 shrink-0 sm:mt-0">
                Add {missing.length === 1 ? 'it' : 'them'}
              </Button>
            </DialogTrigger>
          </div>
        ) : (
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <Pencil className="h-3.5 w-3.5" />
              Edit focus
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit your Command Center focus</DialogTitle>
            <DialogDescription>
              These changes shape future missions, your operating loop, routine, and recommendation ranking.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label htmlFor="dashboard-startup-brief">What are you building, and who is it for?</Label>
              <Textarea
                id="dashboard-startup-brief"
                value={draft.startupBrief}
                maxLength={280}
                rows={4}
                onChange={(event) => setDraft({ ...draft, startupBrief: event.target.value })}
              />
              <p className="text-right text-xs text-muted-foreground">{draft.startupBrief.trim().length}/280</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>30-day outcome</Label>
                <Select
                  value={draft.primaryGoal}
                  onValueChange={(primaryGoal) => setDraft({
                    ...draft,
                    primaryGoal: primaryGoal as OnboardingAnswersV1['primaryGoal'],
                  })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOALS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Primary blocker</Label>
                <Select
                  value={draft.blocker}
                  onValueChange={(blocker) => setDraft({
                    ...draft,
                    blocker: blocker as OnboardingAnswersV1['blocker'],
                  })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLOCKERS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Weekly execution capacity</Label>
              <Select
                value={String(draft.weeklyCapacityHours ?? 5)}
                onValueChange={(capacity) => setDraft({
                  ...draft,
                  weeklyCapacityHours: Number(capacity) as OnboardingAnswersV1['weeklyCapacityHours'],
                })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">About 2 hours</SelectItem>
                  <SelectItem value="5">About 5 hours</SelectItem>
                  <SelectItem value="10">About 10 hours</SelectItem>
                  <SelectItem value="20">20 or more hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium leading-none">Days you work on this</legend>
              <div className="flex flex-wrap gap-2 pt-1">
                {WORKING_DAY_OPTIONS.map((option) => {
                  const selected = draft.workingDays.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      aria-label={option.label}
                      onClick={() => setDraft({
                        ...draft,
                        workingDays: normalizeWorkingDays(
                          selected
                            ? draft.workingDays.filter((day) => day !== option.value)
                            : [...draft.workingDays, option.value],
                        ),
                      })}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm transition-colors',
                        selected
                          ? 'border-accent-teal bg-accent-teal/15 font-medium text-foreground'
                          : 'border-border text-muted-foreground hover:border-accent-teal/50',
                      )}
                    >
                      {option.short}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Your routine is rebuilt on these days. Leave empty to keep the Monday-to-Friday default.
              </p>
            </fieldset>
            <div className="grid gap-2">
              <Label>Runway</Label>
              <Select
                value={draft.runwayMonths || 'unset'}
                onValueChange={(runway) => setDraft({
                  ...draft,
                  runwayMonths: runway === 'unset'
                    ? ''
                    : runway as OnboardingAnswersV1['runwayMonths'],
                })}
              >
                <SelectTrigger><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Prefer not to say</SelectItem>
                  {RUNWAY.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sets how hard your recommendations push. A short runway prioritizes revenue over polish.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Monthly revenue</Label>
              <Select
                value={draft.revenueBand || 'unset'}
                onValueChange={(band) => setDraft({
                  ...draft,
                  revenueBand: band === 'unset' ? '' : band as OnboardingAnswersV1['revenueBand'],
                })}
              >
                <SelectTrigger><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Prefer not to say</SelectItem>
                  {REVENUE.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sets the starting point for your revenue metric instead of assuming zero.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dashboard-country">Country (optional)</Label>
              <Input
                id="dashboard-country"
                value={draft.country}
                maxLength={100}
                placeholder="Used only for local founder and mentor matching"
                onChange={(event) => setDraft({ ...draft, country: event.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save focus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
