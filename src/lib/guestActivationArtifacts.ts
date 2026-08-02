import { supabase } from "@/integrations/supabase/client";
import type { TryDraft } from "@/lib/demoStudio/tryDraft";

export interface DemoGuestArtifactRef {
  artifactId: string;
  resumeToken: string;
  expiresAt: string;
}

async function invoke<T>(body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke("guest-activation-artifacts", { body });
  if (error) {
    let message = error.message;
    try {
      const payload = await (error as { context?: Response }).context?.clone().json();
      if (typeof payload?.error === "string") message = payload.error;
    } catch {
      // Use the SDK error message.
    }
    throw new Error(message);
  }
  return data as T;
}

export async function createDemoGuestArtifact(draft: TryDraft, source: string): Promise<DemoGuestArtifactRef> {
  const result = await invoke<Partial<DemoGuestArtifactRef> & { success?: boolean; error?: string }>({
    operation: "create_demo",
    draft,
    source,
  });
  if (!result.success || !result.artifactId || !result.resumeToken || !result.expiresAt) {
    throw new Error(result.error || "Could not preserve this demo.");
  }
  return result as DemoGuestArtifactRef;
}

export async function loadDemoGuestArtifact(resumeToken: string) {
  const result = await invoke<{ success?: boolean; draft?: TryDraft; artifactId?: string; expiresAt?: string; error?: string }>({
    operation: "load_demo",
    resumeToken,
  });
  if (!result.success || !result.draft) throw new Error(result.error || "This demo result is unavailable.");
  return result;
}

export async function claimDemoGuestArtifact(resumeToken: string, nativeArtifactId: string) {
  const result = await invoke<{ success?: boolean; error?: string }>({
    operation: "claim_demo",
    resumeToken,
    nativeArtifactId,
  });
  if (!result.success) throw new Error(result.error || "Could not claim this demo result.");
  return result;
}

export async function publishGuestActivationArtifact(
  resumeToken: string,
  nativeArtifactId: string,
  shareSlug: string,
) {
  const result = await invoke<{ success?: boolean; shareSlug?: string; error?: string }>({
    operation: "publish",
    resumeToken,
    nativeArtifactId,
    shareSlug,
  });
  if (!result.success) throw new Error(result.error || "Could not link this public artifact.");
  return result;
}
