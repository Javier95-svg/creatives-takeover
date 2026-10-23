/**
 * Project setup for founders: the fields drafted from their files and
 * website, and what saving writes. Pure, so node:test covers the mapping.
 */

export const PROJECT_IMPORT_MAX_FILES = 5;

export const PROJECT_STAGE_OPTIONS = [
  ['idea', 'Idea'],
  ['prototype', 'Prototype'],
  ['mvp', 'MVP'],
  ['launch', 'Launch'],
  ['growth', 'Growth'],
  ['scale', 'Scale'],
] as const;

/** Same keys as the onboarding business model question. */
export const PROJECT_BUSINESS_MODEL_OPTIONS = [
  ['b2b_saas', 'B2B SaaS or business software'],
  ['service', 'Agency, consultancy, or online service'],
  ['b2c_product', 'Consumer app or digital product'],
  ['marketplace', 'Marketplace'],
  ['ecommerce', 'E-commerce'],
  ['media', 'Creator, media, or audience business'],
  ['other', 'Another model'],
] as const;

export type ProjectStage = (typeof PROJECT_STAGE_OPTIONS)[number][0];
export type ProjectBusinessModel = (typeof PROJECT_BUSINESS_MODEL_OPTIONS)[number][0];

export interface ImportedProject {
  name: string;
  pitch: string;
  description: string;
  problem: string;
  customer: string;
  businessModel: ProjectBusinessModel | '';
  stage: ProjectStage | '';
  customers: string;
  traction: string;
  team: string;
  industry: string[];
  website: string;
  demo: string;
  pitchDeck: string;
}

export type ImportedField = keyof ImportedProject;

/** Where each drafted field came from, e.g. "deck.pdf" or "website". */
export type ImportedSources = Partial<Record<ImportedField, string>>;

export const IMPORTED_FIELD_LIMITS: Record<Exclude<ImportedField, 'businessModel' | 'stage' | 'industry'>, number> = {
  name: 80,
  pitch: 160,
  description: 1200,
  problem: 600,
  customer: 300,
  customers: 600,
  traction: 600,
  team: 600,
  website: 300,
  demo: 300,
  pitchDeck: 300,
};

/** Shown on the public Founder ID when the box is ticked; the rest stays private. */
export const FOUNDER_ID_FIELD_LABELS: Array<[ImportedField, string]> = [
  ['name', 'Project name'],
  ['pitch', 'One-line pitch'],
  ['description', 'What it does'],
  ['stage', 'Stage'],
  ['industry', 'Industry'],
  ['website', 'Website'],
  ['demo', 'Demo link'],
  ['pitchDeck', 'Pitch deck link'],
];

export function emptyImportedProject(): ImportedProject {
  return {
    name: '', pitch: '', description: '', problem: '', customer: '', businessModel: '', stage: '',
    customers: '', traction: '', team: '', industry: [], website: '', demo: '', pitchDeck: '',
  };
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\s+\n/g, '\n').trim().slice(0, max) : '');

