import type {
  MVPProjectArtifact,
  MVPProjectFile,
  MVPProjectType,
} from './project.ts';
import {
  detectProjectFileLanguage,
  normalizeProjectFiles,
  normalizeProjectPath,
} from './project.ts';

export type MVPBuilderTemplateId =
  | 'waitlist_landing'
  | 'saas_landing'
  | 'community_landing'
  | 'blank';

export type MVPBuilderPaletteId = 'minimal' | 'bold' | 'warm';

export type MVPBuilderActionType =
  | 'generation'
  | 'targeted_edit'
  | 'debug'
  | 'add_page'
  | 'add_feature'
  | 'design_overhaul'
  | 'deploy'
  | 'restore'
  | 'export'
  | 'chat'
  | 'github_edit';

export type MVPBuilderOutputProjectType = 'html_single' | 'react_vite';

export interface MVPBuilderSetupInput {
  productName: string;
  oneLineDescription: string;
  validatedProblemStatement: string;
  validatedTargetSegment: string;
  keyPainLanguage: string;
  existingTagline?: string;
  template: MVPBuilderTemplateId;
  palettePreference: MVPBuilderPaletteId;
  customPrompt?: string;
  prefillSource?: 'pmf' | 'icp' | 'waitlist_launch_kit' | 'dashboard_home' | 'onboarding_quiz' | null;
}

export interface MVPBuilderOutputFile {
  filename: string;
  content: string;
  description: string;
}

export interface MVPBuilderValidatedOutput {
  project_type: MVPBuilderOutputProjectType;
  files: MVPBuilderOutputFile[];
  package_json?: Record<string, unknown>;
  dev_command: string;
  build_command: string;
  preview_port: number;
  setup_instructions: string;
  posthog_events: Array<{
    event_name: string;
    trigger: string;
    properties: string;
  }>;
  generation_notes: string;
}

export interface MVPBuilderVersion {
  version_id: string;
  version_number: number;
  created_at: string;
  action_type: MVPBuilderActionType;
  user_instruction: string;
  credits_used: number;
  mvp_credits_used?: number;
  project_type?: MVPBuilderOutputProjectType;
  framework?: string;
  model?: string | null;
  build_command?: string;
  dev_command?: string;
  validation_status?: 'validated';
  files: MVPBuilderOutputFile[];
  generation_notes?: string;
}

export const MVP_BUILDER_TEMPLATES: Array<{
  id: MVPBuilderTemplateId;
  label: string;
  description: string;
}> = [
  {
    id: 'waitlist_landing',
    label: 'Waitlist Landing Page',
    description: 'A conversion-focused waitlist page with email capture and founder-ready copy.',
  },
  {
    id: 'saas_landing',
    label: 'SaaS Landing Page',
    description: 'A simple product site with homepage, feature, pricing, and FAQ sections.',
  },
  {
    id: 'community_landing',
    label: 'Community Landing',
    description: 'A launch page for a founder community, cohort, or membership concept.',
  },
  {
    id: 'blank',
    label: 'Blank',
    description: 'A free-form build from your own prompt and context.',
  },
];

export const MVP_BUILDER_PALETTES: Array<{
  id: MVPBuilderPaletteId;
  label: string;
  description: string;
}> = [
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Clean white/gray interface with one calm accent color.',
  },
  {
    id: 'bold',
    label: 'Bold',
    description: 'High-contrast composition with a stronger launch feel.',
  },
  {
    id: 'warm',
    label: 'Warm',
    description: 'Soft neutrals and warmer accents for a more human touch.',
  },
];

export const MVP_BUILDER_ACTION_CREDIT_FEATURE: Record<MVPBuilderActionType, string> = {
  generation: 'APP_BUILDER_GENERATE',
  targeted_edit: 'APP_BUILDER_REFINE',
  debug: 'APP_BUILDER_DEBUG',
  add_page: 'APP_BUILDER_ADD_PAGE',
  add_feature: 'APP_BUILDER_ADD_FEATURE',
  design_overhaul: 'APP_BUILDER_DESIGN_OVERHAUL',
  deploy: 'APP_BUILDER_DEPLOY',
  restore: 'APP_BUILDER_RESTORE',
  export: 'APP_BUILDER_EXPORT',
  chat: 'APP_BUILDER_CHAT',
  github_edit: 'APP_BUILDER_GITHUB_EDIT',
};

