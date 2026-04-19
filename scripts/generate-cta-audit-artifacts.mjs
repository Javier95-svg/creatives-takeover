import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'src');
const reportsDir = path.join(repoRoot, 'reports');
const appFile = path.join(srcRoot, 'App.tsx');

const INTERNAL_ROUTE_PATTERNS = [
  /^\/admin(\/|$)/,
  /^\/demo$/,
  /^\/rag-test$/,
  /^\/test-phase1$/,
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function listFiles(dirPath, extension, results = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name === 'dist' || entry.name === 'node_modules') {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      listFiles(fullPath, extension, results);
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(extension)) {
      results.push(fullPath);
    }
  }

  return results;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function toRepoRelative(value) {
  return toPosix(path.relative(repoRoot, value));
}

function getLineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function buildRouteInventory() {
  const appSource = fs.readFileSync(appFile, 'utf8');
  const routePattern = /<Route\s+path="([^"]+)"\s+element={<([A-Za-z0-9_]+)(?:\s|\/>|\s*\/>|\s*>)/g;
  const routes = [];
  let match;

  while ((match = routePattern.exec(appSource)) !== null) {
    const routePath = match[1];
    const elementName = match[2];
    const line = getLineNumber(appSource, match.index);
    const isCatchAll = routePath === '*';
    const isInternal = INTERNAL_ROUTE_PATTERNS.some((pattern) => pattern.test(routePath));

    routes.push({
      path: routePath,
      element: elementName,
      file: 'src/App.tsx',
      line,
      isCatchAll,
      isInternal,
      isUserFacing: !isCatchAll && !isInternal,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    source: 'src/App.tsx',
    totalRoutes: routes.length,
    userFacingRoutes: routes.filter((route) => route.isUserFacing).length,
    routes,
  };
}

function buildInteractiveInventory() {
  const files = listFiles(srcRoot, '.tsx');
  const patterns = [
    { type: 'Button', regex: /<Button\b/g },
    { type: 'button', regex: /<button\b/g },
    { type: 'Link', regex: /<Link\b/g },
    { type: 'anchor', regex: /<a\b/g },
    { type: 'onClick', regex: /\bonClick\s*=/g },
  ];
  const entries = [];

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, 'utf8');
    const lines = source.split('\n');

    for (const pattern of patterns) {
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        if (!pattern.regex.test(line)) {
          pattern.regex.lastIndex = 0;
          continue;
        }

        pattern.regex.lastIndex = 0;
        entries.push({
          type: pattern.type,
          file: toRepoRelative(filePath),
          line: lineIndex + 1,
          snippet: line.trim(),
        });
      }
    }
  }

  const countsByType = Object.fromEntries(
    patterns.map((pattern) => [
      pattern.type,
      entries.filter((entry) => entry.type === pattern.type).length,
    ]),
  );

  return {
    generatedAt: new Date().toISOString(),
    scannedRoot: 'src',
    totalEntries: entries.length,
    countsByType,
    entries,
  };
}

function buildPersonaMatrix() {
  return {
    generatedAt: new Date().toISOString(),
    viewports: [
      { name: 'mobile', width: 390, height: 844 },
      { name: 'desktop', width: 1440, height: 900 },
    ],
    personas: [
      {
        id: 'logged_out',
        authState: 'logged_out',
        verificationState: 'n/a',
        planTier: 'none',
        notes: 'Guest session with no authenticated user.',
      },
      {
        id: 'unverified_account',
        authState: 'blocked_at_login',
        verificationState: 'unverified',
        planTier: 'rookie',
        notes: 'Modeled via the login error and resend-confirmation flow because AuthContext does not expose an in-session unverified state.',
      },
      {
        id: 'verified_rookie',
        authState: 'authenticated',
        verificationState: 'verified',
        planTier: 'rookie',
        notes: 'Free tier.',
      },
      {
        id: 'verified_starter',
        authState: 'authenticated',
        verificationState: 'verified',
        planTier: 'starter',
        notes: 'Paid tier.',
      },
      {
        id: 'verified_rising',
        authState: 'authenticated',
        verificationState: 'verified',
        planTier: 'rising',
        notes: 'Paid tier.',
      },
      {
        id: 'verified_pro',
        authState: 'authenticated',
        verificationState: 'verified',
        planTier: 'pro',
        notes: 'Highest standard paid tier.',
      },
    ],
  };
}

function writeJsonReport(fileName, payload) {
  fs.writeFileSync(path.join(reportsDir, fileName), `${JSON.stringify(payload, null, 2)}\n`);
}

ensureDir(reportsDir);

const routeInventory = buildRouteInventory();
const interactiveInventory = buildInteractiveInventory();
const personaMatrix = buildPersonaMatrix();

writeJsonReport('platform-route-inventory.json', routeInventory);
writeJsonReport('platform-interactive-inventory.json', interactiveInventory);
writeJsonReport('platform-persona-matrix.json', personaMatrix);

console.log(
  JSON.stringify(
    {
      routeCount: routeInventory.totalRoutes,
      userFacingRouteCount: routeInventory.userFacingRoutes,
      interactiveCount: interactiveInventory.totalEntries,
      countsByType: interactiveInventory.countsByType,
      personaCount: personaMatrix.personas.length,
    },
    null,
    2,
  ),
);
