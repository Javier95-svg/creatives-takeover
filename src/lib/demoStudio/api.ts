// Demo Studio data-access layer. Uses the Supabase client directly; RLS on the
// demo_studio_* tables is the authoritative access control. Table names are cast
// with `as any` because the generated DB types don't include these tables yet.
import { supabase } from '@/integrations/supabase/client';
import type {
  DemoStudioProject,
  DemoStudioDemo,
  DemoStudioStep,
  DemoStudioHotspot,
  DemoStepWithHotspots,
  DemoTheme,
  HotspotAction,
  HotspotType,
  PublicDemo,
} from './types';

const PROJECTS = 'demo_studio_projects' as any;
const DEMOS = 'demo_studio_demos' as any;
const STEPS = 'demo_studio_demo_steps' as any;
const HOTSPOTS = 'demo_studio_demo_hotspots' as any;

const ASSET_BUCKET = 'demo-assets';
const PUBLIC_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function shortId(length = 9): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += PUBLIC_ID_ALPHABET[Math.floor(Math.random() * PUBLIC_ID_ALPHABET.length)];
  }
  return out;
}

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
  asset: { url: string; width: number | null; height: number | null },
): Promise<DemoStudioStep> {
  const result = await supabase
    .from(STEPS)
    .insert({
      demo_id: demoId,
      position,
      asset_url: asset.url,
      asset_width: asset.width,
      asset_height: asset.height,
    } as any)
    .select('*')
    .single();
  return unwrap(result) as unknown as DemoStudioStep;
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
  fields: { x: number; y: number; w: number; h: number; type?: HotspotType; action?: HotspotAction },
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
