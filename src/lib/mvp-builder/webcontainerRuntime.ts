import type { WebContainer, WebContainerProcess } from '@webcontainer/api';
import type { MVPProjectFile } from './project';

export type MVPWebContainerStatus =
  | 'idle'
  | 'unsupported'
  | 'booting'
  | 'mounting'
  | 'installing'
  | 'starting'
  | 'ready'
  | 'error';

export interface MVPWebContainerLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  createdAt: string;
}

export interface MVPWebContainerState {
  status: MVPWebContainerStatus;
  previewUrl: string | null;
  error: string | null;
  logs: MVPWebContainerLog[];
}

type StateListener = (state: MVPWebContainerState) => void;

const initialState: MVPWebContainerState = {
  status: 'idle',
  previewUrl: null,
  error: null,
  logs: [],
};

function isBrowserRuntimeSupported() {
  return typeof window !== 'undefined' && typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated === true;
}

function normalizePath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\.\/+/, '');
}

function buildFilesSignature(files: MVPProjectFile[]) {
  return [...files]
    .map((file) => ({
      path: normalizePath(file.path),
      content: file.content,
    }))
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => `${file.path}\0${file.content}`)
    .join('\0\0');
}

function buildFilePathSignature(files: MVPProjectFile[]) {
  return [...files]
    .map((file) => normalizePath(file.path))
    .sort((a, b) => a.localeCompare(b))
    .join('\0');
}

function buildDependencySignature(files: MVPProjectFile[]) {
  const dependencyFiles = new Set([
    'package.json',
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'bun.lockb',
  ]);

  return [...files]
    .map((file) => ({
      path: normalizePath(file.path),
      content: file.content,
    }))
    .filter((file) => dependencyFiles.has(file.path))
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => `${file.path}\0${file.content}`)
    .join('\0\0');
}

function buildFileTree(files: MVPProjectFile[]) {
  const root: Record<string, unknown> = {};

  for (const file of files) {
    const path = normalizePath(file.path);
    if (!path) continue;
    const parts = path.split('/').filter(Boolean);
    let cursor = root;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        cursor[part] = { file: { contents: file.content } };
        return;
      }
      const existing = cursor[part] as { directory?: Record<string, unknown> } | undefined;
      if (!existing?.directory) {
        cursor[part] = { directory: {} };
      }
      cursor = (cursor[part] as { directory: Record<string, unknown> }).directory;
    });
  }

  return root;
}

class MVPWebContainerRuntime {
  private webcontainer: WebContainer | null = null;
  private installProcess: WebContainerProcess | null = null;
  private devProcess: WebContainerProcess | null = null;
  private listeners = new Set<StateListener>();
  private state: MVPWebContainerState = initialState;
  private activeFilesSignature: string | null = null;
  private activeFilePathSignature: string | null = null;
  private activeDependencySignature: string | null = null;

  subscribe(listener: StateListener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private setState(patch: Partial<MVPWebContainerState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.state));
  }

  private log(level: MVPWebContainerLog['level'], message: string) {
    this.setState({
      logs: [
        ...this.state.logs.slice(-120),
        {
          id: crypto.randomUUID(),
          level,
          message,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }

  private async pipeOutput(process: WebContainerProcess, level: MVPWebContainerLog['level']) {
    process.output.pipeTo(new WritableStream({
      write: (chunk) => {
        const text = String(chunk).trim();
        if (text) this.log(level, text);
      },
    })).catch((error) => {
      this.log('warn', error instanceof Error ? error.message : String(error));
    });
  }

  async stop() {
    this.installProcess?.kill();
    this.devProcess?.kill();
    this.installProcess = null;
    this.devProcess = null;
    this.activeFilesSignature = null;
    this.activeFilePathSignature = null;
    this.setState({ status: 'idle', previewUrl: null, error: null });
  }

  async start(files: MVPProjectFile[], options: { devCommand?: string; port?: number } = {}) {
    if (!isBrowserRuntimeSupported()) {
      this.setState({
        status: 'unsupported',
        previewUrl: null,
        error: 'WebContainer preview requires a cross-origin isolated browser context.',
      });
      return;
    }

    const nextFilesSignature = buildFilesSignature(files);
    const nextFilePathSignature = buildFilePathSignature(files);
    const nextDependencySignature = buildDependencySignature(files);
    const runtimeIsBusy = ['booting', 'mounting', 'installing', 'starting'].includes(this.state.status);

    if (
      this.activeFilesSignature === nextFilesSignature &&
      this.state.status !== 'error' &&
      (runtimeIsBusy || this.state.previewUrl)
    ) {
      return;
    }

    try {
      if (!this.webcontainer) {
        await this.stop();
        this.setState({ status: 'booting', previewUrl: null, error: null, logs: [] });
        this.log('info', 'Booting WebContainer...');

        const { WebContainer } = await import('@webcontainer/api');
        this.webcontainer = await WebContainer.boot();
        this.webcontainer.on('server-ready', (port, url) => {
          this.log('info', `Dev server ready on port ${port}`);
          this.setState({ status: 'ready', previewUrl: url, error: null });
        });
      }

      const canHotUpdate =
        this.devProcess &&
        this.state.previewUrl &&
        this.activeFilePathSignature === nextFilePathSignature &&
        this.activeDependencySignature === nextDependencySignature &&
        this.state.status !== 'error';

      if (canHotUpdate) {
        this.setState({ status: 'mounting', error: null });
        await this.webcontainer.mount(buildFileTree(files));
        this.activeFilesSignature = nextFilesSignature;
        this.activeFilePathSignature = nextFilePathSignature;
        this.log('info', 'Preview files updated without reinstalling dependencies.');
        this.setState({ status: 'ready', error: null });
        return;
      }

      await this.stop();
      this.setState({ status: 'mounting', previewUrl: null, error: null, logs: [] });

      await this.webcontainer.mount(buildFileTree(files));
      this.activeFilesSignature = nextFilesSignature;
      this.activeFilePathSignature = nextFilePathSignature;
      this.log('info', 'Project files mounted.');

      this.setState({ status: 'installing' });
      this.installProcess = await this.webcontainer.spawn('npm', ['install']);
      await this.pipeOutput(this.installProcess, 'info');
      const installExit = await this.installProcess.exit;
      if (installExit !== 0) {
        throw new Error(`npm install failed with exit code ${installExit}`);
      }
      this.activeDependencySignature = nextDependencySignature;

      this.setState({ status: 'starting' });
      const command = options.devCommand || 'npm run dev';
      const [cmd, ...args] = command.split(/\s+/).filter(Boolean);
      this.devProcess = await this.webcontainer.spawn(cmd || 'npm', args.length ? args : ['run', 'dev']);
      await this.pipeOutput(this.devProcess, 'info');

      window.setTimeout(() => {
        if (this.state.status === 'starting') {
          this.log('warn', `Waiting for Vite preview on port ${options.port ?? 5173}...`);
        }
      }, 6000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log('error', message);
      this.setState({ status: 'error', previewUrl: null, error: message });
    }
  }
}

export const mvpWebContainerRuntime = new MVPWebContainerRuntime();