export const MVP_BUILDER_ACTION_LABELS: Record<MVPBuilderActionType, string> = {
  generation: 'New project generation',
  targeted_edit: 'Targeted edit',
  debug: 'Bug fix',
  add_page: 'Add page',
  add_feature: 'Add feature',
  design_overhaul: 'Design overhaul',
  deploy: 'Deploy to URL',
  restore: 'Restore previous version',
  export: 'Export code',
  chat: 'Builder chat',
  github_edit: 'GitHub edit',
};

const FORBIDDEN_COPY_PATTERNS = [
  /lorem ipsum/i,
  /\[(?:insert|your|company|placeholder)[^\]]*\]/i,
  /todo:/i,
  /add your logic here/i,
  /rest of code here/i,
  /coming soon/i,
];

const REQUIRED_PHASE_1_EVENTS = ['page_view', 'cta_clicked', 'form_submitted'];
const REQUIRED_REACT_FILES = ['package.json', 'index.html'];

export function sanitizeMVPBuilderTemplate(value: unknown): MVPBuilderTemplateId {
  return MVP_BUILDER_TEMPLATES.some((template) => template.id === value)
    ? (value as MVPBuilderTemplateId)
    : 'waitlist_landing';
}

export function sanitizeMVPBuilderPalette(value: unknown): MVPBuilderPaletteId {
  return MVP_BUILDER_PALETTES.some((palette) => palette.id === value)
    ? (value as MVPBuilderPaletteId)
    : 'minimal';
}

