// Demo Studio data-access layer. Uses the Supabase client directly; RLS on the
// demo_studio_* tables is the authoritative access control. Table names are cast
// with `as any` because the generated DB types don't include these tables yet.
import { supabase } from '@/integrations/supabase/client';
import type {
  CaptureMethod,
  DemoStudioProject,
  DemoStudioAiKit,
  DemoStudioBrief,
  DemoStudioDemo,
  DemoStudioStep,
  DemoStudioHotspot,
  DemoStudioLaunchPage,
  DemoMetrics,
  DemoStepFunnelRow,
  DemoStudioMetrics,
  DemoStudioMetricsWindow,
  DemoStudioReadiness,
  DemoStudioVsl,
  DemoStudioWebhookDelivery,
  DemoStudioStoryboardStep,
  DemoStepWithHotspots,
  DemoTheme,
  HotspotAction,
  HotspotType,
  PublicLaunchPage,
  PublicDemo,
} from './types';
import { DEFAULT_DEMO_STUDIO_CTA, getDefaultBrief, normalizeAiKit, normalizeProjectSlug, normalizeStoryboard } from './brief';
import { deriveTryProductName, normalizeTryStepCount, type DemoStudioTryStepCount } from './tryPreview';
import {
  calculateSignupRate,
  canAddVsl,
  getLaunchPublishMissing,
  getNextVslLabel,
  normalizeLoomUrl,
} from './vsl';
import { canPublishDemo, getPublishedDemoCap } from './plan';
import { normalizePlan } from '@/config/planPermissions';
import { trackDemoStudioFunnel } from '@/lib/analytics';

const PROJECTS = 'demo_studio_projects' as any;
const DEMOS = 'demo_studio_demos' as any;
const STEPS = 'demo_studio_demo_steps' as any;
const HOTSPOTS = 'demo_studio_demo_hotspots' as any;
const BRIEFS = 'demo_studio_briefs' as any;
const VSLS = 'demo_studio_vsls' as any;
const LAUNCH_PAGES = 'demo_studio_launch_pages' as any;
const SIGNUPS = 'demo_studio_signups' as any;
const EVENTS = 'demo_studio_events' as any;
const WEBHOOK_DELIVERIES = 'demo_studio_webhook_deliveries' as any;

const ASSET_BUCKET = 'demo-assets';
const PUBLIC_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function shortId(length = 9): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += PUBLIC_ID_ALPHABET[Math.floor(Math.random() * PUBLIC_ID_ALPHABET.length)];
  }
  return out;
}

function slugify(value: string): string {
  const base = normalizeProjectSlug(value).slice(0, 48);
  return `${base || 'demo'}-${shortId(5)}`;
}

export { normalizeProjectSlug };

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('No data returned');
  return result.data;
}

/* -------------------------------------------------------------------------- */
/* Projects                                                                    */
/* -------------------------------------------------------------------------- */

export async function listProjects(ownerId: string): Promise<DemoStudioProject[]> {
  const { data, error } = await supabase
    .from(PROJECTS)
    .select('*')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DemoStudioProject[];
}

export async function getProject(id: string): Promise<DemoStudioProject | null> {
  const { data, error } = await supabase.from(PROJECTS).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as DemoStudioProject) ?? null;
}

export async function createProject(
  ownerId: string,
  fields: { name: string; tagline?: string; category?: string },
): Promise<DemoStudioProject> {
  const result = await supabase
    .from(PROJECTS)
    .insert({
      owner_id: ownerId,
      name: fields.name,
      tagline: fields.tagline ?? null,
      category: fields.category ?? null,
    } as any)
    .select('*')
    .single();
  const project = unwrap(result) as unknown as DemoStudioProject;
  trackDemoStudioFunnel('demo_project_created', { projectId: project.id, hasCategory: Boolean(fields.category) });
  return project;
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<DemoStudioProject, 'name' | 'tagline' | 'logo_url' | 'category' | 'slug'>>,
): Promise<void> {
  const { error } = await supabase.from(PROJECTS).update(patch as any).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from(PROJECTS).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function isLaunchSlugAvailable(slug: string, currentProjectId?: string | null): Promise<boolean> {
  const normalized = normalizeProjectSlug(slug);
  if (!normalized) return false;
  let query = supabase.from(PROJECTS).select('id').eq('slug', normalized).limit(1);
  if (currentProjectId) query = query.neq('id', currentProjectId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).length === 0;
}

/* -------------------------------------------------------------------------- */
/* Demo brief                                                                  */
/* -------------------------------------------------------------------------- */

export async function getBrief(projectId: string): Promise<DemoStudioBrief | null> {
  const { data, error } = await supabase
    .from(BRIEFS)
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as DemoStudioBrief) ?? null;
}

export async function getOrCreateBrief(
  project: DemoStudioProject,
  ownerId: string,
): Promise<DemoStudioBrief> {
  const existing = await getBrief(project.id);
  if (existing) return existing;
  const result = await supabase
    .from(BRIEFS)
    .insert({
      project_id: project.id,
      owner_id: ownerId,
      product_promise: project.tagline,
      primary_cta_label: DEFAULT_DEMO_STUDIO_CTA,
      tone: 'conversational',
      product_stage: 'prototype',
      demo_goal: 'collect_signups',
      ai_storyboard: [],
      ai_vsl_scripts: [],
      ai_launch_copy: {
        headlines: [],
        subheadline: '',
        cta_label: DEFAULT_DEMO_STUDIO_CTA,
        proof_bullets: [],
        success_message: 'You are on the early access list.',
      },
    } as any)
    .select('*')
    .single();
  return unwrap(result) as unknown as DemoStudioBrief;
}

