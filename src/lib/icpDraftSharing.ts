import { supabase } from "@/integrations/supabase/client";
import type { IcpDraftDocument, StoredIcpArtifact } from "@/lib/icpBuilderSession";

const SHARED_OUTPUTS_TABLE = "bizmap_shared_outputs";

export interface IcpDraftSharedSnapshot {
  documentVersion: 1;
  generatedAt: string;
  draftDocument: IcpDraftDocument;
}

export interface IcpDraftSharedRecord {
  id: string;
  user_id: string;
  source_type: "icp";
  source_id: string;
  slug: string;
  title: string;
  summary: string;
  snapshot: IcpDraftSharedSnapshot;
  visibility: "private" | "unlisted" | "public";
  created_at: string;
  updated_at: string;
  published_at: string;
}

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function createRandomSuffix() {
  return crypto.randomUUID().slice(0, 8);
}

function createShareSlug(title: string) {
  const base = sanitizeSegment(title) || "icp-draft";
  return `icp-${base}-${createRandomSuffix()}`;
}

export function createIcpDraftSharedPayload(artifact: StoredIcpArtifact) {
  const title = `${artifact.draftDocument.customer.personaName} ICP Draft`;
  const summary = artifact.draftDocument.build.valueProposition;
  const snapshot: IcpDraftSharedSnapshot = {
    documentVersion: 1,
    generatedAt: artifact.generatedAt,
    draftDocument: artifact.draftDocument,
  };

  return { title, summary, snapshot };
}

export function getIcpDraftPublicUrl(slug: string) {
  return `${window.location.origin}/icp/${slug}/public`;
}

export async function upsertIcpDraftShare({
  userId,
  sourceId,
  artifact,
}: {
  userId: string;
  sourceId: string;
  artifact: StoredIcpArtifact;
}) {
  const { title, summary, snapshot } = createIcpDraftSharedPayload(artifact);

  const { data: existing, error: existingError } = await supabase
    .from(SHARED_OUTPUTS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("source_type", "icp")
    .eq("source_id", sourceId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { data, error } = await supabase
      .from(SHARED_OUTPUTS_TABLE)
      .update({
        title,
        summary,
        snapshot,
        visibility: existing.visibility === "private" ? "unlisted" : existing.visibility,
        published_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw error;
    return data as IcpDraftSharedRecord;
  }

  const { data, error } = await supabase
    .from(SHARED_OUTPUTS_TABLE)
    .insert({
      user_id: userId,
      source_type: "icp",
      source_id: sourceId,
      slug: createShareSlug(title),
      title,
      summary,
      snapshot,
      visibility: "unlisted",
      published_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as IcpDraftSharedRecord;
}

export async function getIcpDraftShareBySlug(slug: string) {
  const { data, error } = await supabase
    .from(SHARED_OUTPUTS_TABLE)
    .select("*")
    .eq("slug", slug)
    .eq("source_type", "icp")
    .in("visibility", ["unlisted", "public"])
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as IcpDraftSharedRecord | null;
}

export function isIcpDraftSharedSnapshot(value: unknown): value is IcpDraftSharedSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<IcpDraftSharedSnapshot>;
  return snapshot.documentVersion === 1 && Boolean(snapshot.draftDocument?.customer);
}