export function classifyMVPBuilderAction(input: string, hasProject: boolean): MVPBuilderActionType | 'unclear' | 'unsupported' {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return 'unclear';
  if (!hasProject) return 'generation';
  if (/\b(error|bug|broken|fix|doesn'?t work|not working|console|crash)\b/.test(normalized)) {
    return 'debug';
  }
  if (/\b(auth|database|supabase|stripe|payment|marketplace|backend|server action)\b/.test(normalized)) {
    return 'unsupported';
  }
  if (/\b(add|create|build)\b.{0,40}\b(page|route|screen)\b|\b(new page|new route|another screen)\b/.test(normalized)) {
    return 'add_page';
  }
  if (/\b(add|build|create|implement)\b.*\b(feature|flow|component|wizard|form|dashboard|table|chart|modal|settings)\b/.test(normalized)) {
    return 'add_feature';
  }
  if (/\b(redesign|design overhaul|make it beautiful|modernize|visual refresh|new look|polish the design)\b/.test(normalized)) {
    return 'design_overhaul';
  }
  if (/\b(change|make|replace|remove|update|edit|rewrite|rename|color|headline|button|copy|spacing)\b/.test(normalized)) {
    return 'targeted_edit';
  }
  return 'targeted_edit';
}

export function parseMVPBuilderOutput(raw: string): unknown {
  const trimmed = raw.trim();
  const tagged = trimmed.match(/<project-output>\s*([\s\S]*?)\s*<\/project-output>/i)?.[1];
  const jsonCandidate = tagged ?? trimmed.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(jsonCandidate);
}

export function validateMVPBuilderOutput(raw: unknown, options: { phase1Only?: boolean } = {}): MVPBuilderValidatedOutput {
  if (!raw || typeof raw !== 'object') {
    throw new Error('MVP output must be a JSON object.');
  }

  const candidate = raw as Record<string, unknown>;
  const projectType = candidate.project_type;
  if (projectType !== 'html_single' && projectType !== 'react_vite') {
    throw new Error('project_type must be html_single or react_vite.');
  }
  if (options.phase1Only !== false && projectType !== 'html_single') {
    throw new Error('Phase 1 only supports html_single projects.');
  }

  if (!Array.isArray(candidate.files) || candidate.files.length === 0) {
    throw new Error('files must be a non-empty array.');
  }

  const files = candidate.files.map((file, index) => {
    if (!file || typeof file !== 'object') {
      throw new Error(`files[${index}] must be an object.`);
    }
    const item = file as Record<string, unknown>;
    const rawPath = typeof item.path === 'string' ? item.path : item.filename;
    const filename = typeof rawPath === 'string' ? normalizeProjectPath(rawPath) : '';
    const content = typeof item.content === 'string' ? item.content : '';
    const description = typeof item.description === 'string' ? item.description.trim() : '';

    if (!filename || !content.trim() || !description) {
      throw new Error(`files[${index}] is missing filename, content, or description.`);
    }
    if (filename.includes('..')) {
      throw new Error(`files[${index}] has an unsafe path.`);
    }
    for (const pattern of FORBIDDEN_COPY_PATTERNS) {
      if (pattern.test(content)) {
        throw new Error(`files[${index}] contains placeholder or incomplete copy.`);
      }
    }
    return { filename, content, description };
  });

  const indexFile = files.find((file) => file.filename.toLowerCase() === 'index.html') ?? files.find((file) => file.filename.endsWith('.html'));
  if (projectType === 'html_single') {
    if (!indexFile) {
      throw new Error('html_single output must include an HTML file.');
    }
    if (!/<title>[^<]+<\/title>/i.test(indexFile.content)) {
      throw new Error('HTML output must include a title tag.');
    }
    if (!/<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(indexFile.content)) {
      throw new Error('HTML output must include a meta description.');
    }
    for (const eventName of REQUIRED_PHASE_1_EVENTS) {
      if (!indexFile.content.includes(eventName)) {
        throw new Error(`HTML output must track ${eventName}.`);
      }
    }
  }

  if (projectType === 'react_vite') {
    for (const requiredFile of REQUIRED_REACT_FILES) {
      if (!files.some((file) => file.filename === requiredFile)) {
        throw new Error(`react_vite output must include ${requiredFile}.`);
      }
    }
    const packageFile = files.find((file) => file.filename === 'package.json');
    const packageJson = parsePackageJson(packageFile?.content);
    const dependencies = {
      ...(packageJson.dependencies as Record<string, unknown> | undefined),
      ...(packageJson.devDependencies as Record<string, unknown> | undefined),
    };
    if (!dependencies.react || !dependencies['react-dom'] || !dependencies.vite) {
      throw new Error('react_vite package.json must include react, react-dom, and vite.');
    }
    const hasReactEntry = files.some((file) =>
      /^(src\/)?main\.(tsx|jsx)$/.test(file.filename) && /createRoot|ReactDOM/.test(file.content)
    );
    if (!hasReactEntry) {
      throw new Error('react_vite output must include a React main entry that mounts the app.');
    }
    const hasAppComponent = files.some((file) =>
      /^src\/App\.(tsx|jsx)$/.test(file.filename) && /export\s+default|function\s+App|const\s+App/.test(file.content)
    );
    if (!hasAppComponent) {
      throw new Error('react_vite output must include src/App.tsx or src/App.jsx.');
    }
  }

  const packageJson = projectType === 'react_vite'
    ? parsePackageJson(files.find((file) => file.filename === 'package.json')?.content)
    : undefined;

  return {
    project_type: projectType,
    files,
    package_json: packageJson,
    dev_command:
      typeof candidate.dev_command === 'string' && candidate.dev_command.trim()
        ? candidate.dev_command.trim()
        : projectType === 'react_vite'
        ? 'npm run dev'
        : '',
    build_command:
      typeof candidate.build_command === 'string' && candidate.build_command.trim()
        ? candidate.build_command.trim()
        : projectType === 'react_vite'
        ? 'npm run build'
        : '',
    preview_port:
      typeof candidate.preview_port === 'number' && Number.isFinite(candidate.preview_port)
        ? Math.floor(candidate.preview_port)
        : 5173,
    setup_instructions:
      typeof candidate.setup_instructions === 'string' && candidate.setup_instructions.trim()
        ? candidate.setup_instructions.trim()
        : 'Open index.html in a browser or deploy it as a static site.',
    posthog_events: Array.isArray(candidate.posthog_events)
      ? candidate.posthog_events
          .map((event) => {
            const item = event as Record<string, unknown>;
            if (typeof item.event_name !== 'string' || typeof item.trigger !== 'string') return null;
            return {
              event_name: item.event_name,
              trigger: item.trigger,
              properties: typeof item.properties === 'string' ? item.properties : '',
            };
          })
          .filter((event): event is MVPBuilderValidatedOutput['posthog_events'][number] => Boolean(event))
      : [],
    generation_notes:
      typeof candidate.generation_notes === 'string' && candidate.generation_notes.trim()
        ? candidate.generation_notes.trim()
        : projectType === 'react_vite'
        ? 'Generated a React/Vite MVP with a live app runtime.'
        : 'Generated a portable single-file MVP for fast validation.',
  };
}

function parsePackageJson(content: string | undefined): Record<string, unknown> {
  if (!content) {
    throw new Error('react_vite output must include package.json contents.');
  }
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid package.json');
    if (typeof parsed.scripts !== 'object' || !parsed.scripts) {
      throw new Error('package.json must include scripts.');
    }
    return parsed;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'package.json must be valid JSON.');
  }
}

