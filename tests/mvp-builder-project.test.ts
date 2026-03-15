import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPreviewFromProject,
  createProjectFromHtml,
  extractProjectFromText,
  getChangedProjectFiles,
} from '../src/lib/mvp-builder/project.ts';

test('extractProjectFromText parses structured project output', () => {
  const raw = `MVP Snapshot: Demo\nCore Features: inbox, tasks\nPrimary Workflow: collect and sort\nNext Iteration: add auth\n<project-output>
{
  "projectName": "Launch Board",
  "framework": "static-html",
  "projectType": "dashboard",
  "entryFile": "index.html",
  "summary": "A launch planning dashboard for early-stage teams.",
  "dependencies": [
    { "name": "Chart.js", "source": "cdn", "url": "https://cdn.jsdelivr.net/npm/chart.js", "purpose": "Charts" }
  ],
  "files": [
    { "path": "index.html", "content": "<!DOCTYPE html><html><head><link rel=\\"stylesheet\\" href=\\"styles.css\\"></head><body><script src=\\"app.js\\"></script></body></html>" },
    { "path": "styles.css", "content": "body { color: red; }" },
    { "path": "app.js", "content": "console.log('ready');" }
  ]
}
</project-output>`;

  const project = extractProjectFromText(raw);

  assert.ok(project);
  assert.equal(project?.projectName, 'Launch Board');
  assert.equal(project?.projectType, 'dashboard');
  assert.equal(project?.summary, 'A launch planning dashboard for early-stage teams.');
  assert.equal(project?.dependencies[0]?.name, 'Chart.js');
  assert.equal(project?.files.length, 3);
  assert.equal(project?.entryFile, 'index.html');
});

test('buildPreviewFromProject inlines linked CSS and JS for static previews', () => {
  const project = extractProjectFromText(`MVP Snapshot: Demo
Core Features: inbox
Primary Workflow: open app
Next Iteration: add analytics
<project-output>
{
  "projectName": "Launch Board",
  "framework": "static-html",
  "entryFile": "index.html",
  "files": [
    { "path": "index.html", "content": "<!DOCTYPE html><html><head><link rel=\\"stylesheet\\" href=\\"styles.css\\"></head><body><h1>Hello</h1><script src=\\"app.js\\"></script></body></html>" },
    { "path": "styles.css", "content": "body { background: black; }" },
    { "path": "app.js", "content": "window.__previewReady = true;" }
  ]
}
</project-output>`);

  assert.ok(project);
  const preview = buildPreviewFromProject(project!.files, project!.entryFile);

  assert.equal(preview.canPreview, true);
  assert.match(preview.html ?? '', /background: black/);
  assert.match(preview.html ?? '', /window\.__previewReady = true/);
});

test('buildPreviewFromProject rejects bundler-only projects cleanly', () => {
  const preview = buildPreviewFromProject(
    [
      {
        path: 'index.html',
        content:
          '<!DOCTYPE html><html><body><script type="module" src="src/main.tsx"></script></body></html>',
        language: 'html',
      },
      {
        path: 'src/main.tsx',
        content: 'import App from "./App"; console.log(App);',
        language: 'tsx',
      },
    ],
    'index.html'
  );

  assert.equal(preview.canPreview, false);
  assert.ok(preview.errors.some((error) => error.includes('requires a framework bundler')));
});

test('legacy html sessions still migrate into a project', () => {
  const project = createProjectFromHtml('<!DOCTYPE html><html><body>Legacy</body></html>', 'Legacy App');

  assert.equal(project.projectName, 'Legacy App');
  assert.equal(project.files[0]?.path, 'index.html');
});

test('getChangedProjectFiles reports added and modified files', () => {
  const changes = getChangedProjectFiles(
    [
      { path: 'index.html', content: '<html>updated</html>', language: 'html' },
      { path: 'app.js', content: 'console.log(1);', language: 'javascript' },
    ],
    [{ path: 'index.html', content: '<html>base</html>', language: 'html' }]
  );

  assert.deepEqual(changes, [
    { path: 'app.js', status: 'added' },
    { path: 'index.html', status: 'modified' },
  ]);
});
