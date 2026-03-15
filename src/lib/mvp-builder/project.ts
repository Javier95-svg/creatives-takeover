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

function inlineLocalStyles(
  html: string,
  entryFile: string,
  files: MVPProjectFile[],
  warnings: string[]
): string {
  return html.replace(
    /<link\b([^>]*?)href=(["'])([^"'#]+)\2([^>]*)>/gi,
    (match, _beforeHref, _quote, href) => {
      if (isRemoteAsset(href)) return match;
      const resolved = joinProjectPath(entryFile, href);
      const asset = findFile(files, resolved);
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
}

function buildStaticPreviewHtml(
  files: MVPProjectFile[],
  entryFile: string
): MVPPreviewResult {
  const sourceFile = findFile(files, entryFile);
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

  html = inlineLocalStyles(html, entryFile, files, warnings);

  html = html.replace(
    /<script\b([^>]*?)src=(["'])([^"'#]+)\2([^>]*)>\s*<\/script>/gi,
    (match, beforeSrc, _quote, src, afterSrc) => {
      if (isRemoteAsset(src)) return match;

      const attrs = `${beforeSrc}${afterSrc}`.toLowerCase();
      if (attrs.includes('type="module"')) {
        errors.push(`Preview routes ${src} through the runtime sandbox because it is an ES module.`);
        return match;
      }

      const resolved = joinProjectPath(entryFile, src);
      const asset = findFile(files, resolved);
      if (!asset) {
        warnings.push(`Missing script: ${resolved}`);
        return match;
      }

      if (!['javascript', 'text'].includes(asset.language)) {
        warnings.push(`Preview kept external script "${resolved}" because it is not a plain JS file.`);
        return match;
      }

      const attrsWithoutSrc = `${beforeSrc}${afterSrc}`.replace(/\s+/g, ' ').trim();
      const attrText = attrsWithoutSrc ? ` ${attrsWithoutSrc}` : '';
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
    consoleHints: ['Static preview can run plain HTML, CSS, and browser JavaScript directly.'],
  };
}

function escapeForInlineScript(value: string): string {
  return value
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildSandboxHtml(
  files: MVPProjectFile[],
  framework: MVPProjectFramework,
  entryFile: string | null,
  preferredEntryFile?: string | null
): MVPPreviewResult {
  const normalizedFiles = normalizeProjectFiles(files);
  const warnings: string[] = [];
  const errors: string[] = [];
  const fileDependencies = extractProjectDependenciesFromFiles(normalizedFiles);
  let htmlEntry = pickProjectEntryFile(normalizedFiles, preferredEntryFile);
  let moduleEntries: string[] = [];
  const virtualFiles: Record<string, string> = {};

  if (htmlEntry) {
    const htmlFile = findFile(normalizedFiles, htmlEntry);
    if (htmlFile) {
      moduleEntries = extractLocalModuleEntriesFromHtml(htmlFile.content, htmlFile.path);
    }
  }

  if (framework === 'next-like') {
    const pageEntry = pickNextPageEntry(normalizedFiles);
    if (!pageEntry) {
      return {
        html: null,
        entryFile: htmlEntry,
        canPreview: false,
        warnings,
        errors: ['Could not find app/page.* or pages/index.* for the Next-style preview runtime.'],
        runtimeMode: 'none',
        consoleHints: [],
      };
    }

    virtualFiles['__ct_runtime__/next-entry.tsx'] = `import React from 'react';
import { createRoot } from 'react-dom/client';
import PageModule from '../${pageEntry}';
const View = PageModule?.default ?? PageModule;
const root = document.getElementById('root');
if (!root) {
  throw new Error('The runtime root element could not be found.');
}
createRoot(root).render(React.createElement(View));`;
    virtualFiles['__ct_runtime__/shims/next-link.js'] = `import React from 'react';
export default function Link({ href = '#', children, ...props }) {
  return React.createElement('a', { href, ...props }, children);
}`;
    virtualFiles['__ct_runtime__/shims/next-image.js'] = `import React from 'react';
export default function Image({ src = '', alt = '', ...props }) {
  return React.createElement('img', { src, alt, ...props });
}`;
    virtualFiles['__ct_runtime__/shims/next-head.js'] = `import React from 'react';
export default function Head({ children }) {
  return React.createElement(React.Fragment, null, children);
}`;
    virtualFiles['__ct_runtime__/shims/next-navigation.js'] = `export function useRouter() {
  return {
    push: (url) => window.history.pushState({}, '', url),
    replace: (url) => window.history.replaceState({}, '', url),
    back: () => window.history.back(),
    refresh: () => window.location.reload(),
    prefetch: async () => undefined,
  };
}
export function usePathname() {
  return window.location.pathname;
}
export function useSearchParams() {
  return new URLSearchParams(window.location.search);
}`;
    moduleEntries = ['__ct_runtime__/next-entry.tsx'];
    htmlEntry = htmlEntry ?? '__ct_runtime__/index.html';
  } else if (moduleEntries.length === 0) {
    const runtimeEntry = pickRuntimeModuleEntry(normalizedFiles);
    if (runtimeEntry) {
      moduleEntries = [runtimeEntry];
    }
  }

  if (moduleEntries.length === 0) {
    return {
      html: null,
      entryFile: htmlEntry ?? entryFile,
      canPreview: false,
      warnings,
      errors: ['No runtime entry module was found for this project.'],
      runtimeMode: 'none',
      consoleHints: [],
    };
  }

  let baseHtml =
    htmlEntry && findFile(normalizedFiles, htmlEntry)
      ? findFile(normalizedFiles, htmlEntry)!.content
      : '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div></body></html>';

  if (htmlEntry && findFile(normalizedFiles, htmlEntry)) {
    baseHtml = inlineLocalStyles(baseHtml, htmlEntry, normalizedFiles, warnings);
    baseHtml = baseHtml.replace(
      /<script\b([^>]*?)src=(["'])([^"'#]+)\2([^>]*)>\s*<\/script>/gi,
      (match, beforeSrc, _quote, src, afterSrc) => {
        if (isRemoteAsset(src)) return match;
        const attrs = `${beforeSrc}${afterSrc}`.toLowerCase();
        if (attrs.includes('type="module"')) {
          return '';
        }
        return match;
      }
    );
  }

  if (!/id=(["'])root\1/i.test(baseHtml) && (framework === 'react-vite' || framework === 'next-like')) {
    baseHtml = /<\/body>/i.test(baseHtml)
      ? baseHtml.replace(/<\/body>/i, '<div id="root"></div></body>')
      : `${baseHtml}<div id="root"></div>`;
  }

  const runtimeFiles = normalizeProjectFiles([
    ...normalizedFiles,
    ...Object.entries(virtualFiles).map(([path, content]) => ({
      path,
      content,
      language: detectProjectFileLanguage(path),
    })),
  ]);

  const dependencies = mergeProjectDependencies(
    fileDependencies,
    framework === 'react-vite' || framework === 'next-like'
      ? [
          { name: 'react', source: 'npm', version: '18', purpose: 'Component runtime' },
          { name: 'react-dom', source: 'npm', version: '18', purpose: 'DOM renderer' },
        ]
      : []
  );

  const runtimeBootstrap = `<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="module">
${createRuntimeBootstrap(runtimeFiles, moduleEntries, dependencies, framework)}
</script>`;

  const bridgeHtml = injectBridgeScript(baseHtml);
  const html = /<\/body>/i.test(bridgeHtml)
    ? bridgeHtml.replace(/<\/body>/i, `${runtimeBootstrap}</body>`)
    : `${bridgeHtml}${runtimeBootstrap}`;

  return {
    html,
    entryFile: htmlEntry ?? entryFile,
    canPreview: true,
    warnings,
    errors,
    runtimeMode: 'sandbox',
    consoleHints: [
      'Runtime sandbox resolves npm packages through esm.sh.',
      'The console below shows transpile, import, and runtime errors.',
    ],
  };
}

function createRuntimeBootstrap(
  files: MVPProjectFile[],
  entryModules: string[],
  dependencies: MVPProjectDependency[],
  framework: MVPProjectFramework
): string {
  const filesJson = escapeForInlineScript(
    JSON.stringify(
      files.map((file) => ({
        path: file.path,
        content: file.content,
        language: file.language,
      }))
    )
  );
  const dependenciesJson = escapeForInlineScript(JSON.stringify(dependencies));
  const entryModulesJson = escapeForInlineScript(JSON.stringify(entryModules));

  return `const FILES = ${filesJson};
const DEPENDENCIES = ${dependenciesJson};
const ENTRY_MODULES = ${entryModulesJson};
const FRAMEWORK = ${JSON.stringify(framework)};
const runtimeChannel = window.__CT_MVP_SEND__ || (() => undefined);
const fileMap = new Map(FILES.map((file) => [file.path, file]));
const compiledUrlCache = new Map();
const dependencyMap = new Map(DEPENDENCIES.map((dependency) => [dependency.name, dependency]));

function emit(type, payload) {
  try {
    runtimeChannel(type, payload);
  } catch {}
}

function emitBuild(level, message) {
  emit('build-log', { level, message });
}

function normalizePath(value) {
  return value
    .replace(/\\\\/g, '/')
    .replace(/^\\.\\//, '')
    .split('/')
    .reduce((parts, segment) => {
      if (!segment || segment === '.') return parts;
      if (segment === '..') {
        parts.pop();
        return parts;
      }
      parts.push(segment);
      return parts;
    }, [])
    .join('/');
}

function dirname(value) {
  const normalized = normalizePath(value);
  const index = normalized.lastIndexOf('/');
  return index === -1 ? '' : normalized.slice(0, index);
}

function joinPath(from, to) {
  if (!to) return normalizePath(from);
  if (to.startsWith('/')) return normalizePath(to.slice(1));
  const base = dirname(from);
  return normalizePath(base ? \`\${base}/\${to}\` : to);
}

function resolveLocalPath(from, to) {
  const direct = joinPath(from, to);
  if (fileMap.has(direct)) return direct;

  const attempts = [
    \`\${direct}.ts\`,
    \`\${direct}.tsx\`,
    \`\${direct}.js\`,
    \`\${direct}.jsx\`,
    \`\${direct}.css\`,
    \`\${direct}.json\`,
    \`\${direct}/index.ts\`,
    \`\${direct}/index.tsx\`,
    \`\${direct}/index.js\`,
    \`\${direct}/index.jsx\`,
  ];

  for (const attempt of attempts) {
    if (fileMap.has(attempt)) return attempt;
  }

  return direct;
}

function getRootPackage(specifier) {
  if (specifier.startsWith('@')) {
    return specifier.split('/').slice(0, 2).join('/');
  }
  return specifier.split('/')[0];
}

function withVersion(specifier, version) {
  if (!version) return specifier;
  const root = getRootPackage(specifier);
  const suffix = specifier.slice(root.length);
  return \`\${root}@\${version}\${suffix}\`;
}

async function resolveBareImport(specifier) {
  if (specifier === 'next/link') return compileModule('__ct_runtime__/shims/next-link.js');
  if (specifier === 'next/image') return compileModule('__ct_runtime__/shims/next-image.js');
  if (specifier === 'next/head') return compileModule('__ct_runtime__/shims/next-head.js');
  if (specifier === 'next/navigation') return compileModule('__ct_runtime__/shims/next-navigation.js');

  const root = getRootPackage(specifier);
  const dependency = dependencyMap.get(root);
  const version = dependency?.version?.replace(/^[\\^~]/, '') || '';
  const versioned = withVersion(specifier, version);
  return \`https://esm.sh/\${versioned}?dev\`;
}

async function replaceSpecifiers(source, importerPath) {
  const resolvers = [
    /(\\bimport\\s+[^'"]*?\\sfrom\\s*["'])([^"']+)(["'])/g,
    /(\\bexport\\s+[^'"]*?\\sfrom\\s*["'])([^"']+)(["'])/g,
    /(\\bimport\\s*\\(\\s*["'])([^"']+)(["']\\s*\\))/g,
    /(\\bimport\\s*["'])([^"']+)(["'])/g,
  ];

  let output = source;
  for (const pattern of resolvers) {
    const matches = Array.from(output.matchAll(pattern));
    const replacements = new Map();
    for (const match of matches) {
      const specifier = match[2];
      if (replacements.has(specifier)) continue;
      if (specifier.startsWith('.') || specifier.startsWith('/')) {
        const resolved = resolveLocalPath(importerPath, specifier);
        replacements.set(specifier, await compileModule(resolved));
      } else {
        replacements.set(specifier, await resolveBareImport(specifier));
      }
    }
    output = output.replace(pattern, (full, prefix, specifier, suffix) => {
      const resolved = replacements.get(specifier) || specifier;
      return \`\${prefix}\${resolved}\${suffix}\`;
    });
  }

  return output;
}

function cssModuleSource(path, cssText) {
  return \`const styleId = 'ct-mvp-style-' + \${JSON.stringify(path)};
let styleTag = document.querySelector('style[data-ct-mvp-style="' + styleId + '"]');
if (!styleTag) {
  styleTag = document.createElement('style');
  styleTag.setAttribute('data-ct-mvp-style', styleId);
  styleTag.textContent = \${JSON.stringify(cssText)};
  document.head.appendChild(styleTag);
}
export default \${JSON.stringify(cssText)};\`;
}

async function transpileModule(path, source, language) {
  const rewrittenSource = await replaceSpecifiers(source, path);
  if (language === 'css') {
    return cssModuleSource(path, source);
  }
  if (language === 'json') {
    return \`export default \${source.trim() || '{}'};\`;
  }
  if (!['javascript', 'typescript', 'tsx', 'jsx', 'text'].includes(language)) {
    return rewrittenSource;
  }

  const presets = [];
  presets.push(['env', { targets: { esmodules: true }, modules: false }]);
  if (language === 'jsx' || language === 'tsx') {
    presets.push(['react', { runtime: 'automatic' }]);
  }
  if (language === 'typescript' || language === 'tsx') {
    presets.push('typescript');
  }

  if (presets.length === 0) {
    return rewrittenSource;
  }

  const result = window.Babel.transform(rewrittenSource, {
    filename: path,
    sourceType: 'module',
    presets,
    babelrc: false,
    configFile: false,
    comments: false,
  });
  return result.code;
}

async function compileModule(path) {
  const normalizedPath = normalizePath(path);
  if (compiledUrlCache.has(normalizedPath)) {
    return compiledUrlCache.get(normalizedPath);
  }

  const file = fileMap.get(normalizedPath);
  if (!file) {
    throw new Error(\`Missing file in runtime sandbox: \${normalizedPath}\`);
  }

  emitBuild('info', \`Compiling \${normalizedPath}\`);
  const code = await transpileModule(normalizedPath, file.content, file.language);
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  compiledUrlCache.set(normalizedPath, url);
  return url;
}

async function boot() {
  emitBuild('info', FRAMEWORK === 'static-html' ? 'Starting static runtime.' : \`Starting \${FRAMEWORK} runtime sandbox.\`);
  if (DEPENDENCIES.length > 0) {
    emitBuild('info', \`Resolving \${DEPENDENCIES.length} package dependencies through npm CDN.\`);
  }

  for (const entry of ENTRY_MODULES) {
    const moduleUrl = await compileModule(entry);
    await import(moduleUrl);
  }

  emitBuild('info', 'Preview runtime is ready.');
}

boot().catch((error) => {
  const message = error?.stack || error?.message || String(error);
  emitBuild('error', message);
  throw error;
});`;
}

export function buildPreviewFromProject(
  files: MVPProjectFile[],
  preferredEntryFile?: string | null
): MVPPreviewResult {
  const normalizedFiles = normalizeProjectFiles(files);
  const framework = inferProjectFramework(normalizedFiles);
  const entryFile = pickProjectEntryFile(normalizedFiles, preferredEntryFile);

  if (framework === 'static-html' && entryFile) {
    const htmlFile = findFile(normalizedFiles, entryFile);
    const moduleEntries = htmlFile
      ? extractLocalModuleEntriesFromHtml(htmlFile.content, htmlFile.path)
      : [];
    if (moduleEntries.length === 0) {
      return buildStaticPreviewHtml(normalizedFiles, entryFile);
    }
  }

  if (framework === 'react-vite' || framework === 'next-like') {
    return buildSandboxHtml(normalizedFiles, framework, entryFile, preferredEntryFile);
  }

  if (framework === 'static-html' && entryFile) {
    return buildSandboxHtml(normalizedFiles, 'react-vite', entryFile, preferredEntryFile);
  }

  return {
    html: null,
    entryFile,
    canPreview: false,
    warnings: [],
    errors: ['No previewable entry file was found. Open the Code tab to inspect the project.'],
    runtimeMode: 'none',
    consoleHints: [],
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
