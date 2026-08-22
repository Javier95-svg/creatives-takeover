import { supabase } from "@/integrations/supabase/client";
import type { IcpDraftDocument, StoredIcpArtifact } from "@/lib/icpBuilderSession";
import { buildIcpScoreCard, isIcpScoreCard, type IcpScoreCard } from "@/lib/icpScoreCard";

const SHARED_OUTPUTS_TABLE = "bizmap_shared_outputs";

export interface IcpDraftSharedSnapshot {
  documentVersion: 1;
  generatedAt: string;
  draftDocument: IcpDraftDocument;
  /**
   * The verdict as it stood when this link was created.
   *
   * Absent on links shared before the card existed, so every reader must fall
   * back to recomputing from draftDocument rather than assuming it is there.
   */
  scoreCard?: IcpScoreCard;
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
    scoreCard: buildIcpScoreCard(artifact.draftDocument, {
      idea: artifact.founderInputs.fastDescription,
      generatedAt: artifact.generatedAt,
    }),
  };

  return { title, summary, snapshot };
}

export function getIcpDraftPublicUrl(slug: string) {
  return `${window.location.origin}/icp/${slug}/public`;
}

/**
 * Publish an account holder's score card.
 *
 * Kept separate from upsertIcpDraftShare, which snapshots the whole draft. The
 * shareable unit is the score, so this row carries ONLY the card: the public
 * page fetches its snapshot from the browser, and a snapshot containing the
 * draft would be readable by anyone with the link no matter what renders.
 *
 * source_type "icp_score" rather than "icp" so the two can never be confused
 * by a reader, an OG renderer, or a future query.
 */
export async function upsertIcpScoreShare({
  userId,
  sourceId,
  card,
}: {
  userId: string;
  sourceId: string;
  card: IcpScoreCard;
}) {
  const title = `Idea score ${card.displayScore}/100`;
  const summary = card.idea ?? card.roleLine;

  const { data: existing, error: existingError } = await supabase
    .from(SHARED_OUTPUTS_TABLE)
    .select("id, slug, visibility")
    .eq("user_id", userId)
    .eq("source_type", "icp_score")
    .eq("source_id", sourceId)
    .maybeSingle();
  if (existingError) throw existingError;

  // Reuse the slug so a link already posted keeps resolving.
  if (existing) {
    const { error } = await supabase
      .from(SHARED_OUTPUTS_TABLE)
      .update({
        title,
        summary,
        snapshot: { scoreCard: card },
        visibility: existing.visibility === "private" ? "unlisted" : existing.visibility,
        published_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", userId);
    if (error) throw error;
    return existing.slug as string;
  }

  const slug = buildScoreSlug(card.idea ?? card.roleLine);
  const { error } = await supabase.from(SHARED_OUTPUTS_TABLE).insert({
    user_id: userId,
    source_type: "icp_score",
    source_id: sourceId,
    slug,
    title,
    summary,
    snapshot: { scoreCard: card },
    visibility: "unlisted",
    published_at: new Date().toISOString(),
  });
  if (error) throw error;
  return slug;
}

/** Reads a published score card by slug. Returns only the card. */
export async function getIcpScoreShareBySlug(slug: string): Promise<IcpScoreCard | null> {
  const { data, error } = await supabase
    .from(SHARED_OUTPUTS_TABLE)
    .select("snapshot")
    .eq("slug", slug)
    .eq("source_type", "icp_score")
    .in("visibility", ["unlisted", "public"])
    .maybeSingle();
  if (error || !data) return null;
  const card = (data.snapshot as { scoreCard?: unknown } | null)?.scoreCard;
  return isIcpScoreCard(card) ? card : null;
}

/**
 * Mirrors buildScoreSlug in guest-activation-artifacts, so a score link looks
 * the same whether it was published before or after signup.
 */
function buildScoreSlug(idea: string | null) {
  const words = (idea ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean);
  const stem = words.slice(0, 8).join("-").slice(0, 60).replace(/-+$/g, "");
  return stem ? `${stem}-${createRandomSuffix()}` : `score-${createRandomSuffix()}${createRandomSuffix()}`;
}

export function getIcpScorePublicUrl(slug: string) {
  return `${window.location.origin}/idea/${slug}`;
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
