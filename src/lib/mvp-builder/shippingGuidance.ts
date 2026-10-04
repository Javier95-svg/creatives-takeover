import type { MVPBuildBrief } from '../../../supabase/functions/_shared/mvp-build-brief.ts';
import { buildBriefErrors } from '../../../supabase/functions/_shared/mvp-build-brief.ts';
import { automaticWorkflow, launchRequirement } from '../../../supabase/functions/_shared/mvp-builder-journey.ts';

export type ShippingAction = 'save' | 'availability' | 'build' | 'check' | 'publish';
export function shippingGuidance(input: {
  brief: MVPBuildBrief; hasFiles: boolean; saveError: string | null;
  workerAvailable: boolean | null; canPublish: boolean;
}) {
  const issues = buildBriefErrors(input.brief).map(message =>
    message === 'Complete the customer.' ? 'Tell us who will use this app.' :
    message === 'Complete the task.' ? 'Describe the main task your customer should complete.' :
    message === 'Complete the idea.' ? 'Describe the app you want to build.' : message);
  const launchBlocker = launchRequirement(input.brief, !!automaticWorkflow(input.brief));
  const checkable = !launchBlocker;
  let action: ShippingAction;
  if (input.saveError) action = 'save';
  else if (input.workerAvailable === false && (input.brief.delivery === 'connected' || input.hasFiles && checkable)) action = 'availability';
  else if (!input.hasFiles) action = 'build';
  else if (input.canPublish && checkable) action = 'publish';
  else action = 'check';
  const disabled = issues.length > 0 || (action === 'build' && input.brief.delivery === 'connected' && input.workerAvailable !== true) ||
    (action === 'check' && (!checkable || input.workerAvailable !== true));
  return { action, disabled: action === 'save' || action === 'availability' ? false : disabled, issues, launchBlocker };
}

const checks: Record<string, string> = {
  customer_task: 'Main customer task', database_write: 'Records saved to the database',
  persisted_after_reload: 'Records survive reload', access_control: 'Private account access',
  failed_write: 'Failed submissions show an error', requester_status: 'Requester sees the saved status',
  owner_only_status: 'Only the owner changes status', responsive_ui: 'Mobile layout',
  no_runtime_errors: 'No runtime errors during checks', cta_navigation: 'Main button reaches its destination',
};
export function completedCheckLabels(assertions: Record<string, boolean>): string[] {
  return Object.entries(checks).filter(([key]) => assertions[key] === true).map(([, label]) => label);
}
