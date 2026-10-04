import { unsupportedRequest } from './mvp-capabilities.ts';

export type BuilderAction = 'generation' | 'targeted_edit' | 'debug' | 'add_page' | 'add_feature' | 'design_overhaul' | 'chat';

/** The same capability boundary is used for client quotes and paid server actions. */
export function classifyBuilderAction(input: string, hasProject: boolean): BuilderAction | 'unclear' | 'unsupported' {
  const text = input.trim().toLowerCase();
  if (!text) return 'unclear';
  if (unsupportedRequest(text)) return 'unsupported';
  if (!hasProject) return 'generation';
  if (/\b(error|bug|broken|fix|doesn'?t work|not working|console|crash)\b/.test(text)) return 'debug';
  if (/\b(add|create|build)\b.{0,40}\b(page|route|screen)\b|\b(new page|new route|another screen)\b/.test(text)) return 'add_page';
  if (/\b(add|build|create|implement)\b.*\b(feature|flow|component|wizard|form|dashboard|table|chart|modal|settings|auth|database|sign.in|request|record)\b/.test(text)) return 'add_feature';
  if (/\b(redesign|design overhaul|make it beautiful|modernize|visual refresh|new look|polish the design|theme|brand|rebrand|palette|colou?r scheme|aesthetic|look and feel|skin care|skincare)\b/.test(text)) return 'design_overhaul';
  return 'targeted_edit';
}
