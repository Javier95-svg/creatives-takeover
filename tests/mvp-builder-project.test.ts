import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPreviewFromProject,
  createProjectFromHtml,
  extractProjectFromText,
  getChangedProjectFiles,
} from '../src/lib/mvp-builder/project.ts';
import {
  MVP_BUILDER_ACTION_CREDIT_FEATURE,
  buildMVPProjectZip,
  classifyMVPBuilderAction,
  mvpBuilderOutputToArtifact,
  validateMVPBuilderOutput,
} from '../src/lib/mvp-builder/phase1.ts';
import { MVP_CREDIT_COSTS } from '../src/config/constants.ts';

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

test('phase 1 output validation accepts complete html_single JSON', () => {
  const output = validateMVPBuilderOutput({
    project_type: 'html_single',
    files: [
      {
        filename: 'index.html',
        description: 'Main static MVP page.',
        content:
          '<!DOCTYPE html><html><head><title>Launch OS</title><meta name="description" content="A waitlist MVP for launch teams."></head><body><button>Join</button><script>posthog.init("POSTHOG_KEY",{api_host:"https://app.posthog.com"});posthog.capture("page_view");posthog.capture("cta_clicked");posthog.capture("form_submitted");</script></body></html>',
      },
    ],
    setup_instructions: 'Open index.html.',
    posthog_events: [],
    generation_notes: 'Built as a portable waitlist MVP.',
  });

  const artifact = mvpBuilderOutputToArtifact(output, 'Launch OS');
  assert.equal(output.project_type, 'html_single');
  assert.equal(artifact.framework, 'static-html');
  assert.equal(artifact.entryFile, 'index.html');
});

test('phase 2 output validation accepts complete react_vite JSON', () => {
  const output = validateMVPBuilderOutput({
    project_type: 'react_vite',
    files: [
      {
        path: 'package.json',
        description: 'Project manifest.',
        content: JSON.stringify({
          scripts: { dev: 'vite', build: 'vite build' },
          dependencies: { '@vitejs/plugin-react-swc': '^3.5.0', vite: '^5.4.1', react: '^18.3.1', 'react-dom': '^18.3.1' },
          devDependencies: {},
        }),
      },
      { path: 'index.html', description: 'Vite HTML entry.', content: '<!doctype html><html><head><title>App</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>' },
      { path: 'src/main.tsx', description: 'React mount.', content: 'import React from "react";import { createRoot } from "react-dom/client";import App from "./App";createRoot(document.getElementById("root")!).render(<App />);' },
      { path: 'src/App.tsx', description: 'Main app.', content: 'export default function App(){return <main><button onClick={() => posthog.capture("cta_clicked")}>Start</button><form onSubmit={(e)=>{e.preventDefault();posthog.capture("form_submitted")}}><input /></form></main>}' },
    ],
    generation_notes: 'Built as a React/Vite MVP.',
  }, { phase1Only: false });

  const artifact = mvpBuilderOutputToArtifact(output, 'Launch OS');
  assert.equal(output.project_type, 'react_vite');
  assert.equal(artifact.framework, 'react-vite');
  assert.equal(artifact.entryFile, 'src/main.tsx');
});

test('phase 2 output validation rejects malformed react_vite projects', () => {
  assert.throws(() =>
    validateMVPBuilderOutput({
      project_type: 'react_multi',
      files: [{ filename: 'index.html', content: 'x', description: 'x' }],
    }, { phase1Only: false })
  );

  assert.throws(() =>
    validateMVPBuilderOutput({
      project_type: 'react_vite',
      files: [
        { path: 'package.json', description: 'Manifest.', content: JSON.stringify({ scripts: { dev: 'vite' }, dependencies: { react: '^18.3.1' } }) },
        { path: 'index.html', description: 'Entry.', content: '<div id="root"></div>' },
      ],
    }, { phase1Only: false })
  );

  assert.throws(() =>
    validateMVPBuilderOutput({
      project_type: 'html_single',
      files: [
        {
          filename: 'index.html',
          description: 'Main page.',
          content:
            '<!DOCTYPE html><html><head><title>X</title><meta name="description" content="X"></head><body>[INSERT BENEFIT HERE]<script>page_view;cta_clicked;form_submitted;</script></body></html>',
        },
      ],
    })
  );
});

test('phase 1 action classifier maps supported and unsupported actions', () => {
  assert.equal(classifyMVPBuilderAction('build my waitlist page', false), 'generation');
  assert.equal(classifyMVPBuilderAction('make the headline sharper', true), 'targeted_edit');
  assert.equal(classifyMVPBuilderAction('fix the broken submit button', true), 'debug');
  assert.equal(classifyMVPBuilderAction('add a pricing page', true), 'add_page');
  assert.equal(classifyMVPBuilderAction('add a dashboard feature', true), 'add_feature');
  assert.equal(classifyMVPBuilderAction('redesign the entire app', true), 'design_overhaul');
  assert.equal(classifyMVPBuilderAction('add auth and database tables', true), 'unsupported');
});

test('phase 2 MVP action credit costs use the separate wallet pricing', () => {
  assert.equal(MVP_BUILDER_ACTION_CREDIT_FEATURE.add_page, 'APP_BUILDER_ADD_PAGE');
  assert.equal(MVP_BUILDER_ACTION_CREDIT_FEATURE.add_feature, 'APP_BUILDER_ADD_FEATURE');
  assert.equal(MVP_BUILDER_ACTION_CREDIT_FEATURE.design_overhaul, 'APP_BUILDER_DESIGN_OVERHAUL');
  assert.equal(MVP_CREDIT_COSTS.APP_BUILDER_GENERATE, 15);
  assert.equal(MVP_CREDIT_COSTS.APP_BUILDER_ADD_PAGE, 6);
  assert.equal(MVP_CREDIT_COSTS.APP_BUILDER_ADD_FEATURE, 8);
  assert.equal(MVP_CREDIT_COSTS.APP_BUILDER_DESIGN_OVERHAUL, 8);
  assert.equal(MVP_CREDIT_COSTS.APP_BUILDER_DEPLOY, 3);
});

test('zip export creates an archive blob without deployment substitutions', async () => {
  const blob = buildMVPProjectZip([
    {
      path: 'index.html',
      content: '<script>posthog.init("POSTHOG_KEY")</script>',
      language: 'html',
    },
  ]);

  assert.equal(blob.type, 'application/zip');
  assert.ok(blob.size > 0);
});
