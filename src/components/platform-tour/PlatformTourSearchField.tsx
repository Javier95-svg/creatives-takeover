import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTourGate } from './PlatformTourGateContext';

/**
 * The header search, shaped like the real one but inert.
 *
 * The product's AccountSearchField would also be inert without a search
 * function, but its module holds a lazy reference to the Live variant and so to
 * the database client. Owning eight lines here keeps the tour's import graph
 * provably clean, and it lets the placeholder say plainly why nothing comes back.
 */
export function PlatformTourSearchField() {
  const openGate = useTourGate();
  return <div className="relative min-w-0 flex-1 md:max-w-sm">
    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      readOnly
      aria-label="Search accounts"
      placeholder="Search people (needs an account)"
      onFocus={() => openGate('account')}
      onClick={() => openGate('account')}
      className="pl-9"
    />
  </div>;
}
