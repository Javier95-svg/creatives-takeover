import { Link } from 'react-router-dom';

import { ProjectSwitcher } from '@/components/workspace/ProjectSwitcher';
import { useWorkspaceFrame } from '@/contexts/WorkspaceFrameContext';
import type { ActiveProjectContext } from '@/hooks/useActiveProjectContext';

// "For {project} · Customer: {ICP segment}", with the project switcher in
// place, so founders can see and change which project a tool is working on
// without leaving it. When the project has no ICP yet, the line says where to
// make one, because every tool pre-fills from it.

const clip = (text: string, max = 90) => (text.length <= max ? text : `${text.slice(0, max - 1).trim()}…`);

export function ToolProjectContext({ context }: { context: ActiveProjectContext }) {
  const inWorkspace = useWorkspaceFrame();
  if (!context.project) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>For</span>
      {inWorkspace ? (
        // The workspace top bar has the switcher on large screens; one is enough.
        <>
          <span className="hidden font-medium text-foreground lg:inline">{context.project.title}</span>
          <span className="lg:hidden"><ProjectSwitcher /></span>
        </>
      ) : (
        <ProjectSwitcher />
      )}
      {context.customerLine ? (
        <span className="text-muted-foreground">· Customer: {clip(context.customerLine)}</span>
      ) : !context.isLoading ? (
        <Link to="/icp-builder" className="font-medium text-primary underline-offset-4 hover:underline">
          · Add your customer profile to pre-fill this
        </Link>
      ) : null}
    </span>
  );
}
