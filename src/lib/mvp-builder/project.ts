export type MVPProjectFramework = 'static-html' | 'react-vite' | 'next-like' | 'code-only';
export type MVPProjectType =
  | 'web-app'
  | 'landing-page'
  | 'dashboard'
  | 'marketplace'
  | 'directory'
  | 'internal-tool';

export interface MVPProjectDependency {
  name: string;
  source: 'browser' | 'cdn' | 'npm';
  version?: string;
  url?: string;
  purpose?: string;
}

export interface MVPProjectFile {
  path: string;
  content: string;
  language: string;
}

export interface MVPProjectArtifact {
  projectName: string;
  framework: MVPProjectFramework;
  projectType: MVPProjectType;
  entryFile: string;
  summary: string;
  dependencies: MVPProjectDependency[];
  files: MVPProjectFile[];
}

export interface MVPProjectSnapshot {
  id: string;
  label: string;
  createdAt: string;
  source: 'generated' | 'manual' | 'imported' | 'restore' | 'commit';
  artifact: MVPProjectArtifact;
}

export interface MVPPreviewResult {
  html: string | null;
  entryFile: string | null;
  canPreview: boolean;
  warnings: string[];
  errors: string[];
  runtimeMode: 'none' | 'static' | 'sandbox';
  consoleHints: string[];
}

interface RawProjectFile {
  path?: unknown;
  content?: unknown;
}

interface RawProjectArtifact {
  projectName?: unknown;
  framework?: unknown;
  projectType?: unknown;
  entryFile?: unknown;
  summary?: unknown;
  dependencies?: unknown;
  files?: unknown;
}

interface PackageManifest {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

const PROJECT_START_TAG = '<project-output>';
const PROJECT_END_TAG = '</project-output>';
const HTML_START_TAG = '<html-output>';
const HTML_END_TAG = '</html-output>';

const RUNTIME_ENTRY_CANDIDATES = [
  'src/main.tsx',
  'src/main.jsx',
  'src/main.ts',
  'src/main.js',
  'src/index.tsx',
  'src/index.jsx',
  'src/index.ts',
  'src/index.js',
  'main.tsx',
  'main.jsx',
  'main.ts',
  'main.js',
] as const;

const NEXT_PAGE_CANDIDATES = [
  'app/page.tsx',
  'app/page.jsx',
  'app/page.ts',
  'app/page.js',
  'pages/index.tsx',
  'pages/index.jsx',
  'pages/index.ts',
  'pages/index.js',
] as const;

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}

