export type MVPProjectFramework = 'static-html' | 'code-only';

export interface MVPProjectFile {
  path: string;
  content: string;
  language: string;
}

export interface MVPProjectArtifact {
  projectName: string;
  framework: MVPProjectFramework;
  entryFile: string;
  files: MVPProjectFile[];
}

export interface MVPPreviewResult {
  html: string | null;
  entryFile: string | null;
  canPreview: boolean;
  warnings: string[];
  errors: string[];
}

interface RawProjectFile {
  path?: unknown;
  content?: unknown;
}

interface RawProjectArtifact {
  projectName?: unknown;
  framework?: unknown;
  entryFile?: unknown;
  files?: unknown;
}

const PROJECT_START_TAG = '<project-output>';
const PROJECT_END_TAG = '</project-output>';
const HTML_START_TAG = '<html-output>';
const HTML_END_TAG = '</html-output>';

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

function hasBundlerOnlyReferences(content: string): boolean {
  return /from\s+['"]\.[^'"]+['"]/.test(content) || /import\s*\(\s*['"]\.[^'"]+['"]\s*\)/.test(content);
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

  const indexHtml = normalizedFiles.find(
    (file) => file.path.toLowerCase() === 'index.html'
  );
  if (indexHtml) return indexHtml.path;

  const anyHtml = normalizedFiles.find((file) => file.path.toLowerCase().endsWith('.html'));
  return anyHtml?.path ?? null;
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
    };
  }

  let html = sourceFile.content;
  const warnings: string[] = [];
  const errors: string[] = [];

  html = html.replace(
    /<link\b([^>]*?)href=(["'])([^"'#]+)\2([^>]*)>/gi,
    (match, beforeHref, quote, href, _afterHref) => {
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
    (match, beforeSrc, quote, src, afterSrc) => {
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

      if (['typescript', 'tsx', 'jsx'].includes(asset.language) || hasBundlerOnlyReferences(asset.content)) {
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
    };
  }

  return {
    html,
    entryFile,
    canPreview: true,
    warnings,
    errors,
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

  const entryFile =
    (typeof raw.entryFile === 'string' ? normalizeProjectPath(raw.entryFile) : '') ||
    pickProjectEntryFile(files) ||
    files[0].path;

  return {
    projectName:
      typeof raw.projectName === 'string' && raw.projectName.trim()
        ? raw.projectName.trim()
        : fallbackName,
    framework: raw.framework === 'code-only' ? 'code-only' : 'static-html',
    entryFile,
    files,
  };
}

function extractTaggedContent(fullText: string, startTag: string, endTag: string): string | null {
  const start = fullText.indexOf(startTag);
  const end = fullText.indexOf(endTag);
  if (start === -1 || end === -1 || end <= start) return null;
  return fullText.slice(start + startTag.length, end).trim();
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
    entryFile: 'index.html',
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
      entryFile: project.entryFile,
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