export function mvpBuilderOutputToArtifact(
  output: MVPBuilderValidatedOutput,
  projectName: string,
  projectType: MVPProjectType = 'landing-page'
): MVPProjectArtifact {
  const files: MVPProjectFile[] = normalizeProjectFiles(
    output.files.map((file) => ({
      path: file.filename,
      content: file.content,
      language: detectProjectFileLanguage(file.filename),
    }))
  );
  const entry = files.find((file) => file.path === 'index.html')?.path ?? files.find((file) => file.path.endsWith('.html'))?.path ?? files[0]?.path ?? 'index.html';
  const reactEntry =
    files.find((file) => /^(src\/)?main\.(tsx|jsx)$/.test(file.path))?.path ??
    files.find((file) => /^(src\/)?main\.(ts|js)$/.test(file.path))?.path ??
    entry;

  return {
    projectName: projectName.trim() || 'Generated MVP',
    framework: output.project_type === 'react_vite' ? 'react-vite' : 'static-html',
    projectType,
    entryFile: output.project_type === 'react_vite' ? reactEntry : entry,
    summary: output.generation_notes,
    dependencies: [],
    files,
  };
}

export function createMVPBuilderVersion(input: {
  previousVersions: MVPBuilderVersion[];
  actionType: MVPBuilderActionType;
  userInstruction: string;
  creditsUsed: number;
  output: MVPBuilderValidatedOutput;
  model?: string | null;
}): MVPBuilderVersion {
  const highest = input.previousVersions.reduce((max, version) => Math.max(max, version.version_number || 0), 0);
  return {
    version_id: crypto.randomUUID(),
    version_number: highest + 1,
    created_at: new Date().toISOString(),
    action_type: input.actionType,
    user_instruction: input.userInstruction,
    credits_used: input.creditsUsed,
    mvp_credits_used: input.creditsUsed,
    project_type: input.output.project_type,
    framework: input.output.project_type === 'react_vite' ? 'react-vite' : 'static-html',
    model: input.model ?? null,
    build_command: input.output.build_command,
    dev_command: input.output.dev_command,
    validation_status: 'validated',
    files: input.output.files,
    generation_notes: input.output.generation_notes,
  };
}

function crc32(bytes: Uint8Array): number {
  let crc = ~0;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function writeUint16(output: number[], value: number) {
  output.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(output: number[], value: number) {
  output.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

export function buildMVPProjectZip(files: MVPProjectFile[]): Blob {
  const encoder = new TextEncoder();
  const output: number[] = [];
  const centralDirectory: number[] = [];

  for (const file of normalizeProjectFiles(files)) {
    const name = encoder.encode(file.path);
    const content = encoder.encode(file.content);
    const checksum = crc32(content);
    const localHeaderOffset = output.length;

    writeUint32(output, 0x04034b50);
    writeUint16(output, 20);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint32(output, checksum);
    writeUint32(output, content.length);
    writeUint32(output, content.length);
    writeUint16(output, name.length);
    writeUint16(output, 0);
    output.push(...name, ...content);

    writeUint32(centralDirectory, 0x02014b50);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, checksum);
    writeUint32(centralDirectory, content.length);
    writeUint32(centralDirectory, content.length);
    writeUint16(centralDirectory, name.length);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, 0);
    writeUint32(centralDirectory, localHeaderOffset);
    centralDirectory.push(...name);
  }

  const centralDirectoryOffset = output.length;
  output.push(...centralDirectory);
  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, normalizeProjectFiles(files).length);
  writeUint16(output, normalizeProjectFiles(files).length);
  writeUint32(output, centralDirectory.length);
  writeUint32(output, centralDirectoryOffset);
  writeUint16(output, 0);

  return new Blob([new Uint8Array(output)], { type: 'application/zip' });
}