function link(value: unknown): string {
  const raw = text(value, 300);
  if (!raw) return '';
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function option<T extends string>(value: unknown, options: ReadonlyArray<readonly [T, string]>): T | '' {
  return typeof value === 'string' && options.some(([key]) => key === value) ? (value as T) : '';
}

/**
 * Cleans a drafted project: trims and caps text, keeps only known stage and
 * business model keys, keeps industries that match the given options
 * (case-insensitive, at most three) and drops links that aren't web links.
 */
export function normalizeImportedProject(raw: unknown, industryOptions: readonly string[] = []): ImportedProject {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const industries = Array.isArray(value.industry) ? value.industry : typeof value.industry === 'string' ? [value.industry] : [];
  const industry = industries
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .map((entry) => (industryOptions.length ? industryOptions.find((opt) => opt.toLowerCase() === entry.toLowerCase()) ?? '' : entry))
    .filter((entry, index, all) => entry && all.indexOf(entry) === index)
    .slice(0, 3);

  return {
    name: text(value.name, IMPORTED_FIELD_LIMITS.name),
    pitch: text(value.pitch, IMPORTED_FIELD_LIMITS.pitch),
    description: text(value.description, IMPORTED_FIELD_LIMITS.description),
    problem: text(value.problem, IMPORTED_FIELD_LIMITS.problem),
    customer: text(value.customer, IMPORTED_FIELD_LIMITS.customer),
    businessModel: option(value.businessModel, PROJECT_BUSINESS_MODEL_OPTIONS),
    stage: option(value.stage, PROJECT_STAGE_OPTIONS),
    customers: text(value.customers, IMPORTED_FIELD_LIMITS.customers),
    traction: text(value.traction, IMPORTED_FIELD_LIMITS.traction),
    team: text(value.team, IMPORTED_FIELD_LIMITS.team),
    industry,
    website: link(value.website),
    demo: link(value.demo),
    pitchDeck: link(value.pitchDeck),
  };
}

export function normalizeImportedSources(raw: unknown, project: ImportedProject): ImportedSources {
  if (!raw || typeof raw !== 'object') return {};
  const sources: ImportedSources = {};
  for (const [field, source] of Object.entries(raw as Record<string, unknown>)) {
    if (!(field in project) || typeof source !== 'string' || !source.trim()) continue;
    const key = field as ImportedField;
    const filled = Array.isArray(project[key]) ? (project[key] as string[]).length > 0 : Boolean(project[key]);
    if (filled) sources[key] = source.trim().slice(0, 80);
  }
  return sources;
}

/** Which public Founder ID fields this save would change. */
export function founderIdChanges(project: ImportedProject): string[] {
  return FOUNDER_ID_FIELD_LABELS
    .filter(([field]) => (Array.isArray(project[field]) ? (project[field] as string[]).length > 0 : Boolean(project[field])))
    .map(([, label]) => label);
}

/**
 * The profile update for the public Founder ID, or null when the founder
 * unticked "Also show this on my Founder ID". Empty fields never overwrite
 * what the profile already shows, and other saved links are kept.
 */
export function buildFounderIdUpdate(
  project: ImportedProject,
  showOnFounderId: boolean,
  existingLinks: unknown,
): Record<string, unknown> | null {
  if (!showOnFounderId) return null;
  const update: Record<string, unknown> = {};
  if (project.name) update.startup_name = project.name;
  if (project.pitch) update.startup_tagline = project.pitch;
  if (project.description) update.startup_description = project.description;
  if (project.stage) update.startup_stage = project.stage;
  if (project.industry.length) update.startup_industry = project.industry;

  const links = { ...(existingLinks && typeof existingLinks === 'object' && !Array.isArray(existingLinks) ? existingLinks as Record<string, unknown> : {}) };
  let linksChanged = false;
  for (const [field, key] of [['website', 'website'], ['demo', 'demo'], ['pitchDeck', 'pitchDeck']] as const) {
    if (project[field]) {
      links[key] = project[field];
      linksChanged = true;
    }
  }
  if (linksChanged) update.startup_links = links;
  return Object.keys(update).length ? update : null;
}

/** The project row: title and summary, with everything else under context.import. */
export function buildProjectRecord(
  project: ImportedProject,
  sources: ImportedSources,
  existingContext: unknown,
  importedAt: string,
): { title: string; idea_summary: string | null; context: Record<string, unknown> } {
  const context = existingContext && typeof existingContext === 'object' && !Array.isArray(existingContext)
    ? existingContext as Record<string, unknown>
    : {};
  return {
    title: project.name || 'My project',
    idea_summary: project.pitch || project.description.slice(0, 280) || null,
    context: { ...context, import: { ...project, sources, importedAt } },
  };
}

/** Only same-site paths are honoured for ?next=, so the link can't send people elsewhere. */
export function safeNextPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
