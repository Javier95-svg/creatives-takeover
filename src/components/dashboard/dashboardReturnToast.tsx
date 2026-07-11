import type { ReactElement } from 'react';
import { toast } from 'sonner';

import { ToastAction } from '@/components/ui/toast';
import { trackToolMilestoneDashboardReturnClicked } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';

export const DASHBOARD_RETURN_ROUTE = '/dashboard';
const RETURN_LABEL = 'View command center';

function publishToolMilestone(tool: string) {
  void supabase.functions.invoke('track-activity', {
    body: {
      activity_type: 'tool_milestone_completed',
      activity_data: { tool },
      page_path: typeof window !== 'undefined' ? window.location.pathname : null,
      source_tool: tool,
      source_entity_type: 'tool_milestone',
    },
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ct:tool-milestone', { detail: { tool } }));
  }
}

// Milestone toast with a "View command center" action — the client-side return
// path after a founder completes a key action inside a tool. Sonner variant.
export function showDashboardReturnToast(options: {
  message: string;
  description?: string;
  tool: string;
  navigate: (to: string) => void;
}): void {
  const { message, description, tool, navigate } = options;
  publishToolMilestone(tool);
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
  publishToolMilestone(tool);
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
