import { trackPulseInvestorsRecommended } from '@/lib/analytics';
import type { PulseHomeAction } from '@/lib/pulseHome';

/** Records which angel investor cards a Pulse answer showed, if any. */
export function trackInvestorCards(actions: PulseHomeAction[], surface: 'home' | 'widget') {
  const investors = actions.filter(action => action.kind === 'investor');
  if (!investors.length) return;
  trackPulseInvestorsRecommended({
    surface,
    count: investors.length,
    investor_ids: investors.map(action => action.id),
    is_pro: !investors.some(action => action.locked),
  });
}
