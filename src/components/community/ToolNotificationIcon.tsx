import type { ComponentType } from 'react';
import { FlaskConical, Hammer, LineChart, Radio, TrendingUp, Users } from 'lucide-react';
import { NOTIFICATION_TOOLS, type NotificationTool } from '@/lib/toolNotifications';
import { cn } from '@/lib/utils';

// The same icons the dashboard's journey grid and Insighta section use, on
// each tool's own colour (--tool-* in index.css, light and dark). ICP Builder
// has no tool colour, so it uses the brand primary.
const TOOL_ICON: Record<NotificationTool, { icon: ComponentType<{ className?: string }>; colourVar: string }> = {
  icp_builder: { icon: Users, colourVar: '--primary' },
  demo_studio: { icon: Radio, colourVar: '--tool-demo' },
  pmf_lab: { icon: FlaskConical, colourVar: '--tool-pmf' },
  mvp_builder: { icon: Hammer, colourVar: '--tool-mvp' },
  gtm_strategist: { icon: TrendingUp, colourVar: '--tool-gtm' },
  traction_engine: { icon: LineChart, colourVar: '--tool-traction' },
};

/** A tool's icon in its colour, in place of a person's photo in the bell. */
export function ToolNotificationIcon({ tool, className }: { tool: NotificationTool; className?: string }) {
  const { icon: Icon, colourVar } = TOOL_ICON[tool];
  return (
    <span
      role="img"
      aria-label={NOTIFICATION_TOOLS[tool].name}
      className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', className)}
      style={{ color: `hsl(var(${colourVar}))`, backgroundColor: `hsl(var(${colourVar}) / 0.15)` }}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}