export function normalizeProjectPath(value: string): string {
  const trimmed = normalizeSlashes(value.trim()).replace(/^\.\/+/, '');
  if (!trimmed) return '';

  const segments: string[] = [];
  for (const segment of trimmed.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return segments.join('/');
}

export function detectProjectFileLanguage(path: string): string {
  const normalized = normalizeProjectPath(path).toLowerCase();
  if (normalized.endsWith('.html')) return 'html';
  if (normalized.endsWith('.css')) return 'css';
  if (normalized.endsWith('.js') || normalized.endsWith('.mjs')) return 'javascript';
  if (normalized.endsWith('.ts')) return 'typescript';
  if (normalized.endsWith('.tsx')) return 'tsx';
  if (normalized.endsWith('.jsx')) return 'jsx';
  if (normalized.endsWith('.json')) return 'json';
  if (normalized.endsWith('.md')) return 'markdown';
  if (normalized.endsWith('.svg')) return 'svg';
  return 'text';
}

export function normalizeProjectFiles(files: MVPProjectFile[]): MVPProjectFile[] {
  const deduped = new Map<string, MVPProjectFile>();

  for (const file of files) {
    const path = normalizeProjectPath(file.path);
    if (!path) continue;

    deduped.set(path, {
      path,
      content: typeof file.content === 'string' ? file.content : '',
      language: file.language || detectProjectFileLanguage(path),
    });
  }

  return Array.from(deduped.values()).sort((a, b) => a.path.localeCompare(b.path));
}

function isRemoteAsset(target: string): boolean {
  return /^(https?:)?\/\//i.test(target) || target.startsWith('data:') || target.startsWith('#');
}

function dirname(path: string): string {
  const normalized = normalizeProjectPath(path);
  const index = normalized.lastIndexOf('/');
  return index === -1 ? '' : normalized.slice(0, index);
}

function joinProjectPath(from: string, to: string): string {
  if (!to) return normalizeProjectPath(from);
  if (to.startsWith('/')) return normalizeProjectPath(to.slice(1));

  const base = dirname(from);
  return normalizeProjectPath(base ? `${base}/${to}` : to);
}

function findFile(files: MVPProjectFile[], path: string): MVPProjectFile | undefined {
  const normalized = normalizeProjectPath(path);
  return files.find((file) => file.path === normalized);
}

function extractTaggedContent(fullText: string, startTag: string, endTag: string): string | null {
  const start = fullText.indexOf(startTag);
  const end = fullText.indexOf(endTag);
  if (start === -1 || end === -1 || end <= start) return null;
  return fullText.slice(start + startTag.length, end).trim();
}

function sanitizeProjectType(raw: unknown): MVPProjectType {
  switch (raw) {
    case 'landing-page':
    case 'dashboard':
    case 'marketplace':
    case 'directory':
    case 'internal-tool':
      return raw;
    default:
      return 'web-app';
  }
}

function sanitizeProjectFramework(raw: unknown): MVPProjectFramework {
  switch (raw) {
    case 'react-vite':
    case 'next-like':
    case 'code-only':
    case 'static-html':
      return raw;
    default:
      return 'static-html';
  }
}

function normalizeProjectDependencies(raw: unknown): MVPProjectDependency[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((dependency) => {
      const candidate = dependency as Record<string, unknown>;
      if (typeof candidate?.name !== 'string' || !candidate.name.trim()) {
        return null;
      }

      return {
        name: candidate.name.trim(),
        source:
          candidate.source === 'cdn'
            ? 'cdn'
            : candidate.source === 'npm'
            ? 'npm'
            : 'browser',
        version:
          typeof candidate.version === 'string' && candidate.version.trim()
            ? candidate.version.trim()
            : undefined,
        url: typeof candidate.url === 'string' && candidate.url.trim() ? candidate.url.trim() : undefined,
        purpose:
          typeof candidate.purpose === 'string' && candidate.purpose.trim()
            ? candidate.purpose.trim()
            : undefined,
      };
    })
    .filter((dependency): dependency is MVPProjectDependency => Boolean(dependency));
}

function mergeProjectDependencies(
  projectDependencies: MVPProjectDependency[],
  fileDependencies: MVPProjectDependency[]
): MVPProjectDependency[] {
  const merged = new Map<string, MVPProjectDependency>();

  for (const dependency of [...projectDependencies, ...fileDependencies]) {
    const key = `${dependency.name}:${dependency.source}:${dependency.url ?? ''}`;
    const previous = merged.get(key);
    merged.set(key, {
      ...previous,
      ...dependency,
      version: dependency.version ?? previous?.version,
      purpose: dependency.purpose ?? previous?.purpose,
      url: dependency.url ?? previous?.url,
    });
  }

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function parsePackageManifest(files: MVPProjectFile[]): PackageManifest | null {
  const packageFile = findFile(files, 'package.json');
  if (!packageFile) return null;

  try {
    const parsed = JSON.parse(packageFile.content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return {
      dependencies:
        parsed.dependencies && typeof parsed.dependencies === 'object'
          ? parsed.dependencies
          : {},
      devDependencies:
        parsed.devDependencies && typeof parsed.devDependencies === 'object'
          ? parsed.devDependencies
          : {},
    };
  } catch {
    return null;
  }
}

export function extractProjectDependenciesFromFiles(files: MVPProjectFile[]): MVPProjectDependency[] {
  const manifest = parsePackageManifest(normalizeProjectFiles(files));
  if (!manifest) return [];

  const dependencies: MVPProjectDependency[] = [];
  for (const [name, version] of Object.entries(manifest.dependencies)) {
    dependencies.push({
      name,
      version,
      source: 'npm',
      purpose: 'Runtime dependency',
    });
  }
  for (const [name, version] of Object.entries(manifest.devDependencies)) {
    if (dependencies.some((dependency) => dependency.name === name)) continue;
    dependencies.push({
      name,
      version,
      source: 'npm',
      purpose: 'Build dependency',
    });
  }

  return dependencies.sort((a, b) => a.name.localeCompare(b.name));
}

function hasReactEntrypoint(files: MVPProjectFile[]): boolean {
  const normalizedFiles = normalizeProjectFiles(files);
  if (RUNTIME_ENTRY_CANDIDATES.some((candidate) => findFile(normalizedFiles, candidate))) {
    return true;
  }

  const htmlEntry = pickProjectEntryFile(normalizedFiles);
  const htmlFile = htmlEntry ? findFile(normalizedFiles, htmlEntry) : undefined;
  if (!htmlFile) return false;

  return extractLocalModuleEntriesFromHtml(htmlFile.content, htmlFile.path).length > 0;
}

function hasNextLikeStructure(files: MVPProjectFile[]): boolean {
  const normalizedFiles = normalizeProjectFiles(files);
  return NEXT_PAGE_CANDIDATES.some((candidate) => Boolean(findFile(normalizedFiles, candidate)));
}

export function inferProjectFramework(
  files: MVPProjectFile[],
  preferredFramework?: MVPProjectFramework | null
): MVPProjectFramework {
  const normalizedFiles = normalizeProjectFiles(files);
  const manifest = parsePackageManifest(normalizedFiles);
  const manifestDependencies = {
    ...manifest?.dependencies,
    ...manifest?.devDependencies,
  };

  const explicit = sanitizeProjectFramework(preferredFramework);
  if (preferredFramework && explicit !== 'static-html') {
    return explicit;
  }

  if (hasNextLikeStructure(normalizedFiles) || manifestDependencies.next) {
    return 'next-like';
  }

  if (
    hasReactEntrypoint(normalizedFiles) ||
    manifestDependencies.react ||
    manifestDependencies['react-dom'] ||
    manifestDependencies.vite
  ) {
    return 'react-vite';
  }

  if (pickProjectEntryFile(normalizedFiles)) {
    return 'static-html';
  }

  return 'code-only';
}

export function pickProjectEntryFile(
  files: MVPProjectFile[],
  preferredPath?: string | null
): string | null {
  const normalizedFiles = normalizeProjectFiles(files);
  const preferred = preferredPath ? normalizeProjectPath(preferredPath) : '';
  const preferredFile = preferred ? findFile(normalizedFiles, preferred) : undefined;
  if (preferredFile && preferredFile.path.toLowerCase().endsWith('.html')) {
    return preferredFile.path;
  }

  const indexHtml = normalizedFiles.find((file) => file.path.toLowerCase() === 'index.html');
  if (indexHtml) return indexHtml.path;

  const anyHtml = normalizedFiles.find((file) => file.path.toLowerCase().endsWith('.html'));
  return anyHtml?.path ?? null;
}

function pickRuntimeModuleEntry(files: MVPProjectFile[]): string | null {
  const normalizedFiles = normalizeProjectFiles(files);
  for (const candidate of RUNTIME_ENTRY_CANDIDATES) {
    const file = findFile(normalizedFiles, candidate);
    if (file) return file.path;
  }
  return null;
}

function pickNextPageEntry(files: MVPProjectFile[]): string | null {
  const normalizedFiles = normalizeProjectFiles(files);
  for (const candidate of NEXT_PAGE_CANDIDATES) {
    const file = findFile(normalizedFiles, candidate);
    if (file) return file.path;
  }
  return null;
}

function extractLocalModuleEntriesFromHtml(html: string, htmlPath: string): string[] {
  const entries: string[] = [];
  html.replace(
    /<script\b([^>]*?)src=(["'])([^"'#]+)\2([^>]*)>\s*<\/script>/gi,
    (_match, beforeSrc, _quote, src, afterSrc) => {
      const attrs = `${beforeSrc} ${afterSrc}`.toLowerCase();
      if (isRemoteAsset(src)) return '';
      if (!attrs.includes('type="module"')) return '';
      entries.push(joinProjectPath(htmlPath, src));
      return '';
    }
  );
  return entries;
}

function injectBridgeScript(html: string): string {
  const bridgeScript = `<script>(function(){const channel='ct-mvp-builder-runtime';const formatArg=(value)=>{if(typeof value==='string')return value;try{return JSON.stringify(value);}catch{return String(value);}};const send=(type,payload)=>{try{window.parent.postMessage({source:channel,type,payload},'*');}catch{}};window.__CT_MVP_SEND__=send;['log','info','warn','error'].forEach((level)=>{const original=console[level]?.bind(console);if(!original)return;console[level]=(...args)=>{send('console',{level,args:args.map(formatArg)});original(...args);};});window.addEventListener('error',(event)=>{send('runtime-error',{message:event.message,filename:event.filename,lineno:event.lineno,colno:event.colno});});window.addEventListener('unhandledrejection',(event)=>{const reason=event.reason;send('runtime-error',{message:typeof reason==='string'?reason:reason?.message||'Unhandled promise rejection'});});send('runtime-ready',{href:location.href});})();</script>`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${bridgeScript}`);
  }
  return `${bridgeScript}${html}`;
}

export function buildPreviewFromProject(
  files: MVPProjectFile[],
  preferredEntryFile?: string | null
): MVPPreviewResult {
  const normalizedFiles = normalizeProjectFiles(files);
  const entryFile = pickProjectEntryFile(normalizedFiles, preferredEntryFile);

  if (!entryFile) {
    return {
      html: null,
      entryFile: null,
      canPreview: false,
      warnings: [],
      errors: ['No HTML entry file was found. Preview supports static HTML projects right now.'],
      runtimeMode: 'none',
      consoleHints: [],
    };
  }

  const sourceFile = findFile(normalizedFiles, entryFile);
  if (!sourceFile) {
    return {
      html: null,
      entryFile,
      canPreview: false,
      warnings: [],
      errors: ['The selected entry file could not be loaded.'],
      runtimeMode: 'none',
      consoleHints: [],
    };
  }

  let html = sourceFile.content;
  const warnings: string[] = [];
  const errors: string[] = [];

  html = html.replace(
    /<link\b([^>]*?)href=(["'])([^"'#]+)\2([^>]*)>/gi,
    (match, _beforeHref, _quote, href) => {
      if (isRemoteAsset(href)) return match;

      const resolved = joinProjectPath(entryFile, href);
      const asset = findFile(normalizedFiles, resolved);
      if (!asset) {
        warnings.push(`Missing asset: ${resolved}`);
        return match;
      }

      if (asset.language !== 'css') {
        warnings.push(`Preview kept external asset "${resolved}" because it is not a CSS file.`);
        return match;
      }

      return `<style data-source="${asset.path}">\n${asset.content}\n</style>`;
    }
  );

  html = html.replace(
    /<script\b([^>]*?)src=(["'])([^"'#]+)\2([^>]*)>\s*<\/script>/gi,
    (match, beforeSrc, _quote, src, afterSrc) => {
      if (isRemoteAsset(src)) return match;

      const resolved = joinProjectPath(entryFile, src);
      const asset = findFile(normalizedFiles, resolved);
      if (!asset) {
        warnings.push(`Missing script: ${resolved}`);
        return match;
      }

      if (!['javascript', 'typescript', 'jsx', 'tsx', 'text'].includes(asset.language)) {
        warnings.push(`Preview kept external script "${resolved}" because it is not a JS-like file.`);
        return match;
      }

      if (
        ['typescript', 'tsx', 'jsx'].includes(asset.language) ||
        /from\s+['"]\.[^'"]+['"]/.test(asset.content) ||
        /import\s*\(\s*['"]\.[^'"]+['"]\s*\)/.test(asset.content)
      ) {
        errors.push(
          `Preview cannot run ${asset.path} because it requires a framework bundler or module graph.`
        );
        return match;
      }

      const attrs = `${beforeSrc}${afterSrc}`.replace(/\s+/g, ' ').trim();
      const attrText = attrs ? ` ${attrs}` : '';
      return `<script${attrText}>\n${asset.content}\n</script>`;
    }
  );

  if (errors.length > 0) {
    return {
      html: null,
      entryFile,
      canPreview: false,
      warnings,
      errors,
      runtimeMode: 'none',
      consoleHints: [],
    };
  }

  return {
    html: injectBridgeScript(html),
    entryFile,
    canPreview: true,
    warnings,
    errors,
    runtimeMode: 'static',
    consoleHints: ['Static preview is active for this project. Plain browser logs will appear below.'],
  };
}

function sanitizeRawProject(raw: RawProjectArtifact, fallbackName = 'Generated App'): MVPProjectArtifact | null {
  const rawFiles = Array.isArray(raw.files) ? raw.files : [];
  const files = normalizeProjectFiles(
    rawFiles
      .map((file) => {
        const candidate = file as RawProjectFile;
        if (typeof candidate.path !== 'string' || typeof candidate.content !== 'string') {
          return null;
        }
        return {
          path: candidate.path,
          content: candidate.content,
          language: detectProjectFileLanguage(candidate.path),
        };
      })
      .filter((file): file is MVPProjectFile => Boolean(file))
  );

  if (files.length === 0) return null;

  const rawDependencies = normalizeProjectDependencies(raw.dependencies);
  const fileDependencies = extractProjectDependenciesFromFiles(files);
  const framework = inferProjectFramework(files, sanitizeProjectFramework(raw.framework));
  const selectedEntry =
    (typeof raw.entryFile === 'string' ? normalizeProjectPath(raw.entryFile) : '') ||
    pickProjectEntryFile(files) ||
    pickRuntimeModuleEntry(files) ||
    pickNextPageEntry(files) ||
    files[0].path;

  return {
    projectName:
      typeof raw.projectName === 'string' && raw.projectName.trim()
        ? raw.projectName.trim()
        : fallbackName,
    framework,
    projectType: sanitizeProjectType(raw.projectType),
    entryFile: selectedEntry,
    summary:
      typeof raw.summary === 'string' && raw.summary.trim()
        ? raw.summary.trim()
        : 'Generated with MVP Builder.',
    dependencies: mergeProjectDependencies(rawDependencies, fileDependencies),
    files,
  };
}

export function extractHtmlFromText(fullText: string): string | null {
  return extractTaggedContent(fullText, HTML_START_TAG, HTML_END_TAG);
}

export function extractProjectFromText(
  fullText: string,
  fallbackName = 'Generated App'
): MVPProjectArtifact | null {
  const rawProject = extractTaggedContent(fullText, PROJECT_START_TAG, PROJECT_END_TAG);
  if (rawProject) {
    try {
      const parsed = JSON.parse(rawProject) as RawProjectArtifact;
      const normalized = sanitizeRawProject(parsed, fallbackName);
      if (normalized) return normalized;
    } catch {
      // fall back to legacy HTML extraction
    }
  }

  const html = extractHtmlFromText(fullText);
  if (!html) return null;
  return createProjectFromHtml(html, fallbackName);
}

export function createProjectFromHtml(
  html: string,
  projectName = 'Generated App'
): MVPProjectArtifact {
  return {
    projectName,
    framework: 'static-html',
    projectType: 'web-app',
    entryFile: 'index.html',
    summary: 'Generated with MVP Builder.',
    dependencies: [],
    files: normalizeProjectFiles([
      {
        path: 'index.html',
        content: html,
        language: 'html',
      },
    ]),
  };
}

export function serializeProjectForPrompt(project: MVPProjectArtifact): string {
  return JSON.stringify(
    {
      projectName: project.projectName,
      framework: project.framework,
      projectType: project.projectType,
      entryFile: project.entryFile,
      summary: project.summary,
      dependencies: project.dependencies,
      files: project.files.map((file) => ({
        path: file.path,
        content: file.content,
      })),
    },
    null,
    2
  );
}

export function getChangedProjectFiles(
  currentFiles: MVPProjectFile[],
  baselineFiles: MVPProjectFile[]
): Array<{ path: string; status: 'added' | 'modified' }> {
  const baselineMap = new Map(
    normalizeProjectFiles(baselineFiles).map((file) => [file.path, file.content])
  );

  return normalizeProjectFiles(currentFiles)
    .map((file) => {
      if (!baselineMap.has(file.path)) {
        return { path: file.path, status: 'added' as const };
      }
      if (baselineMap.get(file.path) !== file.content) {
        return { path: file.path, status: 'modified' as const };
      }
      return null;
    })
    .filter((item): item is { path: string; status: 'added' | 'modified' } => Boolean(item));
}
