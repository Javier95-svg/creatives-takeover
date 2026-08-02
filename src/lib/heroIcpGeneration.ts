import { supabase } from "@/integrations/supabase/client";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";

/**
 * Two-stage ICP generation for the homepage hero.
 *
 * `build_draft` is a single gpt-4o call behind a 38s server abort, which is far
 * too slow to be the only thing a visitor sees after typing one sentence into
 * the homepage. So both stages are started together:
 *
 *   first_slice  gpt-4o-mini, ~2-4s  -> persona, segment, pain, trigger
 *   build_draft  gpt-4o,      ~20-50s -> the full brief
 *
 * The slice renders as real, readable content while the full draft finishes
 * behind it. Neither stage requires an account.
 */

export const FIRST_SLICE_TIMEOUT_MS = 15_000;
export const FULL_DRAFT_TIMEOUT_MS = 65_000;

export interface HeroFirstSlice {
  personaName: string;
  roleLine: string;
  segment: string;
  corePain: string;
  buyingTrigger: string;
}

export class HeroGenerationError extends Error {
  errorCode: string | null;

  constructor(message: string, errorCode: string | null = null) {
    super(message);
    this.name = "HeroGenerationError";
    this.errorCode = errorCode;
  }
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new HeroGenerationError(`${label} timed out`, "TIMEOUT")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Pulls the structured errorCode out of a supabase-js FunctionsHttpError so the
 * caller can distinguish a rate limit from a genuine failure. The body is only
 * readable once, and only on the error's `context` Response.
 */
async function readErrorCode(error: unknown): Promise<string | null> {
  const context = (error as { context?: unknown })?.context;
  if (!context || typeof (context as Response).json !== "function") return null;
  try {
    const body = await (context as Response).clone().json();
    const code = body?.errorCode;
    return typeof code === "string" && code.trim() ? code : null;
  } catch {
    return null;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Stage one. Resolves in a couple of seconds so the hero has something to show. */
export async function generateFirstSlice(description: string): Promise<HeroFirstSlice> {
  const { data, error } = await withTimeout(
    supabase.functions.invoke("icp-analyzer", {
      body: { operation: "first_slice", description },
    }),
    FIRST_SLICE_TIMEOUT_MS,
    "First slice",
  );

  if (error) {
    throw new HeroGenerationError("First slice failed", await readErrorCode(error));
  }

  const slice = (data as { slice?: Partial<HeroFirstSlice> } | null)?.slice;
  // The persona line is the whole point of the stage; without it there is
  // nothing worth rendering and we should wait for the full draft instead.
  if (!slice || !isNonEmptyString(slice.personaName)) {
    throw new HeroGenerationError("First slice returned no persona", "EMPTY_RESPONSE");
  }

  return {
    personaName: slice.personaName,
    roleLine: slice.roleLine ?? "",
    segment: slice.segment ?? "",
    corePain: slice.corePain ?? "",
    buyingTrigger: slice.buyingTrigger ?? "",
  };
}

/** Stage two. The real brief, ungated - the same artifact /icp-builder renders. */
export async function generateFullDraft(description: string): Promise<StoredIcpArtifact> {
  const { data, error } = await withTimeout(
    supabase.functions.invoke("icp-analyzer", {
      body: {
        operation: "build_draft",
        mode: "preview",
        entryMode: "fast",
        fastInput: { description },
      },
    }),
    FULL_DRAFT_TIMEOUT_MS,
    "ICP draft",
  );

  if (error) {
    throw new HeroGenerationError("ICP draft failed", await readErrorCode(error));
  }

  const artifact = (data as { artifact?: StoredIcpArtifact } | null)?.artifact;
  if (!artifact?.draftDocument) {
    throw new HeroGenerationError("ICP draft returned no artifact", "EMPTY_RESPONSE");
  }

  return artifact;
}
