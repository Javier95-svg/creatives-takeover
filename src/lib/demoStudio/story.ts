import { supabase } from '@/integrations/supabase/client';
import { isDemoStoryDraft, type DemoStoryDraftV1 } from '../../../supabase/functions/_shared/demo-story';
export { demoStoryText, isDemoStoryDraft, type DemoStoryDraftV1 } from '../../../supabase/functions/_shared/demo-story';

export interface DemoStoryRef { artifactId: string; resumeToken: string; expiresAt: string }
const KEY = 'ct_demo_story_v1';

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  let response;
  try { response = await supabase.functions.invoke(name, { body, signal: controller.signal }); }
  finally { clearTimeout(timer); }
  const { data, error } = response;
  if (error) {
    let message = error.message;
    try {
      const details = await (error as { context?: Response }).context?.clone().json();
      if (details?.error) message = details.error;
    } catch { /* SDK message */ }
    throw new Error(message);
  }
  if (!data?.success) throw new Error(data?.error || 'Could not complete this request. Please retry.');
  return data as T;
}

export async function generateDemoStory(description: string): Promise<DemoStoryDraftV1> {
  const result = await invoke<{ draft: unknown }>('demo-studio-generator', {
    draft: true, mode: 'story', description: description.trim(),
  });
  if (!isDemoStoryDraft(result.draft)) throw new Error('The story did not finish. Please retry.');
  return result.draft;
}

export async function createDemoStoryArtifact(draft: DemoStoryDraftV1): Promise<DemoStoryRef> {
  return invoke<DemoStoryRef>('guest-activation-artifacts', {
    operation: 'create_story', draft, source: 'hero-product-story',
  });
}

export async function loadDemoStoryArtifact(resumeToken: string) {
  const result = await invoke<{ draft: unknown; artifactId: string; expiresAt: string }>(
    'guest-activation-artifacts', { operation: 'load_story', resumeToken },
  );
  if (!isDemoStoryDraft(result.draft)) throw new Error('This demo story is unavailable.');
  return { draft: result.draft, ref: { artifactId: result.artifactId, resumeToken, expiresAt: result.expiresAt } };
}

export async function claimDemoStoryArtifact(resumeToken: string): Promise<{ projectId: string }> {
  return invoke('guest-activation-artifacts', { operation: 'claim_story', resumeToken });
}

export function buildDemoStoryResumePath(resumeToken: string): string {
  return `/start/product?guest=${encodeURIComponent(resumeToken)}`;
}

export function persistDemoStory(draft: DemoStoryDraftV1, ref?: DemoStoryRef): void {
  try { localStorage.setItem(KEY, JSON.stringify({ draft, ref, savedAt: Date.now() })); } catch { /* Token URL survives auth. */ }
}

export function readDemoStory(description?: string): { draft: DemoStoryDraftV1; ref?: DemoStoryRef } | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!value || !Number.isFinite(value.savedAt) || Date.now() - value.savedAt > 7 * 86400000
      || !isDemoStoryDraft(value.draft) || (description && value.draft.description !== description)) return null;
    const ref = value.ref;
    if (ref && (typeof ref.resumeToken !== 'string' || typeof ref.artifactId !== 'string'
      || !Number.isFinite(Date.parse(ref.expiresAt)) || Date.parse(ref.expiresAt) <= Date.now())) return null;
    return value;
  } catch { return null; }
}
