import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Sits in the header utilities slot, where the real shell puts connection
 * requests and messages. A visitor should never have to remember they are in a
 * tour, and the header is the one region that survives every panel change.
 */
export function PlatformTourHeaderBadge() {
  return <Badge
    variant="secondary"
    title="Every name, number and result in this tour belongs to a sample founder. Nothing is saved."
    className="gap-1.5 whitespace-nowrap"
  >
    <Eye aria-hidden="true" className="h-3.5 w-3.5" />
    <span className="hidden sm:inline">Sample workspace</span>
    <span className="sm:hidden">Sample</span>
  </Badge>;
}
