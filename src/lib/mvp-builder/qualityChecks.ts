import type { MVPPreviewResult, MVPProjectFile } from './project.ts';

export interface MVPQualityChecks {
  project_generated: boolean;
  preview_ready: boolean;
  primary_flow_present: boolean;
  responsive_ui: boolean;
  no_runtime_errors: boolean;
  rollback_support: boolean;
}

export interface MVPQualityResult {
  passed: boolean;
  checks: MVPQualityChecks;
  failures: string[];
}

export function evaluateMvpQuality({
  files,
  preview,
  versionCount,
}: {
  files: MVPProjectFile[];
  preview: MVPPreviewResult;
  versionCount: number;
}): MVPQualityResult {
  const source = files.map((file) => file.content).join('\n');
  const primaryFlowPattern = /<form\b|<button\b|<input\b|onClick\s*=|addEventListener\s*\(|href\s*=|router\.(push|navigate)|navigate\s*\(/i;
  const responsivePattern = /<meta[^>]+viewport|(?:sm|md|lg|xl):[a-z]|@media\s*\(|grid-template-columns|clamp\s*\(/i;

  const checks: MVPQualityChecks = {
    project_generated: files.length > 0,
    preview_ready: preview.canPreview && Boolean(preview.entryFile),
    primary_flow_present: primaryFlowPattern.test(source),
    responsive_ui: responsivePattern.test(source),
    no_runtime_errors: preview.errors.length === 0,
    rollback_support: versionCount > 0,
  };

  const labels: Record<keyof MVPQualityChecks, string> = {
    project_generated: 'Generate the project files.',
    preview_ready: 'Open a working primary preview.',
    primary_flow_present: 'Add one testable customer action such as a form, button, or navigation flow.',
    responsive_ui: 'Add responsive viewport and layout behavior.',
    no_runtime_errors: 'Resolve the current preview or runtime errors.',
    rollback_support: 'Create at least one saved version so the build can be rolled back.',
  };
  const failures = (Object.keys(checks) as Array<keyof MVPQualityChecks>)
    .filter((key) => !checks[key])
    .map((key) => labels[key]);

  return { passed: failures.length === 0, checks, failures };
}
