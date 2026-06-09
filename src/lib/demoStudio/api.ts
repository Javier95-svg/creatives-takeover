// Demo Studio data-access layer. Uses the Supabase client directly; RLS on the
// demo_studio_* tables is the authoritative access control. Table names are cast
// with `as any` because the generated DB types don't include these tables yet.
import { supabase } from '@/integrations/supabase/client';
import type {
  DemoStudioProject,
  DemoStudioAiKit,
  DemoStudioBrief,
  DemoStudioDemo,
  DemoStudioStep,
  DemoStudioHotspot,
  DemoStudioLaunchPage,
  DemoStudioMetrics,
  DemoStudioMetricsWindow,
  DemoStudioReadiness,
  DemoStudioSignup,
  DemoStudioVsl,
  DemoStudioStoryboardStep,
  DemoStepWithHotspots,
  DemoTheme,
  HotspotAction,
  HotspotType,
  PublicLaunchPage,
  PublicDemo,
} from './types';
import { DEFAULT_DEMO_STUDIO_CTA, normalizeAiKit, normalizeProjectSlug } from './brief';
import {
  calculateSignupRate,
  canAddVsl,
  getLaunchPublishMissing,
  getNextVslLabel,
  normalizeLoomUrl,
} from './vsl';

const PROJECTS = 'demo_studio_projects' as any;
const DEMOS = 'demo_studio_demos' as any;
const STEPS = 'demo_studio_demo_steps' as any;
const HOTSPOTS = 'demo_studio_demo_hotspots' as any;
const BRIEFS = 'demo_studio_briefs' as any;
const VSLS = 'demo_studio_vsls' as any;
const LAUNCH_PAGES = 'demo_studio_launch_pages' as any;
const SIGNUPS = 'demo_studio_signups' as any;
const EVENTS = 'demo_studio_events' as any;

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
  return unwrap(result) as unknown as DemoStudioProject;
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
      ai_launch_copy: {},
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
  return normalizeAiKit(data.kit);
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
  return unwrap(result) as unknown as DemoStudioDemo;
}

export async function updateDemo(
  id: string,
  patch: Partial<{ title: string; theme: DemoTheme; status: string }>,
): Promise<void> {
  const { error } = await supabase.from(DEMOS).update(patch as any).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function publishDemo(id: string): Promise<DemoStudioDemo> {
  const existing = await getDemo(id);
  const publicId = existing?.public_id || shortId();
  const result = await supabase
    .from(DEMOS)
    .update({ status: 'published', public_id: publicId } as any)
    .eq('id', id)
    .select('*')
    .single();
  return unwrap(result) as unknown as DemoStudioDemo;
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
  const totalQuery = await supabase
    .from(DEMOS)
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId);
  const publishedQuery = await supabase
    .from(DEMOS)
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('status', 'published');
  return { total: totalQuery.count ?? 0, published: publishedQuery.count ?? 0 };
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
  asset: { url?: string | null; width?: number | null; height?: number | null; title?: string | null; caption?: string | null; speaker_notes?: string | null },
): Promise<DemoStudioStep> {
  const result = await supabase
    .from(STEPS)
    .insert({
      demo_id: demoId,
      position,
      asset_url: asset.url ?? null,
      asset_width: asset.width ?? null,
      asset_height: asset.height ?? null,
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
  patch: Partial<Pick<DemoStudioStep, 'title' | 'caption' | 'speaker_notes' | 'position' | 'asset_url' | 'asset_width' | 'asset_height'>>,
): Promise<void> {
  const { error } = await supabase.from(STEPS).update(patch as any).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function duplicateStep(step: DemoStepWithHotspots, position: number): Promise<DemoStepWithHotspots> {
  const result = await supabase
    .from(STEPS)
    .insert({
      demo_id: step.demo_id,
      position,
      asset_url: step.asset_url,
      asset_width: step.asset_width,
      asset_height: step.asset_height,
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
  patch: Partial<Pick<DemoStudioLaunchPage, 'headline' | 'subheadline' | 'cta_label' | 'primary_demo_id' | 'primary_vsl_id' | 'theme'>>,
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

export async function createLaunchSignup(
  projectId: string,
  email: string,
  fields: { referrer?: string | null; vslVariationSeen?: string | null } = {},
): Promise<DemoStudioSignup> {
  const result = await supabase
    .from(SIGNUPS)
    .insert({
      project_id: projectId,
      email: email.trim().toLowerCase(),
      referrer: fields.referrer ?? null,
      vsl_variation_seen: fields.vslVariationSeen ?? null,
    } as any)
    .select('*')
    .single();
  const signup = unwrap(result) as unknown as DemoStudioSignup;
  await supabase.from(EVENTS).insert({
    project_id: projectId,
    type: 'signup',
    meta: {
      vsl_variation_seen: fields.vslVariationSeen ?? null,
      referrer: fields.referrer ?? null,
    },
  } as any);
  return signup;
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
