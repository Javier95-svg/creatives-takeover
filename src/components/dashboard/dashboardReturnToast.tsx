import type { ReactElement } from 'react';
import { toast } from 'sonner';

import { ToastAction } from '@/components/ui/toast';
import { trackToolMilestoneDashboardReturnClicked } from '@/lib/analytics';

export const DASHBOARD_RETURN_ROUTE = '/dashboard';
const RETURN_LABEL = 'View command center';

// Milestone toast with a "View command center" action — the client-side return
// path after a founder completes a key action inside a tool. Sonner variant.
export function showDashboardReturnToast(options: {
  message: string;
  description?: string;
  tool: string;
  navigate: (to: string) => void;
}): void {
  const { message, description, tool, navigate } = options;
  toast.success(message, {
    description,
    action: {
      label: RETURN_LABEL,
      onClick: () => {
        trackToolMilestoneDashboardReturnClicked({ tool });
        navigate(DASHBOARD_RETURN_ROUTE);
      },
    },
  });
}

// shadcn useToast variant (Tech Stack is the one caller on that system).
export function buildDashboardReturnToastAction(
  tool: string,
  navigate: (to: string) => void,
): ReactElement {
  return (
    <ToastAction
      altText={RETURN_LABEL}
      onClick={() => {
        trackToolMilestoneDashboardReturnClicked({ tool });
        navigate(DASHBOARD_RETURN_ROUTE);
      }}
    >
      {RETURN_LABEL}
    </ToastAction>
  );
}