export async function updateBrief(
  projectId: string,
  ownerId: string,
  patch: Partial<Pick<
    DemoStudioBrief,
    | 'audience'
    | 'problem'
    | 'product_promise'
    | 'aha_moment'
    | 'primary_cta_label'
    | 'primary_cta_url'
    | 'tone'
    | 'product_stage'
    | 'demo_goal'
    | 'ai_storyboard'
    | 'ai_vsl_scripts'
    | 'ai_launch_copy'
  >>,
): Promise<DemoStudioBrief> {
  const existing = await getBrief(projectId);
  if (!existing) {
    const result = await supabase
      .from(BRIEFS)
      .insert({
        project_id: projectId,
        owner_id: ownerId,
        primary_cta_label: DEFAULT_DEMO_STUDIO_CTA,
        tone: 'conversational',
        product_stage: 'prototype',
        demo_goal: 'collect_signups',
        ...patch,
      } as any)
      .select('*')
      .single();
    return unwrap(result) as unknown as DemoStudioBrief;
  }
  const result = await supabase
    .from(BRIEFS)
    .update(patch as any)
    .eq('project_id', projectId)
    .select('*')
    .single();
  return unwrap(result) as unknown as DemoStudioBrief;
}

export async function generateDemoStudioKit(args: {
  mode: 'full_kit' | 'storyboard' | 'vsl_scripts' | 'launch_copy';
  project: Pick<DemoStudioProject, 'id' | 'name' | 'tagline' | 'category'>;
  brief: Partial<DemoStudioBrief>;
}): Promise<DemoStudioAiKit> {
  const { data, error } = await supabase.functions.invoke('demo-studio-generator', {
    body: args,
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Could not generate Demo Studio drafts.');
  trackDemoStudioFunnel('demo_brief_generated', { projectId: args.project.id, mode: args.mode });
  return normalizeAiKit(data.kit);
}

// supabase-js wraps non-2xx function responses in a FunctionsHttpError whose
// `.message` is generic; our structured `{ error }` body (e.g. the rate-limit
// message) lives on the original Response at `.context`.
async function readFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (ctx instanceof Response) {
    try {
      const payload = await ctx.clone().json();
      if (payload && typeof payload.error === 'string' && payload.error) return payload.error;
    } catch {
      // Non-JSON body; fall through to the generic message.
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Anonymous lead-magnet generation for /demo-studio/try. Calls the generator's
 * draft path (no auth, no credit charge, no persistence) and returns normalized
 * storyboard steps to render captions/hotspot labels client-side. A pasted URL
 * is optional context only; visuals come from the visitor's uploaded screenshots.
 */
export interface DemoStudioDraftStoryboardResult {
  steps: DemoStudioStoryboardStep[];
  /** Server-reported reason when the hard-coded fallback storyboard was used. */
  fallbackReason: string | null;
}

export async function generateDemoStudioDraftStoryboard(args: {
  contextUrl?: string;
  productName?: string;
  /** Zero-asset mode: a one-line product description standing in for screenshots. */
  description?: string;
  stepCount?: DemoStudioTryStepCount;
}): Promise<DemoStudioDraftStoryboardResult> {
  const trimmedUrl = args.contextUrl?.trim() || '';
  let host = '';
  if (trimmedUrl) {
    try {
      host = new URL(/^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`)
        .hostname.replace(/^www\./, '');
    } catch {
      host = '';
    }
  }
  const name = deriveTryProductName(trimmedUrl, args.productName);
  const stepCount = normalizeTryStepCount(args.stepCount);
  const brief = getDefaultBrief({ name });
  const description = args.description?.trim() || '';
  if (description) {
    brief.product_promise = description.slice(0, 300);
  } else if (trimmedUrl) {
    brief.product_promise = brief.product_promise || `Product shown at ${host || trimmedUrl}`;
  }

  const { data, error } = await supabase.functions.invoke('demo-studio-generator', {
    body: {
      draft: true,
      mode: 'storyboard',
      stepCount,
      project: { id: 'try', name, tagline: null, category: null },
      brief,
    },
  });
  if (error) throw new Error(await readFunctionErrorMessage(error, 'Could not generate your demo preview.'));
  if (!data?.success) throw new Error(data?.error || 'Could not generate your demo preview.');
  return {
    steps: normalizeStoryboard(data.kit?.storyboard),
    fallbackReason: typeof data.fallbackReason === 'string' ? data.fallbackReason : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Demos                                                                       */
/* -------------------------------------------------------------------------- */

export async function listDemos(projectId: string): Promise<DemoStudioDemo[]> {
  const { data, error } = await supabase
    .from(DEMOS)
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DemoStudioDemo[];
}

export async function getDemo(id: string): Promise<DemoStudioDemo | null> {
  const { data, error } = await supabase.from(DEMOS).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as DemoStudioDemo) ?? null;
}

export async function createDemo(
  projectId: string,
  ownerId: string,
  title: string,
): Promise<DemoStudioDemo> {
  const result = await supabase
    .from(DEMOS)
    .insert({ project_id: projectId, owner_id: ownerId, title } as any)
    .select('*')
    .single();
  const demo = unwrap(result) as unknown as DemoStudioDemo;
  trackDemoStudioFunnel('demo_created', { projectId, demoId: demo.id });
  return demo;
}

export async function updateDemo(
  id: string,
  patch: Partial<{ title: string; theme: DemoTheme; status: string; capture_method: CaptureMethod }>,
): Promise<void> {
  const { error } = await supabase.from(DEMOS).update(patch as any).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function publishDemo(
  id: string,
  opts?: { ownerId?: string; ownerPlan?: string },
): Promise<DemoStudioDemo> {
  const existing = await getDemo(id);
  const [steps, hotspots] = await Promise.all([listSteps(id), listHotspotsForDemo(id)]);
  const stepIds = new Set(steps.map((step) => step.id));
  const brokenHotspot = hotspots.find((hotspot) => {
    const action = hotspot.action;
    if (!Number.isFinite(hotspot.x) || !Number.isFinite(hotspot.y) || !Number.isFinite(hotspot.w) || !Number.isFinite(hotspot.h)) return true;
    if (hotspot.w <= 0 || hotspot.h <= 0 || hotspot.x < 0 || hotspot.y < 0 || hotspot.x + hotspot.w > 1 || hotspot.y + hotspot.h > 1) return true;
    if (action === 'goto') return !hotspot.action_target || !stepIds.has(hotspot.action_target);
    if (action === 'url') {
      try {
        const url = new URL(hotspot.action_target ?? '');
        return !['http:', 'https:'].includes(url.protocol);
      } catch {
        return true;
      }
    }
    return action !== 'next';
  });
  const incompleteStep = steps.find((step) => (
    !step.asset_url?.trim()
    || /placeholder/i.test(step.asset_url)
    || !step.caption?.trim()
  ));
  if (steps.length < 2 || incompleteStep || brokenHotspot || hotspots.length === 0) {
    throw new Error('Complete at least two captioned steps and fix every hotspot before publishing.');
  }
  // Free-tier cap: enforce only when transitioning draft -> published (republish
  // of an already-public demo is never blocked). Mirrors Arcade's free ceiling.
  if (existing && existing.status !== 'published' && opts?.ownerId) {
    const { published } = await getOwnerDemoCounts(opts.ownerId);
    if (!canPublishDemo(opts.ownerPlan, published)) {
      const cap = getPublishedDemoCap(opts.ownerPlan);
      throw new Error(`Your plan allows ${cap} published demos. Upgrade to publish more.`);
    }
  }
  const publicId = existing?.public_id || shortId();
  const update: Record<string, unknown> = { status: 'published', public_id: publicId };
  // Snapshot the owner's plan so public renders can enforce the watermark without
  // reading the owner's tier (not exposed to anon). Only write when provided.
  if (opts?.ownerPlan) {
    update.theme = { ...(existing?.theme ?? {}), ownerPlan: normalizePlan(opts.ownerPlan) };
  }
  const result = await supabase
    .from(DEMOS)
    .update(update as any)
    .eq('id', id)
    .select('*')
    .single();
  const published = unwrap(result) as unknown as DemoStudioDemo;
  if (existing?.status !== 'published') {
    trackDemoStudioFunnel('demo_published', { demoId: id, projectId: published.project_id });
  }
  return published;
}

export async function unpublishDemo(id: string): Promise<void> {
  const { error } = await supabase.from(DEMOS).update({ status: 'draft' } as any).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteDemo(id: string): Promise<void> {
  const { error } = await supabase.from(DEMOS).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Owner-wide counts for the "getting started" checklist on the dashboard. */
export async function getOwnerDemoCounts(ownerId: string): Promise<{ total: number; published: number }> {
  // One round trip: fetch the owner's demo statuses (small, plan-capped set) and
  // derive both counts client-side instead of issuing two count queries.
  const { data, error } = await supabase
    .from(DEMOS)
    .select('status')
    .eq('owner_id', ownerId);
  if (error) {
    console.error('getOwnerDemoCounts failed:', error.message);
    return { total: 0, published: 0 };
  }
  const rows = (data ?? []) as Array<{ status: string | null }>;
  return { total: rows.length, published: rows.filter((row) => row.status === 'published').length };
}

/* -------------------------------------------------------------------------- */
/* Steps                                                                       */
/* -------------------------------------------------------------------------- */

export async function listSteps(demoId: string): Promise<DemoStudioStep[]> {
  const { data, error } = await supabase
    .from(STEPS)
    .select('*')
    .eq('demo_id', demoId)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DemoStudioStep[];
}

export async function createStep(
  demoId: string,
  position: number,
  asset: { url?: string | null; width?: number | null; height?: number | null; title?: string | null; caption?: string | null; speaker_notes?: string | null; type?: 'image' | 'html' },
): Promise<DemoStudioStep> {
  const result = await supabase
    .from(STEPS)
    .insert({
      demo_id: demoId,
      position,
      asset_type: asset.type ?? 'image',
      asset_url: asset.url ?? null,
      asset_width: asset.width ?? null,
      asset_height: asset.height ?? null,
      asset_captured_at: asset.url ? new Date().toISOString() : null,
      title: asset.title ?? `Step ${position + 1}`,
      caption: asset.caption ?? null,
      speaker_notes: asset.speaker_notes ?? null,
    } as any)
    .select('*')
    .single();
  return unwrap(result) as unknown as DemoStudioStep;
}

export async function applyStoryboardToDemo(
  demoId: string,
  storyboard: DemoStudioStoryboardStep[],
  startPosition: number,
): Promise<DemoStepWithHotspots[]> {
  const created: DemoStepWithHotspots[] = [];
  let position = startPosition;
  for (const item of storyboard) {
    const step = await createStep(demoId, position, {
      title: item.title,
      caption: item.caption,
      speaker_notes: item.speaker_notes,
    });
    created.push({ ...step, hotspots: [] });
    position += 1;
  }
  return created;
}

export async function updateStep(
  id: string,
  patch: Partial<Pick<DemoStudioStep, 'title' | 'caption' | 'speaker_notes' | 'position' | 'asset_type' | 'asset_url' | 'asset_width' | 'asset_height' | 'asset_captured_at'>>,
): Promise<void> {
  const { error } = await supabase.from(STEPS).update(patch as any).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Replace a step's screenshot in place (anti-staleness). Uploads the new image and
 * updates the asset fields + asset_captured_at. Hotspots are stored normalized 0–1,
 * so they keep their positions over the new image — no rebuild needed.
 */
export async function replaceStepAsset(
  stepId: string,
  ownerId: string,
  file: File,
): Promise<{ asset_url: string; asset_width: number | null; asset_height: number | null; asset_captured_at: string }> {
  const asset = await uploadStepAsset(ownerId, file);
  const asset_captured_at = new Date().toISOString();
  await updateStep(stepId, {
    asset_type: 'image',
    asset_url: asset.url,
    asset_width: asset.width,
    asset_height: asset.height,
    asset_captured_at,
  });
  return { asset_type: 'image' as const, asset_url: asset.url, asset_width: asset.width, asset_height: asset.height, asset_captured_at };
}

export async function duplicateStep(step: DemoStepWithHotspots, position: number): Promise<DemoStepWithHotspots> {
  const result = await supabase
    .from(STEPS)
    .insert({
      demo_id: step.demo_id,
      position,
      asset_type: step.asset_type ?? 'image',
      asset_url: step.asset_url,
      asset_width: step.asset_width,
      asset_height: step.asset_height,
      asset_captured_at: step.asset_captured_at ?? null,
      title: step.title ? `${step.title} copy` : `Step ${position + 1}`,
      caption: step.caption,
      speaker_notes: step.speaker_notes,
    } as any)
    .select('*')
    .single();
  const newStep = unwrap(result) as unknown as DemoStudioStep;
  const hotspots = await Promise.all(
    step.hotspots.map((hotspot) =>
      createHotspot(newStep.id, {
        x: hotspot.x,
        y: hotspot.y,
        w: hotspot.w,
        h: hotspot.h,
        type: hotspot.type,
        action: hotspot.action,
        label: hotspot.label ?? undefined,
        action_target: hotspot.action_target ?? undefined,
      }),
    ),
  );
  return { ...newStep, hotspots };
}

export async function persistStepOrder(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from(STEPS).update({ position: index } as any).eq('id', id),
    ),
  );
}

export async function deleteStep(id: string): Promise<void> {
  const { error } = await supabase.from(STEPS).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* Hotspots                                                                    */
/* -------------------------------------------------------------------------- */

export async function listHotspotsForDemo(demoId: string): Promise<DemoStudioHotspot[]> {
  const steps = await listSteps(demoId);
  if (steps.length === 0) return [];
  const { data, error } = await supabase
    .from(HOTSPOTS)
    .select('*')
    .in(
      'step_id',
      steps.map((s) => s.id),
    );
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DemoStudioHotspot[];
}

export async function createHotspot(
  stepId: string,
  fields: {
    x: number;
    y: number;
    w: number;
    h: number;
    type?: HotspotType;
    action?: HotspotAction;
    label?: string;
    action_target?: string;
  },
): Promise<DemoStudioHotspot> {
  const result = await supabase
    .from(HOTSPOTS)
    .insert({
      step_id: stepId,
      x: fields.x,
      y: fields.y,
      w: fields.w,
      h: fields.h,
      type: fields.type ?? 'hotspot',
      action: fields.action ?? 'next',
      label: fields.label ?? null,
      action_target: fields.action_target ?? null,
    } as any)
    .select('*')
    .single();
  return unwrap(result) as unknown as DemoStudioHotspot;
}

export async function updateHotspot(
  id: string,
  patch: Partial<Pick<DemoStudioHotspot, 'x' | 'y' | 'w' | 'h' | 'label' | 'type' | 'action' | 'action_target'>>,
): Promise<void> {
  const { error } = await supabase.from(HOTSPOTS).update(patch as any).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteHotspot(id: string): Promise<void> {
  const { error } = await supabase.from(HOTSPOTS).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* VSLs                                                                        */
/* -------------------------------------------------------------------------- */

export async function listVsls(projectId: string): Promise<DemoStudioVsl[]> {
  const { data, error } = await supabase
    .from(VSLS)
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DemoStudioVsl[];
}

export async function createVsl(
  projectId: string,
  ownerId: string,
  fields: {
    variation_label?: string;
    title?: string;
    hook?: string;
    script?: string;
    script_outline?: string[];
    loom_shared_url?: string;
    loom_embed_url?: string | null;
    loom_video_id?: string | null;
    thumbnail_url?: string | null;
    duration_seconds?: number | null;
    target_duration_seconds?: number | null;
  },
): Promise<DemoStudioVsl> {
  const existing = await listVsls(projectId);
  if (!canAddVsl(existing.length)) {
    throw new Error('A project can have at most 3 VSL variations.');
  }
  const fromUrl = fields.loom_shared_url ? normalizeLoomUrl(fields.loom_shared_url) : null;
  const result = await supabase
    .from(VSLS)
    .insert({
      project_id: projectId,
      owner_id: ownerId,
      variation_label: fields.variation_label || getNextVslLabel(existing.map((vsl) => vsl.variation_label)),
      title: fields.title?.trim() || null,
      hook: fields.hook?.trim() || null,
      script: fields.script?.trim() || null,
      script_outline: fields.script_outline ?? [],
      loom_video_id: fields.loom_video_id ?? fromUrl?.videoId ?? null,
      loom_shared_url: fromUrl?.sharedUrl ?? fields.loom_shared_url ?? null,
      loom_embed_url: fields.loom_embed_url ?? fromUrl?.embedUrl ?? null,
      thumbnail_url: fields.thumbnail_url ?? null,
      duration_seconds: fields.duration_seconds ?? null,
      target_duration_seconds: fields.target_duration_seconds ?? null,
      is_primary: existing.length === 0,
    } as any)
    .select('*')
    .single();
  return unwrap(result) as unknown as DemoStudioVsl;
}

export async function updateVsl(
  id: string,
  patch: Partial<Pick<DemoStudioVsl, 'variation_label' | 'title' | 'hook' | 'script' | 'script_outline' | 'loom_shared_url' | 'loom_embed_url' | 'thumbnail_url' | 'duration_seconds' | 'target_duration_seconds' | 'is_primary'>>,
): Promise<void> {
  const normalizedPatch = { ...patch };
  if (patch.loom_shared_url) {
    const parsed = normalizeLoomUrl(patch.loom_shared_url);
    normalizedPatch.loom_shared_url = parsed.sharedUrl;
    normalizedPatch.loom_embed_url = patch.loom_embed_url ?? parsed.embedUrl;
  }
  const { error } = await supabase.from(VSLS).update(normalizedPatch as any).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setPrimaryVsl(projectId: string, id: string): Promise<void> {
  const { error: resetError } = await supabase.from(VSLS).update({ is_primary: false } as any).eq('project_id', projectId);
  if (resetError) throw new Error(resetError.message);
  const { error } = await supabase.from(VSLS).update({ is_primary: true } as any).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteVsl(id: string): Promise<void> {
  const { error } = await supabase.from(VSLS).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* Launch pages + readiness                                                    */
/* -------------------------------------------------------------------------- */

export async function getLaunchPage(projectId: string): Promise<DemoStudioLaunchPage | null> {
  const { data, error } = await supabase
    .from(LAUNCH_PAGES)
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as DemoStudioLaunchPage) ?? null;
}

export async function getOrCreateLaunchPage(
  project: DemoStudioProject,
  ownerId: string,
): Promise<DemoStudioLaunchPage> {
  const existing = await getLaunchPage(project.id);
  if (existing) return existing;
  const result = await supabase
    .from(LAUNCH_PAGES)
    .insert({
      project_id: project.id,
      owner_id: ownerId,
      headline: project.name,
      subheadline: project.tagline,
      cta_label: DEFAULT_DEMO_STUDIO_CTA,
      theme: { primaryColor: '#6366f1', background: 'dark', layoutStyle: 'split', successMessage: 'You are on the early access list.' },
    } as any)
    .select('*')
    .single();
  return unwrap(result) as unknown as DemoStudioLaunchPage;
}

export async function updateLaunchPage(
  projectId: string,
  ownerId: string,
  patch: Partial<Pick<DemoStudioLaunchPage, 'headline' | 'subheadline' | 'cta_label' | 'primary_demo_id' | 'primary_vsl_id' | 'theme' | 'lead_webhook_url' | 'lead_notify_enabled'>>,
): Promise<DemoStudioLaunchPage> {
  const existing = await getLaunchPage(projectId);
  if (!existing) {
    const result = await supabase
      .from(LAUNCH_PAGES)
      .insert({ project_id: projectId, owner_id: ownerId, ...patch } as any)
      .select('*')
      .single();
    return unwrap(result) as unknown as DemoStudioLaunchPage;
  }
  const result = await supabase
    .from(LAUNCH_PAGES)
    .update(patch as any)
    .eq('project_id', projectId)
    .select('*')
    .single();
  return unwrap(result) as unknown as DemoStudioLaunchPage;
}

export async function getProjectReadiness(projectId: string): Promise<DemoStudioReadiness> {
  const [project, demos, vsls, launchPage, brief] = await Promise.all([
    getProject(projectId),
    listDemos(projectId),
    listVsls(projectId),
    getLaunchPage(projectId),
    getBrief(projectId),
  ]);
  const publishedDemoCount = demos.filter((demo) => demo.status === 'published').length;
  const attachedVslCount = vsls.filter((vsl) => vsl.loom_embed_url || vsl.loom_shared_url || vsl.video_url).length;
  const vslCount = vsls.length;
  const missing = getLaunchPublishMissing({
    hasPublishedDemo: publishedDemoCount > 0,
    hasVsl: attachedVslCount > 0,
  });
  if (!launchPage?.headline?.trim()) missing.push('Add a launch page headline.');
  if (!launchPage?.subheadline?.trim()) missing.push('Add a launch page subheadline.');
  if (!launchPage?.cta_label?.trim()) missing.push('Set the launch page CTA.');
  return {
    hasPublishedDemo: publishedDemoCount > 0,
    hasVsl: attachedVslCount > 0,
    hasBrief: Boolean(brief?.audience && brief.product_promise && brief.aha_moment),
    hasHeadline: Boolean(launchPage?.headline?.trim()),
    hasSubheadline: Boolean(launchPage?.subheadline?.trim()),
    hasCta: Boolean(launchPage?.cta_label?.trim()),
    hasSlug: Boolean(project?.slug?.trim()),
    publishedDemoCount,
    vslCount,
    canPublishLaunchPage: missing.length === 0,
    missing,
  };
}

export async function publishLaunchPage(project: DemoStudioProject, ownerId: string): Promise<DemoStudioProject> {
  const [readiness, demos, vsls, launchPage] = await Promise.all([
    getProjectReadiness(project.id),
    listDemos(project.id),
    listVsls(project.id),
    getOrCreateLaunchPage(project, ownerId),
  ]);
  if (!readiness.canPublishLaunchPage) {
    throw new Error(readiness.missing.join(' '));
  }
  const primaryDemoId =
    launchPage.primary_demo_id || demos.find((demo) => demo.status === 'published')?.id || null;
  const playableVsls = vsls.filter((vsl) => vsl.loom_embed_url || vsl.loom_shared_url || vsl.video_url);
  const selectedLaunchVsl = playableVsls.find((vsl) => vsl.id === launchPage.primary_vsl_id);
  const primaryVslId =
    selectedLaunchVsl?.id || playableVsls.find((vsl) => vsl.is_primary)?.id || playableVsls[0]?.id || null;

  await updateLaunchPage(project.id, ownerId, {
    primary_demo_id: primaryDemoId,
    primary_vsl_id: primaryVslId,
  });

  const result = await supabase
    .from(PROJECTS)
    .update({
      launch_published: true,
      slug: project.slug || slugify(project.name),
    } as any)
    .eq('id', project.id)
    .select('*')
    .single();
  return unwrap(result) as unknown as DemoStudioProject;
}

export async function unpublishLaunchPage(projectId: string): Promise<void> {
  const { error } = await supabase
    .from(PROJECTS)
    .update({ launch_published: false } as any)
    .eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function getPublicLaunchPage(slug: string): Promise<PublicLaunchPage | null> {
  const { data: projectRow, error: projectError } = await supabase
    .from(PROJECTS)
    .select('*')
    .eq('slug', slug)
    .eq('launch_published', true)
    .maybeSingle();
  if (projectError) throw new Error(projectError.message);
  if (!projectRow) return null;
  const project = projectRow as unknown as DemoStudioProject;

  const { data: launchRow, error: launchError } = await supabase
    .from(LAUNCH_PAGES)
    .select('*')
    .eq('project_id', project.id)
    .maybeSingle();
  if (launchError) throw new Error(launchError.message);
  if (!launchRow) return null;
  const launchPage = launchRow as unknown as DemoStudioLaunchPage;

  const { data: demoRows, error: demoError } = await supabase
    .from(DEMOS)
    .select('*')
    .eq('project_id', project.id)
    .eq('status', 'published')
    .order('created_at', { ascending: true });
  if (demoError) throw new Error(demoError.message);
  const demos = (demoRows ?? []) as unknown as DemoStudioDemo[];
  const selectedDemo =
    demos.find((demo) => demo.id === launchPage.primary_demo_id) ?? demos[0] ?? null;
  const demo = selectedDemo?.public_id ? await getPublicDemo(selectedDemo.public_id) : null;

  const { data: vslRows, error: vslError } = await supabase
    .from(VSLS)
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: true });
  if (vslError) throw new Error(vslError.message);
  const vsls = (vslRows ?? []) as unknown as DemoStudioVsl[];
  const playableVsls = vsls.filter((row) => row.loom_embed_url || row.loom_shared_url || row.video_url);
  const vsl = playableVsls.find((row) => row.id === launchPage.primary_vsl_id) ?? playableVsls.find((row) => row.is_primary) ?? playableVsls[0] ?? null;

  return { project, launchPage, demo, vsl };
}

/**
 * Public launch-page signup. Routed through the demo-studio-lead edge function so
 * the signup insert, the analytics event, the owner email notification, and the
 * outbound webhook dispatch all happen server-side (the webhook URL is never
 * exposed to the browser). The function de-dupes repeat emails and never fails the
 * visitor on a bad/slow webhook.
 */
export async function createLaunchSignup(
  projectId: string,
  email: string,
  fields: { referrer?: string | null; vslVariationSeen?: string | null } = {},
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('demo-studio-lead', {
    body: {
      projectId,
      email: email.trim().toLowerCase(),
      referrer: fields.referrer ?? null,
      vslVariationSeen: fields.vslVariationSeen ?? null,
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Could not record your signup.');
  trackDemoStudioFunnel('demo_lead_captured', { projectId });
}

/** Owner-only: send a sample payload to a webhook URL to confirm lead routing works. */
export async function testLeadWebhook(projectId: string, webhookUrl: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('demo-studio-lead', {
    body: { test: true, projectId, webhookUrl },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'The webhook did not accept the test.');
}

/** Recent webhook delivery attempts for a project (owner-read via RLS). */
export async function getWebhookDeliveries(projectId: string, limit = 10): Promise<DemoStudioWebhookDelivery[]> {
  const { data, error } = await supabase
    .from(WEBHOOK_DELIVERIES)
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DemoStudioWebhookDelivery[];
}

function getMetricsWindowStart(window: DemoStudioMetricsWindow): string | null {
  if (window === 'all') return null;
  const days = window === '7d' ? 7 : 30;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export async function getProjectMetrics(projectId: string, window: DemoStudioMetricsWindow = 'all'): Promise<DemoStudioMetrics> {
  const since = getMetricsWindowStart(window);
  let eventsQuery = supabase.from(EVENTS).select('type, vsl_id, meta, created_at').eq('project_id', projectId);
  let signupsQuery = supabase.from(SIGNUPS).select('vsl_variation_seen, created_at').eq('project_id', projectId);
  if (since) {
    eventsQuery = eventsQuery.gte('created_at', since);
    signupsQuery = signupsQuery.gte('created_at', since);
  }
  const [{ data: eventsData, error: eventsError }, { data: signupData, error: signupError }] = await Promise.all([
    eventsQuery,
    signupsQuery,
  ]);
  if (eventsError) throw new Error(eventsError.message);
  if (signupError) throw new Error(signupError.message);

  const events = (eventsData ?? []) as Array<{ type: string; vsl_id: string | null; meta: Record<string, unknown> | null }>;
  const signups = (signupData ?? []) as Array<{ vsl_variation_seen: string | null }>;
  const vslImpressions = events.filter((event) => event.type === 'vsl_impression');
  const byVariation = new Map<string, { impressions: number; signups: number }>();

  vslImpressions.forEach((event) => {
    const variation = String(event.meta?.variation_label || event.vsl_id || 'Primary');
    const row = byVariation.get(variation) ?? { impressions: 0, signups: 0 };
    row.impressions += 1;
    byVariation.set(variation, row);
  });

  signups.forEach((signup) => {
    const variation = signup.vsl_variation_seen || 'Primary';
    const row = byVariation.get(variation) ?? { impressions: 0, signups: 0 };
    row.signups += 1;
    byVariation.set(variation, row);
  });

  return {
    demoViews: events.filter((event) => event.type === 'demo_view').length,
    demoStepEvents: events.filter((event) => event.type === 'demo_step').length,
    launchPageViews: events.filter((event) => event.type === 'launch_page_view').length,
    demoStarts: events.filter((event) => event.type === 'demo_start').length,
    demoCompletions: events.filter((event) => event.type === 'demo_complete').length,
    vslImpressions: vslImpressions.length,
    ctaClicks: events.filter((event) => event.type === 'cta_click').length,
    signupAttempts: events.filter((event) => event.type === 'signup_attempt').length,
    signups: signups.length,
    signupRate: calculateSignupRate(signups.length, vslImpressions.length || events.filter((event) => event.type === 'launch_page_view').length),
    byVslVariation: Array.from(byVariation.entries()).map(([variation, row]) => ({
      variation,
      impressions: row.impressions,
      signups: row.signups,
      signupRate: calculateSignupRate(row.signups, row.impressions),
    })),
  };
}

/**
 * Per-demo engagement metrics for the analytics view. Reads the demo's event
 * stream (owner-scoped via RLS) and the demo's steps, then derives unique
 * viewers, completion rate, and a per-step drop-off funnel client-side. Volumes
 * are small (one demo's events); aggregating here mirrors getProjectMetrics and
 * avoids a bespoke RPC. demo_view/demo_start/demo_complete are de-duped per
 * session at emit time, so counting distinct sessions is the source of truth.
 */
export async function getDemoMetrics(
  demoId: string,
  window: DemoStudioMetricsWindow = 'all',
): Promise<DemoMetrics> {
  const since = getMetricsWindowStart(window);
  let eventsQuery = supabase.from(EVENTS).select('type, meta, created_at').eq('demo_id', demoId);
  if (since) eventsQuery = eventsQuery.gte('created_at', since);
  const [{ data: eventsData, error }, steps] = await Promise.all([eventsQuery, listSteps(demoId)]);
  if (error) throw new Error(error.message);

  const events = (eventsData ?? []) as Array<{
    type: string;
    meta: Record<string, unknown> | null;
    created_at: string;
  }>;
  // Group by session. Older events may predate session tagging, so fall back to
  // a per-row key (each counts as its own session) rather than collapsing them.
  const sessionOf = (event: { meta: Record<string, unknown> | null; created_at: string }) =>
    String(event.meta?.session_id ?? `anon:${event.created_at}`);

  const viewEvents = events.filter((event) => event.type === 'demo_view');
  const viewerSessions = new Set(viewEvents.map(sessionOf));
  const startSessions = new Set(events.filter((event) => event.type === 'demo_start').map(sessionOf));
  const completionSessions = new Set(events.filter((event) => event.type === 'demo_complete').map(sessionOf));
  const ctaClicks = events.filter((event) => event.type === 'cta_click').length;

  // Furthest step index each session reached, from demo_step events.
  const maxStepBySession = new Map<string, number>();
  events
    .filter((event) => event.type === 'demo_step')
    .forEach((event) => {
      const session = sessionOf(event);
      const rawIndex = Number(event.meta?.step_index);
      const index = Number.isFinite(rawIndex) ? rawIndex : 0;
      maxStepBySession.set(session, Math.max(maxStepBySession.get(session) ?? 0, index));
    });

  const uniqueViewers = viewerSessions.size;
  // Funnel top: everyone who opened the demo. Guard against viewers who recorded
  // step events without a demo_view (defensive) so the funnel never exceeds 100%.
  const funnelTop = Math.max(uniqueViewers, maxStepBySession.size);

  const sessionsReachingStep = (stepIndex: number): number => {
    if (stepIndex <= 0) return funnelTop;
    let count = 0;
    maxStepBySession.forEach((maxIndex) => {
      if (maxIndex >= stepIndex) count += 1;
    });
    return count;
  };

  let prevReached = funnelTop;
  const funnel: DemoStepFunnelRow[] = steps.map((step, index) => {
    const reached = sessionsReachingStep(index);
    const reachedPct = funnelTop === 0 ? 0 : Math.round((reached / funnelTop) * 100);
    const dropFromPrevPct = funnelTop === 0 ? 0 : Math.round(((prevReached - reached) / funnelTop) * 100);
    prevReached = reached;
    return {
      stepIndex: index,
      stepId: step.id,
      title: step.title?.trim() || `Step ${index + 1}`,
      reached,
      reachedPct,
      dropFromPrevPct: Math.max(0, dropFromPrevPct),
    };
  });

  const totalStepsViewed = Array.from(maxStepBySession.values()).reduce((sum, index) => sum + index + 1, 0);
  const avgStepsViewed =
    maxStepBySession.size === 0 ? 0 : Math.round((totalStepsViewed / maxStepBySession.size) * 10) / 10;
  const lastViewedAt = viewEvents.reduce<string | null>(
    (latest, event) => (!latest || event.created_at > latest ? event.created_at : latest),
    null,
  );
  const oldestAssetCapturedAt = steps.reduce<string | null>((oldest, step) => {
    const captured = step.asset_captured_at;
    if (!captured) return oldest;
    return !oldest || captured < oldest ? captured : oldest;
  }, null);

  return {
    views: viewEvents.length,
    uniqueViewers,
    starts: startSessions.size,
    completions: completionSessions.size,
    completionRate: uniqueViewers === 0 ? 0 : Math.round((completionSessions.size / uniqueViewers) * 100),
    ctaClicks,
    ctaClickRate: uniqueViewers === 0 ? 0 : Math.round((ctaClicks / uniqueViewers) * 100),
    avgStepsViewed,
    funnel,
    lastViewedAt,
    oldestAssetCapturedAt,
  };
}

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

export const STEP_ASSET_MAX_BYTES = 5 * 1024 * 1024;

function readImageDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: null, height: null });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export async function uploadStepAsset(
  ownerId: string,
  file: File,
): Promise<{ url: string; width: number | null; height: number | null }> {
  if (file.size > STEP_ASSET_MAX_BYTES) {
    throw new Error('Image must be 5MB or smaller.');
  }
  const dims = await readImageDimensions(file);
  const ext = file.name.split('.').pop() || 'png';
  const path = `${ownerId}/${Date.now()}-${shortId(6)}.${ext}`;
  const { error } = await supabase.storage
    .from(ASSET_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw new Error(error.message);
  const {
    data: { publicUrl },
  } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(path);
  return { url: publicUrl, width: dims.width, height: dims.height };
}

export const STEP_HTML_MAX_BYTES = 15 * 1024 * 1024;

/**
 * Import a self-contained HTML snapshot (e.g. from the free SingleFile tool) as an
 * 'html' step. The markup is sanitized with DOMPurify (scripts, event handlers,
 * iframe/object/embed/base, javascript: URLs removed) before storage. It is also
 * rendered in a sandboxed iframe with no script execution (see SnapshotFrame), so the
 * sanitizer is defense-in-depth, not the sole control. DOMPurify is imported lazily so
 * it never runs during SSR/prerender and stays out of the main bundle.
 */
export async function uploadStepHtmlSnapshot(ownerId: string, file: File): Promise<{ url: string }> {
  if (file.size > STEP_HTML_MAX_BYTES) {
    throw new Error('HTML snapshot must be 15MB or smaller.');
  }
  const raw = await file.text();
  const DOMPurify = (await import('dompurify')).default;
  const clean = DOMPurify.sanitize(raw, {
    WHOLE_DOCUMENT: true,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'base', 'link'],
    FORBID_ATTR: ['ping'],
  });
  if (!clean || clean.trim().length === 0) {
    throw new Error("That file didn't contain renderable HTML.");
  }
  const blob = new Blob([clean], { type: 'text/html' });
  const path = `${ownerId}/${Date.now()}-${shortId(6)}.html`;
  const { error } = await supabase.storage
    .from(ASSET_BUCKET)
    .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: 'text/html' });
  if (error) throw new Error(error.message);
  const {
    data: { publicUrl },
  } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(path);
  return { url: publicUrl };
}

/* -------------------------------------------------------------------------- */
/* Public read (published demos, for /demo/:publicId and embeds)               */
/* -------------------------------------------------------------------------- */

export async function getPublicDemo(publicId: string): Promise<PublicDemo | null> {
  const { data: demoRow, error: demoError } = await supabase
    .from(DEMOS)
    .select('*')
    .eq('public_id', publicId)
    .eq('status', 'published')
    .maybeSingle();
  if (demoError) throw new Error(demoError.message);
  if (!demoRow) return null;
  const demo = demoRow as unknown as DemoStudioDemo;

  const steps = await listSteps(demo.id);
  const hotspots = steps.length > 0 ? await listHotspotsForDemo(demo.id) : [];
  const byStep = new Map<string, DemoStudioHotspot[]>();
  hotspots.forEach((h) => {
    const arr = byStep.get(h.step_id) ?? [];
    arr.push(h);
    byStep.set(h.step_id, arr);
  });

  const stepsWithHotspots: DemoStepWithHotspots[] = steps.map((s) => ({
    ...s,
    hotspots: byStep.get(s.id) ?? [],
  }));

  return { demo, steps: stepsWithHotspots };
}
